/**
 * AggregateBubbleLayer
 * Renders one summary "bubble" per aggregate node (a rayon at city scope, or an
 * area at rayon scope) for the monitoring map's "Ringkasan" mode. Each bubble
 * shows the online worker count, tinted danger when understaffed; tapping drills
 * one level deeper. This is the light default view that avoids drawing hundreds
 * of individual worker markers at the city zoom.
 *
 * tracksViewChanges is disabled after first paint so the native marker bitmap is
 * stable (no per-pan redraw jank — mirrors UserMarker).
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import type { AggregateNode } from '../../types/models.types';

interface AggregateBubbleLayerProps {
  nodes: AggregateNode[];
  onDrill: (node: AggregateNode) => void;
}

function Bubble({
  node,
  onDrill,
}: {
  node: AggregateNode;
  onDrill: (node: AggregateNode) => void;
}): React.JSX.Element | null {
  // Let the first frame render the label, then freeze the bitmap.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);

  if (typeof node.center_lat !== 'number' || typeof node.center_lng !== 'number') {
    return null;
  }

  return (
    <Marker
      coordinate={{ latitude: node.center_lat, longitude: node.center_lng }}
      onPress={() => onDrill(node)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={`aggregate-bubble-${node.id}`}
    >
      <View
        style={[
          styles.bubble,
          { backgroundColor: node.is_understaffed ? nbColors.dangerDark : nbColors.statusActive },
        ]}
      >
        <NBText variant="body-sm" style={styles.count}>
          {String(node.online_count)}
        </NBText>
      </View>
    </Marker>
  );
}

export function AggregateBubbleLayer({
  nodes,
  onDrill,
}: AggregateBubbleLayerProps): React.JSX.Element {
  return (
    <>
      {nodes.map(node => (
        <Bubble key={`aggregate-${node.id}`} node={node} onDrill={onDrill} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: nbRadius.lg,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.xs,
  },
  count: {
    color: nbColors.white,
    fontWeight: '700',
  },
});
