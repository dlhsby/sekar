'use client';

/**
 * NodeMarkerLayer — the drill-down node markers on the monitoring map. One
 * marker per node at the current scope: the single Surabaya summary (top level),
 * one per rayon (city scope) or one per area (rayon scope). Each shows the
 * attendance ratio `hadir/terjadwal` colored by staffing health; clicking drills
 * one level deeper. Replaces the old status-only "Ringkasan" bubbles.
 */
import { useMemo } from 'react';
import { Marker } from '@react-google-maps/api';
import {
  pinMarker,
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
  // The native `title` gives just a name hint on desktop hover.
  return (
    <>
      {placed.map((node) => {
        // ONE unified marker (ADR-051): a code-drawn pin filled with the area's
        // identity color (marker_color = border_color), carrying its glyph + a
        // staffing-health outline + the active-count badge — the same builder the
        // editor/preview use, so the map and settings always agree. EVERY node —
        // including an empty lokasi — draws its glyph pin (no muted-dot fallback):
        // a lokasi should always read as a lokasi marker, just with a grey (empty)
        // health outline and no count badge.
        const health = rosterHealth(node.scheduled, node.clocked_in);
        const big = node.variant === 'rayon' || node.variant === 'region';
        const icon = pinMarker(node.marker_icon ?? KIND_DEFAULT_GLYPH[node.variant] ?? null, {
          outline: HEALTH_COLORS[health],
          fill: node.fill_color ?? undefined,
          fillOpacity: node.fill_opacity ?? undefined,
          count: node.active,
          big,
        });
        // Google-style place label under every marker (rayon / kawasan / lokasi),
        // colored by staffing health (green ok / amber short / red none) so
        // per-node status still reads at a glance now that the pin shows identity.
        // Geo-filter spotlight: when a rayon/kawasan/lokasi is selected in the
        // filter, dim (and drop the label of) the nodes that don't match, so the
        // selected one stands out. No selection → everything at full opacity.
        const dimmed = activeGeoId != null && node.id !== activeGeoId;
        const showLabel = !dimmed;
        return (
          <Marker
            key={`node-${node.id}`}
            position={{ lat: node.lat, lng: node.lng }}
            onClick={() => onDrill?.(node)}
            icon={icon}
            opacity={dimmed ? 0.3 : 1}
            label={
              showLabel
                ? {
                    text: node.name,
                    className: 'node-marker-label',
                    color: HEALTH_COLORS[health],
                    fontSize: '12px',
                    fontWeight: '700',
                  }
                : undefined
            }
            title={node.name}
            zIndex={dimmed ? 3 : node.variant === 'surabaya' ? 8 : 5}
          />
        );
      })}
    </>
  );
}
