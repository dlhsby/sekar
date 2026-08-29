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
import { layerRows, type LayerFacet } from '../../../components/monitoring/monitoringLayers';
import { toggleFacet } from '../../../utils/layerVisibility';
import { MODE_OPTIONS } from '../../../components/monitoring/monitoringLayers';
import type { MonitoringV2VisibleLayers, MonitoringMode } from '../../../store/slices/monitoringV2Slice';

interface ToolsOverlayProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onMyLocation: () => void;
  resetHeading: () => void;
  visibleLayers: MonitoringV2VisibleLayers;
  onSetLayer: (key: keyof MonitoringV2VisibleLayers, value: string[] | boolean) => void;
  mode: MonitoringMode;
  onSetMode: (mode: MonitoringMode) => void;
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

/**
 * A layer row whose facets are INDEPENDENT chips — outline, fill, marker — each
 * toggling on tap.
 *
 * This replaced a tap-to-cycle row over four named states. Cycling made a two-
 * facet change take up to three taps and hid the options you were not on; the
 * chips show the whole row at once and each tap means exactly one thing. It is
 * also the shape web now uses, so the two platforms read the same.
 */
function LayerFacetRow({
  icon,
  label,
  facets,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  facets: LayerFacet[];
  value: readonly string[];
  onToggle: (facet: string) => void;
}): React.JSX.Element {
  const hidden = value.length === 0;
  return (
    <View style={[styles.toolRow, styles.facetRow, !hidden && styles.toolRowActive]}>
      <View style={styles.toolIconChip}>
        <MaterialCommunityIcons name={icon} size={16} color={nbColors.black} />
      </View>
      <View style={styles.facetBody}>
        <NBText variant="body-sm" style={styles.layerLabel}>{label}</NBText>
        <View style={styles.facetChips}>
          {facets.map(f => {
            const on = value.includes(f.value);
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.facetChip, on && styles.facetChipOn]}
                onPress={() => onToggle(f.value)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${label}: ${f.label}`}
              >
                <NBText variant="mono-sm" color={on ? 'black' : 'gray400'}>
                  {f.label}
                </NBText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function ToolsOverlay({
  onZoomIn,
  onZoomOut,
  onMyLocation,
  resetHeading,
  visibleLayers,
  onSetLayer,
  mode,
  onSetMode,
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

      {/* Monitoring mode (ADR-060) — how much of the hierarchy draws at once. */}
      <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
        {t('monitoring:mode.title')}
      </NBText>
      {/* Three chips, not a toggle: a two-state button cannot express three
          modes, and cycling would hide the option you are not on. Same shape as
          the layer facets below, and as web's select. */}
      <View style={styles.modeRow}>
        {MODE_OPTIONS.map(o => {
          const on = mode === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.modeChip, on && styles.modeChipOn]}
              onPress={() => onSetMode(o.value)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(o.labelKey)}
            >
              <NBText variant="mono-sm" color={on ? 'black' : 'gray400'}>
                {t(o.labelKey)}
              </NBText>
            </TouchableOpacity>
          );
        })}
      </View>
      <NBText variant="caption" color="gray500" style={styles.modeHint}>
        {t(`monitoring:mode.${mode}Hint`)}
      </NBText>

      {/* Map-layer visibility toggles */}
      <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
        {t('monitoring:tools.layersSection')}
      </NBText>
      {layerRows().map(row =>
        row.facets ? (
          <LayerFacetRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            facets={row.facets}
            value={(visibleLayers[row.key] as string[]) ?? []}
            onToggle={facet =>
              onSetLayer(row.key, toggleFacet(row.key, visibleLayers[row.key] as string[], facet))
            }
          />
        ) : (
          <LayerToggleRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            visible={Boolean(visibleLayers[row.key])}
            onPress={() => onSetLayer(row.key, !visibleLayers[row.key])}
          />
        ),
      )}

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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  modeChip: {
    borderWidth: 2,
    borderColor: nbColors.black,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: nbColors.white,
  },
  modeChipOn: {
    backgroundColor: nbColors.primary,
  },
  modeHint: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  facetRow: {
    alignItems: 'flex-start',
  },
  facetBody: {
    flex: 1,
    gap: 6,
  },
  facetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  facetChip: {
    borderWidth: 2,
    borderColor: nbColors.black,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: nbColors.white,
  },
  facetChipOn: {
    backgroundColor: nbColors.primary,
  },
  layerLabel: {
    flex: 1,
  },
});
