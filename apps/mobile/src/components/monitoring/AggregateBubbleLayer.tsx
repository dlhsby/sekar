/**
 * AggregateBubbleLayer
 * Renders one drill-down node marker per aggregate node at the current scope:
 * one per district (city scope), one per kawasan ∪ region-less lokasi (district
 * scope), or one per lokasi (region scope). Each bubble shows the node name +
 * attendance ratio `hadir/terjadwal` colored by staffing health; tapping drills
 * one level deeper (district → region/location, region → location). Sourced from
 * the aggregate (not boundary geometry) so kawasan — which have no polygon in the
 * boundaries payload — can render. Mirrors the web NodeMarkerLayer.
 *
 * tracksViewChanges is disabled after first paint so the native marker bitmap is
 * stable (no per-pan redraw jank — mirrors UserMarker).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { healthColor, rosterHealth } from './markerSpec';
import { clusterNodes, type NodeCluster } from '../../utils/monitoringDrillNodes';

/** A drill-down node marker: a district (rayon), a region (kawasan), or a location (lokasi). */
export interface NodeMarker {
  id: string;
  name: string;
  variant: 'district' | 'region' | 'location';
  lat: number;
  lng: number;
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
}

interface AggregateBubbleLayerProps {
  nodes: NodeMarker[];
  onDrill: (node: NodeMarker) => void;
  /** Current map zoom (region latitudeDelta) — drives proximity clustering so a
   *  dense tier doesn't stack into an unreadable pile. */
  latitudeDelta: number;
  /** Tap a cluster → zoom in toward its centre (declutter, NOT a drill). */
  onClusterPress: (center: { latitude: number; longitude: number }) => void;
}

function Bubble({
  node,
  onDrill,
}: {
  node: NodeMarker;
  onDrill: (node: NodeMarker) => void;
}): React.JSX.Element | null {
  // Let the first frame render the label, then freeze the bitmap.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);

  if (typeof node.lat !== 'number' || typeof node.lng !== 'number') {
    return null;
  }

  const color = healthColor(rosterHealth(node.scheduled, node.clocked_in));
  // District + region bubbles read as area rollups (bigger); a lokasi is a leaf.
  const big = node.variant === 'district' || node.variant === 'region';

  return (
    <Marker
      coordinate={{ latitude: node.lat, longitude: node.lng }}
      onPress={() => onDrill(node)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={`node-marker-${node.id}`}
    >
      <View style={[styles.bubble, big && styles.bubbleBig, { borderColor: color }]}>
        <NBText variant="caption" style={styles.name} numberOfLines={1}>
          {node.name}
        </NBText>
        <NBText variant="body-sm" style={[styles.ratio, { color }]}>
          {node.clocked_in}/{node.scheduled}
        </NBText>
      </View>
    </Marker>
  );
}

/** A collapsed group of nearby nodes: a neutral count bubble; tap zooms in. */
function ClusterBubble({
  cluster,
  onPress,
}: {
  cluster: NodeCluster;
  onPress: (center: { latitude: number; longitude: number }) => void;
}): React.JSX.Element {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);
  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      onPress={() => onPress({ latitude: cluster.lat, longitude: cluster.lng })}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={`node-cluster-${cluster.id}`}
    >
      <View style={styles.cluster}>
        <NBText variant="body-sm" style={styles.clusterCount}>
          {cluster.count}
        </NBText>
      </View>
    </Marker>
  );
}

export function AggregateBubbleLayer({
  nodes,
  onDrill,
  latitudeDelta,
  onClusterPress,
}: AggregateBubbleLayerProps): React.JSX.Element {
  const items = useMemo(() => clusterNodes(nodes, latitudeDelta), [nodes, latitudeDelta]);
  return (
    <>
      {items.map(item =>
        item.kind === 'cluster' ? (
          <ClusterBubble
            key={`cluster-${item.cluster.id}`}
            cluster={item.cluster}
            onPress={onClusterPress}
          />
        ) : (
          <Bubble key={`node-${item.node.id}`} node={item.node} onDrill={onDrill} />
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    minWidth: 44,
    maxWidth: 160,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: nbRadius.lg,
    borderWidth: nbBorders.widthThick,
    backgroundColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm,
  },
  bubbleBig: {
    paddingVertical: 6,
  },
  name: {
    color: nbColors.black,
    fontWeight: '700',
  },
  ratio: {
    fontWeight: '800',
  },
  cluster: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: nbRadius.full,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm,
  },
  clusterCount: {
    color: nbColors.black,
    fontWeight: '800',
  },
});
