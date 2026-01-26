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
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { EmptyState, SkeletonLoader } from '../../components/common';
import { NBCard } from '../../components/nb';
import { getMyShifts } from '../../services/api/shiftsApi';
import { getToken, getRefreshToken } from '../../services/storage/secureStorage';
import { isTokenExpired, getTokenTimeRemaining } from '../../utils/tokenUtils';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
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
    return { hours: 0, minutes: 0, formatted: 'Belum selesai' };
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
 * Shift Card Component
 */
interface ShiftCardProps {
  shift: CurrentShiftResponse;
}

function ShiftCard({ shift }: ShiftCardProps): React.JSX.Element {
  const duration = calculateDuration(shift.clock_in_time, shift.clock_out_time);
  const isActive = !shift.clock_out_time;

  return (
    <NBCard style={styles.shiftCard} variant="outlined">
      <View style={styles.shiftHeader}>
        <View style={styles.areaInfo}>
          <Text style={styles.areaName} numberOfLines={1}>
            {shift.area?.name || 'Area tidak diketahui'}
          </Text>
          {shift.area?.area_type?.name && (
            <Text style={styles.areaType}>{shift.area.area_type.name}</Text>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusActive : styles.statusCompleted,
          ]}>
          <Text
            style={[
              styles.statusText,
              isActive ? styles.statusTextActive : styles.statusTextCompleted,
            ]}>
            {isActive ? 'Aktif' : 'Selesai'}
          </Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeItem}>
          <MaterialCommunityIcons
            name="login"
            size={18}
            color={colors.success}
            style={styles.timeIcon}
          />
          <View>
            <Text style={styles.timeLabel}>Clock In</Text>
            <Text style={styles.timeValue}>{formatTime(shift.clock_in_time)}</Text>
          </View>
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeItem}>
          <MaterialCommunityIcons
            name="logout"
            size={18}
            color={isActive ? colors.gray400 : colors.error}
            style={styles.timeIcon}
          />
          <View>
            <Text style={styles.timeLabel}>Clock Out</Text>
            <Text style={[styles.timeValue, isActive && styles.timeValueInactive]}>
              {shift.clock_out_time ? formatTime(shift.clock_out_time) : '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeItem}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={18}
            color={colors.primary}
            style={styles.timeIcon}
          />
          <View>
            <Text style={styles.timeLabel}>Durasi</Text>
            <Text style={[styles.timeValue, styles.durationValue]}>
              {duration.formatted}
            </Text>
          </View>
        </View>
      </View>
    </NBCard>
  );
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
        color={colors.textSecondary}
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

        console.log('[ShiftHistory] 📊 Token Status:');
        console.log('[ShiftHistory]   - Access token exists:', !!token);
        console.log('[ShiftHistory]   - Refresh token exists:', !!refreshToken);
        console.log('[ShiftHistory]   - Token expired:', expired);
        console.log('[ShiftHistory]   - Time remaining (min):', timeRemaining);

        if (token) {
          console.log('[ShiftHistory]   - Token preview:', token.substring(0, 30) + '...');
        }
      }

      const response = await getMyShifts();

      if (response.error) {
        console.error('[ShiftHistory] ❌ API Error:', response.error);
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
        console.log('[ShiftHistory] ✅ Loaded', sortedShifts.length, 'shifts');
      }
    } catch (err: any) {
      console.error('[ShiftHistory] ❌ Exception:', err);
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
      <View style={styles.container}>
        <SkeletonLoader type="list" count={5} />
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState
          variant="error"
          description={error}
          ctaLabel="Coba Lagi"
          onCtaPress={loadShifts}
        />
      </View>
    );
  }

  /**
   * Render empty state
   */
  if (shifts.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState variant="shifts" />
      </View>
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
    <View style={styles.container}>
      {/* Summary Header */}
      <NBCard variant="elevated" style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{shifts.length}</Text>
          <Text style={styles.summaryLabel}>Total Shift</Text>
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
          <Text style={styles.summaryLabel}>Total Jam</Text>
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  summaryValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Date Header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  dateIcon: {
    marginRight: spacing.sm,
  },
  dateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },

  // Shift Card
  shiftCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  areaInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  areaName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  areaType: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  statusActive: {
    backgroundColor: colors.successLight || `${colors.success}20`,
  },
  statusCompleted: {
    backgroundColor: colors.gray200,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextCompleted: {
    color: colors.textSecondary,
  },

  // Time Row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: spacing.xs,
  },
  timeDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  timeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  timeValueInactive: {
    color: colors.gray400,
  },
  durationValue: {
    color: colors.primary,
  },
});

export default ShiftHistoryScreen;
