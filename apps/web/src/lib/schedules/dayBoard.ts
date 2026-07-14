/**
 * Day-board grouping (Jadwal redesign P1). Turns a flat list of schedule
 * occurrences for one day into the Rayon → Kawasan → Lokasi coverage tree the
 * board renders, with each container split by shift and by role. Pure — no React,
 * fully unit-testable.
 */
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

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
}

export interface BoardMasterData {
  rayons: Array<{ id: string; name: string }>;
  regions: Array<{ id: string; name: string; rayon_id: string }>;
  locations: Array<{ id: string; name: string; rayon_id: string; region_id?: string | null }>;
  shifts: BoardShiftDef[];
}

/** Only these roles count toward staffing/understaffing (ADR requirement). */
export const COUNTABLE_ROLES = ['satgas', 'linmas'];

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

  // Occurrences bucketed by container id (location, region, or rayon).
  const byLocation = new Map<string, ScheduleOccurrence[]>();
  const byRegionMobile = new Map<string, ScheduleOccurrence[]>();
  const byRayonMobile = new Map<string, ScheduleOccurrence[]>();
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
    }
  }

  const buildLocation = (loc: BoardMasterData['locations'][number]): BoardLocation => {
    const shiftGroups = groupByShift(byLocation.get(loc.id) ?? [], shifts);
    return { id: loc.id, name: loc.name, shifts: shiftGroups, total: sumTotal(shiftGroups) };
  };

  return rayons.map((rayon) => {
    const rayonRegions = regions.filter((r) => r.rayon_id === rayon.id);
    const rayonLocations = locations.filter((l) => l.rayon_id === rayon.id);

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
    };
  });
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
