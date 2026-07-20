'use client';

/**
 * NodeMarkerLayer — the drill-down node markers on the monitoring map. One
 * marker per node at the current scope: the single Surabaya summary (top level),
 * one per rayon (city scope) or one per area (rayon scope). Each shows the
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
  pinElement,
  rosterHealth,
  HEALTH_COLORS,
  KIND_DEFAULT_GLYPH,
} from '@/lib/monitoring/markers';

export interface NodeMarker {
  id: string;
  name: string;
  variant: 'rayon' | 'area' | 'region' | 'surabaya';
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
  /** Configured marker glyph for this area (e.g. "trees"); null → per-kind default. */
  marker_icon?: string | null;
  /** The area's fill_color — fills the marker pin (null → white). */
  fill_color?: string | null;
  /** The area's fill_opacity 0–1. */
  fill_opacity?: number | null;
}

export interface NodeMarkerLayerProps {
  nodes: NodeMarker[];
  onDrill?: (node: NodeMarker) => void;
  /** Accepted for API compatibility; labels now show at every zoom. */
  zoom?: number;
  /** Geo filter selection (rayon/kawasan/lokasi id). When set, node bubbles that
   *  don't match are dimmed to spotlight the selection. Null = no geo filter. */
  activeGeoId?: string | null;
}

export function NodeMarkerLayer({ nodes, onDrill, activeGeoId }: NodeMarkerLayerProps) {
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
        const big = node.variant === 'rayon' || node.variant === 'region';
        // Geo-filter spotlight: dim the nodes that don't match the selection so the
        // selected one stands out; the name label stays readable either way.
        const dimmed = activeGeoId != null && node.id !== activeGeoId;
        // Signature = every field the pin/label visual depends on (NOT position —
        // that is synced cheaply by the marker wrapper). Unchanged signature →
        // memoized element → a moved node only repositions.
        const signature =
          `${node.variant}|${node.marker_icon ?? ''}|${node.fill_color ?? ''}|${node.fill_opacity ?? ''}` +
          `|${node.active}|${node.scheduled}|${node.clocked_in}|${node.name}|${dimmed ? 1 : 0}`;
        return (
          <AdvancedPinMarker
            key={`node-${node.id}`}
            position={{ lat: node.lat, lng: node.lng }}
            signature={signature}
            build={() => {
              const el = pinElement(
                node.marker_icon ?? KIND_DEFAULT_GLYPH[node.variant] ?? null,
                {
                  outline: HEALTH_COLORS[health],
                  fill: node.fill_color ?? undefined,
                  fillOpacity: node.fill_opacity ?? undefined,
                  count: node.active,
                  big,
                },
                { text: node.name, className: 'node-marker-label', color: HEALTH_COLORS[health] }
              );
              el.style.opacity = dimmed ? '0.3' : '1';
              return el;
            }}
            onClick={() => onDrill?.(node)}
            title={node.name}
            zIndex={dimmed ? 3 : node.variant === 'surabaya' ? 8 : 5}
          />
        );
      })}
    </>
  );
}
