/**
 * FABColumn Component
 * Right-side FAB column (tools, locate, refresh) with optional tools overlay.
 * Consolidated from MapDashboardScreen lines 745–806.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapFab } from '../../../components/monitoring/MapFab';
import { ToolsOverlay } from './ToolsOverlay';
import { nbSpacing } from '../../../constants/nbTokens';

interface FABColumnProps {
  toolsExpanded: boolean;
  setToolsExpanded: (expanded: boolean) => void;
  /** Opens the monitoring status-summary sheet. */
  onOpenStatus: () => void;
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
  onOpenStatus,
  handleMyLocation,
  handleRefresh,
  resetHeading,
  handleZoomIn,
  handleZoomOut,
  filterModalVisible,
  setFilterModalVisible,
}: FABColumnProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <>
      {/* Transparent scrim — a tap anywhere outside the tools overlay dismisses it */}
      {toolsExpanded && (
        <Pressable
          style={styles.toolsScrim}
          onPress={() => setToolsExpanded(false)}
          accessibilityLabel={t('monitoring:fab.closeTools')}
        />
      )}

      {/* FAB column — MON-3 refactored with tools overlay */}
      <View style={styles.fabColumn}>
        {/* Status summary FAB — opens the petugas status-summary sheet */}
        <MapFab
          icon="account-group"
          onPress={onOpenStatus}
          accessibilityLabel={t('monitoring:fab.status')}
        />
        {/* Tools FAB — opens the map-tools overlay (compass, zoom, filter, layers) */}
        <MapFab
          icon="wrench"
          onPress={() => setToolsExpanded(!toolsExpanded)}
          accessibilityLabel={t('monitoring:fab.tools')}
        />
        {/* Locate me FAB — recenter on a fresh GPS fix */}
        <MapFab
          icon="crosshairs-gps"
          onPress={handleMyLocation}
          accessibilityLabel={t('monitoring:fab.myLocation')}
        />
        {/* Refresh FAB */}
        <MapFab
          icon="refresh"
          onPress={handleRefresh}
          accessibilityLabel={t('monitoring:fab.refresh')}
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
    bottom: nbSpacing.md,
    gap: nbSpacing.sm,
    pointerEvents: 'box-none',
  },
  // Invisible full-bleed catcher for outside-taps while the tools overlay is open.
  toolsScrim: {
    ...StyleSheet.absoluteFill,
  },
});
