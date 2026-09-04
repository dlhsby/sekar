/**
 * NodeMarkerLayer
 * One drill-down node marker per aggregate node at the current scope: one per
 * district (city scope), one per kawasan ∪ region-less lokasi (district scope),
 * or one per lokasi (region scope). Sourced from the aggregate (not boundary
 * geometry) so kawasan — which have no polygon in the boundaries payload — can
 * render. The web twin is `apps/web/src/components/monitoring/NodeMarkerLayer.tsx`.
 *
 * ONE unified marker (ADR-051): a code-drawn white teardrop carrying the node's
 * glyph, a staffing-health-coloured count badge showing ACTIVE workers, and a
 * neutral ring. This replaced the `hadir/terjadwal` ratio bubble — colour on a
 * pin means status, and the ratio competed with the boundary polygons for the
 * operator's attention while answering a question the roster panel answers
 * better. EVERY node draws its glyph pin, including an empty lokasi (grey ring,
 * no badge): a lokasi should always read as a lokasi.
 *
 * There is deliberately NO clustering here (ADR-060 §4). A merged bubble hides
 * its members; presentation may de-emphasise, never hide. The de-emphasis is
 * `promoted` — progressive reveal, in viewport mode only — which turns a node
 * that lost its screen cell into a dot that is still positioned and still
 * drills.
 *
 * tracksViewChanges is disabled after first paint so the native marker bitmap is
 * stable (no per-pan redraw jank — mirrors UserMarker).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { SvgXml } from 'react-native-svg';
import { nbColors } from '../../constants/nbTokens';
import {
  healthColor,
  rosterHealth,
  nodeGlyphFor,
  nodePinSvg,
  MARKER_NEUTRAL_OUTLINE,
} from './markerSpec';
import { LabeledMarker, NODE_LABEL_PLACEMENT } from './MarkerLabel';

/** A drill-down node marker: a district (rayon), a region (kawasan), or a location (lokasi). */
export interface NodeMarker {
  id: string;
  name: string;
  /** Mobile retired the Surabaya top level — city is the top, so there is no
   *  `surabaya` node here (the glyph table still names one, shared with web). */
  variant: 'district' | 'region' | 'location';
  lat: number;
  lng: number;
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
  /**
   * The roster split, carried separately as well as summed.
   *
   * Salience weights a no-show more heavily than someone still inside their
   * grace window (ADR-050). Summing them at the builder made that distinction
   * unavailable and would have let mobile rank the same data differently from
   * web.
   */
  belum_hadir: number;
  tidak_hadir: number;
  /** Active workers in scope — the number shown on the count badge. */
  active: number;
  /** Configured marker glyph for this node (e.g. "trees"); null → per-kind default. */
  marker_icon?: string | null;
  /** Parent ids, carried so a drill from the MAP knows where the node sits: zoom
   *  and viewport draw every tier at once, so a kawasan or lokasi pin is tappable
   *  at city scope, where the page's own `view` has no id to fall back on. */
  district_id?: string | null;
  region_id?: string | null;
}

interface NodeMarkerLayerProps {
  nodes: NodeMarker[];
  onDrill: (node: NodeMarker) => void;
  /** Per-tier `label` facet. Hiding a dense tier's names keeps its pins. */
  showLabels?: Partial<Record<NodeMarker['variant'], boolean>>;
  /**
   * Progressive reveal (viewport mode). Ids in this set draw as full pins;
   * everything else draws as a dot — present, positioned and drillable, but
   * silent. `null` (drill and zoom mode) means every node draws in full.
   */
  promoted?: Set<string> | null;
  /**
   * Of the promoted markers, the ones whose NAME is printed. Always a subset of
   * {@link promoted}. Separate because a pin and its label collide at different
   * sizes: gating both on the label's box cost a marker its staffing count
   * merely because its name would not have fit.
   */
  labelled?: Set<string> | null;
}

function NodePin({
  node,
  onDrill,
  showLabel = true,
  demoted = false,
}: {
  node: NodeMarker;
  onDrill: (node: NodeMarker) => void;
  showLabel?: boolean;
  demoted?: boolean;
}): React.JSX.Element | null {
  // Let the first frame render, then freeze the bitmap.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);

  const health = rosterHealth(node.scheduled, node.clocked_in);
  const color = healthColor(health);
  // District + region pins read as area rollups (bigger); a lokasi is a leaf.
  const big = node.variant === 'district' || node.variant === 'region';
  const pin = useMemo(
    () =>
      nodePinSvg(nodeGlyphFor(node.variant, node.marker_icon), {
        outline: MARKER_NEUTRAL_OUTLINE,
        count: node.active,
        badgeColor: color,
        big,
      }),
    [node.variant, node.marker_icon, node.active, color, big],
  );

  if (typeof node.lat !== 'number' || typeof node.lng !== 'number') {
    return null;
  }

  return (
    <Marker
      coordinate={{ latitude: node.lat, longitude: node.lng }}
      onPress={() => onDrill(node)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={`node-marker-${node.id}`}
    >
      {demoted ? (
        <View style={[styles.dot, { backgroundColor: color }]} testID={`node-dot-${node.id}`} />
      ) : (
        // The name rides OUTSIDE the pin: inside it, it was clipped to one line
        // and every tier wrote in the same place. Outside, it wraps and each
        // tier writes on its own side.
        <LabeledMarker
          label={showLabel ? node.name : null}
          placement={NODE_LABEL_PLACEMENT[node.variant] ?? 'bottom'}
          color={color}
        >
          <SvgXml
            xml={pin.svg}
            width={pin.w}
            height={pin.h}
            testID={`node-pin-${node.id}`}
          />
        </LabeledMarker>
      )}
    </Marker>
  );
}

export function NodeMarkerLayer({
  nodes,
  onDrill,
  showLabels,
  promoted,
  labelled,
}: NodeMarkerLayerProps): React.JSX.Element {
  return (
    <>
      {nodes.map((node) => {
        // Demoted: this node lost its screen cell to a more salient neighbour,
        // or fell past the cap. It still renders and still drills — only its
        // detail is deferred until there is room for it.
        const demoted = promoted != null && !promoted.has(node.id);
        // Two gates: the operator's per-tier facet, then the label declutter.
        const showLabel =
          showLabels?.[node.variant] !== false && (labelled == null || labelled.has(node.id));
        return (
          <NodePin
            key={`node-${node.id}`}
            node={node}
            onDrill={onDrill}
            showLabel={showLabel}
            demoted={demoted}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: nbColors.white,
  },
});
