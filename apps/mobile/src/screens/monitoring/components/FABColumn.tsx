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
import type { MonitoringV2VisibleLayers } from '../../../store/slices/monitoringV2Slice';

interface FABColumnProps {
  toolsExpanded: boolean;
  setToolsExpanded: (expanded: boolean) => void;
  /** Opens the monitoring status-summary sheet. */
  onOpenStatus: () => void;
  handleRefresh: () => void;
  resetHeading: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onMyLocation: () => void;
  visibleLayers: MonitoringV2VisibleLayers;
  onToggleLayer: (key: keyof MonitoringV2VisibleLayers) => void;
  filterModalVisible: boolean;
  setFilterModalVisible: (visible: boolean) => void;
}

export function FABColumn({
  toolsExpanded,
  setToolsExpanded,
  onOpenStatus,
  handleRefresh,
  resetHeading,
  onZoomIn,
  onZoomOut,
  onMyLocation,
  visibleLayers,
  onToggleLayer,
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
        {/* Tools FAB — opens the map-tools overlay (zoom, my-location, compass,
            layer visibility, filter). */}
        <MapFab
          icon="wrench"
          onPress={() => setToolsExpanded(!toolsExpanded)}
          accessibilityLabel={t('monitoring:fab.tools')}
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
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onMyLocation={onMyLocation}
            resetHeading={resetHeading}
            visibleLayers={visibleLayers}
            onToggleLayer={onToggleLayer}
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
