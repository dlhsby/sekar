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
    // Not-clocked-in = belum_hadir (within grace) + tidak_hadir (no-show), ADR-050.
    not_clocked_in: (node.roster?.belum_hadir ?? 0) + (node.roster?.tidak_hadir ?? 0),
  };
}

function toMarkers(nodes: AggregateNode[]): NodeMarker[] {
  return nodes.map(aggregateNodeToNodeMarker).filter((n): n is NodeMarker => n !== null);
}

/** A group of nearby node markers, collapsed at the current zoom to cut overlap. */
export interface NodeCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  nodes: NodeMarker[];
}

/** Either a single drill node or a proximity cluster of them (a tap zooms in). */
export type ClusterOrNode =
  | { kind: 'node'; node: NodeMarker }
  | { kind: 'cluster'; cluster: NodeCluster };

/** Order-independent short id for a set of node ids (stable React key for a cluster). */
function clusterId(ids: string[]): string {
  const s = ids.slice().sort().join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `cluster-${(h >>> 0).toString(36)}`;
}

/**
 * Distance-clustering of drill-node markers so a dense tier (a district's 100+
 * lokasi, or its kawasan) doesn't stack into an unreadable pile. Groups are
 * connected components under a proximity relation (transitive — a node close to
 * ANY group member joins it, not just the seed), so nothing that visually sits
 * inside a cluster renders separately on top of it. The merge radius scales with
 * `latitudeDelta` (zoom): zoomed out → aggressive grouping; zoom in → clusters
 * break apart. Pure + O(n²), fine for the ≤~200 nodes a single scope returns.
 * The cluster id hashes its (sorted) member ids, so it is stable regardless of the
 * input order — no React-key thrash / marker remount when the node array reorders.
 */
export function clusterNodes(
  nodes: NodeMarker[],
  latitudeDelta: number,
  thresholdFactor = 0.06,
): ClusterOrNode[] {
  const threshold = Math.max(latitudeDelta * thresholdFactor, 0.00015);
  const near = (a: NodeMarker, b: NodeMarker) =>
    Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;

  const used = new Array<boolean>(nodes.length).fill(false);
  const out: ClusterOrNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    if (used[i]) continue;
    // BFS the connected component: a candidate joins if it's near ANY member.
    const group: NodeMarker[] = [nodes[i]];
    used[i] = true;
    const queue = [i];
    while (queue.length > 0) {
      const k = queue.shift() as number;
      for (let j = 0; j < nodes.length; j++) {
        if (used[j]) continue;
        if (near(nodes[k], nodes[j])) {
          used[j] = true;
          group.push(nodes[j]);
          queue.push(j);
        }
      }
    }
    if (group.length === 1) {
      out.push({ kind: 'node', node: group[0] });
    } else {
      const lat = group.reduce((s, n) => s + n.lat, 0) / group.length;
      const lng = group.reduce((s, n) => s + n.lng, 0) / group.length;
      out.push({
        kind: 'cluster',
        cluster: { id: clusterId(group.map(n => n.id)), lat, lng, count: group.length, nodes: group },
      });
    }
  }
  return out;
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
