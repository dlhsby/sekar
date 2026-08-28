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
import { useEffect, useMemo, useRef } from 'react';
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
   * Opens the node's detail card. Rendered as a small ⓘ badge on the pin so the
   * body of the pin keeps its original meaning — tap = drill. Mobile splits the
   * same two actions across a bubble and a marker; on web one pin carries both,
   * which avoids drawing two pins per area in zoom mode.
   */
  onDetail?: (node: NodeMarker) => void;
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
}

export function NodeMarkerLayer({
  nodes,
  onDrill,
  onDetail,
  activeGeoId,
  showLabels,
  promoted,
}: NodeMarkerLayerProps) {
  // `build()` is memoized by signature, so a handler captured inside it would go
  // stale the moment the callback identity changed. The ref is read at CLICK
  // time, which keeps the memo intact and the handler current.
  const onDetailRef = useRef(onDetail);
  useEffect(() => {
    onDetailRef.current = onDetail;
  }, [onDetail]);
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
        const withLabel = showLabels?.[node.variant] !== false;
        const signature =
          // fill_color/opacity are no longer read for the pin body (white), so
          // they are out of the signature — leaving them in would rebuild the
          // element for a change that cannot alter a pixel.
          `${node.variant}|${node.marker_icon ?? ''}` +
          `|${node.active}|${node.scheduled}|${node.clocked_in}|${node.name}|${dimmed ? 1 : 0}` +
          `|${onDetail ? 1 : 0}|${withLabel ? 1 : 0}|${demoted ? 'dot' : 'pin'}`;
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
              if (onDetailRef.current) {
                const info = document.createElement('button');
                info.type = 'button';
                info.className = 'node-info-badge';
                info.textContent = 'i';
                info.setAttribute('aria-label', node.name);
                info.addEventListener('click', (ev) => {
                  // Without this the marker's own handler fires too and the map
                  // drills at the same moment the card opens.
                  ev.stopPropagation();
                  onDetailRef.current?.(node);
                });
                el.appendChild(info);
              }
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
