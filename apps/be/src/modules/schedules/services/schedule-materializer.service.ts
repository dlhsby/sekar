import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { ScheduleRecurrenceUtil } from '../utils/schedule-recurrence.util';
import { ScheduleOverlapService } from './schedule-overlap.service';
import { SystemConfigService } from '../../settings/services/system-config.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { User } from '../../users/entities/user.entity';

export interface MaterializationResult {
  created: number;
  skipped: Array<{
    user_id: string;
    date: string;
    reason: 'exists' | 'duplicate';
  }>;
  conflicts: Array<{
    user_id: string;
    date: string;
    conflicting_shift: string;
  }>;
}

/**
 * Materializes ScheduleEvents into concrete Schedule occurrences.
 * Uses a rolling horizon to avoid unnecessary far-future materialization.
 */
@Injectable()
export class ScheduleMaterializerService {
  private readonly logger = new Logger(ScheduleMaterializerService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly overlapService: ScheduleOverlapService,
    private readonly configService: SystemConfigService,
  ) {}

  /**
   * Get the materialization horizon in days from the config (default 30).
   */
  horizonDays(): number {
    // Fallback matches the settings-catalog default (60). It read 30 here, which
    // contradicted the catalog and the ~60 days of rows actually present on
    // staging — two different answers to "how far ahead do we schedule".
    return this.configService.getNumber('schedule.materialization_days', 60);
  }

  /**
   * Materialize a ScheduleEvent for a date range.
   *
   * @param event ScheduleEvent to materialize
   * @param from Start date (defaults to today WIB)
   * @param to End date (defaults to today + horizon)
   * @returns MaterializationResult with created count and skipped entries
   */
  async materializeEvent(
    event: ScheduleEvent,
    from?: string,
    to?: string,
  ): Promise<MaterializationResult> {
    const today = TimezoneUtil.jakartaDateString();
    const fromDate = from || today;
    const toDate = to || this.addDays(today, this.horizonDays());

    // Expand the event's recurrence into concrete dates
    const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, fromDate, toDate);

    // Resolve members: individual → [user_id]; team → [pic_user_id, ...members]
    const memberIds = await this.resolveMemberIds(event);

    let created = 0;
    const skipped: MaterializationResult['skipped'] = [];
    const conflicts: MaterializationResult['conflicts'] = [];

    // One query for every existing row of this event in the window (incl.
    // soft-deleted tombstones and detached overrides) — none of these may be
    // regenerated. Avoids a findOne per (member, date).
    const existingRows =
      dates.length === 0
        ? []
        : await this.scheduleRepo.find({
            where: { schedule_event_id: event.id, schedule_date: In(dates) },
            withDeleted: true,
            select: ['user_id', 'schedule_date'],
          });
    const occupied = new Set(existingRows.map((r) => `${r.user_id}:${r.schedule_date}`));

    // A row for the same (user, date, shift) owned by ANOTHER event (or added
    // manually) makes this occurrence impossible — `UQ_schedules_user_date_shift`
    // is a partial unique index. Without this the insert threw on every cron run
    // and boot self-heal, logging a constraint violation for a row that can never
    // exist. Duplicates are now rejected at assignment time; this covers events
    // created before that guard.
    const takenRows =
      dates.length === 0 || memberIds.length === 0 || !event.shift_definition_id
        ? []
        : ((await this.scheduleRepo.find({
            where: {
              user_id: In(memberIds),
              schedule_date: In(dates),
              shift_definition_id: event.shift_definition_id,
            },
            select: ['user_id', 'schedule_date'],
          })) ?? []);
    const takenTriples = new Set(takenRows.map((r) => `${r.user_id}:${r.schedule_date}`));

    // Every overlap answer for the whole fan-out, in ONE query.
    //
    // This used to be a `findConflict` call per (member, date) INSIDE the loop
    // below, each a joined query over a 3-day window: a 10-member team across a
    // 60-day horizon meant ~600 sequential round-trips before
    // `POST /schedule-events` could return, which is most of why the success
    // toast appeared long before the row did.
    const conflictByPair =
      memberIds.length === 0 || dates.length === 0
        ? new Map<string, { shift_name: string }>()
        : await this.overlapService.findConflicts(memberIds, dates, event.shift_definition, {
            excludeEventId: event.id,
          });

    // Build every row first, then write them in chunks. Saving one at a time
    // was a second round-trip per tuple on top of the conflict check.
    const district_id =
      event.scope === 'static'
        ? event.location?.district_id
        : event.scope === 'mobile'
          ? event.region?.district_id
          : event.district_id;

    const pending: Array<{ row: Schedule; memberId: string; dateStr: string }> = [];
    for (const memberId of memberIds) {
      for (const dateStr of dates) {
        if (occupied.has(`${memberId}:${dateStr}`) || takenTriples.has(`${memberId}:${dateStr}`)) {
          // Tombstone, detached override, already-materialized occurrence, or the
          // same shift already owned by another event / a manual row.
          skipped.push({ user_id: memberId, date: dateStr, reason: 'exists' });
          continue;
        }

        const row = this.scheduleRepo.create({
          user_id: memberId,
          schedule_date: dateStr,
          shift_definition_id: event.shift_definition_id,
          status: ScheduleStatus.PLANNED,
          source: 'event',
          schedule_event_id: event.id,
          region_id: event.scope === 'mobile' ? event.region_id : null,
          // The occurrence's single place (ADR-053) — was written into the
          // schedule_locations junction; now it lives on the row, which is what
          // the uniqueness key indexes.
          location_id: event.scope === 'static' ? event.location_id : null,
          team_category_id: event.is_team ? event.team_category_id : null,
          district_id,
          created_by: event.created_by,
        });
        pending.push({ row, memberId, dateStr });
      }
    }

    // Chunked, and per-chunk failures fall back to one-by-one so a single
    // duplicate is still reported as `skipped` rather than losing its whole
    // batch. Unlike Phase 3, an overlap CREATES the row and warns (ADR-047
    // amended, overlap policy) — only the unique key can stop a row.
    const CHUNK = 200;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const batch = pending.slice(i, i + CHUNK);
      try {
        await this.scheduleRepo.save(
          batch.map((p) => p.row),
          { chunk: CHUNK },
        );
        created += batch.length;
      } catch {
        for (const p of batch) {
          try {
            await this.scheduleRepo.save(p.row);
            created++;
          } catch (err) {
            // (user, date, shift, place) unique — the worker already holds this
            // EXACT occurrence via another event/manual row. The only thing
            // still impossible: report as skipped, never crash the fan-out.
            if ((err as { code?: string }).code === '23505') {
              skipped.push({ user_id: p.memberId, date: p.dateStr, reason: 'duplicate' });
              continue;
            }
            throw err;
          }
        }
      }
    }

    for (const p of pending) {
      const conflict = conflictByPair.get(`${p.memberId}:${p.dateStr}`);
      if (!conflict) continue;
      this.logger.warn(
        `Overlap detected: user ${p.memberId} on ${p.dateStr} has ${conflict.shift_name}; ` +
          `created ${event.shift_definition.name} anyway`,
      );
      conflicts.push({
        user_id: p.memberId,
        date: p.dateStr,
        conflicting_shift: conflict.shift_name,
      });
    }

    return { created, skipped, conflicts };
  }

  /**
   * Re-materialize a series starting from a given date.
   * Hard-deletes future non-detached rows of this event, then re-materializes.
   * Soft-deleted tombstones are left alone (they block regeneration).
   * Past rows (< fromDate) are never touched.
   *
   * @param event ScheduleEvent
   * @param fromDate Start date (defaults to today WIB)
   */
  async rematerializeSeries(
    event: ScheduleEvent,
    fromDate?: string,
  ): Promise<MaterializationResult> {
    const today = TimezoneUtil.jakartaDateString();
    const from = fromDate || today;
    const to = this.addDays(today, this.horizonDays());

    // Hard-delete future non-detached rows of this event (>= from). Default
    // repository finds already exclude soft-deleted rows, so tombstones —
    // which must survive to keep blocking regeneration — are never selected.
    const rowsToDelete = await this.scheduleRepo.find({
      where: {
        schedule_event_id: event.id,
        schedule_date: MoreThanOrEqual(from),
        is_detached: false,
      },
      select: ['id'],
    });

    if (rowsToDelete.length > 0) {
      // Hard delete via the connection to avoid soft-delete behavior
      await this.scheduleRepo
        .createQueryBuilder()
        .delete()
        .from(Schedule)
        .where('id IN (:...ids)', { ids: rowsToDelete.map((r) => r.id) })
        .execute();
    }

    // Re-materialize from fromDate forward
    return this.materializeEvent(event, from, to);
  }

  /**
   * Resolve all member IDs for an event.
   * - Individual: [user_id]
   * - Team: [pic_user_id, ...member_ids] (deduplicated)
   */
  private async resolveMemberIds(event: ScheduleEvent): Promise<string[]> {
    if (!event.is_team) {
      return [event.user_id!];
    }

    // Team: PIC + invited members
    const members = [event.pic_user_id!];
    if (event.members && event.members.length > 0) {
      members.push(...event.members.map((m) => m.user_id));
    }

    return Array.from(new Set(members)); // Deduplicate
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }
}
