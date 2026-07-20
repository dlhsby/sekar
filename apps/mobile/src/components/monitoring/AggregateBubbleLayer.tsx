/**
 * AggregateBubbleLayer
 * Renders one drill-down node marker per node at the current scope: the single
 * Surabaya summary (top level), one per rayon (city scope) or one per area
 * (district scope). Each shows the attendance ratio `hadir/terjadwal` colored by
 * staffing health; tapping drills one level deeper. Mirrors the web
 * NodeMarkerLayer.
 *
 * tracksViewChanges is disabled after first paint so the native marker bitmap is
 * stable (no per-pan redraw jank — mirrors UserMarker).
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { nbColors, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { healthColor, rosterHealth } from './markerSpec';

/** A drill-down node marker: a district, an area, or the whole-city Surabaya node. */
export interface NodeMarker {
  id: string;
  name: string;
  variant: 'district' | 'area' | 'surabaya';
  lat: number;
  lng: number;
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
}

interface AggregateBubbleLayerProps {
  nodes: NodeMarker[];
  onDrill: (node: NodeMarker) => void;
}

function Bubble({
  node,
  onDrill,
}: {
  node: NodeMarker;
  onDrill: (node: NodeMarker) => void;
}): React.JSX.Element | null {
  const { t } = useTranslation();
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
  const isSurabaya = node.variant === 'surabaya';

  return (
    <Marker
      coordinate={{ latitude: node.lat, longitude: node.lng }}
      onPress={() => onDrill(node)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={`node-marker-${node.id}`}
    >
      <View style={[styles.bubble, isSurabaya && styles.bubbleSurabaya, { borderColor: color }]}>
        {isSurabaya && (
          <NBText variant="caption" style={styles.surabayaLabel}>
            {t('monitoring:surabaya.title').toUpperCase()}
          </NBText>
        )}
        <NBText variant="body-sm" style={[styles.ratio, { color }]}>
          {node.clocked_in}/{node.scheduled}
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
        <Bubble key={`node-${node.id}`} node={node} onDrill={onDrill} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: nbRadius.lg,
    borderWidth: nbBorders.widthThick,
    backgroundColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...nbShadows.sm,
  },
  bubbleSurabaya: {
    minWidth: 96,
    paddingVertical: 6,
  },
  surabayaLabel: {
    color: nbColors.black,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ratio: {
    fontWeight: '800',
  },
});
