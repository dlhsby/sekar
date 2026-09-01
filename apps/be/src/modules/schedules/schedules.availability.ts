import type { Repository } from 'typeorm';
import { Between, In, IsNull, LessThan, LessThanOrEqual, Not } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import { isNonRosteredRole } from './schedule-edit.policy';
import {
  BUSY_STATUSES,
  DEFAULT_SWEEP_LOOKBACK_DAYS,
  EXCUSED_STATUSES,
  FREED_STATUSES,
  SCHEDULABLE_WORKER_ROLES,
  isShiftWindowClosed,
  type RangeFilters,
  type UnavailableWorkerDto,
  type UnscheduledResult,
  type UnscheduledWorkerDto,
} from './schedules.support';

/** What the availability reads need from `SchedulesService`. */
export interface AvailabilityDeps {
  rosterRepo: Repository<Schedule>;
  userRepo: Repository<User>;
  shiftRepo: Repository<Shift>;
  logger: Logger;
  configService?: { getNumber(key: string, fallback?: number): number };
  findByDateRange(from: string, to: string, filters?: RangeFilters): Promise<Schedule[]>;
}

/**
 * Who is NOT on the roster, and who stopped being expected on it.
 *
 * `findUnscheduled` answers the gap panel — the clockable workforce minus
 * whoever the day already covers — and `sweepAbsences` (ADR-056) closes out
 * `planned` rows whose clock-in window has passed. Split out of
 * `schedules.service.ts`; both read only through `AvailabilityDeps`.
 */
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
export async function sweepAbsences(
  svc: AvailabilityDeps,
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
    svc.configService?.getNumber(
      'schedule.absence_sweep_lookback_days',
      DEFAULT_SWEEP_LOOKBACK_DAYS,
    ) ??
    DEFAULT_SWEEP_LOOKBACK_DAYS;
  const fromStr =
    lookback > 0
      ? TimezoneUtil.jakartaDateString(new Date(now.getTime() - lookback * 24 * 60 * 60 * 1000))
      : null;

  const candidates = await svc.rosterRepo.find({
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
  const sessions = await svc.shiftRepo.find({
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
    await svc.rosterRepo.update(
      { id: In(absentIds), status: ScheduleStatus.PLANNED },
      { status: ScheduleStatus.ABSENT },
    );
  }
  if (presentIds.length > 0) {
    await svc.rosterRepo.update(
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
/** The gap panel's criteria. `visibleDistrictId` is the CALLER's scope, not the slot's. */
export interface UnscheduledFilters {
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
}

export async function findUnscheduled(
  svc: AvailabilityDeps,
  date: string,
  filters: UnscheduledFilters = {},
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
  const userQb = svc.userRepo
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
    if (r.u_district_id && r.district_name) districtNameById.set(r.u_district_id, r.district_name);
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
  const occurrences = await svc.findByDateRange(date, date);

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
