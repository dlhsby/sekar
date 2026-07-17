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
import { nodeCountIcon, nodeImageIcon, rosterHealth, KIND_DEFAULT_GLYPH } from '@/lib/monitoring/markers';

export interface NodeMarker {
  id: string;
  name: string;
  variant: 'rayon' | 'area' | 'region' | 'surabaya';
  lat: number;
  lng: number;
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
  /** Active workers in scope — the number shown on the count marker. */
  active: number;
  /** Active (fresh ping) AND inside their area — a detail field (unused on the pin). */
  active_inside: number;
  /** Configured marker glyph for this area (e.g. "trees"); falls back to a plain dot. */
  marker_icon?: string | null;
  /** Configured map-marker image (penanda peta); null → the per-kind system default. */
  marker_image_url?: string | null;
}

/**
 * Zoom at which dense area/kawasan labels reveal. Rayon labels always show (few,
 * well-spaced); kawasan/lokasi labels would collide at the drill-in fit zoom, so
 * they appear only once the user zooms in and they spread out — mirroring how
 * Google reveals place labels progressively (legacy markers have no collision).
 */
const AREA_LABEL_REVEAL_ZOOM = 14;

export interface NodeMarkerLayerProps {
  nodes: NodeMarker[];
  onDrill?: (node: NodeMarker) => void;
  /** Current map zoom — gates when dense area/kawasan labels appear. */
  zoom?: number;
}

export function NodeMarkerLayer({ nodes, onDrill, zoom }: NodeMarkerLayerProps) {
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
        const glyph = glyphFor(node);
        // Custom-uploaded image → render it literally; otherwise the composited
        // glyph + count + health-ring marker (glyph null = a muted empty dot).
        const icon = node.marker_image_url
          ? nodeImageIcon(node.marker_image_url, node.variant)
          : nodeCountIcon(node.variant, node.active, rosterHealth(node.scheduled, node.clocked_in), {
              icon: glyph,
            });
        // Google-style place label under the marker — not on muted empty dots
        // (a rayon's idle lokasi stay clean), and dense kawasan/lokasi labels
        // only once zoomed in enough that they don't collide. Rayons (few,
        // spread out) are always labeled.
        const hasMarker = node.marker_image_url != null || glyph !== null;
        const zoomedForArea =
          node.variant === 'rayon' ||
          node.variant === 'surabaya' ||
          zoom == null ||
          zoom >= AREA_LABEL_REVEAL_ZOOM;
        const showLabel = hasMarker && zoomedForArea;
        return (
          <Marker
            key={`node-${node.id}`}
            position={{ lat: node.lat, lng: node.lng }}
            onClick={() => onDrill?.(node)}
            icon={icon}
            label={
              showLabel
                ? { text: node.name, className: 'node-marker-label', fontSize: '12px', fontWeight: '600' }
                : undefined
            }
            title={node.name}
            zIndex={node.variant === 'surabaya' ? 8 : 5}
          />
        );
      })}
    </>
  );
}

/**
 * The glyph a node renders: its explicit `marker_icon`, else the system default
 * for its kind ("bawaan sistem" — rayon → building, kawasan/lokasi → tree). An
 * empty lokasi (nothing scheduled, nobody active, no explicit icon) opts out so
 * it stays a muted dot and dense rayons don't clutter.
 */
function glyphFor(node: NodeMarker): string | null {
  const explicit = node.marker_icon ?? null;
  const isEmptyArea =
    node.variant === 'area' && node.scheduled <= 0 && node.active <= 0 && !explicit;
  if (isEmptyArea) return null;
  return explicit ?? KIND_DEFAULT_GLYPH[node.variant] ?? null;
}
