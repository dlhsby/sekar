/**
 * monitoringDrillNodes — pure helpers that turn aggregate responses into the
 * drill-down node markers for the current scope. Mirrors the web canon
 * (monitoring/page.tsx `listNodes`), extended per the user-dictated spec so a
 * district shows its **regions ∪ region-less locations together** (not either/or).
 *
 * This is the DRILL-mode composer. Zoom and viewport fetch `scope=all`, which
 * already returns every tier mixed, and use those nodes directly.
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

import type { AggregateNode, AggregateScope } from '../types/monitoring.types';
import { isZoomLike, type MonitoringMode } from '../store/slices/monitoringV2Slice';
import type { NodeMarker } from '../components/monitoring/NodeMarkerLayer';

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
    // Also carried unsummed: salience weights a no-show above someone still
    // within their grace window, and the sum discards that.
    belum_hadir: node.roster?.belum_hadir ?? 0,
    tidak_hadir: node.roster?.tidak_hadir ?? 0,
    // The number the pin's badge shows: workers active in this node's scope.
    active: node.counts_by_status?.active ?? 0,
    marker_icon: node.marker_icon ?? null,
    // Carried so a drill from the MAP knows where the node sits — zoom and
    // viewport draw every tier at once, so a kawasan or lokasi pin is tappable
    // at city scope, where the view itself has no parent id to fall back on.
    district_id: node.district_id ?? null,
    region_id: node.region_id ?? null,
  };
}

function toMarkers(nodes: AggregateNode[]): NodeMarker[] {
  return nodes.map(aggregateNodeToNodeMarker).filter((n): n is NodeMarker => n !== null);
}

/**
 * Compose the child node markers to render at the current drill scope from the
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

/**
 * The node markers to DRAW, for the current mode and scope.
 *
 * The three modes differ in what is drawn or fetched, never in what is counted
 * (ADR-060). Drill shows one tier of children at a time and composes it from the
 * per-scope aggregate slices. Zoom and viewport show every tier at once, which is
 * what a single `scope=all` fetch returns — so they use those nodes directly
 * instead of composing, and the mode's own label ("Zoom (semua)") finally holds.
 *
 * The node currently drilled into is dropped: it cannot be drilled from itself,
 * and it is already on screen as its own highlighted boundary polygon.
 */
export function selectDrawnNodes(input: {
  mode: MonitoringMode;
  view: DrillView;
  aggregate: { nodes: AggregateNode[] } | null;
  aggregateRegion: { nodes: AggregateNode[] } | null;
}): NodeMarker[] {
  const { mode, view, aggregate, aggregateRegion } = input;

  if (isZoomLike(mode)) {
    const nodes = (aggregate?.nodes ?? []).filter(n => n.id !== view.id);
    return toMarkers(nodes);
  }

  const cityNodes = view.scope === 'city' ? (aggregate?.nodes ?? []) : [];
  const districtNodes = view.scope !== 'city' ? (aggregate?.nodes ?? []) : [];
  return composeDrillNodes(view.scope, view, cityNodes, districtNodes, aggregateRegion?.nodes ?? []);
}

/** One `/monitoring/aggregate` request. Mirrors `FetchAggregateParams`. */
export interface AggregateRequest {
  scope: AggregateScope;
  id?: string;
  bbox?: string;
}

/**
 * Which aggregate call(s) the current mode and scope need.
 *
 * `null` means DEFER — do not fetch yet. Viewport mode returns it until the
 * camera box is known, because the alternative is worse than a wasted request:
 * the first pass would ask for `scope=all` with no bbox, which is every node in
 * Surabaya (~1k), and the narrowed request would land a frame later. Pulling the
 * whole city is the exact thing viewport mode exists to avoid, and on a field
 * phone it is the payload that costs the most.
 *
 * Zoom and viewport draw every tier at once, which one `scope=all` call returns.
 * Drill shows one tier of children and keeps the per-scope calls — a district
 * view needs BOTH its lokasi rollup and its kawasan rollup to render
 * regions ∪ region-less lokasi.
 */
export function aggregateRequestsFor(input: {
  mode: MonitoringMode;
  view: DrillView;
  /** The padded camera box; only viewport mode has one. */
  viewportBox: string | undefined;
}): AggregateRequest[] | null {
  const { mode, view, viewportBox } = input;

  if (isZoomLike(mode)) {
    if (mode === 'viewport' && !viewportBox) return null;
    return [
      {
        scope: 'all',
        id: view.districtId ?? undefined,
        bbox: mode === 'viewport' ? viewportBox : undefined,
      },
    ];
  }

  if (view.scope === 'city') return [{ scope: 'city' }];
  if (view.scope === 'district' && view.id) {
    return [
      { scope: 'district', id: view.id },
      { scope: 'region', id: view.id },
    ];
  }
  if ((view.scope === 'region' || view.scope === 'location') && view.districtId) {
    return [{ scope: 'district', id: view.districtId }];
  }
  return [];
}
