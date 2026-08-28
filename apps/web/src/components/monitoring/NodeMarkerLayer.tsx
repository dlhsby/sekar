'use client';

/**
 * NodeMarkerLayer — the drill-down node markers on the monitoring map. One
 * marker per node at the current scope: the single Surabaya summary (top level),
 * one per rayon (city scope) or one per area (district scope). Each shows the
 * attendance ratio `hadir/terjadwal` colored by staffing health; clicking drills
 * one level deeper. Replaces the old status-only "Ringkasan" bubbles.
 *
 * Renders on `AdvancedMarkerElement` via {@link AdvancedPinMarker} (ADR-051 unified
 * glyph pin as DOM content). Each pin's content is memoized by visual signature, so
 * a WebSocket snapshot patch that only moves a node repositions the marker in place
 * instead of rebuilding it (reposition-on-patch; profiled 47× cheaper).
 */
import { useMemo } from 'react';
import { AdvancedPinMarker } from './AdvancedPinMarker';
import {
  NODE_LABEL_PLACEMENT,
  pinElement,
  rosterHealth,
  HEALTH_COLORS,
  KIND_DEFAULT_GLYPH,
  MARKER_NEUTRAL_OUTLINE,
  dotElement,
} from '@/lib/monitoring/markers';

export interface NodeMarker {
  id: string;
  name: string;
  variant: 'district' | 'location' | 'region' | 'surabaya';
  lat: number;
  lng: number;
  scheduled: number;
  clocked_in: number;
  belum_hadir: number;
  tidak_hadir: number;
  /** Active workers in scope — the number shown on the count marker. */
  active: number;
  /** Active (fresh ping) AND inside their area — a detail field (unused on the pin). */
  active_inside: number;
  /**
   * Parent ids, carried so a drill from the MAP knows where the node sits.
   *
   * Zoom and viewport draw every tier at once, so a kawasan or lokasi pin is
   * tappable at city scope — where the page's own `view` has no id to fall back
   * on. Without these the node was entered with no parent, which cost the
   * breadcrumb its middle crumbs and sent the boundary query a parent id that
   * was really the node's own.
   */
  district_id?: string | null;
  region_id?: string | null;
  /** Configured marker glyph for this location (e.g. "trees"); null → per-kind default. */
  marker_icon?: string | null;
  /**
   * The location's own colours. Still carried because the BOUNDARY polygons use
   * them; the pin body is white for every geo tier (see the builder below).
   */
  fill_color?: string | null;
  fill_opacity?: number | null;
}

export interface NodeMarkerLayerProps {
  nodes: NodeMarker[];
  onDrill?: (node: NodeMarker) => void;
  /**
   * NOTE: there is deliberately no detail affordance ON the pin.
   *
   * A ⓘ badge used to sit on the pin's top-right — the same corner the SVG
   * draws the active-count badge in, so the two overlapped and the staffing
   * number was covered by a button. That corner belongs to the count: it is the
   * only live number the marker carries.
   *
   * Rather than move the badge, it was removed. A ~16 px tap target is a poor
   * one at any zoom, and mobile has no equivalent, so keeping it meant a gesture
   * that worked badly on web and not at all on the other platform. The pin now
   * has exactly one meaning again — tap = drill — and area detail opens from the
   * ⓘ button on the node's row in the sidebar, which is full height and
   * unambiguous.
   */
  /** Accepted for API compatibility; labels now show at every zoom. */
  zoom?: number;
  /** Geo filter selection (district/kawasan/lokasi id). When set, node bubbles that
   *  don't match are dimmed to spotlight the selection. Null = no geo filter. */
  activeGeoId?: string | null;
  /**
   * Per-tier name-label visibility (the `label` facet). Separate from the marker
   * facet: hiding a dense tier's names while keeping its pins is the common ask,
   * so this gates the label rather than filtering the node out.
   */
  showLabels?: Partial<Record<NodeMarker['variant'], boolean>>;
  /**
   * Progressive reveal (viewport mode). Ids in this set draw as full pins;
   * everything else draws as a {@link dotElement} — present, positioned and
   * clickable, but silent. `null` (drill and zoom mode) means every node draws
   * in full, exactly as before this existed.
   */
  promoted?: Set<string> | null;
  /**
   * Of the promoted markers, the ones whose NAME is printed. Always a subset of
   * {@link promoted}. Separate because a pin (~40 px) and its label (~150 px)
   * collide at different sizes: gating both on the label's box cost a marker its
   * staffing count merely because its name would not have fit.
   *
   * `null` (drill and zoom mode) means the per-tier `showLabels` facet decides
   * alone, exactly as before.
   */
  labelled?: Set<string> | null;
}

export function NodeMarkerLayer({
  nodes,
  onDrill,
  activeGeoId,
  showLabels,
  promoted,
  labelled,
}: NodeMarkerLayerProps) {
  const placed = useMemo(
    () => nodes.filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng)),
    [nodes]
  );

  // Tap = drill in. No hover-stats tooltip (touch has no hover) — a node's stats
  // are read from the re-scoping status bar + the tappable current-node marker.
  return (
    <>
      {placed.map((node) => {
        // ONE unified marker (ADR-051): a code-drawn pin filled with the area's
        // identity color (marker_color = border_color), carrying its glyph + a
        // staffing-health outline + the active-count badge — the same builder the
        // editor/preview use, so the map and settings always agree. EVERY node —
        // including an empty lokasi — draws its glyph pin (no muted-dot fallback):
        // a lokasi should always read as a lokasi marker, just with a grey (empty)
        // health outline and no count badge. The name label rides below the pin,
        // health-tinted so per-node status reads too.
        const health = rosterHealth(node.scheduled, node.clocked_in);
        const big = node.variant === 'district' || node.variant === 'region';
        // Demoted: this node lost its screen cell to a more salient neighbour,
        // or fell past the cap. It still renders and still drills on click —
        // only its detail is deferred until there is room for it.
        const demoted = promoted != null && !promoted.has(node.id);
        // Geo-filter spotlight: dim the nodes that don't match the selection so the
        // selected one stands out; the name label stays readable either way.
        const dimmed = activeGeoId != null && node.id !== activeGeoId;
        // Signature = every field the pin/label visual depends on (NOT position —
        // that is synced cheaply by the marker wrapper). Unchanged signature →
        // memoized element → a moved node only repositions.
        // Two gates: the operator's per-tier facet, then the label declutter.
        const withLabel =
          showLabels?.[node.variant] !== false && (labelled == null || labelled.has(node.id));
        const signature =
          // fill_color/opacity are no longer read for the pin body (white), so
          // they are out of the signature — leaving them in would rebuild the
          // element for a change that cannot alter a pixel.
          `${node.variant}|${node.marker_icon ?? ''}` +
          `|${node.active}|${node.scheduled}|${node.clocked_in}|${node.name}|${dimmed ? 1 : 0}` +
          `|${withLabel ? 1 : 0}|${demoted ? 'dot' : 'pin'}`;
        return (
          <AdvancedPinMarker
            key={`node-${node.id}`}
            position={{ lat: node.lat, lng: node.lng }}
            signature={signature}
            build={() => {
              if (demoted) return dotElement(HEALTH_COLORS[health], dimmed);
              const el = pinElement(
                node.marker_icon ?? KIND_DEFAULT_GLYPH[node.variant] ?? null,
                {
                  // Ring is NEUTRAL and the body is WHITE for every geo tier.
                  //
                  // Node pins used to take the area's own fill_color, which put
                  // the map's loudest colour on its most repeated element: at
                  // zoom level the pins competed with the polygons wearing the
                  // same colours, and a rayon's identity read twice. White pins
                  // let the BOUNDARIES carry area identity and leave colour on a
                  // pin to mean status — the health badge — which is the only
                  // thing an operator needs to spot at a glance. People keep
                  // their own colours (role marker / team category); those are
                  // the markers where colour still identifies something.
                  outline: MARKER_NEUTRAL_OUTLINE,
                  fill: undefined,
                  fillOpacity: undefined,
                  count: node.active,
                  badgeColor: HEALTH_COLORS[health],
                  big,
                },
                withLabel
                  ? {
                      text: node.name,
                      className: 'node-marker-label',
                      color: HEALTH_COLORS[health],
                      placement: NODE_LABEL_PLACEMENT[node.variant],
                    }
                  : undefined
              );
              el.style.opacity = dimmed ? '0.3' : '1';
              return el;
            }}
            onClick={() => onDrill?.(node)}
            title={node.name}
            zIndex={demoted ? 2 : dimmed ? 3 : node.variant === 'surabaya' ? 8 : 5}
          />
        );
      })}
    </>
  );
}
