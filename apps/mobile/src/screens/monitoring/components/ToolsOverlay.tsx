/**
 * ToolsOverlay Component
 * Left-anchored popover with map controls (compass, zoom) and filter entry.
 * Consolidated from MapDashboardScreen lines 768–805.
 */

import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';
import { NBText } from '../../../components/nb/NBText';

interface ToolsOverlayProps {
  resetHeading: () => void;
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

export function ToolsOverlay({
  resetHeading,
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
      {/* Map controls — zoom is now the native Google control; keep heading reset. */}
      <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
        {t('monitoring:tools.mapSection')}
      </NBText>
      <ToolActionRow
        icon="compass-outline"
        label={t('monitoring:tools.resetHeading')}
        onPress={resetHeading}
      />

      {/* Filter (status / area / jabatan / layer visibility) */}
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
    width: 210,
    maxHeight: 360,
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
});
