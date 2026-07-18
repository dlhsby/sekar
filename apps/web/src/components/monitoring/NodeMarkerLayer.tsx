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
import { nodeCountIcon, nodeImageIcon, rosterHealth, HEALTH_COLORS } from '@/lib/monitoring/markers';
import { entityMarkerDefault, type MarkerEntityKind } from '@/lib/constants/markerDefaults';

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

export interface NodeMarkerLayerProps {
  nodes: NodeMarker[];
  onDrill?: (node: NodeMarker) => void;
  /** Accepted for API compatibility; labels now show at every zoom. */
  zoom?: number;
}

export function NodeMarkerLayer({ nodes, onDrill }: NodeMarkerLayerProps) {
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
        // Render the SAME marker the settings/edit screens show: the configured
        // `marker_image_url`, or the per-kind system default pin — so the map and
        // the editor agree (no more building-glyph-vs-pin split). Empty lokasi
        // (nothing scheduled) stay a muted dot so a rayon's many idle locations
        // don't clutter the map.
        const isEmptyArea =
          node.variant === 'area' &&
          node.scheduled <= 0 &&
          node.active <= 0 &&
          !node.marker_image_url;
        const health = rosterHealth(node.scheduled, node.clocked_in);
        const icon = isEmptyArea
          ? nodeCountIcon(node.variant, 0, 'empty', { icon: null })
          : nodeImageIcon(
              node.marker_image_url ?? entityMarkerDefault(kindOf(node.variant)),
              node.variant
            );
        // Google-style place label under every marker (rayon / kawasan / lokasi),
        // colored by staffing health (green ok / amber short / red none) so
        // per-node status still reads at a glance now that the pin shows identity.
        // Empty muted-dot lokasi stay unlabeled to keep dense rayons clean.
        const showLabel = !isEmptyArea;
        return (
          <Marker
            key={`node-${node.id}`}
            position={{ lat: node.lat, lng: node.lng }}
            onClick={() => onDrill?.(node)}
            icon={icon}
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
            zIndex={node.variant === 'surabaya' ? 8 : 5}
          />
        );
      })}
    </>
  );
}

/** Node variant → the marker-entity kind used to resolve its default pin. */
function kindOf(variant: NodeMarker['variant']): MarkerEntityKind {
  if (variant === 'region') return 'region';
  if (variant === 'area') return 'area';
  return 'rayon';
}
