/**
 * ClusterMarker Component
 * Phase 3 sub-phase 3-5: Dedicated cluster bubble for ClusteredUserMarkers.
 *
 * Stability guarantees (mirrors UserMarker Apr 24 fixes):
 * - `tracksViewChanges={false}` — prevents continuous Android bitmap redraw.
 * - Key MUST include `zoomBucket` (Math.floor(zoom / 2)) and `count`, never a
 *   raw latitudeDelta float — ensures bitmap is replaced only when cluster size
 *   or zoom bucket actually changes, not on every map pan.
 * - Press handler calls `onClusterPress()` — parent decides whether to zoom in
 *   or open a list. Never calls `animateToRegion` directly (avoids race with
 *   any concurrent bottom-sheet animation).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import {
  nbColors,
  nbBorders,
  nbShadows,
  nbTypography,
} from '../../constants/nbTokens';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClusterMarkerProps {
  coordinate: { latitude: number; longitude: number };
  count: number;
  /**
   * Discrete zoom bucket: `Math.floor(latitudeDelta / 0.01)` or similar.
   * Used exclusively as part of the React `key` (by the parent) to control
   * when the Android native bitmap is replaced. Not rendered.
   */
  zoomBucket: number;
  onClusterPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ClusterMarker = React.memo(function ClusterMarker({
  coordinate,
  count,
  onClusterPress,
}: ClusterMarkerProps): React.JSX.Element {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onClusterPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={100}
    >
      <View style={styles.bubble}>
        <Text style={styles.countText} accessibilityLabel={`${count} petugas`}>
          {count}
        </Text>
      </View>
    </Marker>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nbColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    // Hard-edge Neo Brutalism shadow: offset 2/2, opacity 1, radius 0
    ...nbShadows.sm,
  },
  countText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textAlign: 'center',
  },
});
