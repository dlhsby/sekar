/**
 * FilterBar — shared filter UI for tasks/activities
 * Displays active filter chips, sort/filter buttons, badge count.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../../constants/nbTokens';

export type FilterBarType = 'tasks' | 'activities';

export interface FilterChip {
  text: string;
  style: any;
}

interface FilterBarProps {
  type: FilterBarType;
  filterCount: number;
  chips: FilterChip[];
  isSortActive: boolean;
  onSortPress: () => void;
  onFilterPress: () => void;
  onReset: () => void;
}

export function FilterBar({
  type,
  filterCount,
  chips,
  isSortActive,
  onSortPress,
  onFilterPress,
  onReset,
}: FilterBarProps): React.JSX.Element {
  const label = type === 'tasks' ? 'tugas' : 'aktivitas';

  return (
    <View style={[styles.filterBarCollapsed, filterCount > 0 && styles.filterBarActive]}>
      <View style={styles.filterBarLeft}>
        {chips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.miniChipsContent}
          >
            {chips.map((chip, i) => (
              <View key={i} style={[styles.miniChip, chip.style]}>
                <NBText variant="caption" style={styles.miniChipText}>{chip.text}</NBText>
              </View>
            ))}
          </ScrollView>
        ) : (
          <NBText variant="body-sm" color="gray400" style={styles.filterBarPlaceholder}>Semua {label}</NBText>
        )}
        {filterCount > 0 && (
          <TouchableOpacity
            style={styles.filterClearButton}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel={`Reset filter ${label}`}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterBarRight}>
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={onSortPress}
          accessibilityRole="button"
          accessibilityLabel="Urutkan"
        >
          <MaterialCommunityIcons
            name="sort"
            size={22}
            color={isSortActive ? nbColors.primary : nbColors.black}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel={`Filter ${label}${filterCount > 0 ? `, ${filterCount} filter aktif` : ''}`}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={22}
            color={filterCount > 0 ? nbColors.primary : nbColors.black}
          />
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <NBText variant="caption" color="white" style={styles.filterBadgeText}>{filterCount}</NBText>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBarCollapsed: {
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
  filterBarActive: {
    borderBottomColor: nbColors.primary,
  },
  filterBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  filterBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: nbSpacing.xs,
  },
  filterBarPlaceholder: {
    fontStyle: 'italic',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterClearButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterBadge: {
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
  filterBadgeText: {},
  miniChipsContent: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  miniChip: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    height: 32,
    justifyContent: 'center',
  },
  miniChipAssignment: {
    backgroundColor: nbColors.primary,
  },
  miniChipStatus: {
    backgroundColor: nbColors.info,
  },
  miniChipDate: {
    backgroundColor: nbColors.warning,
  },
  miniChipLocation: {
    backgroundColor: nbColors.infoLight,
  },
  miniChipText: {},
});
