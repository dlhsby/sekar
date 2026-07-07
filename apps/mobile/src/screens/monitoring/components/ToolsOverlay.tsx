/**
 * ToolsOverlay Component
 * Left-anchored popover from the wrench FAB: map camera controls (zoom, heading,
 * my-location), map-layer visibility toggles ("Tampilan"), and the filter entry.
 */

import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';
import { NBText } from '../../../components/nb/NBText';
import { LAYER_ROWS } from '../../../components/monitoring/monitoringLayers';
import type { MonitoringV2VisibleLayers } from '../../../store/slices/monitoringV2Slice';

interface ToolsOverlayProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onMyLocation: () => void;
  resetHeading: () => void;
  visibleLayers: MonitoringV2VisibleLayers;
  onToggleLayer: (key: keyof MonitoringV2VisibleLayers) => void;
  filterModalVisible: boolean;
  setFilterModalVisible: (visible: boolean) => void;
}

function ToolActionRow({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.toolRow, active && styles.toolRowActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.toolIconChip}>
        <MaterialCommunityIcons name={icon} size={16} color={nbColors.black} />
      </View>
      <NBText variant="body-sm">{label}</NBText>
    </TouchableOpacity>
  );
}

/** A layer visibility row — icon + label + an eye toggle (on = visible). */
function LayerToggleRow({
  icon,
  label,
  visible,
  onPress,
}: {
  icon: string;
  label: string;
  visible: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[styles.toolRow, visible && styles.toolRowActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="switch"
      accessibilityState={{ checked: visible }}
      accessibilityLabel={label}
    >
      <View style={styles.toolIconChip}>
        <MaterialCommunityIcons name={icon} size={16} color={nbColors.black} />
      </View>
      <NBText variant="body-sm" style={styles.layerLabel}>{label}</NBText>
      <MaterialCommunityIcons
        name={visible ? 'eye' : 'eye-off-outline'}
        size={18}
        color={visible ? nbColors.statusActive : nbColors.gray400}
        accessibilityLabel={visible ? t('common:ui.visible') : t('common:ui.hidden')}
      />
    </TouchableOpacity>
  );
}

export function ToolsOverlay({
  onZoomIn,
  onZoomOut,
  onMyLocation,
  resetHeading,
  visibleLayers,
  onToggleLayer,
  filterModalVisible,
  setFilterModalVisible,
}: ToolsOverlayProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <ScrollView
      style={styles.toolsOverlay}
      contentContainerStyle={styles.toolsOverlayContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Map camera controls */}
      <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
        {t('monitoring:tools.mapSection')}
      </NBText>
      <ToolActionRow icon="plus" label={t('monitoring:tools.zoomIn')} onPress={onZoomIn} />
      <ToolActionRow icon="minus" label={t('monitoring:tools.zoomOut')} onPress={onZoomOut} />
      <ToolActionRow icon="crosshairs-gps" label={t('monitoring:tools.myLocation')} onPress={onMyLocation} />
      <ToolActionRow icon="compass-outline" label={t('monitoring:tools.resetHeading')} onPress={resetHeading} />

      {/* Map-layer visibility toggles */}
      <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
        {t('monitoring:tools.layersSection')}
      </NBText>
      {LAYER_ROWS.map(row => (
        <LayerToggleRow
          key={row.key}
          icon={row.icon}
          label={t(`monitoring:layers.${row.key}`)}
          visible={visibleLayers[row.key]}
          onPress={() => onToggleLayer(row.key)}
        />
      ))}

      {/* Filter (status / area / jabatan) */}
      <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
        {t('monitoring:tools.filterSection')}
      </NBText>
      <ToolActionRow
        icon="filter-variant"
        label={t('monitoring:tools.filter')}
        active={filterModalVisible}
        onPress={() => setFilterModalVisible(true)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toolsOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 44 + nbSpacing.sm,
    width: 220,
    maxHeight: 420,
    borderRadius: nbRadius.md,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  toolsOverlayContent: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
  },
  toolsHeader: {
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
    color: nbColors.black,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs + 2,
    paddingHorizontal: nbSpacing.xs,
    marginVertical: nbSpacing.xs - 2,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  toolRowActive: {
    backgroundColor: nbColors.bgAccentMint,
  },
  toolIconChip: {
    width: 24,
    height: 24,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.white,
  },
  layerLabel: {
    flex: 1,
  },
});
