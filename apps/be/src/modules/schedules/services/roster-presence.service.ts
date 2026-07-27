import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { UserTrackingStatus } from '../../monitoring/entities/user-tracking-status.entity';
import { SystemConfigService } from '../../settings/services/system-config.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { deriveRosterPresence, sessionKey } from '../lib/roster-presence';

/** Batched session lookup with exact-shift-then-unattributed precedence. */
interface SessionIndex {
  lookup(userId: string, day: string, shiftDefId: string | null | undefined): Shift | undefined;
  /** Does an APPROVED OVERTIME session exist for this worker on this day? */
  hasOvertime(userId: string, day: string): boolean;
}

/**
 * Attaches the ADR-050 presence axes to roster rows.
 *
 * Roster reads used to return the bare `Schedule` row, so every consumer could
 * only ever see `status` — planned / present / absent / leave. The Jadwal board
 * declared it read the full presence model and rendered a coloured bullet for
 * it, but the fields never arrived, so it silently fell back to `status` and five
 * of its nine tones were unreachable. This service is what makes the board's
 * claim true.
 *
 * Two deliberate constraints:
 *
 * 1. **Only past-or-today rows are enriched.** Lifecycle answers "where is this
 *    worker in their day", which is meaningless for a row three weeks out. The
 *    range endpoint serves up to 62 days (~60k rows on staging); deriving all of
 *    them would burn the budget to compute `belum_hadir` 60 000 times.
 * 2. **Two batched queries, never per-row.** Sessions and tracking snapshots are
 *    fetched once for the whole page, mirroring the batching `sweepAbsences`
 *    already uses. An N+1 here would be a query per worker per day.
 */
@Injectable()
export class RosterPresenceService {
  private readonly logger = new Logger(RosterPresenceService.name);

  constructor(
    @InjectRepository(Shift) private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepo: Repository<UserTrackingStatus>,
    private readonly configService: SystemConfigService,
  ) {}

  /**
   * Late grace, shared with monitoring (`monitoring.late_grace_sec`) so
   * "terlambat" means the same thing on the board as on the map. Read through
   * the same settings service rather than importing MonitoringModule, which
   * would make schedules depend on monitoring at the Nest level.
   */
  private graceMs(): number {
    return this.configService.getNumber('monitoring.late_grace_sec', 900) * 1000;
  }

  /**
   * Enrich rows in place-free fashion: returns NEW row objects carrying the
   * presence axes. Rows in the future are returned with `lifecycle_state: null`
   * so a consumer can tell "not applicable" from "off duty".
   */
  async attach(rows: Schedule[], now: Date = new Date()): Promise<Schedule[]> {
    if (rows.length === 0) return rows;

    // `now` is a REAL instant, not a WIB-shifted one: `derivePresenceState`
    // compares it against `resolveShiftWindow`'s real instants (monitoring passes
    // `new Date()` for the same reason), and `jakartaDateString` applies the +7h
    // itself. Passing `jakartaNow()` here shifted the clock twice — 14h ahead —
    // which silently derived tomorrow's rows and aged today's toward tidak_hadir.
    const today = TimezoneUtil.jakartaDateString(now);
    const derivable = rows.filter((r) => r.schedule_date <= today);
    if (derivable.length === 0) return rows;

    const [sessions, tracking] = await Promise.all([
      this.loadSessions(derivable),
      this.loadTracking(derivable),
    ]);
    const grace = this.graceMs();

    return rows.map((row) => {
      if (row.schedule_date > today) {
        return {
          ...row,
          lifecycle_state: null,
          lifecycle_flags: [],
          leave_reason: null,
          is_within_area: null,
          is_scheduled: true,
        } as Schedule;
      }

      const session = sessions.lookup(row.user_id, row.schedule_date, row.shift_definition_id);
      const presence = deriveRosterPresence(
        row.status,
        row.schedule_date,
        row.shift_definition,
        session,
        grace,
        now,
        sessions.hasOvertime(row.user_id, row.schedule_date),
      );

      // The inside/outside axis only means something while the worker is on
      // duty; a stale snapshot from last week would otherwise paint a planned
      // row amber. Null = "no live reading", which the UI renders as neutral.
      const within =
        presence.lifecycle_state === 'bertugas' ? (tracking.get(row.user_id) ?? null) : null;

      return {
        ...row,
        lifecycle_state: presence.lifecycle_state,
        lifecycle_flags: presence.lifecycle_flags,
        leave_reason: presence.leave_reason,
        is_within_area: within,
        is_scheduled: presence.is_scheduled,
      } as Schedule;
    });
  }

  /**
   * One query for every session the page could possibly need.
   *
   * Two indexes, not one: sessions keyed by their attributed shift, plus a
   * per-day fallback holding sessions that could NOT be attributed. A roster row
   * consults the exact shift first, then the fallback — the same precedence
   * `sweepAbsences` uses, so an unattributable punch still reads as present
   * rather than becoming a phantom no-show. Writing both into a single map let a
   * session for Shift 2 answer a lookup for Shift 1.
   */
  private async loadSessions(rows: Schedule[]): Promise<SessionIndex> {
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const days = [...new Set(rows.map((r) => r.schedule_date))];
    // Overtime sessions are fetched too — not to match roster rows (a roster row
    // is a normal assignment), but so past-end presence backed by overtime reads
    // as `lembur` instead of accusing the worker of forgetting to clock out.
    const found = await this.shiftRepo.find({
      where: { user_id: In(userIds), service_day: In(days) },
      select: [
        'id',
        'user_id',
        'service_day',
        'shift_definition_id',
        'clock_in_time',
        'clock_out_time',
        'is_overtime',
      ],
    });

    const exact = new Map<string, Shift>();
    const unattributed = new Map<string, Shift>();
    const overtime = new Set<string>();
    for (const s of found) {
      if (!s.service_day) continue;
      // `date` columns come back as `YYYY-MM-DD` strings, but a driver/entity
      // change could hand back a Date — normalise rather than trust the shape.
      const raw: unknown = s.service_day;
      const day = raw instanceof Date ? TimezoneUtil.jakartaDateOf(raw) : String(raw);
      if (s.is_overtime) {
        overtime.add(`${s.user_id}|${day}`);
        continue;
      }
      if (s.shift_definition_id) {
        exact.set(sessionKey(s.user_id, day, s.shift_definition_id), s);
      } else {
        unattributed.set(sessionKey(s.user_id, day, null), s);
      }
    }
    return {
      lookup: (userId, day, shiftDefId) =>
        (shiftDefId ? exact.get(sessionKey(userId, day, shiftDefId)) : undefined) ??
        unattributed.get(sessionKey(userId, day, null)),
      hasOvertime: (userId, day) => overtime.has(`${userId}|${day}`),
    };
  }

  /** One query for the live inside/outside axis. */
  private async loadTracking(rows: Schedule[]): Promise<Map<string, boolean>> {
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    try {
      const found = await this.trackingRepo.find({
        where: { user_id: In(userIds) },
        select: ['user_id', 'is_within_area'],
      });
      return new Map(found.map((t) => [t.user_id, t.is_within_area]));
    } catch (err) {
      // The axis is decoration, not truth: a missing snapshot must never fail a
      // roster read. Degrade to "no live reading".
      this.logger.warn(`tracking snapshot unavailable: ${(err as Error).message}`);
      return new Map();
    }
  }
}
