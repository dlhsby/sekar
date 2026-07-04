/**
 * FilterBar — the shared filter/sort header used by every list screen
 * (Tugas, Aktivitas, Lembur, Kehadiran). Renders active-filter chips, a reset
 * affordance, and sort/filter icon buttons with an active-count badge.
 *
 * Chips carry a `tone` (mapped to a token colour here) rather than a style, so
 * every list gets the same chip palette.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

export type FilterChipTone = 'status' | 'date' | 'location' | 'assignment';

export interface FilterChip {
  text: string;
  tone: FilterChipTone;
}

const TONE_STYLE: Record<FilterChipTone, ViewStyle> = {
  status: { backgroundColor: nbColors.info },
  date: { backgroundColor: nbColors.warning },
  location: { backgroundColor: nbColors.infoLight },
  assignment: { backgroundColor: nbColors.primary },
};

interface FilterBarProps {
  /** Noun shown in the empty placeholder, e.g. "Tugas" → "Semua Tugas". */
  label: string;
  filterCount: number;
  chips: FilterChip[];
  isSortActive: boolean;
  onSortPress: () => void;
  onFilterPress: () => void;
  onReset: () => void;
  /** Extra outer style — list screens without a padded wrapper pass margins. */
  style?: StyleProp<ViewStyle>;
}

export function FilterBar({
  label,
  filterCount,
  chips,
  isSortActive,
  onSortPress,
  onFilterPress,
  onReset,
  style,
}: FilterBarProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, filterCount > 0 && styles.barActive, style]}>
      <View style={styles.left}>
        {chips.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {chips.map((chip, i) => (
              <View key={i} style={[styles.chip, TONE_STYLE[chip.tone]]}>
                <NBText variant="caption" color="black">{chip.text}</NBText>
              </View>
            ))}
          </ScrollView>
        ) : (
          <NBText variant="body-sm" color="gray400" style={styles.placeholder}>{t('components:ui.all')} {label}</NBText>
        )}
        {filterCount > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel={`Reset filter ${label}`}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onSortPress}
          accessibilityRole="button"
          accessibilityLabel={t('components:ui.sort')}
        >
          <MaterialCommunityIcons name="sort" size={22} color={isSortActive ? nbColors.primary : nbColors.black} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel={`Filter ${label}${filterCount > 0 ? `, ${filterCount} ${t('components:ui.activeFilters')}` : ''}`}
        >
          <MaterialCommunityIcons name="filter-variant" size={22} color={filterCount > 0 ? nbColors.primary : nbColors.black} />
          {filterCount > 0 && (
            <View style={styles.badge}>
              <NBText variant="caption" color="white">{filterCount}</NBText>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.gray300,
    ...nbShadows.md,
    marginBottom: nbSpacing.sm,
    minHeight: 48,
  },
  barActive: {
    borderBottomColor: nbColors.primary,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: nbSpacing.xs,
  },
  placeholder: {
    fontStyle: 'italic',
  },
  chipsContent: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  chip: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    height: 32,
    justifyContent: 'center',
  },
  clearButton: {
    padding: nbSpacing.xs,
    marginLeft: nbSpacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: nbSpacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: nbColors.danger,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FilterBar;
