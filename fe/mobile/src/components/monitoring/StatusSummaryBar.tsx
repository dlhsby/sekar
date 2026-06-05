/**
 * StatusSummaryBar Component
 * Phase 2D: bar showing the four-status counts as tappable cards.
 * Tapping a card filters the map to show only that status.
 *
 * Phase 4 M3 (CP2): merged the peek status row + the old "Ringkasan" tile grid
 * into this single surface. The statuses render as fixed-size tone-tinted cards
 * (big count + status dot + mono label) in a horizontal scroller — fixed width
 * AND height keep the cards symmetrical regardless of label length, and the
 * scroll content is padded on every side so the hard-edge shadow has room
 * instead of being clipped at the viewport edges. The active card gets a black
 * border + heavier shadow.
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
// react-native-gesture-handler's ScrollView is the correct nested scroller
// inside @gorhom/bottom-sheet — its native gesture handler coordinates with the
// sheet's pan handler so horizontal drags aren't swallowed by the sheet's
// vertical pan or the parent BottomSheetFlatList hosting this bar.
import { ScrollView } from 'react-native-gesture-handler';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { presencePill } from '../../utils/statusHelpers';
import { getStatusColor } from '../../utils/mapUtils';
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

const STATUS_BG: Record<TrackingStatus, string> = {
  active: nbColors.statusActiveBg,
  inactive: nbColors.statusIdleBg,
  outside_area: nbColors.statusOutsideBg,
  missing: nbColors.statusMissingBg,
  offline: nbColors.statusOfflineBg,
};

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
  const { label } = presencePill(status);
  const accent = getStatusColor(status);

  return (
    <TouchableOpacity
      onPress={() => onPress(status)}
      activeOpacity={0.75}
      accessibilityLabel={`Filter ${label}: ${count}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={`status-chip-${status}`}
    >
      <View
        style={[
          styles.chip,
          { backgroundColor: STATUS_BG[status], borderColor: accent },
          isActive && styles.chipActive,
        ]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <NBText variant="h3" color="black">{count}</NBText>
        <NBText variant="mono-sm" uppercase color="gray700" style={styles.chipLabel}>
          {label}
        </NBText>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray300,
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  // Auto-width: the card hugs its content (dot + count + label on one row).
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    ...nbShadows.xs,
  },
  // Active filter: black ring + heavier hard-edge shadow over the tone fill.
  chipActive: {
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: nbColors.black,
  },
  chipLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
