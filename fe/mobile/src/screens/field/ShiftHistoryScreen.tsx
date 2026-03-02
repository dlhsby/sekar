/**
 * Shift History Screen
 * Displays worker's past shifts with clock-in/out times and duration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBEmptyState, NBBackgroundPattern } from '../../components/nb';
import { ShiftCard } from '../../components/common';
import { getMyShifts } from '../../services/api/shiftsApi';
import { getToken, getRefreshToken } from '../../services/storage/secureStorage';
import { isTokenExpired, getTokenTimeRemaining } from '../../utils/tokenUtils';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorderRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type { CurrentShiftResponse } from '../../types/api.types';


/**
 * Format date to Indonesian format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return date.toLocaleDateString('id-ID', options);
}

/**
 * Format time to HH:MM
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

/**
 * Group shifts by date for section list
 */
function groupShiftsByDate(
  shifts: CurrentShiftResponse[]
): { date: string; shifts: CurrentShiftResponse[] }[] {
  const grouped: { [key: string]: CurrentShiftResponse[] } = {};

  shifts.forEach((shift) => {
    const date = new Date(shift.clock_in_time).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(shift);
  });

  // Sort dates in descending order (newest first)
  return Object.keys(grouped)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map((date) => ({
      date,
      shifts: grouped[date],
    }));
}


/**
 * Date Header Component
 */
interface DateHeaderProps {
  date: string;
}

function DateHeader({ date }: DateHeaderProps): React.JSX.Element {
  return (
    <View style={styles.dateHeader}>
      <MaterialCommunityIcons
        name="calendar"
        size={16}
        color={nbColors.gray['500']}
        style={styles.dateIcon}
      />
      <Text style={styles.dateText}>{formatDate(date)}</Text>
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

  /**
   * Load shifts from API
   */
  const loadShifts = useCallback(async () => {
    try {
      setError(null);

      // DEBUG: Check token status before making API call
      if (__DEV__) {
        const token = await getToken();
        const refreshToken = await getRefreshToken();
        const expired = await isTokenExpired();
        const timeRemaining = await getTokenTimeRemaining();

        // Token debug info available via: token, refreshToken, expired, timeRemaining
      }

      const response = await getMyShifts();

      if (response.error) {
        if (__DEV__) { console.error('[ShiftHistory] API Error:', response.error); }
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
        // Loaded shifts successfully
      }
    } catch (err: any) {
      if (__DEV__) { console.error('[ShiftHistory] Exception:', err); }
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
          <Text style={styles.loadingText}>Memuat riwayat shift...</Text>
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

  // Group shifts by date
  const groupedShifts = groupShiftsByDate(shifts);

  /**
   * Render shift item with date header
   */
  const renderItem = ({
    item,
    index,
  }: {
    item: { date: string; shifts: CurrentShiftResponse[] };
    index: number;
  }) => {
    return (
      <View>
        <DateHeader date={item.date} />
        {item.shifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} />
        ))}
      </View>
    );
  };

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        {/* Summary Header */}
        <NBCard variant="elevated" style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{shifts.length}</Text>
            <Text style={styles.summaryLabel}>TOTAL SHIFT</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {shifts.reduce((acc, shift) => {
                if (!shift.clock_out_time) {return acc;}
                const duration = calculateDuration(
                  shift.clock_in_time,
                  shift.clock_out_time
                );
                return acc + duration.hours + duration.minutes / 60;
              }, 0).toFixed(1)}
            </Text>
            <Text style={styles.summaryLabel}>TOTAL JAM</Text>
          </View>
        </NBCard>

        {/* Shifts List */}
        <FlatList
          data={groupedShifts}
          renderItem={renderItem}
          keyExtractor={(item) => item.date}
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
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
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
    marginBottom: nbSpacing.sm,
    paddingVertical: 12, // Compact style (was lg: 24px)
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: nbBorders.base, // 3px for NB consistency
    height: 40,
    backgroundColor: nbColors.black, // Bold divider for NB
  },
  summaryValue: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
    marginBottom: nbSpacing.xs,
  },
  summaryLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['600'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Date Header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.xs,
  },
  dateIcon: {
    marginRight: nbSpacing.sm,
  },
  dateText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
  },

});

export default ShiftHistoryScreen;
