import type { Repository } from 'typeorm';
import { In, IsNull, Not } from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { Location } from '../locations/entities/location.entity';
import type { AttributionCandidate } from '../shifts/services/shift-attribution.service';
import { TimezoneUtil } from '../../common/utils/timezone.util';

/** What the per-worker lookups need from `SchedulesService`. */
export interface LookupDeps {
  rosterRepo: Repository<Schedule>;
  locationRepo: Repository<Location>;
  addDaysToDate(dateStr: string, days: number): string;
  findByUserAndDate(userId: string, date: string): Promise<Schedule | null>;
  findAllByUserAndDate(userId: string, date: string): Promise<Schedule[]>;
  findCurrentForUser(userId: string): Promise<Schedule | null>;
}

/**
 * Per-worker reads: where someone is working, on which shift, and which
 * schedules a clock-in could be attributed to. Consumed by the shifts and
 * monitoring modules. Split out of `schedules.service.ts`.
 */
/** Today's rostered areas for a worker (empty when no roster row / no areas). */
export async function getActiveAreasForDay(
  svc: LookupDeps,
  userId: string,
  date: string,
): Promise<Location[]> {
  return areasOf(svc, await svc.findByUserAndDate(userId, date));
}

/**
 * Areas for the roster row operative RIGHT NOW — includes a cross-midnight
 * shift still running from yesterday, which the plain per-day lookup misses.
 */
export async function getActiveAreasNow(svc: LookupDeps, userId: string): Promise<Location[]> {
  return areasOf(svc, await svc.findCurrentForUser(userId));
}

export async function areasOf(svc: LookupDeps, row: Schedule | null): Promise<Location[]> {
  if (!row) return [];

  const byId = new Map<string, Location>();
  if (row.location) byId.set(row.location.id, row.location);

  // A KAWASAN-scoped occurrence names no lokasi, so the geofence had nothing to
  // check and the worker read as "no area" — even though the assignment covers
  // every lokasi in that kawasan. Expand each assigned kawasan (the junction,
  // falling back to the single `region_id`) into its active lokasi.
  const regionIds = row.region_id ? [row.region_id] : [];
  if (regionIds.length > 0) {
    const inRegions = await svc.locationRepo.find({
      where: { region_id: In(regionIds), is_active: true },
    });
    for (const area of inRegions) byId.set(area.id, area);
  }

  return [...byId.values()];
}

/** Today's rostered shift for a worker, or null. */
export async function getShiftForDay(svc: LookupDeps, userId: string, date: string) {
  const row = await svc.findByUserAndDate(userId, date);
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
export async function getAttributionCandidates(
  svc: LookupDeps,
  userId: string,
): Promise<AttributionCandidate[]> {
  const today = TimezoneUtil.jakartaDateString();
  const yesterday = svc.addDaysToDate(today, -1);
  const rows = [
    ...(await svc.findAllByUserAndDate(userId, yesterday)),
    ...(await svc.findAllByUserAndDate(userId, today)),
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
export async function getExpectedForDate(svc: LookupDeps, date: string): Promise<Schedule[]> {
  return svc.rosterRepo.find({
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
export async function getRosterForMonitoring(
  svc: LookupDeps,
  date: string,
  districtId?: string | null,
): Promise<Schedule[]> {
  return svc.rosterRepo.find({
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
export async function getTeamMembership(
  svc: LookupDeps,
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

  const rows = await svc.rosterRepo
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
