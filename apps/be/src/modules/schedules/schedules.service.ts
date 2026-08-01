import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
  type FindOptionsWhere,
  type SelectQueryBuilder,
} from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import type { AttributionCandidate } from '../shifts/services/shift-attribution.service';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { AuditLogService } from '../audit/audit.service';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { ScheduleOverlapService } from './services/schedule-overlap.service';
import { SystemConfigService } from '../settings/services/system-config.service';
import { resolveShiftWindow } from '../monitoring/lib/presence-lifecycle';
import { ScheduleRecurrenceUtil } from './utils/schedule-recurrence.util';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import {
  canEditTargetRole,
  isGlobalRosterEditor,
  isDistrictManagerRole,
  isNonRosteredRole,
} from './schedule-edit.policy';

/**
 * Absence (Ketidakhadiran) type → roster status. `izin` (permit) is an excused
 * absence like sick/annual; `libur` reuses OFF (a deliberate day off, not counted
 * as expected/absent). Keep in sync with the monitoring on-leave filter.
 */
const LEAVE_STATUS_BY_TYPE: Record<'sick' | 'annual' | 'permit' | 'off', ScheduleStatus> = {
  sick: ScheduleStatus.LEAVE_SICK,
  annual: ScheduleStatus.LEAVE_ANNUAL,
  permit: ScheduleStatus.LEAVE_PERMIT,
  off: ScheduleStatus.OFF,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a shift's clock-in window has fully closed at `nowWib` — past its
 * `end_time` (rolled to the next day when the shift crosses midnight) plus the
 * `cutoff_grace_min` (the ADR-055 latest-clock-in cutoff). A still-`planned` row
 * past this point is a no-show, so both the absence sweep and the web/mobile
 * display helpers use this exact rule (kept in sync across the three codebases).
 *
 * `serviceDay`/`nowWib` are framed as WIB-wall-clock-in-UTC-fields, matching
 * `TimezoneUtil.jakartaNow()` and `ShiftAttributionService.wibInstant`.
 */
/**
 * Default reach of one absence sweep, in days. A week comfortably covers a long
 * weekend of downtime while keeping the hourly query small; widen it (or pass 0
 * for "no limit") for a deliberate one-off backfill.
 */
export const DEFAULT_SWEEP_LOOKBACK_DAYS = 7;

export function isShiftWindowClosed(
  serviceDay: string,
  endTime: string,
  crossesMidnight: boolean,
  graceMin: number,
  nowWib: Date,
): boolean {
  if (!endTime) return false;
  const hms = endTime.length === 5 ? `${endTime}:00` : endTime;
  const endMs = new Date(`${serviceDay}T${hms}Z`).getTime();
  if (Number.isNaN(endMs)) return false;
  const closeMs = endMs + (crossesMidnight ? DAY_MS : 0) + Math.max(0, graceMin) * 60_000;
  return nowWib.getTime() > closeMs;
}

/** Statuses that mean a worker is committed for the day and can't cover another shift. */
const BUSY_STATUSES = [
  ScheduleStatus.PLANNED,
  ScheduleStatus.PRESENT,
  ScheduleStatus.LEAVE_SICK,
  ScheduleStatus.LEAVE_ANNUAL,
  ScheduleStatus.LEAVE_PERMIT,
];

/**
 * The roles a day's roster is actually built from (ADR-054 §4).
 *
 * NOT the same as "roles that can hold a row": kepala_rayon / admin_rayon do get
 * rows, but theirs is a standing whole-district posting rather than a per-day
 * assignment, so listing them as "belum dijadwalkan" every single day would be
 * noise no one should ever act on.
 */
export const SCHEDULABLE_WORKER_ROLES: UserRole[] = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
];

/**
 * Statuses that mean "accounted for but NOT placeable" — an excused absence.
 * Distinguishing these from "no row at all" is what stops the panel inviting an
 * admin to schedule someone who is on approved leave.
 */
/**
 * Statuses that RELEASE the slot: the row exists, but the worker is not on it.
 * Only replacement does this — `absent` still holds the assignment.
 */
const FREED_STATUSES: ScheduleStatus[] = [ScheduleStatus.REPLACED];

const EXCUSED_STATUSES: ScheduleStatus[] = [
  ScheduleStatus.OFF,
  ScheduleStatus.LEAVE_SICK,
  ScheduleStatus.LEAVE_ANNUAL,
  ScheduleStatus.LEAVE_PERMIT,
];

export interface UnscheduledWorkerDto {
  id: string;
  full_name: string;
  username: string;
  role: UserRole;
  district_id: string | null;
  district_name: string | null;
  /**
   * Teams this worker is scheduled on TODAY (any shift, any place). Empty for a
   * worker with no team occurrence. Shown as a column and matched by the search,
   * so "Penyiraman" finds that crew even though a team lives on the schedule
   * rather than on the person.
   */
  teams: string[];
}

export interface UnavailableWorkerDto extends UnscheduledWorkerDto {
  /** Why they cannot be placed — drives the reason chip. */
  status: ScheduleStatus;
}

export interface UnscheduledResult {
  date: string;
  shift_definition_id: string | null;
  unscheduled: UnscheduledWorkerDto[];
  unavailable: UnavailableWorkerDto[];
  totals: {
    unscheduled: number;
    unavailable: number;
    scheduled: number;
    /** Workers the caller may see, BEFORE the search — the honest denominator. */
    workforce: number;
    /** How many of them the search matched; equals `workforce` when not searching. */
    matched: number;
  };
}

/**
 * The PLACE half of a row's identity under ADR-053: one row = one worker, one
 * shift, one place. Mirrors the DB expression behind
 * `UQ_schedules_user_date_shift_place`, so an in-memory uniqueness check and the
 * index always agree on what counts as "the same place". A row with no place at
 * all is city-scope, which the index folds onto the nil uuid — the same sentinel
 * is used here so city-scope rows collide with each other and nothing else.
 */
const NIL_PLACE_ID = '00000000-0000-0000-0000-000000000000';

export function schedulePlaceKey(row: {
  location_id?: string | null;
  region_id?: string | null;
  district_id?: string | null;
}): string {
  return row.location_id ?? row.region_id ?? row.district_id ?? NIL_PLACE_ID;
}

/**
 * The place an event's occurrences land on — the same resolution the projection
 * and the materializer apply, in one place so an occupancy check can never
 * disagree with the row it is meant to predict. Constant across the event's
 * users and dates, so callers resolve it once per event.
 */
export function eventPlace(event: ScheduleEvent): {
  location_id: string | null;
  region_id: string | null;
  district_id: string | null;
} {
  return {
    location_id: event.scope === 'static' ? (event.location_id ?? null) : null,
    region_id: event.scope === 'mobile' ? (event.region_id ?? null) : null,
    district_id:
      (event.scope === 'static'
        ? event.location?.district_id
        : event.scope === 'mobile'
          ? event.region?.district_id
          : event.district_id) ?? null,
  };
}

/**
 * Optional filters for the calendar range query (materialized + projected rows).
 * All are ANDed; omitted fields don't filter. `locationId` matches static rows
 * whose location_id matches.
 */
/**
 * `date` columns come back from `getRawMany` as JS **Date objects**, not the
 * `YYYY-MM-DD` strings the entity declares. Keying a Map on one directly uses
 * object identity, so every row becomes its own bucket — an unfiltered month
 * produced 48 954 "days" of one worker each instead of 35. Everything that
 * groups by day must go through here.
 */
function toDayString(value: unknown): string {
  if (value instanceof Date) return TimezoneUtil.jakartaDateOf(value);
  return String(value ?? '').slice(0, 10);
}

/** One week-grid cell: a (day, rayon, shift) breakdown, deduped to PEOPLE. */
export interface RangeSummaryCell {
  date: string;
  district_id: string;
  shift_definition_id: string | null;
  /** Distinct people in the cell. */
  total: number;
  /** …of those, how many are working as part of a team. */
  teams: number;
  /** …and the rest, by role. */
  roleCounts: Record<string, number>;
}

export interface RangeSummary {
  from: string;
  to: string;
  /** Distinct people per day — the month cell's headline figure. */
  days: Array<{ date: string; workers: number }>;
  /** Distinct people per (day, rayon) — the month cell's rayon list. */
  dayDistricts: Array<{ date: string; district_id: string; workers: number }>;
  /** The week grid's cells. */
  cells: RangeSummaryCell[];
}

/** One occurrence reduced to the fields a tally needs. */
interface SummaryTuple {
  user_id: string;
  district_id: string | null;
  region_id: string | null;
  location_id: string | null;
  shift_definition_id: string | null;
  schedule_event_id: string | null;
  role: string;
  /** Whether this occurrence is part of a team assignment. */
  is_team?: boolean;
  schedule_date?: string;
}

/**
 * One (container, shift, role) tally from `getDaySummary`. The container is the
 * innermost binding present: lokasi, else kawasan, else rayon, else city-wide —
 * the same order `buildDayBoard` buckets occurrences in.
 */
export interface DaySummaryGroup {
  district_id: string | null;
  region_id: string | null;
  location_id: string | null;
  shift_definition_id: string | null;
  role: string;
  total: number;
}

/** Distinct people in one container's subtree. */
export interface DaySummaryWorkers {
  id: string;
  workers: number;
}

export interface DaySummary {
  date: string;
  groups: DaySummaryGroup[];
  workers: {
    districts: DaySummaryWorkers[];
    regions: DaySummaryWorkers[];
    locations: DaySummaryWorkers[];
    city: number;
  };
}

export interface RangeFilters {
  /**
   * Only rows bound to NOTHING — no lokasi, no kawasan, no rayon: the board's
   * "Seluruh Surabaya" container. It cannot be expressed as an id filter, and
   * without it the board's city card had to fetch the entire day to show its
   * own handful of rows.
   */
  cityScopeOnly?: boolean;
  districtId?: string | null;
  regionId?: string | null;
  locationId?: string | null;
  userId?: string | null;
  shiftDefinitionId?: string | null;
  teamCategoryId?: string | null;
}

/**
 * Daily roster service — materializes recurring **ScheduleEvents** (the
 * calendar-like recurrence rules) into one concrete, editable `schedules`
 * (occurrence) row per worker per WIB day, and exposes the per-day edits ops
 * needs (leave, replacement, extra area, shift) plus read helpers for clock-in
 * and monitoring. Materialization is driven by the event-materialization cron
 * (ADR-047); `generateRoster` is the same expansion triggered on demand
 * (idempotent) — it reads active ScheduleEvents, not standing user assignments.
 * See ADR-047 (occurrences from events); ADR-013 is the earlier daily-roster
 * model it superseded.
 */
/**
 * Trim a projected row's relations to the fields the calendar actually renders.
 *
 * Projected rows are built from a `ScheduleEvent` loaded with its full relation
 * graph (location, region, team_category, user, pic_user, members.user), so each
 * virtual row carried whole entities — including `location.boundary_polygon`
 * (~2 KB of GeoJSON) and every user column. Measured on the staging clone: a
 * 10-day range BEYOND the materialization horizon returned **95 MB for 10 090
 * rows (11 KB/row)**; a 62-day far-future range would be ~590 MB, which the
 * staging API cannot serialize at `--max-old-space-size=384`.
 *
 * The materialized path fixed this with explicit column lists; this is the same
 * fix for the projection path, which shares no SQL with it. Field sets match
 * what the web board and mobile's personal calendar read — boundaries are
 * fetched per-subject by the map modal, never per roster row.
 */
/**
 * Column lists for the events the projection pass loads.
 *
 * `relations: [...]` alone hydrates every column of every relation, which on the
 * staging clone means `locations.boundary_polygon` (~12 KB of GeoJSON per event,
 * across ~1k events) and `users.profile_picture_url` for each team member — the
 * latter a base64 data URI reaching 5 MB. None of it survives
 * `slimProjectedRelations`, so it is loaded and discarded. These lists select
 * exactly the fields the projection loop reads.
 */
const EVENT_PROJECTION_SELECT = {
  // Root columns are listed explicitly rather than left to default, so the shape
  // does not depend on how TypeORM merges a relation-only `select`. A new column
  // on ScheduleEvent that the projection loop needs must be added here too.
  id: true,
  title: true,
  recurrence_type: true,
  start_date: true,
  end_date: true,
  recurrence_config: true,
  shift_definition_id: true,
  scope: true,
  location_id: true,
  region_id: true,
  district_id: true,
  is_team: true,
  team_category_id: true,
  pic_user_id: true,
  user_id: true,
  is_active: true,
  notes: true,
  created_by: true,
  location: { id: true, name: true, district_id: true, region_id: true },
  region: { id: true, name: true, district_id: true },
  team_category: { id: true, name: true, marker_color: true },
  shift_definition: {
    id: true,
    name: true,
    start_time: true,
    end_time: true,
    crosses_midnight: true,
    cutoff_grace_min: true,
  },
  user: { id: true, full_name: true, username: true, role: true, is_active: true },
  pic_user: { id: true, full_name: true, username: true, role: true, is_active: true },
  members: {
    // Composite PK (schedule_event_id, user_id) — there is no `id` column.
    schedule_event_id: true,
    user_id: true,
    user: { id: true, full_name: true, username: true, role: true, is_active: true },
  },
} as const;

function slimProjectedRelations(row: Schedule): Schedule {
  const place = <T extends { id: string; name: string }>(x: T | null | undefined): T | null =>
    x ? ({ id: x.id, name: x.name } as T) : null;

  if (row.location) row.location = place(row.location);
  if (row.region) row.region = place(row.region);
  if (row.team_category) {
    const t = row.team_category;
    row.team_category = { id: t.id, name: t.name, marker_color: t.marker_color } as typeof t;
  }
  if (row.user) {
    const u = row.user;
    row.user = {
      id: u.id,
      full_name: u.full_name,
      username: u.username,
      role: u.role,
    } as typeof u;
  }
  if (row.shift_definition) {
    const sd = row.shift_definition;
    row.shift_definition = {
      id: sd.id,
      name: sd.name,
      start_time: sd.start_time,
      end_time: sd.end_time,
      crosses_midnight: sd.crosses_midnight,
      cutoff_grace_min: sd.cutoff_grace_min,
    } as typeof sd;
  }
  return row;
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly rosterRepo: Repository<Schedule>,
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepo: Repository<ShiftDefinition>,
    // Read-only: resolve the roster row a still-open shift was started from, so a
    // dangling/overrun cross-midnight shift keeps its schedule + area. Registered
    // via TypeOrmModule.forFeature in schedules.module — no ShiftsModule import,
    // so no circular dependency (shifts already depends on schedules).
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    private readonly userAreasService: UserLocationsService,
    private readonly auditLogService: AuditLogService,
    private readonly materializer: ScheduleMaterializerService,
    private readonly overlapService: ScheduleOverlapService,
    // Optional so the many existing unit specs that construct this service by
    // hand keep working; absent, the sweep falls back to its documented default.
    @Optional()
    private readonly configService?: SystemConfigService,
  ) {}

  // ---- Edit-permission hierarchy (ADR-013 addendum) ----

  /**
   * Enforce the roster edit hierarchy: the `editor` may only edit a row whose
   * worker role is below theirs (see schedule-edit.policy) AND within their
   * scope — district for kepala_rayon/admin_rayon, assigned areas for korlap.
   * admin_system/superadmin/management act globally. Throws otherwise.
   */
  private async assertCanEdit(editor: User, row: Schedule): Promise<void> {
    const target = row.user ?? (await this.userRepo.findOne({ where: { id: row.user_id } }));
    if (!target) throw new NotFoundException('Roster worker not found');

    if (!canEditTargetRole(editor.role, target.role)) {
      throw new ForbiddenException("You cannot edit this worker's schedule");
    }
    if (isGlobalRosterEditor(editor.role)) return;

    if (isDistrictManagerRole(editor.role)) {
      if (!editor.district_id) {
        throw new ForbiddenException('Your account is missing a district assignment');
      }
      const inDistrict =
        row.district_id === editor.district_id || row.location?.district_id === editor.district_id;
      if (!inDistrict) throw new ForbiddenException('This worker is outside your district');
      return;
    }
    // korlap: the row's areas must overlap the coordinator's own assigned areas.
    const editorAreaIds = await this.userAreasService.getPermanentLocationIds(editor.id);
    const overlap = !!row.location_id && editorAreaIds.includes(row.location_id);
    if (!overlap) throw new ForbiddenException('This worker is outside your assigned areas');
  }

  /**
   * Authorize scheduling a NEW row for `target` (no existing row to gate on).
   * Mirrors assertCanEdit's hierarchy + scope, but keyed off the target user's
   * own district / permanent areas rather than a row's.
   */
  private async assertCanScheduleUser(editor: User, target: User): Promise<void> {
    if (!canEditTargetRole(editor.role, target.role)) {
      throw new ForbiddenException('You cannot schedule this worker');
    }
    if (isGlobalRosterEditor(editor.role)) return;
    if (isDistrictManagerRole(editor.role)) {
      if (!editor.district_id) {
        throw new ForbiddenException('Your account is missing a district assignment');
      }
      if (target.district_id !== editor.district_id) {
        throw new ForbiddenException('This worker is outside your district');
      }
      return;
    }
    // korlap: the worker's permanent areas must overlap the coordinator's.
    const [editorAreaIds, targetAreaIds] = await Promise.all([
      this.userAreasService.getPermanentLocationIds(editor.id),
      this.userAreasService.getPermanentLocationIds(target.id),
    ]);
    if (!targetAreaIds.some((a) => editorAreaIds.includes(a))) {
      throw new ForbiddenException('This worker is outside your assigned areas');
    }
  }

  /**
   * Add a single worker to a day's roster (worker joined mid-day / missed by
   * generate). Enforces one live row per worker per day: rejects if the worker
   * already has one. Defaults shift + areas to the worker's template when omitted.
   */
  async addForDay(
    dto: {
      user_id: string;
      date: string;
      shift_definition_id?: string | null;
      area_ids?: string[];
    },
    actor: User,
  ): Promise<Schedule> {
    const target = await this.userRepo.findOne({ where: { id: dto.user_id } });
    if (!target) throw new NotFoundException('Worker not found');
    if (!target.is_active) throw new BadRequestException('Worker is inactive');
    if (isNonRosteredRole(target.role)) {
      throw new BadRequestException('This role is not schedulable');
    }
    await this.assertCanScheduleUser(actor, target);

    const shiftId =
      dto.shift_definition_id !== undefined
        ? dto.shift_definition_id
        : (target.shift_definition_id ?? null);

    // Phase 4: overlaps are warned, not rejected (ADR-047 amended, Google-Calendar style).
    // Pre-check exact duplicate (same user+date+shift) via the unique index.
    // A shiftless (OFF) row still enforces one-per-day.
    if (shiftId) {
      const shift = await this.shiftDefinitionRepo.findOne({ where: { id: shiftId } });
      if (!shift) throw new NotFoundException('Shift definition not found');

      // Check for exact duplicate (same shift that day already exists)
      const exactDuplicates = await this.findAllByUserAndDate(dto.user_id, dto.date);
      const exactMatch = exactDuplicates.find((r) => r.shift_definition_id === shiftId);
      if (exactMatch) {
        throw new BadRequestException('Worker already has this exact shift that day');
      }

      // Check for overlap and log warning if found (but don't reject)
      const conflict = await this.overlapService.findConflict(dto.user_id, dto.date, shift);
      if (conflict) {
        this.logger.warn(
          `Overlap detected: user ${dto.user_id} on ${dto.date} has ${conflict.shift_name}; ` +
            `adding ${shift.name} anyway`,
        );
      }
    } else {
      const existing = await this.findAllByUserAndDate(dto.user_id, dto.date);
      if (existing.length > 0) {
        throw new BadRequestException('Worker already has a schedule for this day');
      }
    }
    const row = await this.rosterRepo.save(
      this.rosterRepo.create({
        user_id: dto.user_id,
        schedule_date: dto.date,
        district_id: target.district_id ?? null,
        shift_definition_id: shiftId,
        status: shiftId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF,
        source: 'manual',
        created_by: actor.id,
      }),
    );
    // ADR-053: one place per row. An explicit multi-lokasi request is a
    // contradiction, not something to truncate behind a 200 — say so. The
    // permanent-assignment FALLBACK legitimately holds several (a korlap covers
    // many taman), so it seeds this row with the first by id and leaves the rest
    // to further rows; sorted so the pick is deterministic across calls.
    if (dto.area_ids && dto.area_ids.length > 1) {
      throw new BadRequestException(
        'A schedule row covers exactly one place (ADR-053). Create one row per lokasi instead of listing several.',
      );
    }
    const locationIds =
      dto.area_ids ??
      [...(await this.userAreasService.getPermanentLocationIds(dto.user_id))].sort();
    await this.setPlace(row.id, locationIds[0] ?? null);
    await this.audit(
      row,
      'add_schedule',
      actor.id,
      {},
      { user_id: dto.user_id, shift_definition_id: shiftId, area_ids: locationIds },
    );
    return this.findOne(row.id);
  }

  /**
   * `user:date:shift:place` for every LIVE roster row in the range, regardless of
   * which event (or none) produced it.
   *
   * `UQ_schedules_user_date_shift_place` makes a second row for the same
   * (user, date, shift, PLACE) impossible, so an event that would produce one can
   * never materialize. Without this set the projection still emitted it — a
   * greyed "projected" duplicate that showed forever, could not be deleted (its
   * id is `projected:…`, not a row), and silently inflated the board's role
   * counts. Projection skips any key a live row already owns.
   *
   * The PLACE component is what keeps this honest under ADR-053. Keying on the
   * (user, date, shift) triple alone — as this did while the old
   * `UQ_schedules_user_date_shift` index still existed — suppressed the second
   * occurrence of a worker legitimately covering two places in one shift, which
   * is precisely the case ADR-053 exists to allow.
   */
  private async occupiedShiftKeys(
    from: string,
    to: string,
    filters?: RangeFilters,
  ): Promise<Set<string>> {
    const rows = await this.rosterRepo.find({
      where: {
        schedule_date: Between(from, to),
        ...this.projectionGuardScope(filters),
      },
      select: [
        'user_id',
        'schedule_date',
        'shift_definition_id',
        'location_id',
        'region_id',
        'district_id',
      ],
    });
    return new Set(
      rows
        .filter((r) => r.shift_definition_id)
        .map(
          (r) => `${r.user_id}:${r.schedule_date}:${r.shift_definition_id}:${schedulePlaceKey(r)}`,
        ),
    );
  }

  /**
   * `event:user:date` for every row in the range that an event produced,
   * INCLUDING soft-deleted tombstones and detached overrides — none of which may
   * be projected again.
   *
   * One query for the whole range. This used to run once per event, inside the
   * projection loop: ~1k active events on the staging clone meant ~1k sequential
   * round-trips, which dominated the 25 s a month-wide range took.
   * `getDailyCounts` already collected the same keys this way.
   */
  private async eventOccurrenceKeys(
    from: string,
    to: string,
    filters?: RangeFilters,
  ): Promise<Set<string>> {
    const rows = await this.rosterRepo.find({
      where: {
        schedule_date: Between(from, to),
        schedule_event_id: Not(IsNull()),
        ...this.projectionGuardScope(filters),
      },
      withDeleted: true,
      select: ['schedule_event_id', 'user_id', 'schedule_date'],
    });
    return new Set(rows.map((r) => `${r.schedule_event_id}:${r.user_id}:${r.schedule_date}`));
  }

  /**
   * The subset of a range's filters that may narrow the two projection-guard
   * key sets above.
   *
   * Both sets exist to answer "could this projected occurrence collide with a
   * row that already exists?". A guard query must therefore keep every row that
   * could collide with an occurrence the caller will actually receive — and the
   * projection loop has already dropped events that don't match the filters, so
   * narrowing the guard the same way is safe for these dimensions:
   *
   * - `userId` / `shiftDefinitionId` — both are components of the collision key,
   *   so a row with a different value can never collide.
   * - `locationId` / `regionId` / `districtId` — the collision key includes the
   *   PLACE, and an occurrence's place comes from its event, which the loop has
   *   already filtered to this place.
   *
   * `teamCategoryId` is deliberately NOT here: a blocking row may belong to a
   * different team (or none) and still own the same (user, date, shift, place).
   * Filtering by it would drop that row from the guard and resurrect a phantom
   * projected duplicate — the exact bug `occupiedShiftKeys` was added to fix.
   *
   * Unfiltered (the default city-wide board) this is a no-op, by design.
   */
  private projectionGuardScope(filters?: RangeFilters): FindOptionsWhere<Schedule> {
    if (!filters) return {};
    const { userId, shiftDefinitionId, locationId, regionId, districtId } = filters;
    return {
      ...(userId ? { user_id: userId } : {}),
      ...(shiftDefinitionId ? { shift_definition_id: shiftDefinitionId } : {}),
      ...(locationId ? { location_id: locationId } : {}),
      ...(regionId ? { region_id: regionId } : {}),
      ...(districtId ? { district_id: districtId } : {}),
    };
  }

  /**
   * `where` for active events that can contribute an occurrence in `[from, to]`.
   * An event starting after `to`, or ending before `from`, expands to zero
   * occurrences in the window (see `expandOccurrenceDates`), so it's excluded at
   * the DB — the projections no longer load every active event into memory.
   * (`end_date IS NULL` = open-ended, always a candidate.)
   */
  /**
   * Active events overlapping a range.
   *
   * `shift_definition: { is_active: true }` matters as much as the event's own
   * flag: a retired shift must stop producing occurrences, including the
   * PROJECTED ones this feeds, or the board keeps showing a shift that no picker
   * offers.
   */
  private activeEventsOverlapping(from: string, to: string): FindOptionsWhere<ScheduleEvent>[] {
    return [
      {
        is_active: true,
        shift_definition: { is_active: true },
        start_date: LessThanOrEqual(to),
        end_date: MoreThanOrEqual(from),
      },
      {
        is_active: true,
        shift_definition: { is_active: true },
        start_date: LessThanOrEqual(to),
        end_date: IsNull(),
      },
    ];
  }

  /**
   * Generate (materialize) the roster for a WIB day from all active ScheduleEvents.
   * Materializes occurrences for any event whose recurrence includes the given date.
   * Idempotent: existing rows (including tombstones) are skipped, so re-running
   * never duplicates and never overwrites manual edits or detached overrides.
   * Returns the number of new rows created (not including skipped/conflicts).
   *
   * Supports manual ad-hoc scheduling and backfill. The POST /schedules/generate
   * endpoint calls this; the daily cron uses ScheduleEventMaterializationCron instead.
   */
  async generateRoster(date: string, actorId: string | null): Promise<number> {
    // Fetch all active, non-deleted schedule events
    const events = await this.eventRepo.find({
      // Soft-deleted events are excluded by the repository's default scope; only
      // events that can occur on this date are loaded.
      where: this.activeEventsOverlapping(date, date),
      relations: [
        'shift_definition',
        'location',
        'region',
        'team_category',
        'pic_user',
        'user',
        'members',
      ],
    });

    let totalCreated = 0;

    // Materialize each event for the given date
    for (const event of events) {
      try {
        const result = await this.materializer.materializeEvent(event, date, date);
        totalCreated += result.created;

        if (result.skipped.length > 0) {
          this.logger.debug(
            `Event ${event.id} for ${date}: created ${result.created}, skipped ${result.skipped.length}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Failed to materialize event ${event.id} for ${date}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Generated ${totalCreated} roster rows for ${date} from active schedule events`,
    );
    return totalCreated;
  }

  /** Map each district id → the ids of all areas in it (for whole-district assignment). */
  private async buildDistrictAreaMap(districtIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (districtIds.length === 0) return map;
    const areas = await this.locationRepo.find({
      where: { district_id: In(districtIds) },
      select: ['id', 'district_id'],
    });
    for (const a of areas) {
      if (!a.district_id) continue;
      const list = map.get(a.district_id) ?? [];
      list.push(a.id);
      map.set(a.district_id, list);
    }
    return map;
  }

  /** All roster rows for a WIB day, optionally scoped to one district. */
  async findByDate(date: string, districtId?: string | null): Promise<Schedule[]> {
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      // `user` is eager on the entity, but createQueryBuilder ignores eager
      // relations — join it explicitly or every row comes back with no user
      // (the web table reads row.user.full_name and crashes).
      //
      // Explicit column lists, NOT leftJoinAndSelect — same reason as
      // `findByDateRange`. `users.profile_picture_url` holds a base64 data URI
      // (legacy rows reach 5 MB), so selecting the whole user stamps that blob
      // onto every one of that worker's rows. Measured on the staging clone: an
      // unscoped day returned **190 MB in 5.4 s** for 3.4k rows. `location` and
      // `region` carry `boundary_polygon` for the same reason.
      .leftJoin('ds.user', 'u')
      .addSelect(['u.id', 'u.full_name', 'u.username', 'u.role', 'u.is_active'])
      .leftJoin('ds.shift_definition', 'sd')
      .addSelect([
        'sd.id',
        'sd.name',
        'sd.start_time',
        'sd.end_time',
        'sd.crosses_midnight',
        'sd.cutoff_grace_min',
      ])
      .leftJoin('ds.location', 'location')
      .addSelect(['location.id', 'location.name'])
      .leftJoin('ds.replacement_user', 'ru')
      .addSelect(['ru.id', 'ru.full_name', 'ru.username', 'ru.role'])
      .where('ds.schedule_date = :date', { date })
      .andWhere('ds.deleted_at IS NULL');
    if (districtId) {
      qb.andWhere('ds.district_id = :districtId', { districtId });
    }
    return qb.orderBy('ds.status', 'ASC').addOrderBy('ds.created_at', 'ASC').getMany();
  }

  /**
   * ALL of a worker's live roster rows for a day, ordered by shift start time.
   * A worker may hold multiple non-overlapping shifts per day (ADR-047).
   */
  async findAllByUserAndDate(userId: string, date: string): Promise<Schedule[]> {
    const rows = await this.rosterRepo.find({
      where: { user_id: userId, schedule_date: date },
      // `region` is loaded so the mobile clock-in screen can name a kawasan-scope
      // assignment instead of falling back to "no area".
      relations: ['shift_definition', 'location', 'district', 'region'],
    });
    return rows.sort((a, b) =>
      (a.shift_definition?.start_time ?? '99:99:99').localeCompare(
        b.shift_definition?.start_time ?? '99:99:99',
      ),
    );
  }

  /**
   * Clock-in transition (ADR schedule-status-lifecycle): flip the day's roster
   * row(s) `planned → present`. Scoped to `(user, service_day, shift)` and to
   * `planned` only, so it never disturbs a `leave_*`/`off`/`replaced` row or an
   * ad-hoc clock-in with no row. Idempotent (a repeat clock-in is a no-op).
   */
  async markPresentForClockIn(
    userId: string,
    serviceDay: string,
    shiftDefinitionId: string,
  ): Promise<void> {
    await this.rosterRepo.update(
      {
        user_id: userId,
        schedule_date: serviceDay,
        shift_definition_id: shiftDefinitionId,
        status: ScheduleStatus.PLANNED,
        deleted_at: IsNull(),
      },
      { status: ScheduleStatus.PRESENT },
    );
  }

  /**
   * Absence sweep (ADR schedule-status-lifecycle): persist the outcome of every
   * PAST `planned` roster row whose clock-in window has fully closed
   * (`isShiftWindowClosed`). For each, self-heal against the session projection:
   * a clocked-in-but-still-`planned` row becomes `present`, a genuine no-show
   * becomes `absent`. `leave_*`/`off`/`replaced` rows are never touched (only
   * `planned` is queried). Deterministic — `now` is injectable for tests.
   *
   * Queries all past `planned` rows (`schedule_date <= today`), not just
   * yesterday/today, so a backlog from downtime is still reconciled.
   */
  async sweepAbsences(
    // A real instant, matching isShiftWindowClosed and the presence engine.
    now: Date = new Date(),
    lookbackDays?: number,
  ): Promise<{ absent: number; present: number }> {
    const todayStr = TimezoneUtil.jakartaDateString(now);

    /**
     * How far back a single sweep reaches.
     *
     * Unbounded, this scans EVERY past `planned` row on every hourly tick. That
     * is harmless once converged, but the first run after a deployment that has
     * never swept before is not: on staging it would rewrite the entire backlog
     * in one transaction. Bounding it keeps each run O(lookback) and turns the
     * backfill into a deliberate act (`lookbackDays: 0` = no limit) instead of a
     * surprise on the first cron tick after cutover.
     */
    const lookback =
      lookbackDays ??
      this.configService?.getNumber(
        'schedule.absence_sweep_lookback_days',
        DEFAULT_SWEEP_LOOKBACK_DAYS,
      ) ??
      DEFAULT_SWEEP_LOOKBACK_DAYS;
    const fromStr =
      lookback > 0
        ? TimezoneUtil.jakartaDateString(new Date(now.getTime() - lookback * 24 * 60 * 60 * 1000))
        : null;

    const candidates = await this.rosterRepo.find({
      where: {
        status: ScheduleStatus.PLANNED,
        schedule_date: fromStr ? Between(fromStr, todayStr) : LessThanOrEqual(todayStr),
        deleted_at: IsNull(),
      },
      relations: ['shift_definition'],
    });

    // Rows whose window has fully closed — the only ones this run resolves.
    const due = candidates.filter((row) => {
      const sd = row.shift_definition;
      if (!sd) return false;
      const grace = sd.cutoff_grace_min ?? 60;
      return isShiftWindowClosed(row.schedule_date, sd.end_time, sd.crosses_midnight, grace, now);
    });
    if (due.length === 0) return { absent: 0, present: 0 };

    // One batched query for the sessions behind every due row (avoids an N+1
    // over a downtime backlog). Keyed on the exact (user, service_day, shift) so
    // a null shift never collapses into "matches any session".
    const sessions = await this.shiftRepo.find({
      where: {
        user_id: In([...new Set(due.map((r) => r.user_id))]),
        service_day: In([...new Set(due.map((r) => r.schedule_date))]),
        is_overtime: false,
      },
      select: ['user_id', 'service_day', 'shift_definition_id'],
    });
    const key = (u: string, d: string, s: string | null | undefined): string =>
      `${u}|${d}|${s ?? ''}`;
    const clockedIn = new Set(
      sessions.map((s) => key(s.user_id, s.service_day ?? '', s.shift_definition_id)),
    );

    const absentIds: string[] = [];
    const presentIds: string[] = [];
    for (const row of due) {
      // Self-heal: a non-overtime session for this exact key means they clocked in.
      const clocked = clockedIn.has(key(row.user_id, row.schedule_date, row.shift_definition_id));
      (clocked ? presentIds : absentIds).push(row.id);
    }

    if (absentIds.length > 0) {
      await this.rosterRepo.update(
        { id: In(absentIds), status: ScheduleStatus.PLANNED },
        { status: ScheduleStatus.ABSENT },
      );
    }
    if (presentIds.length > 0) {
      await this.rosterRepo.update(
        { id: In(presentIds), status: ScheduleStatus.PLANNED },
        { status: ScheduleStatus.PRESENT },
      );
    }
    return { absent: absentIds.length, present: presentIds.length };
  }

  /**
   * Who is NOT scheduled against a TARGET SLOT (ADR-054).
   *
   * The board shows what IS scheduled, so a worker with no row is invisible by
   * construction: an empty column and a fully-placed rayon look identical, and
   * the gap only surfaces the next morning as an understaffed lokasi.
   *
   * **The filters describe the slot being filled, not the worker.** Date, shift,
   * rayon, kawasan and lokasi together say "this is the assignment I am trying
   * to make"; the answer is everyone who does not already hold a schedule
   * matching it — i.e. exactly the people you could place there. An omitted
   * criterion matches everything, so with only a date the question degenerates
   * to the simple one: "who has no schedule today at all".
   *
   * This is why geography does not narrow the workforce. Workers carry a rayon
   * and nothing below it (`users.region_id` is unset in practice, and only a
   * minority hold a permanent lokasi), so filtering PEOPLE by kawasan would
   * match nobody. The kawasan belongs to the target.
   *
   * Three subtleties this has to get right:
   *
   * 1. **Projected occurrences count as scheduled.** Beyond the materialization
   *    horizon a recurring rule yields projected rows, not DB rows (ADR-047), so
   *    a `NOT EXISTS` against `schedules` would report everyone on a daily rule
   *    as unscheduled for every future date. It reads the same materialized ∪
   *    projected union the board renders.
   * 2. **Absence is not availability.** A worker on cuti has no assignment AND
   *    cannot take one, so they are reported separately rather than sitting in a
   *    list of people to place. Excused is judged over the whole DAY, not the
   *    target — leave does not care how the slot is described.
   * 3. **Busy elsewhere is still available here.** Only a row matching the
   *    target counts as "already on it": under ADR-053 one worker legitimately
   *    covers several places in a shift.
   */
  async findUnscheduled(
    date: string,
    filters: {
      shiftDefinitionId?: string | null;
      districtId?: string | null;
      regionId?: string | null;
      locationId?: string | null;
      roles?: UserRole[] | null;
      q?: string | null;
      /**
       * The caller's OWN district, when they are rayon-scoped. Distinct from
       * `districtId`: that describes the slot being filled, this describes who
       * the caller may see at all. Conflating the two is what let a kepala_rayon
       * list every rayon's workers once geography stopped narrowing the
       * workforce.
       */
      visibleDistrictId?: string | null;
    } = {},
  ): Promise<UnscheduledResult> {
    const { shiftDefinitionId, districtId, regionId, locationId, roles, q, visibleDistrictId } =
      filters;

    // The workforce a day is built from. kepala_rayon / admin_rayon are excluded
    // outright (ADR-054 §4): their posting is a standing whole-district one, so
    // they would sit in this list every day with no action ever appropriate.
    //
    // The role filter can only ever NARROW within those three. A request naming
    // a role outside them is dropped rather than honoured — and, once dropped,
    // falls back to all three rather than returning an empty list, which would
    // read as "everyone is scheduled" when the truth is "you asked for a role
    // this view never lists".
    const requested = (roles ?? []).filter((r) => SCHEDULABLE_WORKER_ROLES.includes(r));
    const candidateRoles = requested.length ? requested : [...SCHEDULABLE_WORKER_ROLES];

    // NOTE: the TARGET geography does NOT narrow the workforce. Rayon / kawasan
    // / lokasi describe the slot being filled, not a property of the worker —
    // workers carry a rayon and nothing below it, so filtering people by kawasan
    // would match nobody. See the target predicate below.
    //
    // `visibleDistrictId` is a different thing entirely: the CALLER's own rayon.
    // It DOES narrow the workforce, because a kepala_rayon must not see workers
    // they could never schedule.
    const userQb = this.userRepo
      .createQueryBuilder('u')
      .leftJoin('districts', 'd', 'd.id = u.district_id')
      .addSelect('d.name', 'district_name')
      .where('u.role IN (:...roles)', { roles: candidateRoles })
      // A deactivated account is not a staffing gap.
      .andWhere('u.is_active = TRUE')
      .andWhere('u.deleted_at IS NULL');
    if (visibleDistrictId) {
      userQb.andWhere('u.district_id = :visibleDistrictId', { visibleDistrictId });
    }
    const { entities: workforce, raw } = await userQb
      .orderBy('u.full_name', 'ASC')
      .getRawAndEntities();
    const districtNameById = new Map<string, string>();
    for (const r of raw as Array<{ u_district_id?: string; district_name?: string }>) {
      if (r.u_district_id && r.district_name)
        districtNameById.set(r.u_district_id, r.district_name);
    }

    // The whole day as the BOARD sees it — materialized rows plus projections.
    //
    // Deliberately UNFILTERED, and it has to be: two different questions are
    // asked of it. "Is this worker on the target slot" wants the target
    // filters, but "what is this worker on at all today" — which drives the
    // excused bucket and the team search — wants the whole day. Pushing the
    // target into SQL would answer the first and silently break the other two:
    // a worker on cuti at another lokasi would come back as merely unscheduled,
    // and their team would vanish from the search.
    //
    // One query, filtered in memory by `matchesTarget`. The day is a single
    // date, so this is bounded by one day's occurrences (tens to low hundreds),
    // not by the calendar.
    const occurrences = await this.findByDateRange(date, date);

    /**
     * Does this occurrence satisfy the target the operator described? An omitted
     * criterion matches everything, so with no filters at all every occurrence
     * counts and the answer degenerates to "has no schedule today".
     */
    const matchesTarget = (row: Schedule): boolean => {
      if (shiftDefinitionId && row.shift_definition_id !== shiftDefinitionId) return false;
      // A BROADER assignment already covers a narrower target. A city-wide row
      // (no geography at all) covers every rayon; a rayon-wide row covers every
      // lokasi in it. Requiring an exact column match reported those workers as
      // free for every place they were already committed to — with the seeded
      // city-scope cohort that made `scheduled` collapse to 0 for any rayon
      // target. A row is only "not this slot" when it names a DIFFERENT place at
      // the same level.
      if (locationId && row.location_id && row.location_id !== locationId) return false;
      if (regionId && row.region_id && row.region_id !== regionId) return false;
      if (districtId && row.district_id && row.district_id !== districtId) return false;
      return true;
    };

    const busy = new Set<string>();
    const excusedBy = new Map<string, ScheduleStatus>();
    /** Teams a worker is on TODAY, for the search and the Tim column. */
    const teamsByUser = new Map<string, Set<string>>();
    for (const row of occurrences) {
      if (!row.user_id) continue;
      // A REPLACED row is the one status where holding a schedule means the
      // worker is FREE — someone else took the shift. Deciding this by "not
      // excused" counted them as busy and hid them from the very list meant to
      // find them; it also left them tagged with a team they no longer work.
      // `absent` deliberately stays busy: they hold the slot, they just did not
      // turn up.
      if (FREED_STATUSES.includes(row.status)) continue;
      const teamName = row.team_category?.name;
      if (teamName) {
        const set = teamsByUser.get(row.user_id);
        if (set) set.add(teamName);
        else teamsByUser.set(row.user_id, new Set([teamName]));
      }
      if (EXCUSED_STATUSES.includes(row.status)) {
        // Excused is about the DAY, not the target: someone on cuti cannot be
        // placed anywhere, however the slot is described.
        if (!excusedBy.has(row.user_id)) excusedBy.set(row.user_id, row.status);
        continue;
      }
      // Only a row matching the target means "already on this slot". A worker
      // busy at a DIFFERENT lokasi is still a candidate here — ADR-053 lets one
      // worker cover several places in a shift.
      if (matchesTarget(row)) busy.add(row.user_id);
    }

    const teamsOf = (userId: string): string[] => [...(teamsByUser.get(userId) ?? [])].sort();

    // Search spans name, username AND the teams the worker is scheduled on
    // today, so "Penyiraman" pulls up that crew even though the team lives on
    // their schedule rather than on them. Applied here rather than in SQL
    // because the team names come from the occurrence pass above.
    const needle = q?.trim().toLowerCase();
    const matchesQuery = (u: User): boolean => {
      if (!needle) return true;
      if (u.full_name?.toLowerCase().includes(needle)) return true;
      if (u.username?.toLowerCase().includes(needle)) return true;
      return teamsOf(u.id).some((name) => name.toLowerCase().includes(needle));
    };

    const toDto = (u: User): UnscheduledWorkerDto => ({
      id: u.id,
      full_name: u.full_name,
      username: u.username,
      role: u.role,
      district_id: u.district_id ?? null,
      district_name: u.district_id ? (districtNameById.get(u.district_id) ?? null) : null,
      teams: teamsOf(u.id),
    });

    const unscheduled: UnscheduledWorkerDto[] = [];
    const unavailable: UnavailableWorkerDto[] = [];
    let scheduled = 0;
    let matched = 0;
    for (const u of workforce) {
      if (!matchesQuery(u)) continue;
      matched += 1;
      if (busy.has(u.id)) {
        scheduled += 1;
        continue;
      }
      const excused = excusedBy.get(u.id);
      if (excused) unavailable.push({ ...toDto(u), status: excused });
      else unscheduled.push(toDto(u));
    }

    return {
      date,
      shift_definition_id: shiftDefinitionId ?? null,
      unscheduled,
      unavailable,
      totals: {
        unscheduled: unscheduled.length,
        unavailable: unavailable.length,
        scheduled,
        // The workforce is what the caller may see, not what they searched —
        // reporting the search result as "workforce" made a 3-hit search read
        // as though the whole department were 3 people.
        workforce: workforce.length,
        matched,
      },
    };
  }

  /**
   * The roster row that is OPERATIVE RIGHT NOW — today's, or a still-running
   * cross-midnight shift started yesterday.
   *
   * `/schedules/my` defaulted to today's WIB date, so at 03:26 a satgas on
   * Shift 3 (21:00–05:00, started yesterday) was told "belum ada jadwal hari
   * ini" and read as unassigned — mid-shift. The service day for a crossing
   * shift does not end at midnight; the row that owns it belongs to the START
   * date. Today wins when it has a covering/upcoming row, so an early-morning
   * shift starting today is never shadowed by yesterday's tail.
   */
  async findCurrentForUser(userId: string): Promise<Schedule | null> {
    const now = TimezoneUtil.jakartaNow();
    const today = TimezoneUtil.jakartaDateString();
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

    const minutesOf = (hms: string): number => {
      const [h, m] = hms.split(':').map(Number);
      return h * 60 + m;
    };

    // Yesterday's crossing tail first: it is the only row that can be *running*
    // before its own start time reads as "upcoming" on today's clock.
    const yesterday = this.addDaysToDate(today, -1);
    const carried = (await this.findAllByUserAndDate(userId, yesterday)).find((r) => {
      const sd = r.shift_definition;
      if (!sd?.crosses_midnight) return false;
      return nowMin < minutesOf(sd.end_time);
    });

    const todays = await this.findByUserAndDate(userId, today);
    const resolved = !carried
      ? todays
      : !todays?.shift_definition
        ? carried
        : // Both exist: today's row wins only once it has actually started.
          nowMin >= minutesOf(todays.shift_definition.start_time)
          ? todays
          : carried;

    // A still-open shift that has OVERRUN its window no longer matches the
    // carried-tail test above (`now >= end_time`), yet the worker is demonstrably
    // still on it — the attendance record has no clock-out. At 05:42 on a Shift 3
    // (21:00–05:00) that was never closed, the plain resolution is empty and the
    // worker was shown "belum ada jadwal / tanpa area" mid-shift. Fall back to the
    // open shift's own roster row so the home hero + clock-out screen show the
    // real schedule/area and the geofence tests the right boundary. Only when
    // nothing else is operative, so a genuine current-day shift is never shadowed.
    return resolved ?? (await this.rosterRowForOpenShift(userId));
  }

  /**
   * The roster row a currently-open shift (clocked in, not yet clocked out) was
   * started from — matched by the shift's WIB service-day + its shift definition.
   * Null when there is no open shift, or it was an ad-hoc clock-in with no roster
   * row (a genuinely unscheduled worker, correctly still "belum ada jadwal").
   */
  private async rosterRowForOpenShift(userId: string): Promise<Schedule | null> {
    const open = await this.shiftRepo.findOne({
      where: { user_id: userId, clock_out_time: IsNull() },
      order: { clock_in_time: 'DESC' },
    });
    if (!open?.shift_definition_id) return null;
    const startDate = TimezoneUtil.jakartaDateString(open.clock_in_time);
    const rows = await this.findAllByUserAndDate(userId, startDate);
    return rows.find((r) => r.shift_definition_id === open.shift_definition_id) ?? null;
  }

  private addDaysToDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  /**
   * The worker's MOST RELEVANT roster row for a day. With a single row this is
   * simply that row; with multiple shifts it picks, in order: the shift whose
   * time window covers "now" (WIB, honoring crosses_midnight) → the next
   * upcoming shift today → the last shift of the day. Deterministic — callers
   * that need every shift use findAllByUserAndDate.
   */
  async findByUserAndDate(userId: string, date: string): Promise<Schedule | null> {
    const rows = await this.findAllByUserAndDate(userId, date);
    if (rows.length <= 1) return rows[0] ?? null;

    const now = TimezoneUtil.jakartaNow();
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

    const minutesOf = (hms: string): number => {
      const [h, m] = hms.split(':').map(Number);
      return h * 60 + m;
    };
    // A crosses-midnight shift on THIS date covers from its start tonight into
    // tomorrow — the after-midnight tail is served by the PREVIOUS day's row
    // (callers querying yesterday's date), so coverage here is simply
    // [start, end-possibly-past-1440) against today's clock.
    const covering = rows.find((r) => {
      const sd = r.shift_definition;
      if (!sd) return false;
      const start = minutesOf(sd.start_time);
      const end = minutesOf(sd.end_time) + (sd.crosses_midnight ? 24 * 60 : 0);
      return nowMin >= start && nowMin < end;
    });
    if (covering) return covering;

    const upcoming = rows.find(
      (r) => r.shift_definition && minutesOf(r.shift_definition.start_time) > nowMin,
    );
    return upcoming ?? rows[rows.length - 1];
  }

  /**
   * All roster rows for a date range [from, to] inclusive, district-scoped.
   * Relations: user, shift_definition, location, region, team_category.
   *
   * Phase 4 (ADR-047 amended): includes materialized rows + projected rows from
   * active events that expand beyond the materialization horizon. Projected rows
   * are virtual (is_projected=true) and not persisted.
   */
  async findByDateRangeForUser(from: string, to: string, userId: string): Promise<Schedule[]> {
    // Fetch materialized rows for this user in the range
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.user', 'u')
      .leftJoinAndSelect('ds.shift_definition', 'sd')
      .leftJoinAndSelect('ds.location', 'location')
      // `district` (rayon) is joined alongside `region` so a rayon-scope row
      // carries its boundary — parity with findAllByUserAndDate, and what the
      // client needs to geofence a rayon assignment (QueryBuilder skips eager
      // relations, so this must be explicit).
      .leftJoinAndSelect('ds.district', 'd')
      .leftJoinAndSelect('ds.region', 'r')
      .leftJoinAndSelect('ds.team_category', 'tt')
      .where('ds.user_id = :userId', { userId })
      .andWhere('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL');
    const materialized = await qb
      .orderBy('ds.schedule_date', 'ASC')
      .addOrderBy('ds.status', 'ASC')
      .getMany();

    // Build a set of (event_id, user_id, date) tuples already materialized
    const materializedKey = new Set(
      materialized
        .filter((r) => r.schedule_event_id)
        .map((r) => `${r.schedule_event_id}:${r.user_id}:${r.schedule_date}`),
    );

    // Tombstones and detached overrides for the whole range, in one query rather
    // than one per event inside the projection loop below.
    const existingKey = await this.eventOccurrenceKeys(from, to, { userId });

    // Projection: load active events that include this user and expand beyond the materialized window
    const events = await this.eventRepo.find({
      where: this.activeEventsOverlapping(from, to),
      relations: [
        'shift_definition',
        'location',
        'region',
        'team_category',
        'pic_user',
        'user',
        'members',
        'members.user',
      ],
      select: EVENT_PROJECTION_SELECT,
    });

    const shiftOccupied = await this.occupiedShiftKeys(from, to, { userId });
    const projectedRows: Schedule[] = [];
    for (const event of events) {
      // Expand the event's recurrence into concrete dates
      const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);
      // Constant across this event's users and dates (ADR-053: one place per row).
      const eventPlaceId = schedulePlaceKey(eventPlace(event));

      // Resolve member IDs (same logic as materializer)
      const memberIds = event.is_team
        ? Array.from(
            new Set(
              [event.pic_user_id, ...(event.members?.map((m) => m.user_id) ?? [])].filter(
                (id): id is string => id != null,
              ),
            ),
          )
        : event.user_id
          ? [event.user_id]
          : [];

      // Skip this event if the user is not in it
      if (!memberIds.includes(userId)) continue;

      // Check which (member, date) pairs are already in DB with this event
      if (dates.length > 0) {
        // For each date NOT already in DB, emit a virtual projected row
        for (const dateStr of dates) {
          const key = `${event.id}:${userId}:${dateStr}`;
          if (!materializedKey.has(key)) {
            // Also check withDeleted to avoid resurrecting tombstones
            if (existingKey.has(key)) continue;
            // …and never project a (user, date, shift, PLACE) a live row already
            // owns (see `occupiedShiftKeys`) — it could never materialize anyway.
            // Keyed on the place too, so a second occurrence at a DIFFERENT place
            // in the same shift still projects (ADR-053).
            if (
              shiftOccupied.has(`${userId}:${dateStr}:${event.shift_definition_id}:${eventPlaceId}`)
            )
              continue;
            {
              // Emit a virtual projected row
              const projected = new Schedule();
              projected.id = `projected:${event.id}:${userId}:${dateStr}`;
              projected.user_id = userId;
              projected.schedule_date = dateStr;
              projected.shift_definition_id = event.shift_definition_id;
              projected.shift_definition = event.shift_definition;
              projected.status = ScheduleStatus.PLANNED;
              projected.source = 'event';
              projected.schedule_event_id = event.id;
              projected.region_id = event.scope === 'mobile' ? event.region_id : null;
              projected.region = event.scope === 'mobile' ? event.region : null;
              projected.team_category_id = event.is_team ? event.team_category_id : null;
              projected.team_category = event.is_team ? event.team_category : null;

              const district_id =
                event.scope === 'static'
                  ? event.location?.district_id
                  : event.scope === 'mobile'
                    ? event.region?.district_id
                    : event.district_id;
              projected.district_id = district_id ?? null;
              projected.is_detached = false;
              projected.is_projected = true;

              // Load user
              if (event.is_team) {
                if (userId === event.pic_user_id && event.pic_user) {
                  projected.user = event.pic_user;
                } else if (event.members?.length > 0) {
                  const memberObj = event.members.find((m) => m.user_id === userId);
                  if (memberObj?.user) {
                    projected.user = memberObj.user;
                  }
                }
              } else if (event.user) {
                projected.user = event.user;
              }

              // Static scope → the occurrence's single lokasi (ADR-053).
              if (event.scope === 'static' && event.location) {
                projected.location_id = event.location_id ?? null;
                projected.location = event.location;
              }

              projectedRows.push(slimProjectedRelations(projected));
            }
          }
        }
      }
    }

    // Merge materialized and projected rows, sorted by date + status
    const all = [...materialized, ...projectedRows];
    return all.sort((a, b) => {
      const dateCompare = a.schedule_date.localeCompare(b.schedule_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.status ?? '').localeCompare(b.status ?? '');
    });
  }

  /**
   * How many MATERIALIZED rows a range would return, without hydrating any.
   *
   * The controller uses this to refuse a response too large to serialize rather
   * than OOMing mid-flight. It deliberately counts only materialized rows:
   * projected ones require expanding every recurrence, which is most of the cost
   * the guard exists to avoid. A range dominated by projections is beyond the
   * horizon and small in practice.
   */
  async countByDateRange(
    from: string,
    to: string,
    filters?: RangeFilters | string | null,
  ): Promise<number> {
    const f: RangeFilters = typeof filters === 'string' ? { districtId: filters } : (filters ?? {});
    const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .innerJoin('ds.user', 'u')
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL')
      .andWhere('u.is_active = TRUE');
    if (f.cityScopeOnly) {
      qb.andWhere('ds.location_id IS NULL')
        .andWhere('ds.region_id IS NULL')
        .andWhere('ds.district_id IS NULL');
    }
    if (districtId) qb.andWhere('ds.district_id = :districtId', { districtId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    if (locationId) qb.andWhere('ds.location_id = :locationId', { locationId });
    return qb.getCount();
  }

  async findByDateRange(
    from: string,
    to: string,
    filters?: RangeFilters | string | null,
  ): Promise<Schedule[]> {
    // Back-compat: a bare districtId string is still accepted.
    const f: RangeFilters = typeof filters === 'string' ? { districtId: filters } : (filters ?? {});
    const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;

    // Fetch materialized rows for the range
    // Explicit column lists, NOT leftJoinAndSelect.
    //
    // `location` and `region` carry `boundary_polygon` (~2 KB of GeoJSON each),
    // and joining them wholesale stamps that polygon onto every single roster
    // row. Measured on the staging clone: a 31-day, all-district range returned
    // **293 MB in 29 s** for 31k rows — and staging runs the API with
    // `--max-old-space-size=384`, so serializing that response is an OOM, not a
    // slow page. The web board and mobile's personal calendar only ever render
    // these as NAMES; boundaries are fetched per-subject by the map modal.
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoin('ds.user', 'u')
      .addSelect(['u.id', 'u.full_name', 'u.username', 'u.role', 'u.is_active'])
      .leftJoin('ds.shift_definition', 'sd')
      .addSelect([
        'sd.id',
        'sd.name',
        'sd.start_time',
        'sd.end_time',
        'sd.crosses_midnight',
        // Drives the lazy no-show flip on both frontends (ADR-056).
        'sd.cutoff_grace_min',
      ])
      .leftJoin('ds.location', 'location')
      .addSelect(['location.id', 'location.name'])
      .leftJoin('ds.region', 'r')
      .addSelect(['r.id', 'r.name'])
      .leftJoin('ds.team_category', 'tt')
      .addSelect(['tt.id', 'tt.name', 'tt.marker_color'])
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL')
      // Deactivated workers drop off the board: their rows stay in the DB for
      // history, but the roster only shows people who can actually work.
      .andWhere('u.is_active = TRUE');
    if (f.cityScopeOnly) {
      qb.andWhere('ds.location_id IS NULL')
        .andWhere('ds.region_id IS NULL')
        .andWhere('ds.district_id IS NULL');
    }
    if (districtId) qb.andWhere('ds.district_id = :districtId', { districtId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    // One place per row (ADR-053), so the filter is a plain column match.
    if (locationId) qb.andWhere('ds.location_id = :locationId', { locationId });
    const materialized = await qb
      .orderBy('ds.schedule_date', 'ASC')
      .addOrderBy('ds.status', 'ASC')
      .getMany();

    // Build a set of (event_id, user_id, date) tuples already materialized
    const materializedKey = new Set(
      materialized
        .filter((r) => r.schedule_event_id)
        .map((r) => `${r.schedule_event_id}:${r.user_id}:${r.schedule_date}`),
    );

    // Projection: the occurrences active events will produce that no row holds
    // yet. Shared with `getDaySummary` so the two can never disagree.
    const projectedRows = await this.projectOccurrences(from, to, f, materializedKey);
    // Merge materialized and projected rows, sorted by date + status
    const all = [...materialized, ...projectedRows];
    return all.sort((a, b) => {
      const dateCompare = a.schedule_date.localeCompare(b.schedule_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.status ?? '').localeCompare(b.status ?? '');
    });
  }

  /**
   * The range filters as SQL, applied identically wherever occurrences are
   * counted or listed. Shared so a card's headcount and the rows it expands to
   * can never be filtered differently.
   */
  private applyRangeFilters(qb: SelectQueryBuilder<Schedule>, f: RangeFilters): void {
    if (f.cityScopeOnly) {
      qb.andWhere('ds.location_id IS NULL')
        .andWhere('ds.region_id IS NULL')
        .andWhere('ds.district_id IS NULL');
    }
    if (f.districtId) qb.andWhere('ds.district_id = :districtId', { districtId: f.districtId });
    if (f.regionId) qb.andWhere('ds.region_id = :regionId', { regionId: f.regionId });
    if (f.userId) qb.andWhere('ds.user_id = :userId', { userId: f.userId });
    if (f.shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', {
        shiftDefinitionId: f.shiftDefinitionId,
      });
    if (f.teamCategoryId)
      qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId: f.teamCategoryId });
    // One place per row (ADR-053), so the filter is a plain column match.
    if (f.locationId) qb.andWhere('ds.location_id = :locationId', { locationId: f.locationId });
  }

  /**
   * Virtual occurrences for a range: the ones an active event WILL produce but
   * that no roster row holds yet (beyond the materialization horizon, ADR-047).
   *
   * Extracted so the roster read and the day summary project from exactly the
   * same code. They have to agree — a card counting 0 for a day the board can
   * still open and list people in is worse than a slow board — and two copies of
   * this loop would drift the first time either was touched.
   */
  private async projectOccurrences(
    from: string,
    to: string,
    f: RangeFilters,
    materializedKey: Set<string>,
  ): Promise<Schedule[]> {
    const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;
    // Tombstones and detached overrides for the whole range, in one query rather
    // than one per event inside the loop below.
    const existingKey = await this.eventOccurrenceKeys(from, to, f);

    // Load active events and expand them beyond the materialized window.
    const events = await this.eventRepo.find({
      where: this.activeEventsOverlapping(from, to),
      relations: [
        'shift_definition',
        'location',
        'region',
        'team_category',
        'pic_user',
        'user',
        'members',
        'members.user',
      ],
      select: EVENT_PROJECTION_SELECT,
    });

    const shiftOccupied = await this.occupiedShiftKeys(from, to, f);
    const projectedRows: Schedule[] = [];
    for (const event of events) {
      // Event-level filter gate — skip whole events that can't match, so we
      // never expand their recurrence needlessly.
      if (shiftDefinitionId && event.shift_definition_id !== shiftDefinitionId) continue;
      if (teamCategoryId && event.team_category_id !== teamCategoryId) continue;
      if (locationId && event.location_id !== locationId) continue;
      const eventRegionId =
        event.scope === 'mobile' ? event.region_id : (event.location?.region_id ?? null);
      if (regionId && eventRegionId !== regionId) continue;
      const eventDistrictForFilter =
        event.scope === 'static'
          ? event.location?.district_id
          : event.scope === 'mobile'
            ? event.region?.district_id
            : event.district_id;
      if (districtId && eventDistrictForFilter !== districtId) continue;

      // Expand the event's recurrence into concrete dates
      const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);
      // Constant across this event's users and dates (ADR-053: one place per row).
      const eventPlaceId = schedulePlaceKey(eventPlace(event));

      // Resolve member IDs (same logic as materializer)
      let memberIds = event.is_team
        ? Array.from(
            new Set(
              [event.pic_user_id, ...(event.members?.map((m) => m.user_id) ?? [])].filter(
                (id): id is string => id != null,
              ),
            ),
          )
        : event.user_id
          ? [event.user_id]
          : [];
      // A user filter narrows to just that member (and drops events they aren't on).
      if (userId) memberIds = memberIds.filter((id) => id === userId);
      // Never project an occurrence for a deactivated member — the materialized
      // path already excludes them, so projections must match.
      const activeById = new Map<string, boolean>(
        [event.user, ...(event.members?.map((m) => m.user) ?? [])]
          .filter((u): u is NonNullable<typeof u> => !!u)
          .map((u) => [u.id, u.is_active !== false]),
      );
      memberIds = memberIds.filter((id) => activeById.get(id) !== false);

      // Check which (member, date) pairs are already in DB with this event
      if (dates.length > 0) {
        // For each (member, date) NOT already in DB, emit a virtual projected row
        for (const memberId of memberIds) {
          for (const dateStr of dates) {
            const key = `${event.id}:${memberId}:${dateStr}`;
            if (!materializedKey.has(key)) {
              // Also check withDeleted to avoid resurrecting tombstones
              if (existingKey.has(key)) continue;
              // …and never project a (user, date, shift, PLACE) a live row already
              // owns (see `occupiedShiftKeys`) — it could never materialize anyway.
              // Keyed on the place too, so a second occurrence at a DIFFERENT
              // place in the same shift still projects (ADR-053).
              if (
                shiftOccupied.has(
                  `${memberId}:${dateStr}:${event.shift_definition_id}:${eventPlaceId}`,
                )
              )
                continue;
              {
                // Filter by district if needed
                const district_id =
                  event.scope === 'static'
                    ? event.location?.district_id
                    : event.scope === 'mobile'
                      ? event.region?.district_id
                      : event.district_id;
                if (districtId && district_id !== districtId) continue;

                // Emit a virtual projected row
                const projected = new Schedule();
                projected.id = `projected:${event.id}:${memberId}:${dateStr}`;
                projected.user_id = memberId;
                projected.schedule_date = dateStr;
                projected.shift_definition_id = event.shift_definition_id;
                projected.shift_definition = event.shift_definition;
                projected.status = ScheduleStatus.PLANNED;
                projected.source = 'event';
                projected.schedule_event_id = event.id;
                projected.region_id = event.scope === 'mobile' ? event.region_id : null;
                projected.region = event.scope === 'mobile' ? event.region : null;
                projected.team_category_id = event.is_team ? event.team_category_id : null;
                projected.team_category = event.is_team ? event.team_category : null;
                projected.district_id = district_id ?? null;
                projected.is_detached = false;
                projected.is_projected = true;

                // Load user from event.user or event.pic_user (will be loaded via relations)
                if (event.is_team) {
                  // For team events, find the member user via relations
                  if (memberId === event.pic_user_id && event.pic_user) {
                    projected.user = event.pic_user;
                  } else if (event.members?.length > 0) {
                    const memberObj = event.members.find((m) => m.user_id === memberId);
                    if (memberObj?.user) {
                      projected.user = memberObj.user;
                    }
                  }
                } else if (event.user) {
                  // Individual event
                  projected.user = event.user;
                }

                // Static scope → the occurrence's single lokasi (ADR-053).
                if (event.scope === 'static' && event.location) {
                  projected.location_id = event.location_id ?? null;
                  projected.location = event.location;
                }

                projectedRows.push(slimProjectedRelations(projected));
              }
            }
          }
        }
      }
    }

    return projectedRows;
  }

  /**
   * The day board's collapsed view, as counts rather than rows.
   *
   * A collapsed card shows a headcount, capacity pills and its children's
   * counts — never a worker's name. Names are read only inside an EXPANDED
   * `ShiftRoleTable`. The board nonetheless downloaded every occurrence for the
   * whole city up front: **3.9 MB for one day** on the staging clone, and 57 MB
   * for a month, to render integers. This answers the same question in ~2 % of
   * the bytes; the rows for one container are fetched when it is opened.
   *
   * Two shapes come back because they are two different questions:
   *
   * - `groups` — occurrence counts per (container, shift, role). The client
   *   sums these for a shift's `total`, and filters to the countable roles for
   *   understaffing. Team members are included: a team fans out to one row per
   *   member carrying that member's own role, so a `GROUP BY role` counts them
   *   exactly as the board does.
   * - `workers` — DISTINCT people per container subtree. This cannot be summed
   *   client-side, which is the whole reason it is a separate result: under
   *   ADR-053 one worker may hold several occurrences in a day (different
   *   places), so a kawasan's headcount is a union of its lokasi, not a sum.
   *   Postgres does the dedup per tier.
   *
   * Only non-empty groups are returned; empty containers still render, from
   * master data the client already holds.
   */
  async getDaySummary(date: string, filters?: RangeFilters): Promise<DaySummary> {
    const f = filters ?? {};

    // Slim TUPLES, not entities: one row per occurrence with only the six fields
    // a tally needs. 3.4k of these is nothing to hold; 3.4k hydrated Schedules
    // with their relations is the 3.9 MB this endpoint exists to avoid.
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      // The roster only shows people who can actually work — same rule as
      // `findByDateRange`, or the counts would disagree with the rows.
      .innerJoin('ds.user', 'u', 'u.is_active = TRUE')
      .select('ds.user_id', 'user_id')
      .addSelect('ds.district_id', 'district_id')
      .addSelect('ds.region_id', 'region_id')
      .addSelect('ds.location_id', 'location_id')
      .addSelect('ds.shift_definition_id', 'shift_definition_id')
      .addSelect('ds.schedule_event_id', 'schedule_event_id')
      .addSelect('u.role', 'role')
      .where('ds.schedule_date = :date', { date })
      .andWhere('ds.deleted_at IS NULL');
    this.applyRangeFilters(qb, f);
    const materialized = await qb.getRawMany<SummaryTuple>();

    // A kawasan owns its own mobile rows AND every row at a lokasi inside it,
    // but a static row carries no `region_id` — only the lokasi knows its
    // kawasan. Resolved from one small lookup rather than a join, because the
    // PROJECTED rows need the same answer and their `location` has been slimmed
    // to id+name by then (`slimProjectedRelations`), which silently zeroed every
    // kawasan headcount on a projected day.
    const regionOfLocation = new Map(
      (await this.locationRepo.find({ select: ['id', 'region_id'] })).map((l) => [
        l.id,
        l.region_id ?? null,
      ]),
    );

    // Beyond the materialization horizon a day has NO rows, only occurrences an
    // event will produce. Counting materialized rows alone reported 0 petugas
    // for a day the board could still open and list 1 009 people in.
    const materializedKey = new Set(
      materialized
        .filter((r) => r.schedule_event_id)
        .map((r) => `${r.schedule_event_id}:${r.user_id}:${date}`),
    );
    const projected = await this.projectOccurrences(date, date, f, materializedKey);

    const tuples: SummaryTuple[] = [
      ...materialized,
      ...projected.map((row) => ({
        user_id: row.user_id,
        district_id: row.district_id ?? null,
        region_id: row.region_id ?? null,
        location_id: row.location_id ?? null,
        shift_definition_id: row.shift_definition_id ?? null,
        schedule_event_id: row.schedule_event_id ?? null,
        role: (row.user?.role ?? '') as string,
      })),
    ];

    // The container is the innermost binding a row carries — lokasi, else
    // kawasan, else rayon, else city — the same order `buildDayBoard` buckets in.
    const groupMap = new Map<string, DaySummaryGroup>();
    // Distinct PEOPLE per tier. Sets, not counters: ADR-053 lets one worker hold
    // several occurrences in a day, so a subtree's headcount is a union of its
    // children, never a sum.
    const districtWorkers = new Map<string, Set<string>>();
    const regionWorkers = new Map<string, Set<string>>();
    const locationWorkers = new Map<string, Set<string>>();
    const cityWorkers = new Set<string>();

    const add = (map: Map<string, Set<string>>, id: string | null, userId: string) => {
      if (!id) return;
      const set = map.get(id);
      if (set) set.add(userId);
      else map.set(id, new Set([userId]));
    };

    for (const t of tuples) {
      const key = [t.district_id, t.region_id, t.location_id, t.shift_definition_id, t.role].join(
        '|',
      );
      const existing = groupMap.get(key);
      if (existing) existing.total += 1;
      else
        groupMap.set(key, {
          district_id: t.district_id,
          region_id: t.region_id,
          location_id: t.location_id,
          shift_definition_id: t.shift_definition_id,
          role: t.role,
          total: 1,
        });

      cityWorkers.add(t.user_id);
      add(districtWorkers, t.district_id, t.user_id);
      add(locationWorkers, t.location_id, t.user_id);
      add(
        regionWorkers,
        t.region_id ?? regionOfLocation.get(t.location_id ?? '') ?? null,
        t.user_id,
      );
    }

    const toList = (map: Map<string, Set<string>>): DaySummaryWorkers[] =>
      [...map.entries()].map(([id, set]) => ({ id, workers: set.size }));

    return {
      date,
      groups: [...groupMap.values()],
      workers: {
        districts: toList(districtWorkers),
        regions: toList(regionWorkers),
        locations: toList(locationWorkers),
        city: cityWorkers.size,
      },
    };
  }

  /**
   * The week and month grids, as counts.
   *
   * Same problem as the day board (ADR-057), one dimension larger: both grids
   * render **only headcounts** unless a subject filter is set — `MonthGrid`
   * prints a distinct-petugas figure plus a per-rayon list, `WeekGrid` prints a
   * rayon x day table of per-shift role breakdowns — and both were fed the whole
   * range's occurrences to do it. An unfiltered month measured **57 MB in 27 s**
   * on the staging clone, which at `--max-old-space-size=384` is an OOM rather
   * than a slow page.
   *
   * Every figure here is **distinct people**, never rows: ADR-053 lets a worker
   * hold several occurrences in a day at different places, and every one of
   * these cells reads as "N petugas".
   *
   * A rayon is resolved the way the grids resolve it — the lokasi's rayon, else
   * the kawasan's, else the row's own column — so the numbers match what the day
   * board shows when you click into a cell.
   */
  async getRangeSummary(from: string, to: string, filters?: RangeFilters): Promise<RangeSummary> {
    const f = filters ?? {};

    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .innerJoin('ds.user', 'u', 'u.is_active = TRUE')
      .select('ds.user_id', 'user_id')
      .addSelect('ds.schedule_date', 'schedule_date')
      .addSelect('ds.district_id', 'district_id')
      .addSelect('ds.region_id', 'region_id')
      .addSelect('ds.location_id', 'location_id')
      .addSelect('ds.shift_definition_id', 'shift_definition_id')
      .addSelect('ds.schedule_event_id', 'schedule_event_id')
      .addSelect('ds.team_category_id IS NOT NULL', 'is_team')
      .addSelect('u.role', 'role')
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL');
    this.applyRangeFilters(qb, f);
    const materialized = await qb.getRawMany<SummaryTuple>();

    // Beyond the materialization horizon a range holds no rows, only the
    // occurrences events will produce — the same trap `getDaySummary` fell into.
    const materializedKey = new Set(
      materialized
        .filter((r) => r.schedule_event_id)
        .map((r) => `${r.schedule_event_id}:${r.user_id}:${toDayString(r.schedule_date)}`),
    );
    const projected = await this.projectOccurrences(from, to, f, materializedKey);

    const tuples: SummaryTuple[] = [
      ...materialized,
      ...projected.map((row) => ({
        user_id: row.user_id,
        schedule_date: row.schedule_date,
        district_id: row.district_id ?? null,
        region_id: row.region_id ?? null,
        location_id: row.location_id ?? null,
        shift_definition_id: row.shift_definition_id ?? null,
        schedule_event_id: row.schedule_event_id ?? null,
        is_team: row.team_category_id != null,
        role: (row.user?.role ?? '') as string,
      })),
    ];

    // A lokasi/kawasan knows its rayon; the row does not always carry one.
    const [locations, regions] = await Promise.all([
      this.locationRepo.find({ select: ['id', 'district_id', 'region_id'] }),
      // No `regions` repository is injected here, and adding one for two columns
      // is more coupling than the lookup is worth.
      this.rosterRepo.manager.query(
        `SELECT id, district_id FROM regions WHERE deleted_at IS NULL`,
      ) as Promise<Array<{ id: string; district_id: string | null }>>,
    ]);
    const districtOfLocation = new Map(locations.map((l) => [l.id, l.district_id ?? null]));
    const districtOfRegion = new Map(regions.map((r) => [r.id, r.district_id ?? null]));

    const dayWorkers = new Map<string, Set<string>>();
    const dayDistrictWorkers = new Map<string, Set<string>>();
    /** `<date>|<district>|<shift>` → the people in that cell and how each is attributed. */
    const cellUsers = new Map<string, Map<string, { role: string; isTeam: boolean }>>();

    for (const t of tuples) {
      const date = toDayString(t.schedule_date);
      if (!date) continue;

      const bump = (map: Map<string, Set<string>>, key: string) => {
        const set = map.get(key);
        if (set) set.add(t.user_id);
        else map.set(key, new Set([t.user_id]));
      };
      bump(dayWorkers, date);

      const districtId =
        (t.location_id ? districtOfLocation.get(t.location_id) : undefined) ??
        (t.region_id ? districtOfRegion.get(t.region_id) : undefined) ??
        t.district_id;
      // A city-scope row belongs to no rayon, so it appears in the day total but
      // in none of the rayon rows — exactly as the grids treat it today.
      if (!districtId) continue;
      bump(dayDistrictWorkers, `${date}|${districtId}`);

      const cellKey = `${date}|${districtId}|${t.shift_definition_id ?? 'none'}`;
      const users = cellUsers.get(cellKey) ?? new Map();
      const seen = users.get(t.user_id);
      // One person counts ONCE per cell. Where a worker mixes a team assignment
      // with an individual one in the same shift, the team wins — deterministic,
      // unlike "whichever row the database returned first".
      if (seen) {
        if (t.is_team) seen.isTeam = true;
      } else {
        users.set(t.user_id, { role: t.role, isTeam: !!t.is_team });
      }
      cellUsers.set(cellKey, users);
    }

    const cells: RangeSummaryCell[] = [];
    for (const [key, users] of cellUsers) {
      const [date, district_id, shift] = key.split('|');
      const roleCounts: Record<string, number> = {};
      let teams = 0;
      for (const { role, isTeam } of users.values()) {
        if (isTeam) teams += 1;
        else roleCounts[role] = (roleCounts[role] ?? 0) + 1;
      }
      cells.push({
        date,
        district_id,
        shift_definition_id: shift === 'none' ? null : shift,
        total: users.size,
        teams,
        roleCounts,
      });
    }

    return {
      from,
      to,
      days: [...dayWorkers.entries()].map(([date, set]) => ({ date, workers: set.size })),
      dayDistricts: [...dayDistrictWorkers.entries()].map(([key, set]) => {
        const [date, district_id] = key.split('|');
        return { date, district_id, workers: set.size };
      }),
      cells,
    };
  }

  /**
   * Per-day occupancy counts for a (potentially long) date range — the year
   * heatmap. Counts materialized roster rows plus projected event occurrences
   * beyond the horizon, deduped against a single tombstone query (unlike
   * findByDateRange, no per-event DB round-trip, no row hydration). Returns only
   * days with count > 0. `userId` self-scopes for workers.
   */
  async getDailyCounts(
    from: string,
    to: string,
    filters?: RangeFilters,
  ): Promise<Array<{ date: string; count: number }>> {
    const f: RangeFilters = filters ?? {};
    const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;

    // getRawMany returns `date` columns as JS Date; normalize to YYYY-MM-DD so
    // keys/sorting line up with the projection's string dates.
    const toDay = (v: unknown): string =>
      v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

    // Materialized rows (light select — no relations).
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .select(['ds.schedule_date', 'ds.user_id', 'ds.schedule_event_id'])
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL');
    if (districtId) qb.andWhere('ds.district_id = :districtId', { districtId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    // One place per row (ADR-053) — a plain column match, no junction.
    if (locationId) qb.andWhere('ds.location_id = :locationId', { locationId });
    const materialized = await qb.getRawMany<{
      ds_schedule_date: string;
      ds_user_id: string;
      ds_schedule_event_id: string | null;
    }>();

    // PEOPLE per day, not rows (ADR-053): a worker covering two lokasi on one
    // day holds two occurrences, and the year heatmap reads as headcount. The
    // set also makes the projection pass below idempotent per (user, date).
    const workersByDate = new Map<string, Set<string>>();
    const bump = (date: string, userId: string) => {
      const set = workersByDate.get(date);
      if (set) set.add(userId);
      else workersByDate.set(date, new Set([userId]));
    };
    for (const r of materialized) bump(toDay(r.ds_schedule_date), r.ds_user_id);

    // Every (event, user, date) key in the range, INCLUDING tombstones, so
    // projection never double-counts a materialized/deleted occurrence.
    const keyRows = await this.rosterRepo
      .createQueryBuilder('ds')
      .select(['ds.schedule_event_id', 'ds.user_id', 'ds.schedule_date'])
      .withDeleted()
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.schedule_event_id IS NOT NULL')
      .getRawMany<{
        ds_schedule_event_id: string;
        ds_user_id: string;
        ds_schedule_date: string;
      }>();
    const existingKey = new Set(
      keyRows.map((r) => `${r.ds_schedule_event_id}:${r.ds_user_id}:${toDay(r.ds_schedule_date)}`),
    );

    // Projection: expand active events across the range, adding only occurrences
    // not already represented by a materialized/tombstoned row.
    const events = await this.eventRepo.find({
      where: this.activeEventsOverlapping(from, to),
      relations: ['location', 'region', 'members'],
    });
    for (const event of events) {
      if (shiftDefinitionId && event.shift_definition_id !== shiftDefinitionId) continue;
      if (teamCategoryId && event.team_category_id !== teamCategoryId) continue;
      if (locationId && event.location_id !== locationId) continue;
      const eventRegionId =
        event.scope === 'mobile' ? event.region_id : (event.location?.region_id ?? null);
      if (regionId && eventRegionId !== regionId) continue;
      const eventDistrict =
        event.scope === 'static'
          ? event.location?.district_id
          : event.scope === 'mobile'
            ? event.region?.district_id
            : event.district_id;
      if (districtId && eventDistrict !== districtId) continue;

      let memberIds = event.is_team
        ? Array.from(
            new Set(
              [event.pic_user_id, ...(event.members?.map((m) => m.user_id) ?? [])].filter(
                (id): id is string => id != null,
              ),
            ),
          )
        : event.user_id
          ? [event.user_id]
          : [];
      if (userId) memberIds = memberIds.filter((id) => id === userId);
      if (memberIds.length === 0) continue;

      const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);
      for (const rawDate of dates) {
        // NONE-recurrence events push the entity's start_date (a Date) — normalize.
        const dateStr = toDay(rawDate);
        for (const memberId of memberIds) {
          if (existingKey.has(`${event.id}:${memberId}:${dateStr}`)) continue;
          bump(dateStr, memberId);
        }
      }
    }

    return Array.from(workersByDate.entries())
      .map(([date, workers]) => ({ date, count: workers.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async findOne(id: string): Promise<Schedule> {
    const row = await this.rosterRepo.findOne({
      where: { id },
      // `user` is loaded so the edit-permission hierarchy can read the target's role.
      relations: ['user', 'shift_definition', 'location'],
    });
    if (!row) throw new NotFoundException(`Daily schedule ${id} not found`);
    return row;
  }

  /** Mark a row as sick / annual leave. */
  async setLeave(
    id: string,
    leaveType: 'sick' | 'annual' | 'permit' | 'off',
    notes: string | undefined,
    actor: User,
  ): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const prevStatus = row.status;
    row.status = LEAVE_STATUS_BY_TYPE[leaveType];
    row.notes = notes ?? null;
    row.source = 'manual';
    row.updated_by = actorId;
    const saved = await this.rosterRepo.save(row);
    await this.audit(
      saved,
      'set_leave',
      actorId,
      { status: prevStatus },
      { status: saved.status, notes: saved.notes },
    );
    return this.findOne(saved.id);
  }

  /**
   * Replace the rostered worker for the day. The original row is marked
   * `replaced`; the covering worker's row for the same day is upserted to take
   * over the original's district/shift/areas, with `original_user_id` set.
   */
  async replaceWorker(
    id: string,
    replacementUserId: string,
    notes: string | undefined,
    actor: User,
  ): Promise<Schedule> {
    const actorId = actor.id;
    const original = await this.findOne(id);
    await this.assertCanEdit(actor, original);
    if (replacementUserId === original.user_id) {
      throw new BadRequestException('Replacement must be a different worker');
    }
    const replacement = await this.userRepo.findOne({ where: { id: replacementUserId } });
    if (!replacement) throw new NotFoundException('Replacement worker not found');
    // The stand-in must also be someone the editor is allowed to schedule.
    if (!canEditTargetRole(actor.role, replacement.role)) {
      throw new ForbiddenException('You cannot assign this replacement worker');
    }

    const locationIds = original.location_id ? [original.location_id] : [];

    // Mark the original as replaced.
    const prevStatus = original.status;
    original.status = ScheduleStatus.REPLACED;
    original.replacement_user_id = replacementUserId;
    original.notes = notes ?? original.notes;
    original.source = 'manual';
    original.updated_by = actorId;
    await this.rosterRepo.save(original);

    // Upsert the covering worker's row for the same day. If they already have
    // ANY committed row that day (their own shift — even a different one — or
    // leave) they can't cover; reject rather than silently overwriting.
    // `off`/`replaced` rows are free to take over. Checks every row of the day
    // since a worker may hold multiple shifts (ADR-047).
    const coverRows = await this.findAllByUserAndDate(replacementUserId, original.schedule_date);
    const busyRow = coverRows.find((r) => BUSY_STATUSES.includes(r.status));
    if (busyRow) {
      throw new BadRequestException(
        'Replacement worker already has a schedule or is on leave today',
      );
    }
    // Reuse the row keyed by the same shift when present (the (user, date,
    // shift) unique index), else any free shiftless row.
    const coverRow =
      coverRows.find((r) => r.shift_definition_id === original.shift_definition_id) ??
      coverRows.find((r) => r.shift_definition_id == null) ??
      null;
    const coverStatus = original.shift_definition_id ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
    let coverRowId: string;
    if (!coverRow) {
      // Brand-new entity — no eager/cascaded relations were ever loaded onto
      // it, so a plain save() is safe here.
      const saved = await this.rosterRepo.save(
        this.rosterRepo.create({
          user_id: replacementUserId,
          schedule_date: original.schedule_date,
          district_id: original.district_id,
          shift_definition_id: original.shift_definition_id,
          original_user_id: original.user_id,
          status: coverStatus,
          source: 'manual',
          created_by: actorId,
          updated_by: actorId,
        }),
      );
      coverRowId = saved.id;
    } else {
      // Raw column UPDATE, not `save(coverRow)` — findByUserAndDate() eager/
      // explicitly loads `shift_definition`/`district`/`location`, so
      // `coverRow` holds stale relation objects; saving the entity would let
      // TypeORM reconcile those FKs from the stale objects and revert them.
      coverRowId = coverRow.id;
      await this.rosterRepo.update(coverRowId, {
        district_id: original.district_id,
        shift_definition_id: original.shift_definition_id,
        original_user_id: original.user_id,
        status: coverStatus,
        source: 'manual',
        updated_by: actorId,
      });
    }
    await this.setPlace(coverRowId, locationIds[0] ?? null);

    await this.audit(
      original,
      'replace_worker',
      actorId,
      { status: prevStatus },
      { status: ScheduleStatus.REPLACED, replacement_user_id: replacementUserId },
    );
    return this.findOne(original.id);
  }

  /**
   * Set the day's PLACE — at most one lokasi, or one kawasan, plus the parent
   * rayon.
   *
   * ADR-053: one row = one worker, one shift, one place. A worker covering three
   * taman holds three occurrences, not one occurrence naming three lokasi.
   * `area_ids` stays an array for wire compatibility, but more than one id is now
   * a contradiction rather than something to silently truncate — it used to keep
   * `[0]` and drop the rest with a 200, so an operator's second and third picks
   * vanished without a word and the audit trail recorded ids the row never had.
   *
   * `district_id`/`region_id` omitted (undefined) leave those columns untouched;
   * passing null clears them.
   */
  async updateAreas(
    id: string,
    locationIds: string[],
    actor: User,
    districtId?: string | null,
    regionId?: string | null,
  ): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);

    if (locationIds.length > 1) {
      throw new BadRequestException(
        'A schedule row covers exactly one place (ADR-053). Create one row per lokasi instead of listing several.',
      );
    }

    // A lokasi and a kawasan on the same row name two different places, and only
    // the deeper one would ever be honoured: `schedulePlaceKey` (and the
    // `UQ_schedules_user_date_shift_place` index behind it) resolves lokasi first,
    // so the kawasan would linger as unreachable state that still matched the
    // board's `region_id` filter — the row would show up under both containers.
    const nextLocationId = locationIds[0] ?? null;
    const nextRegionId = regionId !== undefined ? regionId : (row.region_id ?? null);
    if (nextLocationId && nextRegionId) {
      throw new BadRequestException(
        'A schedule row is scoped to a lokasi OR a kawasan, not both (ADR-053).',
      );
    }

    const before = row.location_id ? [row.location_id] : [];
    // ONE raw column UPDATE, not `save(row)` — `row` holds relation objects loaded
    // by `findOne()` above, and entity save would reconcile FK columns back from
    // those stale objects, silently reverting what was just written.
    await this.rosterRepo.update(id, {
      location_id: nextLocationId,
      ...(districtId !== undefined ? { district_id: districtId } : {}),
      ...(regionId !== undefined ? { region_id: regionId } : {}),
      source: 'manual',
      updated_by: actorId,
    });
    await this.audit(row, 'update_areas', actorId, { area_ids: before }, { area_ids: locationIds });
    return this.findOne(id);
  }

  /** Set (or clear) the day's shift. */
  async updateShift(id: string, shiftDefinitionId: string | null, actor: User): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const before = row.shift_definition_id;
    // Re-derive status only for the default planned/off pair; leave/replaced stay.
    let status = row.status;
    if (status === ScheduleStatus.PLANNED || status === ScheduleStatus.OFF) {
      status = shiftDefinitionId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
    }
    // Raw column UPDATE, not `save(row)` — `shift_definition` is an `eager: true`
    // relation, so `row.shift_definition` is still the OLD shift object from
    // `findOne()`. TypeORM's entity save reconciles the FK column from that
    // stale relation object, silently reverting `shift_definition_id` back to
    // the old value (the bug: clearing the shift never actually persisted).
    await this.rosterRepo.update(id, {
      shift_definition_id: shiftDefinitionId,
      status,
      source: 'manual',
      updated_by: actorId,
    });
    await this.audit(
      row,
      'update_shift',
      actorId,
      { shift_definition_id: before },
      { shift_definition_id: shiftDefinitionId },
    );
    return this.findOne(id);
  }

  /**
   * Override today's roster for a worker (used by monitoring reassign): ensure a
   * row exists for the day, set its single area to `areaId`, and optionally its
   * district/shift. Replaces the legacy range-based `schedules` override layer.
   * Returns the affected roster row id.
   */
  async overrideForDay(
    userId: string,
    date: string,
    params: { locationId: string; districtId?: string | null; shiftDefinitionId?: string | null },
    actorId: string,
  ): Promise<string> {
    // NOTE: monitoring-reassign is authorized by its own guard; this path
    // deliberately uses the internal primitives (not the hierarchy-gated
    // updateShift/updateAreas) so the roster edit-hierarchy isn't applied here.
    let row = await this.findByUserAndDate(userId, date);
    if (!row) {
      const shiftId = params.shiftDefinitionId ?? null;
      row = await this.rosterRepo.save(
        this.rosterRepo.create({
          user_id: userId,
          schedule_date: date,
          district_id: params.districtId ?? null,
          shift_definition_id: shiftId,
          // Mirror generateRoster: a row with no shift is OFF, not PLANNED.
          status: shiftId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF,
          source: 'manual',
          created_by: actorId,
        }),
      );
    } else if (params.shiftDefinitionId !== undefined) {
      // Raw column UPDATE, not `save(row)` — same stale-eager-relation pitfall
      // as updateShift() above (`shift_definition` would otherwise win over our
      // manually-set FK column on save).
      let status = row.status;
      if (status === ScheduleStatus.PLANNED || status === ScheduleStatus.OFF) {
        status = params.shiftDefinitionId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
      }
      await this.rosterRepo.update(row.id, {
        shift_definition_id: params.shiftDefinitionId,
        status,
        source: 'manual',
        updated_by: actorId,
      });
    }
    await this.setPlace(row.id, params.locationId);
    return row.id;
  }

  /** Soft-delete a roster row (admin). */
  async remove(id: string, actorId: string): Promise<void> {
    // A PROJECTED occurrence has no row to delete — its id is
    // `projected:<eventId>:<userId>:<date>`. "Hanya hari ini" on one used to hit
    // `DELETE /schedules/projected:…` and fail, so the chip could not be removed
    // at all. Write the tombstone the materializer already understands (a
    // soft-deleted row for that event/user/date) so the day is skipped forever
    // without touching the rest of the recurrence.
    if (id.startsWith('projected:')) {
      return this.tombstoneProjected(id, actorId);
    }
    const row = await this.findOne(id);
    row.deleted_by = actorId;
    await this.rosterRepo.save(row);
    await this.rosterRepo.softDelete(id);
  }

  /**
   * Materialize a tombstone for a single projected occurrence, so that day is
   * dropped from the recurrence while every other date keeps projecting.
   * The unique index on (user, date, shift) is partial (`WHERE deleted_at IS
   * NULL`), so a tombstone never collides with a live row.
   */
  private async tombstoneProjected(id: string, actorId: string): Promise<void> {
    const [, eventId, userId, date] = id.split(':');
    if (!eventId || !userId || !date) {
      throw new BadRequestException('Malformed projected occurrence id');
    }
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Schedule event not found');

    const existing = await this.rosterRepo.findOne({
      where: { schedule_event_id: eventId, user_id: userId, schedule_date: date },
      withDeleted: true,
    });
    if (existing) {
      // Already materialized (or already tombstoned) — fall back to the normal path.
      if (!existing.deleted_at) await this.remove(existing.id, actorId);
      return;
    }

    const row = await this.rosterRepo.save(
      this.rosterRepo.create({
        user_id: userId,
        schedule_date: date,
        shift_definition_id: event.shift_definition_id,
        district_id: event.district_id ?? null,
        region_id: event.scope === 'mobile' ? (event.region_id ?? null) : null,
        team_category_id: event.is_team ? (event.team_category_id ?? null) : null,
        status: ScheduleStatus.PLANNED,
        source: 'event',
        schedule_event_id: eventId,
        created_by: actorId,
        deleted_by: actorId,
      }),
    );
    await this.rosterRepo.softDelete(row.id);
  }

  // ---- Read helpers for clock-in ----

  /** Today's rostered areas for a worker (empty when no roster row / no areas). */
  async getActiveAreasForDay(userId: string, date: string): Promise<Location[]> {
    return this.areasOf(await this.findByUserAndDate(userId, date));
  }

  /**
   * Areas for the roster row operative RIGHT NOW — includes a cross-midnight
   * shift still running from yesterday, which the plain per-day lookup misses.
   */
  async getActiveAreasNow(userId: string): Promise<Location[]> {
    return this.areasOf(await this.findCurrentForUser(userId));
  }

  private async areasOf(row: Schedule | null): Promise<Location[]> {
    if (!row) return [];

    const byId = new Map<string, Location>();
    if (row.location) byId.set(row.location.id, row.location);

    // A KAWASAN-scoped occurrence names no lokasi, so the geofence had nothing to
    // check and the worker read as "no area" — even though the assignment covers
    // every lokasi in that kawasan. Expand each assigned kawasan (the junction,
    // falling back to the single `region_id`) into its active lokasi.
    const regionIds = row.region_id ? [row.region_id] : [];
    if (regionIds.length > 0) {
      const inRegions = await this.locationRepo.find({
        where: { region_id: In(regionIds), is_active: true },
      });
      for (const area of inRegions) byId.set(area.id, area);
    }

    return [...byId.values()];
  }

  /** Today's rostered shift for a worker, or null. */
  async getShiftForDay(userId: string, date: string) {
    const row = await this.findByUserAndDate(userId, date);
    return row?.shift_definition ?? null;
  }

  /**
   * The worker's shifts that a clock-in RIGHT NOW could be attributed to
   * (ADR-055). Yesterday + today rostered rows the worker is expected to work
   * (PLANNED / PRESENT), mapped to attribution candidates carrying each shift's
   * window. Yesterday is included so a post-midnight clock-in can attribute to a
   * crossing shift's tail; the `ShiftAttributionService` picks which one by the
   * early_window / cutoff_grace windows. Deduped per (service_day, shift).
   */
  async getAttributionCandidates(userId: string): Promise<AttributionCandidate[]> {
    const today = TimezoneUtil.jakartaDateString();
    const yesterday = this.addDaysToDate(today, -1);
    const rows = [
      ...(await this.findAllByUserAndDate(userId, yesterday)),
      ...(await this.findAllByUserAndDate(userId, today)),
    ];

    const candidates: AttributionCandidate[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const sd = r.shift_definition;
      if (!sd) continue;
      if (r.status !== ScheduleStatus.PLANNED && r.status !== ScheduleStatus.PRESENT) continue;
      const key = `${r.schedule_date}:${sd.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        shift_definition_id: sd.id,
        service_day: r.schedule_date,
        start_time: sd.start_time,
        end_time: sd.end_time,
        crosses_midnight: sd.crosses_midnight,
        early_window_min: sd.early_window_min ?? 60,
        cutoff_grace_min: sd.cutoff_grace_min ?? 60,
        shift_name: sd.name,
      });
    }
    return candidates;
  }

  /**
   * Rows expected to work on a day (real shift, not on leave / off / replaced).
   * Used by monitoring to compute the present/absent denominator.
   */
  async getExpectedForDate(date: string): Promise<Schedule[]> {
    return this.rosterRepo.find({
      where: {
        schedule_date: date,
        deleted_at: IsNull(),
        status: In([ScheduleStatus.PLANNED, ScheduleStatus.PRESENT]),
      },
      relations: ['shift_definition'],
    });
  }

  /**
   * All live roster rows for a day (any status), optionally district-scoped. The
   * monitoring service derives expected / present / absent / on-leave from this
   * (single query) without a new tracking column. `user` is eager-loaded.
   */
  async getRosterForMonitoring(date: string, districtId?: string | null): Promise<Schedule[]> {
    return this.rosterRepo.find({
      where: {
        schedule_date: date,
        deleted_at: IsNull(),
        ...(districtId ? { district_id: districtId } : {}),
      },
      // `user` is eager on the entity; list it explicitly so the monitoring
      // absent_users mapping (full_name/role) never depends on that subtlety.
      relations: ['user', 'shift_definition'],
    });
  }

  /**
   * Team membership lookup for live (clocked-in) workers on a date.
   * Returns a Map of user_id → { team_id, team_name, team_color } where:
   * - team_id = schedule_event_id ?? team_category_id (ADR-048 grouping key)
   * - team_name = team_category.name
   * - team_color = team_category.marker_color ?? null
   *
   * Single batch query (no N+1): schedules where user_id IN (...) AND
   * schedule_date = date AND deleted_at IS NULL AND team_category_id IS NOT NULL,
   * left-joining team_category for name + marker_color.
   *
   * If a user has multiple team schedules on the same day, the first one wins.
   * Empty userIds returns an empty Map.
   */
  async getTeamMembership(
    userIds: string[],
    date: string,
  ): Promise<
    Map<
      string,
      {
        team_id: string;
        team_name: string;
        team_color: string | null;
        /** Alpha for `team_color`, 0–1; null → opaque. */
        team_opacity: number | null;
        team_icon: string | null;
      }
    >
  > {
    const map = new Map<
      string,
      {
        team_id: string;
        team_name: string;
        team_color: string | null;
        /** Alpha for `team_color`, 0–1; null → opaque. */
        team_opacity: number | null;
        team_icon: string | null;
      }
    >();
    if (userIds.length === 0) return map;

    const rows = await this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.team_category', 'tc')
      .where('ds.user_id IN (:...userIds)', { userIds })
      .andWhere('ds.schedule_date = :date', { date })
      .andWhere('ds.deleted_at IS NULL')
      .andWhere('ds.team_category_id IS NOT NULL')
      // Only a live team assignment counts — a worker who is off/replaced/on-leave
      // for a team schedule isn't on that team's bubble today.
      .andWhere('ds.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .orderBy('ds.created_at', 'ASC')
      .getMany();

    for (const row of rows) {
      if (!row.user_id || map.has(row.user_id)) continue;
      if (!row.team_category) continue;

      const teamId = row.schedule_event_id ?? row.team_category_id;
      if (!teamId) continue;

      map.set(row.user_id, {
        team_id: teamId,
        team_name: row.team_category.name,
        team_color: row.team_category.marker_color ?? null,
        team_opacity: row.team_category.marker_opacity ?? null,
        team_icon: row.team_category.marker_icon ?? null,
      });
    }

    return map;
  }

  // ---- internals ----

  /** Reconcile a row's area set to exactly `locationIds`. */
  /**
   * Set the occurrence's lokasi. ONE place per row (ADR-053) — callers that want
   * wider coverage create another schedule, so this takes a single id (or null)
   * rather than an array it would have to silently truncate.
   */
  private async setPlace(rosterId: string, locationId: string | null): Promise<void> {
    await this.rosterRepo.update(rosterId, { location_id: locationId });
  }

  private async audit(
    row: Schedule,
    action: string,
    actorId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogService
      .log({
        entity_type: 'schedule',
        entity_id: row.id,
        action,
        actor_id: actorId,
        old_value: oldValue,
        new_value: newValue,
        metadata: { date: row.schedule_date, user_id: row.user_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }
}
