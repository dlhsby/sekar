/**
 * monitoringDrillNodes — pure helpers that turn aggregate responses into the
 * drill-down bubble markers for the current scope (PR2-visual). Mirrors the web
 * canon (monitoring/page.tsx `listNodes`), extended per the user-dictated spec so
 * a district shows its **regions ∪ region-less locations together** (not either/or).
 *
 * Node sources (all from `/monitoring/aggregate`, never boundary geometry, since
 * kawasan have no polygon in the boundaries payload):
 *   • city     → district nodes           (aggregate scope=city)
 *   • district → region nodes ∪ location nodes with region_id == null
 *                                          (aggregate scope=region ∪ scope=district)
 *   • region   → location nodes with region_id == the drilled kawasan
 *                                          (aggregate scope=district, filtered)
 *   • location → no child nodes (workers only)
 */

import type { AggregateNode } from '../types/monitoring.types';
import type { NodeMarker } from '../components/monitoring/AggregateBubbleLayer';

export type DrillScope = 'city' | 'district' | 'region' | 'location';

export interface DrillView {
  scope: DrillScope;
  id: string | null;
  districtId: string | null;
  regionId: string | null;
}

/**
 * Adapt one aggregate node into a `NodeMarker`, or `null` when it has no plottable
 * center (the bubble layer also guards, but filtering here keeps counts honest).
 */
export function aggregateNodeToNodeMarker(node: AggregateNode): NodeMarker | null {
  if (typeof node.center_lat !== 'number' || typeof node.center_lng !== 'number') {
    return null;
  }
  return {
    id: node.id,
    name: node.name,
    variant: node.type,
    lat: node.center_lat,
    lng: node.center_lng,
    scheduled: node.roster?.scheduled ?? 0,
    clocked_in: node.roster?.clocked_in ?? 0,
    not_clocked_in: node.roster?.not_clocked_in ?? 0,
  };
}

function toMarkers(nodes: AggregateNode[]): NodeMarker[] {
  return nodes.map(aggregateNodeToNodeMarker).filter((n): n is NodeMarker => n !== null);
}

/**
 * Compose the child bubble markers to render at the current drill scope from the
 * three aggregate slices the screen holds (city rollup, the district's lokasi, the
 * district's kawasan). Pure — pass `[]` for a slice that hasn't loaded yet.
 *
 * @param scope         current drill scope
 * @param view          drill view (supplies the drilled `regionId` at region scope)
 * @param cityNodes     nodes from aggregate scope=city (district-type)
 * @param districtNodes nodes from aggregate scope=district (location-type, carry region_id)
 * @param regionNodes   nodes from aggregate scope=region (region/kawasan-type)
 */
export function composeDrillNodes(
  scope: DrillScope,
  view: DrillView,
  cityNodes: AggregateNode[],
  districtNodes: AggregateNode[],
  regionNodes: AggregateNode[],
): NodeMarker[] {
  // Every branch filters by node `type` so a stale/mismatched aggregate slice
  // (e.g. `aggregate` still holding city district-nodes for one frame after a
  // city→district drill) can never render at the wrong tier.
  if (scope === 'city') {
    return toMarkers(cityNodes.filter(n => n.type === 'district'));
  }
  if (scope === 'district') {
    // Kawasan (marker+boundary) PLUS the lokasi tied directly to the district
    // (region_id null/undefined) — the region-less locations. With no kawasan this
    // degrades to all lokasi, matching today's region-less behaviour.
    const regions = regionNodes.filter(n => n.type === 'region');
    const regionLess = districtNodes.filter(n => n.type === 'location' && n.region_id == null);
    return toMarkers([...regions, ...regionLess]);
  }
  if (scope === 'region') {
    // Only the lokasi inside the drilled kawasan. Guard a missing regionId so we
    // don't silently match every null-region location.
    if (!view.regionId) return [];
    const inRegion = districtNodes.filter(
      n => n.type === 'location' && n.region_id === view.regionId,
    );
    return toMarkers(inRegion);
  }
  // location scope → workers only, no child nodes
  return [];
}
