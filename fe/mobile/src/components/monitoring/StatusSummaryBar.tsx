/**
 * StatusSummaryBar Component
 * Phase 2D: Horizontal bar showing four-status counts as tappable chips.
 * Tapping a chip filters the map to show only that status.
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// react-native-gesture-handler's ScrollView is the correct nested scroller
// inside @gorhom/bottom-sheet. Its native gesture handler coordinates with
// the sheet's pan handler so horizontal drags don't get swallowed by either
// the sheet's vertical pan or the parent BottomSheetFlatList that hosts this
// bar in its ListHeaderComponent.
//
// `BottomSheetScrollView` from gorhom is wrong for this case — that one is
// meant to be the PRIMARY content scroll inside the sheet, not a nested
// horizontal carousel; using it here resulted in completely unscrollable
// chips on Android (the sheet's vertical handler captured every pan).
import { ScrollView } from 'react-native-gesture-handler';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { getStatusColor, getStatusLabel } from '../../utils/mapUtils';
import type { TrackingStatus } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusCounts {
  active: number;
  inactive: number;
  outside_area: number;
  missing: number;
  offline: number;
}

interface StatusSummaryBarProps {
  statusCounts: StatusCounts;
  activeFilter: TrackingStatus | null;
  onFilterChange: (status: TrackingStatus | null) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DISPLAYED_STATUSES: TrackingStatus[] = [
  'active',
  'inactive',
  'outside_area',
  'missing',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusSummaryBar({
  statusCounts,
  activeFilter,
  onFilterChange,
}: StatusSummaryBarProps): React.JSX.Element {
  const handleChipPress = useCallback(
    (status: TrackingStatus) => {
      onFilterChange(activeFilter === status ? null : status);
    },
    [activeFilter, onFilterChange],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        // Android's underlying ScrollView host needs nestedScrollEnabled to opt
        // into NestedScrollingChild so the parent FlatList lets us consume the
        // horizontal pan; iOS ignores the prop without harm.
        nestedScrollEnabled
      >
        {DISPLAYED_STATUSES.map(status => (
          <StatusChip
            key={status}
            status={status}
            count={statusCounts[status] ?? 0}
            isActive={activeFilter === status}
            onPress={handleChipPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── StatusChip sub-component ─────────────────────────────────────────────────

interface StatusChipProps {
  status: TrackingStatus;
  count: number;
  isActive: boolean;
  onPress: (status: TrackingStatus) => void;
}

function StatusChip({ status, count, isActive, onPress }: StatusChipProps): React.JSX.Element {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isActive && { backgroundColor: color, borderColor: nbColors.black },
      ]}
      onPress={() => onPress(status)}
      activeOpacity={0.75}
      accessibilityLabel={`Filter ${label}: ${count}`}
      accessibilityRole="button"
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.countText,
          isActive && styles.countTextActive,
        ]}
      >
        {count}
      </Text>
      <Text
        style={[
          styles.labelText,
          isActive && styles.labelTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.gray['300'],
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.gray['100'],
    borderRadius: nbBorderRadius.full,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['300'],
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    gap: nbSpacing.xs,
    ...nbShadows.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
  },
  countTextActive: {
    color: nbColors.white,
  },
  labelText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
  },
  labelTextActive: {
    color: nbColors.white,
  },
});
