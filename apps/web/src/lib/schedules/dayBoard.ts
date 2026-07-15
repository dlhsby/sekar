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
}

/** One shift's roster inside a container, grouped by role + teams. */
export interface BoardShiftGroup {
  shift: BoardShiftDef;
  /** role code → individual (non-team) occurrences for this shift */
  byRole: Record<string, ScheduleOccurrence[]>;
  teams: BoardTeam[];
  /** counted subjects (satgas + linmas only) for understaffing */
  countable: number;
  /** total occurrences across all roles + teams */
  total: number;
}

export interface BoardLocation {
  id: string;
  name: string;
  shifts: BoardShiftGroup[];
  total: number;
}
export interface BoardRegion {
  id: string;
  name: string;
  /** mobile-in-kawasan assignments (region-scoped, no location) */
  placement: BoardShiftGroup[];
  locations: BoardLocation[];
  total: number;
}
export interface BoardRayon {
  id: string;
  name: string;
  regions: BoardRegion[];
  /** locations under this rayon with no region parent */
  looseLocations: BoardLocation[];
  /** rayon-wide (rayon-scope) assignments with no location/region */
  placement: BoardShiftGroup[];
  total: number;
  /**
   * Tier this rayon's staffing requirements attach to — decides which single
   * level may edit capacity (rayon / kawasan / lokasi, never several).
   * Real rayons always carry a concrete value (falling back to the entity's
   * `region` column default). Left undefined ONLY on the synthetic city node,
   * which has no rayon record and therefore no capacity to edit.
   */
  staffing_level?: StaffingLevel;
}

export interface BoardMasterData {
  /**
   * `staffing_level` decides which tier may edit capacity. It must be carried
   * here — the board can't gate the capacity control without it.
   */
  rayons: Array<{ id: string; name: string; staffing_level?: StaffingLevel }>;
  regions: Array<{ id: string; name: string; rayon_id: string }>;
  locations: Array<{ id: string; name: string; rayon_id: string; region_id?: string | null }>;
  shifts: BoardShiftDef[];
}

/** Only these roles count toward staffing/understaffing (ADR requirement). */
export const COUNTABLE_ROLES = ['satgas', 'linmas'];

/** Sentinel rayon id for the city-wide ("Seluruh Surabaya") board node — its
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
        } else {
          teamMap.set(key, {
            eventId: key,
            name: o.team_category!.name,
            markerColor: o.team_category!.marker_color ?? null,
            count: 1,
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

    const countable = shiftOccs.filter(
      (o) => !isTeam(o) && COUNTABLE_ROLES.includes(o.user.role as string)
    ).length;

    return {
      shift,
      byRole,
      teams: Array.from(teamMap.values()),
      countable,
      total: shiftOccs.length,
    };
  });
}

const sumTotal = (groups: BoardShiftGroup[]): number => groups.reduce((acc, g) => acc + g.total, 0);

/**
 * Build the day board tree. Occurrences are placed by their container:
 * `location_id` → that location; else `region_id` → that kawasan's mobile
 * placement; else `rayon_id` → that rayon's rayon-wide placement. Empty
 * locations/regions still render so operators can assign into them.
 */
export function buildDayBoard(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData
): BoardRayon[] {
  const { rayons, regions, locations, shifts } = master;

  // Occurrences bucketed by container id (location, region, or rayon); those
  // with no binding at all are city-wide (Seluruh Surabaya).
  const byLocation = new Map<string, ScheduleOccurrence[]>();
  const byRegionMobile = new Map<string, ScheduleOccurrence[]>();
  const byRayonMobile = new Map<string, ScheduleOccurrence[]>();
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
    } else if (o.rayon_id) {
      (byRayonMobile.get(o.rayon_id) ?? byRayonMobile.set(o.rayon_id, []).get(o.rayon_id)!).push(o);
    } else {
      cityOccs.push(o);
    }
  }

  const buildLocation = (loc: BoardMasterData['locations'][number]): BoardLocation => {
    const shiftGroups = groupByShift(byLocation.get(loc.id) ?? [], shifts);
    return { id: loc.id, name: loc.name, shifts: shiftGroups, total: sumTotal(shiftGroups) };
  };

  // City-wide node first (only when there are city occurrences) — a placement-
  // only rayon with the sentinel id; the component localizes its label.
  const cityNode: BoardRayon[] =
    cityOccs.length > 0
      ? [
          {
            id: CITY_NODE_ID,
            name: '',
            regions: [],
            looseLocations: [],
            placement: groupByShift(cityOccs, shifts),
            total: sumTotal(groupByShift(cityOccs, shifts)),
            // No staffing_level: the city node is a sentinel, not a rayon —
            // there is nothing to attach a capacity to.
          },
        ]
      : [];

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true });

  const rayonNodes = rayons.map((rayon) => {
    const rayonRegions = regions.filter((r) => r.rayon_id === rayon.id).sort(byName);
    const rayonLocations = locations.filter((l) => l.rayon_id === rayon.id).sort(byName);

    const regionNodes: BoardRegion[] = rayonRegions.map((region) => {
      const placement = groupByShift(byRegionMobile.get(region.id) ?? [], shifts);
      const regionLocations = rayonLocations
        .filter((l) => l.region_id === region.id)
        .map(buildLocation);
      const total = sumTotal(placement) + regionLocations.reduce((acc, l) => acc + l.total, 0);
      return { id: region.id, name: region.name, placement, locations: regionLocations, total };
    });

    const looseLocations = rayonLocations.filter((l) => !l.region_id).map(buildLocation);
    const placement = groupByShift(byRayonMobile.get(rayon.id) ?? [], shifts);

    const total =
      regionNodes.reduce((acc, r) => acc + r.total, 0) +
      looseLocations.reduce((acc, l) => acc + l.total, 0) +
      sumTotal(placement);

    return {
      id: rayon.id,
      name: rayon.name,
      regions: regionNodes,
      looseLocations,
      placement,
      total,
      // Mirror the entity's column default so a rayon whose level the API
      // omitted still resolves to exactly one editable tier (kawasan) rather
      // than none.
      staffing_level: rayon.staffing_level ?? 'region',
    };
  });

  return [...cityNode, ...rayonNodes];
}

/**
 * The active search criteria, as far as the board cares. Mirrors the geography +
 * subject halves of `ScheduleRangeFilters` (which is what the range query sends).
 */
export interface BoardFilters {
  rayonId?: string;
  regionId?: string;
  locationId?: string;
  userId?: string;
  shiftDefinitionId?: string;
  teamCategoryId?: string;
}

/** A geography criterion names a container; it prunes the tree structurally. */
const hasGeographyFilter = (f: BoardFilters): boolean =>
  !!(f.rayonId || f.regionId || f.locationId);

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
 * left every rayon standing at "0 petugas". This prunes the skeleton to match.
 *
 * The two kinds of criteria prune differently, on purpose:
 * - **Geography** (rayon/kawasan/lokasi) names a container, so the matching
 *   subtree is kept **even when empty** — an empty match is a real answer
 *   ("nobody is here today") and is exactly where an operator wants to assign.
 * - **Subject** (petugas/shift/tim) names something that is either present or
 *   not, so containers holding none of it are dropped — an empty container is
 *   noise when you asked "where is Budi".
 *
 * The city node is left to the caller's structural rules: it is kept only when a
 * subject filter matches it, since it belongs to no rayon/kawasan/lokasi.
 */
export function pruneDayBoard(tree: BoardRayon[], filters: BoardFilters): BoardRayon[] {
  if (!hasAnyBoardFilter(filters)) return tree;

  const dropEmpty = hasSubjectFilter(filters);
  const keepNode = (total: number) => !dropEmpty || total > 0;

  const rayons = filters.rayonId ? tree.filter((r) => r.id === filters.rayonId) : tree;

  return rayons
    .map((rayon) => {
      // The city node is a sentinel with no geography; a geography filter can
      // never match it, so it only survives a pure subject search.
      if (rayon.id === CITY_NODE_ID) {
        return hasGeographyFilter(filters) ? null : keepNode(rayon.total) ? rayon : null;
      }

      const regions = (
        filters.regionId ? rayon.regions.filter((r) => r.id === filters.regionId) : rayon.regions
      )
        .map((region) => {
          const locations = (
            filters.locationId
              ? region.locations.filter((l) => l.id === filters.locationId)
              : region.locations
          ).filter((l) => keepNode(l.total));

          // A kawasan that cannot hold the named lokasi is not on the path to it,
          // so it goes — otherwise every rayon survives at "0 petugas", which is
          // the bug this whole function exists to fix. Being named outright
          // (`regionId`) always wins.
          if (filters.locationId && filters.regionId !== region.id && locations.length === 0) {
            return null;
          }

          // A kawasan whose only match is a lokasi under it must survive as the
          // path to that lokasi, so weigh its subtree, not just its own placement.
          const subtreeTotal =
            sumTotal(region.placement) + locations.reduce((a, l) => a + l.total, 0);
          if (!keepNode(subtreeTotal) && locations.length === 0) return null;
          return { ...region, locations, total: subtreeTotal };
        })
        .filter((r): r is BoardRegion => r !== null);

      // A loose lokasi has no kawasan by definition, so a kawasan filter can
      // never be asking about one.
      const looseLocations = filters.regionId
        ? []
        : (filters.locationId
            ? rayon.looseLocations.filter((l) => l.id === filters.locationId)
            : rayon.looseLocations
          ).filter((l) => keepNode(l.total));

      // A lokasi/kawasan filter is asking about a container, not about the
      // rayon's own mobile placement — don't let placement smuggle it back in.
      const placement =
        filters.locationId || filters.regionId
          ? []
          : keepNode(sumTotal(rayon.placement))
            ? rayon.placement
            : [];

      const total =
        regions.reduce((a, r) => a + r.total, 0) +
        looseLocations.reduce((a, l) => a + l.total, 0) +
        sumTotal(placement);

      // Nothing left under this rayon at all → it isn't an answer to the query.
      if (regions.length === 0 && looseLocations.length === 0 && placement.length === 0) return null;

      return { ...rayon, regions, looseLocations, placement, total };
    })
    .filter((r): r is BoardRayon => r !== null);
}

/**
 * Container ids the board should open so a match is visible without clicking.
 *
 * Only nodes that actually hold something are opened — with a broad filter
 * (a whole rayon) opening all 87 lokasi would be worse than opening none. The
 * exception is the deepest *geography* match, which opens even when empty: it's
 * the thing the operator named, so it should be on screen either way.
 */
export function autoExpandedIds(tree: BoardRayon[], filters: BoardFilters): Set<string> {
  const ids = new Set<string>();
  if (!hasAnyBoardFilter(filters)) return ids;

  for (const rayon of tree) {
    let rayonHit = false;

    if (sumTotal(rayon.placement) > 0) {
      ids.add(`${rayon.id}:placement`);
      rayonHit = true;
    }

    for (const region of rayon.regions) {
      let regionHit = false;
      if (sumTotal(region.placement) > 0) {
        ids.add(`${region.id}:placement`);
        regionHit = true;
      }
      for (const loc of region.locations) {
        if (loc.total > 0 || filters.locationId === loc.id) {
          ids.add(loc.id);
          regionHit = true;
        }
      }
      if (regionHit || filters.regionId === region.id) {
        ids.add(region.id);
        rayonHit = true;
      }
    }

    for (const loc of rayon.looseLocations) {
      if (loc.total > 0 || filters.locationId === loc.id) {
        ids.add(loc.id);
        rayonHit = true;
      }
    }

    if (rayonHit || filters.rayonId === rayon.id) ids.add(rayon.id);
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
  rayonId: string;
  rayonName: string;
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

export interface RayonCount {
  rayonId: string;
  rayonName: string;
  count: number;
}

/**
 * Group a day's occurrences by rayon (via their location/region), for the month
 * view's per-day summary. Returns only rayons with assignments, highest first.
 */
export function rayonCountsFor(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData
): RayonCount[] {
  const locRayon = new Map(master.locations.map((l) => [l.id, l.rayon_id]));
  const regRayon = new Map(master.regions.map((r) => [r.id, r.rayon_id]));
  const counts = new Map<string, number>();

  for (const o of occurrences) {
    const rayonId = o.location_id
      ? locRayon.get(o.location_id)
      : o.region_id
        ? regRayon.get(o.region_id)
        : (o.rayon_id ?? undefined);
    if (!rayonId) continue;
    counts.set(rayonId, (counts.get(rayonId) ?? 0) + 1);
  }

  return master.rayons
    .map((r) => ({ rayonId: r.id, rayonName: r.name, count: counts.get(r.id) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Per-rayon × per-day coverage for the week view. Every rayon in the master is
 * returned (even with no schedule), each day carrying a per-shift, per-role
 * breakdown. Occurrences are mapped to a rayon via their location or region
 * (occurrences carry no rayon id).
 */
export function buildWeekCoverage(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData,
  dateStrs: string[]
): WeekCoverageRow[] {
  const locRayon = new Map(master.locations.map((l) => [l.id, l.rayon_id]));
  const regRayon = new Map(master.regions.map((r) => [r.id, r.rayon_id]));
  const shiftName = new Map(master.shifts.map((s) => [s.id, s.name]));
  const dayIndex = new Map(dateStrs.map((d, i) => [d, i]));

  // rayonId → dayIndex → shiftId → breakdown accumulator.
  const acc = new Map<string, Map<string, WeekShiftBreakdown>[]>(
    master.rayons.map((r) => [r.id, dateStrs.map(() => new Map<string, WeekShiftBreakdown>())])
  );

  for (const o of occurrences) {
    const rayonId = o.location_id
      ? locRayon.get(o.location_id)
      : o.region_id
        ? regRayon.get(o.region_id)
        : (o.rayon_id ?? undefined);
    if (!rayonId) continue;
    const di = dayIndex.get(o.schedule_date);
    if (di == null) continue;
    const dayShifts = acc.get(rayonId)?.[di];
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
    }
    cell.total += 1;
    if (isTeam(o)) {
      cell.teams += 1;
    } else {
      const role = o.user.role as string;
      cell.roleCounts[role] = (cell.roleCounts[role] ?? 0) + 1;
    }
  }

  return master.rayons.map((r) => {
    const perDay = acc.get(r.id) ?? dateStrs.map(() => new Map<string, WeekShiftBreakdown>());
    const cells = perDay.map((m) =>
      Array.from(m.values()).sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      )
    );
    const counts = cells.map((day) => day.reduce((sum, s) => sum + s.total, 0));
    return {
      rayonId: r.id,
      rayonName: r.name,
      counts,
      cells,
      total: counts.reduce((a, b) => a + b, 0),
    };
  });
}
