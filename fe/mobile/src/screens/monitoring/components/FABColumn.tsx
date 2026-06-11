/**
 * FABColumn Component
 * Right-side FAB column (tools, locate, refresh) with optional tools overlay.
 * Consolidated from MapDashboardScreen lines 745–806.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MapFab } from '../../../components/monitoring/MapFab';
import { ToolsOverlay } from './ToolsOverlay';
import { nbSpacing } from '../../../constants/nbTokens';

const PEEK_HEIGHT = 88;

interface FABColumnProps {
  toolsExpanded: boolean;
  setToolsExpanded: (expanded: boolean) => void;
  handleMyLocation: () => void;
  handleRefresh: () => void;
  resetHeading: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  filterModalVisible: boolean;
  setFilterModalVisible: (visible: boolean) => void;
}

export function FABColumn({
  toolsExpanded,
  setToolsExpanded,
  handleMyLocation,
  handleRefresh,
  resetHeading,
  handleZoomIn,
  handleZoomOut,
  filterModalVisible,
  setFilterModalVisible,
}: FABColumnProps): React.JSX.Element {
  return (
    <>
      {/* Transparent scrim — a tap anywhere outside the tools overlay dismisses it */}
      {toolsExpanded && (
        <Pressable
          style={styles.toolsScrim}
          onPress={() => setToolsExpanded(false)}
          accessibilityLabel="Tutup alat peta"
        />
      )}

      {/* FAB column — MON-3 refactored with tools overlay */}
      <View style={styles.fabColumn}>
        {/* Tools FAB — opens the map-tools overlay (compass, zoom, filter, layers) */}
        <MapFab
          icon="wrench"
          onPress={() => setToolsExpanded(!toolsExpanded)}
          accessibilityLabel="Alat peta"
        />
        {/* Locate me FAB — recenter on a fresh GPS fix */}
        <MapFab
          icon="crosshairs-gps"
          onPress={handleMyLocation}
          accessibilityLabel="Lokasi saya"
        />
        {/* Refresh FAB */}
        <MapFab
          icon="refresh"
          onPress={handleRefresh}
          accessibilityLabel="Perbarui"
        />

        {/* Tools overlay card — a left-anchored popover from the wrench FAB */}
        {toolsExpanded && (
          <ToolsOverlay
            resetHeading={resetHeading}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            filterModalVisible={filterModalVisible}
            setFilterModalVisible={setFilterModalVisible}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabColumn: {
    position: 'absolute',
    right: nbSpacing.md,
    bottom: PEEK_HEIGHT + nbSpacing.md,
    gap: nbSpacing.sm,
    pointerEvents: 'box-none',
  },
  // Invisible full-bleed catcher for outside-taps while the tools overlay is open.
  toolsScrim: {
    ...StyleSheet.absoluteFill,
  },
});
