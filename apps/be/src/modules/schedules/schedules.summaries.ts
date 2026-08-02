import type { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleRecurrenceUtil } from './utils/schedule-recurrence.util';
import { Location } from '../locations/entities/location.entity';
import {
  toDayString,
  type DaySummary,
  type DaySummaryGroup,
  type DaySummaryWorkers,
  type RangeFilters,
  type RangeSummary,
  type RangeSummaryCell,
  type SummaryTuple,
} from './schedules.support';

/**
 * What the aggregates need from `SchedulesService`.
 *
 * Passed in rather than injected: these are the SAME repositories and the SAME
 * projection the roster read uses, and a card's headcount must never be able to
 * disagree with the rows it opens to (ADR-057). Handing them over keeps one
 * source of both.
 */
export interface SummaryDeps {
  rosterRepo: Repository<Schedule>;
  locationRepo: Repository<Location>;
  eventRepo: Repository<ScheduleEvent>;
  activeEventsOverlapping(from: string, to: string): FindOptionsWhere<ScheduleEvent>[];
  applyRangeFilters(qb: SelectQueryBuilder<Schedule>, f: RangeFilters): void;
  projectOccurrences(
    from: string,
    to: string,
    f: RangeFilters,
    materializedKey: Set<string>,
  ): Promise<Schedule[]>;
}

/**
 * The day board's and the week/month grids' numbers.
 *
 * Split out of `schedules.service.ts` (ADR-057): ~440 lines of tallying that
 * reads only through `SummaryDeps`, so it is testable on its own and the
 * service keeps the API the controller calls.
 */
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
export async function computeDaySummary(
  svc: SummaryDeps,
  date: string,
  filters?: RangeFilters,
): Promise<DaySummary> {
  const f = filters ?? {};

  // Slim TUPLES, not entities: one row per occurrence with only the six fields
  // a tally needs. 3.4k of these is nothing to hold; 3.4k hydrated Schedules
  // with their relations is the 3.9 MB this endpoint exists to avoid.
  const qb = svc.rosterRepo
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
    .andWhere('ds.deleted_at IS NULL')
    // A row with NO shift is a day-off marker, not an assignment. The board
    // cannot render one — `groupByShift` buckets by the known shift ids, so
    // such a row was always dropped from the tree — and the pre-summary
    // headcount was therefore the union of SHIFTED rows only. Counting them
    // here made every card claim people who are off today (measured on the
    // 2026-08-01 clone: 1 087 vs the 1 023 actually on shift).
    .andWhere('ds.shift_definition_id IS NOT NULL');
  svc.applyRangeFilters(qb, f);
  const materialized = await qb.getRawMany<SummaryTuple>();

  // A kawasan owns its own mobile rows AND every row at a lokasi inside it,
  // but a static row carries no `region_id` — only the lokasi knows its
  // kawasan. Resolved from one small lookup rather than a join, because the
  // PROJECTED rows need the same answer and their `location` has been slimmed
  // to id+name by then (`slimProjectedRelations`), which silently zeroed every
  // kawasan headcount on a projected day.
  // The RAYON needs the same treatment, and for the same reason: 276 of one
  // day's rows on the clone carry a lokasi but no `district_id`. Reading the
  // rayon off the row alone left those people out of its headcount while the
  // board still listed them under that rayon's lokasi — the card contradicted
  // its own children, and the figure disagreed with `getRangeSummary`, which
  // has always resolved through the place (1 023 vs 1 026 on 2026-08-01).
  const [locationRows, regionRows] = await Promise.all([
    svc.locationRepo.find({ select: ['id', 'region_id', 'district_id'] }),
    svc.rosterRepo.manager.query(
      `SELECT id, district_id FROM regions WHERE deleted_at IS NULL`,
    ) as Promise<Array<{ id: string; district_id: string | null }>>,
  ]);
  const regionOfLocation = new Map(locationRows.map((l) => [l.id, l.region_id ?? null]));
  const districtOfLocation = new Map(locationRows.map((l) => [l.id, l.district_id ?? null]));
  const districtOfRegion = new Map(regionRows.map((r) => [r.id, r.district_id ?? null]));

  // Beyond the materialization horizon a day has NO rows, only occurrences an
  // event will produce. Counting materialized rows alone reported 0 petugas
  // for a day the board could still open and list 1 009 people in.
  const materializedKey = new Set(
    materialized
      .filter((r) => r.schedule_event_id)
      .map((r) => `${r.schedule_event_id}:${r.user_id}:${date}`),
  );
  const projected = await svc.projectOccurrences(date, date, f, materializedKey);

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
    // Same resolution order as `getRangeSummary`, so a rayon's day figure and
    // its week/month cell can never disagree.
    add(
      districtWorkers,
      (t.location_id ? districtOfLocation.get(t.location_id) : undefined) ??
        (t.region_id ? districtOfRegion.get(t.region_id) : undefined) ??
        t.district_id,
      t.user_id,
    );
    add(locationWorkers, t.location_id, t.user_id);
    add(regionWorkers, t.region_id ?? regionOfLocation.get(t.location_id ?? '') ?? null, t.user_id);
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
export async function computeRangeSummary(
  svc: SummaryDeps,
  from: string,
  to: string,
  filters?: RangeFilters,
): Promise<RangeSummary> {
  const f = filters ?? {};

  const qb = svc.rosterRepo
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
    .andWhere('ds.deleted_at IS NULL')
    // Day-off markers carry no shift and render nowhere — same rule as
    // `getDaySummary`, or a week cell would disagree with the day it opens.
    .andWhere('ds.shift_definition_id IS NOT NULL');
  svc.applyRangeFilters(qb, f);
  const materialized = await qb.getRawMany<SummaryTuple>();

  // Beyond the materialization horizon a range holds no rows, only the
  // occurrences events will produce — the same trap `getDaySummary` fell into.
  const materializedKey = new Set(
    materialized
      .filter((r) => r.schedule_event_id)
      .map((r) => `${r.schedule_event_id}:${r.user_id}:${toDayString(r.schedule_date)}`),
  );
  const projected = await svc.projectOccurrences(from, to, f, materializedKey);

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
    svc.locationRepo.find({ select: ['id', 'district_id', 'region_id'] }),
    // No `regions` repository is injected here, and adding one for two columns
    // is more coupling than the lookup is worth.
    svc.rosterRepo.manager.query(
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
export async function computeDailyCounts(
  svc: SummaryDeps,
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
  const qb = svc.rosterRepo
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
  const keyRows = await svc.rosterRepo
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
  const events = await svc.eventRepo.find({
    where: svc.activeEventsOverlapping(from, to),
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
