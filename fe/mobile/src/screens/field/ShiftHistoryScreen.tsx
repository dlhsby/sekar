/**
 * Shift History Screen
 * Displays worker's past shifts with clock-in/out times and duration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBEmptyState, NBBackgroundPattern, NBText } from '../../components/nb';
import { ShiftCard } from '../../components/common';
import { ShiftDetailModal } from '../../components/modals/ShiftDetailModal';
import { getMyShifts } from '../../services/api/shiftsApi';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type { CurrentShiftResponse } from '../../types/api.types';
import type { Shift } from '../../types/models.types';


/**
 * Calculate duration between two dates
 */
function calculateDuration(
  startTime: string,
  endTime: string | null | undefined
): { hours: number; minutes: number; formatted: string } {
  if (!endTime) {
    return { hours: 0, minutes: 0, formatted: '—' }; // Em dash for active shift
  }

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return {
      hours,
      minutes,
      formatted: `${hours}j ${minutes}m`,
    };
  }
  return { hours, minutes, formatted: `${minutes}m` };
}

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function monthKey(dateString: string): string {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES_ID[parseInt(month, 10) - 1]} ${year}`;
}

function groupShiftsByMonth(
  shifts: CurrentShiftResponse[]
): { monthKey: string; shifts: CurrentShiftResponse[] }[] {
  const grouped: { [key: string]: CurrentShiftResponse[] } = {};
  shifts.forEach((shift) => {
    const key = monthKey(shift.clock_in_time);
    if (!grouped[key]) { grouped[key] = []; }
    grouped[key].push(shift);
  });
  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ monthKey: key, shifts: grouped[key] }));
}

function MonthHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.dateHeader}>
      <MaterialCommunityIcons
        name="calendar-month"
        size={16}
        color={nbColors.gray500}
        style={styles.dateIcon}
      />
      <NBText variant="h3" color="gray700">{label}</NBText>
    </View>
  );
}

/**
 * Shift History Screen Component
 */
export function ShiftHistoryScreen(): React.JSX.Element {
  const [shifts, setShifts] = useState<CurrentShiftResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  /**
   * Load shifts from API
   */
  const loadShifts = useCallback(async () => {
    try {
      setError(null);


      const response = await getMyShifts();

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        // Sort by clock_in_time descending (newest first)
        const sortedShifts = [...response.data].sort(
          (a, b) =>
            new Date(b.clock_in_time).getTime() -
            new Date(a.clock_in_time).getTime()
        );
        setShifts(sortedShifts);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat shift');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadShifts();
    setIsRefreshing(false);
  }, [loadShifts]);

  // Load shifts on mount
  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600" style={styles.loadingText}>Memuat riwayat shift...</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <NBEmptyState
            variant="error"
            title="Gagal Memuat Data"
            description={error}
            ctaLabel="Coba Lagi"
            onCTA={loadShifts}
            testID="shift-history-error"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  /**
   * Render empty state
   */
  if (shifts.length === 0) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <NBEmptyState
            variant="noData"
            title="Belum Ada Riwayat Shift"
            description="Riwayat shift Anda akan muncul di sini setelah Anda menyelesaikan shift"
            testID="shift-history-empty"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  const groupedShifts = groupShiftsByMonth(shifts);

  const renderItem = ({
    item,
  }: {
    item: { monthKey: string; shifts: CurrentShiftResponse[] };
  }) => (
    <View>
      <MonthHeader label={monthLabel(item.monthKey)} />
      {item.shifts.map((shift) => (
        <TouchableOpacity
          key={shift.id}
          onPress={() => setSelectedShift(shift)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Detail shift ${shift.area?.name ?? ''}`}
        >
          <ShiftCard shift={shift} />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        {/* Summary Header */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <NBText variant="display" color="primary">{shifts.length}</NBText>
            <NBText variant="caption" color="gray600" style={styles.summaryLabel}>TOTAL SHIFT</NBText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <NBText variant="display" color="primary">
              {shifts.reduce((acc, shift) => {
                if (!shift.clock_out_time) { return acc; }
                const dur = calculateDuration(shift.clock_in_time, shift.clock_out_time);
                return acc + dur.hours + dur.minutes / 60;
              }, 0).toFixed(1)}
            </NBText>
            <NBText variant="caption" color="gray600" style={styles.summaryLabel}>TOTAL JAM</NBText>
          </View>
        </View>

        {/* Shifts List */}
        <FlatList
          data={groupedShifts}
          renderItem={renderItem}
          keyExtractor={(item) => item.monthKey}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[nbColors.primary]}
              tintColor={nbColors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        <ShiftDetailModal
          visible={selectedShift !== null}
          onClose={() => setSelectedShift(null)}
          shift={selectedShift}
        />
      </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // NBBackgroundPattern provides the background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    // Typography handled by NBText variant="body" color="gray600"
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.xl,
    flexGrow: 1,
  },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: nbBorders.widthBase,
    height: 40,
    backgroundColor: nbColors.black,
  },
  summaryLabel: {
    // Typography (fontSize, fontWeight, color) handled by NBText variant="caption" color="gray600"
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Month Header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.xs,
  },
  dateIcon: {
    marginRight: nbSpacing.sm,
  },

});

export default ShiftHistoryScreen;
