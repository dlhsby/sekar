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
 * placement. Empty locations/regions still render so operators can assign into
 * them. Rayon-scope placement is a later phase (not grouped here yet).
 */
export function buildDayBoard(
  occurrences: ScheduleOccurrence[],
  master: BoardMasterData
): BoardRayon[] {
  const { rayons, regions, locations, shifts } = master;

  // Occurrences bucketed by container id (location or region).
  const byLocation = new Map<string, ScheduleOccurrence[]>();
  const byRegionMobile = new Map<string, ScheduleOccurrence[]>();
  for (const o of occurrences) {
    if (o.location_id) {
      (byLocation.get(o.location_id) ?? byLocation.set(o.location_id, []).get(o.location_id)!).push(
        o
      );
    } else if (o.region_id) {
      (
        byRegionMobile.get(o.region_id) ?? byRegionMobile.set(o.region_id, []).get(o.region_id)!
      ).push(o);
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

    const total =
      regionNodes.reduce((acc, r) => acc + r.total, 0) +
      looseLocations.reduce((acc, l) => acc + l.total, 0);

    return { id: rayon.id, name: rayon.name, regions: regionNodes, looseLocations, total };
  });
}
