/**
 * Day-board grouping (Jadwal redesign P1). Turns a flat list of schedule
 * occurrences for one day into the Rayon → Kawasan → Lokasi coverage tree the
 * board renders, with each container split by shift and by role. Pure — no React,
 * fully unit-testable.
 */
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';
import type { StaffingLevel } from '@/types/models';

export interface BoardShiftDef {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

/** A team (regu) assignment collapsed to one entry in the Tim column. */
export interface BoardTeam {
  eventId: string;
  name: string;
  markerColor: string | null;
  count: number;
  /**
   * The member occurrences this entry collapses, so the Tim row can open the
   * detail modal like an individual row does (any member resolves the same team
   * event via `schedule_event_id`). Members stay OUT of `byRole` — a team is a
   * combination of roles and can't be filed under one — but they still count
   * toward staffing (see `countable`).
   */
  occurrences: ScheduleOccurrence[];
}

/** One shift's roster inside a container, grouped by role + teams. */
export interface BoardShiftGroup {
  shift: BoardShiftDef;
  /** role code → individual (non-team) occurrences for this shift */
  byRole: Record<string, ScheduleOccurrence[]>;
  teams: BoardTeam[];
  /**
   * role code → headcount INCLUDING team members, for staffing only.
   * `byRole` deliberately holds individuals alone (a team is a combination of
   * roles and is displayed as one Tim entry), but a team's members are real
   * satgas/linmas on the ground — so the targets must count them. Keep the two
   * apart: `byRole` is what a column LISTS, this is what it COUNTS.
   */
  countableByRole: Record<string, number>;
  /** counted subjects (satgas + linmas, teams included) for understaffing */
  countable: number;
  /** total occurrences across all roles + teams */
  total: number;
  /**
   * Distinct worker ids in this group. ADR-053 lets one worker hold several
   * occurrences in a day (different places), so occurrence counts and PEOPLE
   * counts diverge the moment you roll them up: a satgas at two lokasi in one
   * kawasan would be "2 petugas". Every headline count dedupes through this.
   */
  userIds: string[];
}

export interface BoardLocation {
  id: string;
  name: string;
  shifts: BoardShiftGroup[];
  total: number;  /** Distinct workers in this node's subtree — what "N petugas" shows. */
  workerIds: string[];
}
export interface BoardRegion {
  id: string;
  name: string;
  /** mobile-in-kawasan assignments (region-scoped, no location) */
  assignment: BoardShiftGroup[];
  locations: BoardLocation[];
  total: number;  /** Distinct workers in this node's subtree — what "N petugas" shows. */
  workerIds: string[];
}
export interface BoardDistrict {
  id: string;
  name: string;
  regions: BoardRegion[];
  /** locations under this district with no region parent */
  looseLocations: BoardLocation[];
  /** district-wide (district-scope) assignments with no location/region */
  assignment: BoardShiftGroup[];
  total: number;
  /** Distinct workers in this district's subtree — what "N petugas" shows. */
  workerIds: string[];
  /**
   * Tier this district's staffing requirements attach to — decides which single
   * level may edit capacity (district / kawasan / lokasi, never several).
   * Real districts always carry a concrete value (falling back to the entity's
   * `region` column default). Left undefined ONLY on the synthetic city node,
   * which has no district record and therefore no capacity to edit.
   */
  staffing_level?: StaffingLevel;
}

export interface BoardMasterData {
  /**
   * `staffing_level` decides which tier may edit capacity. It must be carried
   * here — the board can't gate the capacity control without it.
   */
  districts: Array<{ id: string; name: string; staffing_level?: StaffingLevel }>;
  regions: Array<{ id: string; name: string; district_id: string }>;
  locations: Array<{ id: string; name: string; district_id: string; region_id?: string | null }>;
  shifts: BoardShiftDef[];
}

/** Only these roles count toward staffing/understaffing (ADR requirement). */
export const COUNTABLE_ROLES = ['satgas', 'linmas'];

/** Sentinel district id for the city-wide ("Seluruh Surabaya") board node — its
 * label is localized in the component (this lib stays string-free). */
export const CITY_NODE_ID = '__city__';

const isTeam = (o: ScheduleOccurrence): boolean => o.team_category != null;

/** Split a container's occurrences into per-shift role/team groups. */
function groupByShift(occs: ScheduleOccurrence[], shifts: BoardShiftDef[]): BoardShiftGroup[] {
  return shifts.map((shift) => {
    const shiftOccs = occs.filter((o) => o.shift_definition_id === shift.id);
    const byRole: Record<string, ScheduleOccurrence[]> = {};
    const teamMap = new Map<string, BoardTeam>();

    for (const o of shiftOccs) {
      if (isTeam(o)) {
        const key = o.schedule_event_id ?? o.team_category!.id;
        const existing = teamMap.get(key);
        if (existing) {
          existing.count += 1;
          existing.occurrences.push(o);
        } else {
          teamMap.set(key, {
            eventId: key,
            name: o.team_category!.name,
            markerColor: o.team_category!.marker_color ?? null,
            count: 1,
            occurrences: [o],
          });
        }
      } else {
        const role = o.user.role as string;
        (byRole[role] ??= []).push(o);
      }
    }

    // Stable, human-friendly order: workers alphabetical within each role.
    for (const role of Object.keys(byRole)) {
      byRole[role].sort((a, b) =>
        (a.user.full_name ?? '').localeCompare(b.user.full_name ?? '', undefined, { numeric: true })
      );
    }

    // A team fans out to one occurrence PER MEMBER, each carrying that member's
    // real role — so a team of 5 satgas IS 5 satgas on the ground and must count
    // toward the target exactly like individuals. Excluding them left a kawasan
    // reading 0/10 with ten people standing in it.
    const countableOccs = shiftOccs.filter((o) => COUNTABLE_ROLES.includes(o.user.role as string));
    const countableByRole: Record<string, number> = {};
    for (const o of countableOccs) {
      const role = o.user.role as string;
      countableByRole[role] = (countableByRole[role] ?? 0) + 1;
    }

    return {
      shift,
      byRole,
      teams: Array.from(teamMap.values()),
      countableByRole,
      countable: countableOccs.length,
      total: shiftOccs.length,
      userIds: [...new Set(shiftOccs.map((o) => o.user_id))],
    };
  });
}

const sumTotal = (groups: BoardShiftGroup[]): number => groups.reduce((acc, g) => acc + g.total, 0);

/** Distinct worker ids across shift groups — the input to every "N petugas" count. */
export const workersOf = (...groups: BoardShiftGroup[][]): string[] => [
  ...new Set(groups.flat().flatMap((g) => g.userIds)),
];

/** Union of worker ids across already-computed node lists. */
export const unionWorkers = (...lists: string[][]): string[] => [...new Set(lists.flat())];

/**
 * Build the day board tree. Occurrences are placed by their container:
 * `location_id` → that location; else `region_id` → that kawasan's mobile
 * assignment; else `district_id` → that district's district-wide assignment. Empty
 * locations/regions still render so operators can assign into them.
 */
export function buildDayBoard(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData
): BoardDistrict[] {
  const { districts, regions, locations, shifts } = master;

  // Occurrences bucketed by container id (location, region, or district); those
  // with no binding at all are city-wide (Seluruh Surabaya).
  const byLocation = new Map<string, ScheduleOccurrence[]>();
  const byRegionMobile = new Map<string, ScheduleOccurrence[]>();
  const byDistrictMobile = new Map<string, ScheduleOccurrence[]>();
  const cityOccs: ScheduleOccurrence[] = [];
  for (const o of occurrences) {
    if (o.location_id) {
      (byLocation.get(o.location_id) ?? byLocation.set(o.location_id, []).get(o.location_id)!).push(
        o
      );
    } else if (o.region_id) {
      (
        byRegionMobile.get(o.region_id) ?? byRegionMobile.set(o.region_id, []).get(o.region_id)!
      ).push(o);
    } else if (o.district_id) {
      (byDistrictMobile.get(o.district_id) ?? byDistrictMobile.set(o.district_id, []).get(o.district_id)!).push(o);
    } else {
      cityOccs.push(o);
    }
  }

  const buildLocation = (loc: BoardMasterData['locations'][number]): BoardLocation => {
    const shiftGroups = groupByShift(byLocation.get(loc.id) ?? [], shifts);
    return {
      id: loc.id,
      name: loc.name,
      shifts: shiftGroups,
      total: sumTotal(shiftGroups),
      workerIds: workersOf(shiftGroups),
    };
  };

  // City-wide ("Seluruh Surabaya") node, always first — a assignment-only district
  // with the sentinel id; the component localizes its label.
  //
  // It used to render only once city occurrences existed, which made it
  // unreachable: a city-scope schedule had nowhere to be assigned FROM, so the
  // node never appeared, so you could never assign one. Same chicken-and-egg the
  // district/kawasan assign tables had. It is now always present, like every other
  // empty container on the board.
  const cityPlacement = groupByShift(cityOccs, shifts);
  // `total` stays this node's OWN occupancy (city-scope assignments only).
  // The nested layout shows Surabaya's headline count as the whole city, but that
  // roll-up is computed in the component: pruneDayBoard treats total===0 as empty,
  // so folding the districts in here would make the city node un-prunable.
  const cityNode: BoardDistrict[] = [
    {
      id: CITY_NODE_ID,
      name: '',
      regions: [],
      looseLocations: [],
      assignment: cityPlacement,
      total: sumTotal(cityPlacement),
      workerIds: workersOf(cityPlacement),
      // No staffing_level: the city node is a sentinel, not a district — there is
      // nothing to attach a capacity to.
    },
  ];

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true });

  const districtNodes = districts.map((district) => {
    const districtRegions = regions.filter((r) => r.district_id === district.id).sort(byName);
    const districtLocations = locations.filter((l) => l.district_id === district.id).sort(byName);

    const regionNodes: BoardRegion[] = districtRegions.map((region) => {
      const assignment = groupByShift(byRegionMobile.get(region.id) ?? [], shifts);
      const regionLocations = districtLocations
        .filter((l) => l.region_id === region.id)
        .map(buildLocation);
      const total = sumTotal(assignment) + regionLocations.reduce((acc, l) => acc + l.total, 0);
      return {
        id: region.id,
        name: region.name,
        assignment,
        locations: regionLocations,
        total,
        // Union, not sum: one worker covering two lokasi in this kawasan is one
        // person (ADR-053).
        workerIds: unionWorkers(workersOf(assignment), ...regionLocations.map((l) => l.workerIds)),
      };
    });

    const looseLocations = districtLocations.filter((l) => !l.region_id).map(buildLocation);
    const assignment = groupByShift(byDistrictMobile.get(district.id) ?? [], shifts);

    const total =
      regionNodes.reduce((acc, r) => acc + r.total, 0) +
      looseLocations.reduce((acc, l) => acc + l.total, 0) +
      sumTotal(assignment);

    return {
      id: district.id,
      name: district.name,
      regions: regionNodes,
      looseLocations,
      assignment,
      total,
      workerIds: unionWorkers(
        workersOf(assignment),
        ...regionNodes.map((r) => r.workerIds),
        ...looseLocations.map((l) => l.workerIds),
      ),
      // Mirror the entity's column default so a district whose level the API
      // omitted still resolves to exactly one editable tier (kawasan) rather
      // than none.
      staffing_level: district.staffing_level ?? 'region',
    };
  });

  return [...cityNode, ...districtNodes];
}

/**
 * The active search criteria, as far as the board cares. Mirrors the geography +
 * subject halves of `ScheduleRangeFilters` (which is what the range query sends).
 */
export interface BoardFilters {
  districtId?: string;
  regionId?: string;
  locationId?: string;
  userId?: string;
  shiftDefinitionId?: string;
  teamCategoryId?: string;
}

/** A geography criterion names a container; it prunes the tree structurally. */
const hasGeographyFilter = (f: BoardFilters): boolean =>
  !!(f.districtId || f.regionId || f.locationId);

/** A subject criterion names people/shifts; it only shows where they actually are. */
const hasSubjectFilter = (f: BoardFilters): boolean =>
  !!(f.userId || f.shiftDefinitionId || f.teamCategoryId);

export const hasAnyBoardFilter = (f: BoardFilters): boolean =>
  hasGeographyFilter(f) || hasSubjectFilter(f);

/**
 * Narrow the built tree to what the search actually asked for.
 *
 * The range query already filters *occurrences* server-side, but the tree's
 * skeleton comes from master data — so filtering alone removed the people and
 * left every district standing at "0 petugas". This prunes the skeleton to match.
 *
 * The two kinds of criteria prune differently, on purpose:
 * - **Geography** (district/kawasan/lokasi) names a container, so the matching
 *   subtree is kept **even when empty** — an empty match is a real answer
 *   ("nobody is here today") and is exactly where an operator wants to assign.
 * - **Subject** (petugas/shift/tim) names something that is either present or
 *   not, so containers holding none of it are dropped — an empty container is
 *   noise when you asked "where is Budi".
 *
 * The city node is left to the caller's structural rules: it is kept only when a
 * subject filter matches it, since it belongs to no district/kawasan/lokasi.
 */
export function pruneDayBoard(tree: BoardDistrict[], filters: BoardFilters): BoardDistrict[] {
  if (!hasAnyBoardFilter(filters)) return tree;

  const dropEmpty = hasSubjectFilter(filters);
  const keepNode = (total: number) => !dropEmpty || total > 0;

  const districts = filters.districtId ? tree.filter((r) => r.id === filters.districtId) : tree;

  return districts
    .map((district) => {
      // The city node is a sentinel with no geography; a geography filter can
      // never match it, so it only survives a pure subject search.
      if (district.id === CITY_NODE_ID) {
        return hasGeographyFilter(filters) ? null : keepNode(district.total) ? district : null;
      }

      const regions = (
        filters.regionId ? district.regions.filter((r) => r.id === filters.regionId) : district.regions
      )
        .map((region) => {
          const locations = (
            filters.locationId
              ? region.locations.filter((l) => l.id === filters.locationId)
              : region.locations
          ).filter((l) => keepNode(l.total));

          // A kawasan that cannot hold the named lokasi is not on the path to it,
          // so it goes — otherwise every district survives at "0 petugas", which is
          // the bug this whole function exists to fix. Being named outright
          // (`regionId`) always wins.
          if (filters.locationId && filters.regionId !== region.id && locations.length === 0) {
            return null;
          }

          // A kawasan whose only match is a lokasi under it must survive as the
          // path to that lokasi, so weigh its subtree, not just its own assignment.
          const subtreeTotal =
            sumTotal(region.assignment) + locations.reduce((a, l) => a + l.total, 0);
          if (!keepNode(subtreeTotal) && locations.length === 0) return null;
          return {
            ...region,
            locations,
            total: subtreeTotal,
            workerIds: unionWorkers(workersOf(region.assignment), ...locations.map((l) => l.workerIds)),
          };
        })
        .filter((r): r is BoardRegion => r !== null);

      // A loose lokasi has no kawasan by definition, so a kawasan filter can
      // never be asking about one.
      const looseLocations = filters.regionId
        ? []
        : (filters.locationId
            ? district.looseLocations.filter((l) => l.id === filters.locationId)
            : district.looseLocations
          ).filter((l) => keepNode(l.total));

      // A lokasi/kawasan filter is asking about a container, not about the
      // district's own mobile assignment — don't let assignment smuggle it back in.
      const assignment =
        filters.locationId || filters.regionId
          ? []
          : keepNode(sumTotal(district.assignment))
            ? district.assignment
            : [];

      const total =
        regions.reduce((a, r) => a + r.total, 0) +
        looseLocations.reduce((a, l) => a + l.total, 0) +
        sumTotal(assignment);

      // Nothing left under this district at all → it isn't an answer to the query.
      if (regions.length === 0 && looseLocations.length === 0 && assignment.length === 0) return null;

      return {
        ...district,
        regions,
        looseLocations,
        assignment,
        total,
        // Recomputed from what SURVIVED, exactly like `total` and like the region
        // branch above. Spreading `...district` alone carried the pre-filter
        // worker set through, so a district filtered down to one lokasi still
        // announced "40 petugas" beside three occurrences — and the city roll-up
        // in DayBoard unions these same arrays, so it inherited the error.
        workerIds: unionWorkers(
          workersOf(assignment),
          ...regions.map((r) => r.workerIds),
          ...looseLocations.map((l) => l.workerIds),
        ),
      };
    })
    .filter((r): r is BoardDistrict => r !== null);
}

/**
 * Container ids the board should open so a match is visible without clicking.
 *
 * Takes the tree ALREADY pruned by `pruneDayBoard` with the same filters — the
 * geography branch opens what survived rather than re-testing each id.
 *
 * How deep to open depends on WHAT was named, not on where the rosters are:
 *
 * - **Geography** — the named container IS the destination, so open the chain
 *   down to it and **stop**. Searching *Kawasan Ambengan* opens Rayon Pusat then
 *   Ambengan and leaves its lokasi shut; what's inside is the answer's contents,
 *   not more search results. (Opening every lokasi with a roster under it turned
 *   a kawasan search into a wall of expanded cards.)
 * - **Subject** (petugas/shift/tim) — the person is somewhere *unknown*, so open
 *   every container on the path to each match. That is the whole point of the
 *   search: "display all until found the specific worker".
 *
 * A subject criterion therefore always wins the depth question, even combined
 * with a geography one ("Budi, in Rayon Pusat" still has to reach Budi).
 */
export function autoExpandedIds(tree: BoardDistrict[], filters: BoardFilters): Set<string> {
  const ids = new Set<string>();
  // Surabaya is the board's root container — every rayon lives inside it, so a
  // collapsed city would hide the entire board. It always starts open. Its
  // "Penugasan Kota" block is NOT auto-opened: it is an assignment block like any
  // other and collapses by default, so the rayon list stays reachable.
  ids.add(CITY_NODE_ID);
  if (!hasAnyBoardFilter(filters)) return ids;

  // Geography-only: the tree is already pruned to the named subtree, so opening
  // the chain means opening what survived — down to the named level, no further.
  if (!hasSubjectFilter(filters)) {
    const deepest = filters.locationId ? 'location' : filters.regionId ? 'region' : 'district';

    for (const district of tree) {
      ids.add(district.id);
      if (deepest === 'district') continue;

      for (const region of district.regions) {
        ids.add(region.id);
        if (deepest === 'region') continue;
        for (const loc of region.locations) ids.add(loc.id);
      }
      for (const loc of district.looseLocations) ids.add(loc.id);
    }
    return ids;
  }

  // Subject search: walk to every match and open its ancestors.
  for (const district of tree) {
    let districtHit = false;

    if (sumTotal(district.assignment) > 0) {
      ids.add(`${district.id}:assignment`);
      districtHit = true;
    }

    for (const region of district.regions) {
      let regionHit = false;
      if (sumTotal(region.assignment) > 0) {
        ids.add(`${region.id}:assignment`);
        regionHit = true;
      }
      for (const loc of region.locations) {
        if (loc.total > 0) {
          ids.add(loc.id);
          regionHit = true;
        }
      }
      if (regionHit) {
        ids.add(region.id);
        districtHit = true;
      }
    }

    for (const loc of district.looseLocations) {
      if (loc.total > 0) {
        ids.add(loc.id);
        districtHit = true;
      }
    }

    if (districtHit) ids.add(district.id);
  }

  return ids;
}

/** One shift's headcount inside a week cell, split by role + teams. */
export interface WeekShiftBreakdown {
  shiftId: string;
  /** Full shift name (e.g. "Shift 1"), for tooltips. */
  name: string;
  /** Short shift label (the digit in the name, e.g. "1"). */
  label: string;
  /** Individual (non-team) role code → count. */
  roleCounts: Record<string, number>;
  /** Team occurrences in this shift. */
  teams: number;
  total: number;
}

export interface WeekCoverageRow {
  districtId: string;
  districtName: string;
  /** Worker count per day, aligned to the `dateStrs` passed in. */
  counts: number[];
  /** Per-day shift breakdown (only shifts with assignments), aligned to `dateStrs`. */
  cells: WeekShiftBreakdown[][];
  total: number;
}

/** Short shift label: the digit in the name (matches the day board's pills). */
export function shortShiftLabel(name: string): string {
  return name.match(/\d+/)?.[0] ?? name;
}

export interface DistrictCount {
  districtId: string;
  districtName: string;
  count: number;
}

/**
 * Group a day's occurrences by district (via their location/region), for the month
 * view's per-day summary. Returns only districts with assignments, highest first.
 */
export function districtCountsFor(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData
): DistrictCount[] {
  const locDistrict = new Map(master.locations.map((l) => [l.id, l.district_id]));
  const regDistrict = new Map(master.regions.map((r) => [r.id, r.district_id]));
  // PEOPLE, not occurrences (ADR-053): a worker covering two lokasi in the same
  // rayon on one day holds two rows, and the month/week/year cells count
  // petugas. Summing rows would have shown them twice per day.
  const workers = new Map<string, Set<string>>();

  for (const o of occurrences) {
    const districtId = o.location_id
      ? locDistrict.get(o.location_id)
      : o.region_id
        ? regDistrict.get(o.region_id)
        : (o.district_id ?? undefined);
    if (!districtId) continue;
    const set = workers.get(districtId);
    if (set) set.add(o.user_id);
    else workers.set(districtId, new Set([o.user_id]));
  }

  return master.districts
    .map((r) => ({ districtId: r.id, districtName: r.name, count: workers.get(r.id)?.size ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Per-district × per-day coverage for the week view. Every district in the master is
 * returned (even with no schedule), each day carrying a per-shift, per-role
 * breakdown. Occurrences are mapped to a district via their location or region
 * (occurrences carry no district id).
 */
export function buildWeekCoverage(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData,
  dateStrs: string[]
): WeekCoverageRow[] {
  const locDistrict = new Map(master.locations.map((l) => [l.id, l.district_id]));
  const regDistrict = new Map(master.regions.map((r) => [r.id, r.district_id]));
  const shiftName = new Map(master.shifts.map((s) => [s.id, s.name]));
  const dayIndex = new Map(dateStrs.map((d, i) => [d, i]));

  /** Distinct workers already counted into a cell — keeps `total` a people count. */
  const seenByCell = new Map<WeekShiftBreakdown, Set<string>>();

  // districtId → dayIndex → shiftId → breakdown accumulator.
  const acc = new Map<string, Map<string, WeekShiftBreakdown>[]>(
    master.districts.map((r) => [r.id, dateStrs.map(() => new Map<string, WeekShiftBreakdown>())])
  );

  for (const o of occurrences) {
    const districtId = o.location_id
      ? locDistrict.get(o.location_id)
      : o.region_id
        ? regDistrict.get(o.region_id)
        : (o.district_id ?? undefined);
    if (!districtId) continue;
    const di = dayIndex.get(o.schedule_date);
    if (di == null) continue;
    const dayShifts = acc.get(districtId)?.[di];
    if (!dayShifts) continue;

    const shiftId = o.shift_definition_id ?? 'none';
    let cell = dayShifts.get(shiftId);
    if (!cell) {
      const fullName = shiftName.get(shiftId) ?? shiftId;
      cell = {
        shiftId,
        name: fullName,
        label: shortShiftLabel(fullName),
        roleCounts: {},
        teams: 0,
        total: 0,
      };
      dayShifts.set(shiftId, cell);
      seenByCell.set(cell, new Set());
    }
    // Count PEOPLE, not rows (ADR-053): one worker covering two lokasi in the
    // same rayon and shift holds two occurrences, and this cell reads as
    // "N petugas". Counting rows showed them twice.
    const seen = seenByCell.get(cell)!;
    if (seen.has(o.user_id)) continue;
    seen.add(o.user_id);

    cell.total += 1;
    if (isTeam(o)) {
      cell.teams += 1;
    } else {
      const role = o.user.role as string;
      cell.roleCounts[role] = (cell.roleCounts[role] ?? 0) + 1;
    }
  }

  return master.districts.map((r) => {
    const perDay = acc.get(r.id) ?? dateStrs.map(() => new Map<string, WeekShiftBreakdown>());
    const cells = perDay.map((m) =>
      Array.from(m.values()).sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      )
    );
    const counts = cells.map((day) => day.reduce((sum, s) => sum + s.total, 0));
    return {
      districtId: r.id,
      districtName: r.name,
      counts,
      cells,
      total: counts.reduce((a, b) => a + b, 0),
    };
  });
}
