import { UserRole } from '../users/entities/user.entity';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { TimezoneUtil } from '../../common/utils/timezone.util';

/**
 * The vocabulary of the schedules module: the status maps, the DTO shapes the
 * roster and its summaries answer in, and the pure helpers that resolve a row's
 * place or a shift's window.
 *
 * Split out of `schedules.service.ts`, which had grown past 2,800 lines with
 * ~380 of them being declarations rather than behaviour. Everything here is
 * re-exported by the service so existing imports keep working.
 */
/**
 * Absence (Ketidakhadiran) type → roster status. `izin` (permit) is an excused
 * absence like sick/annual; `libur` reuses OFF (a deliberate day off, not counted
 * as expected/absent). Keep in sync with the monitoring on-leave filter.
 */
export const LEAVE_STATUS_BY_TYPE: Record<'sick' | 'annual' | 'permit' | 'off', ScheduleStatus> = {
  sick: ScheduleStatus.LEAVE_SICK,
  annual: ScheduleStatus.LEAVE_ANNUAL,
  permit: ScheduleStatus.LEAVE_PERMIT,
  off: ScheduleStatus.OFF,
};

export const DAY_MS = 24 * 60 * 60 * 1000;

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
export const BUSY_STATUSES = [
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
export const FREED_STATUSES: ScheduleStatus[] = [ScheduleStatus.REPLACED];

export const EXCUSED_STATUSES: ScheduleStatus[] = [
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
export const NIL_PLACE_ID = '00000000-0000-0000-0000-000000000000';

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
export function toDayString(value: unknown): string {
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
export interface SummaryTuple {
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
export const EVENT_PROJECTION_SELECT = {
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

export function slimProjectedRelations(row: Schedule): Schedule {
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
