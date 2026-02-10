/**
 * ShiftCard Component
 * Displays shift information in a card format
 * Used in ShiftHistoryScreen and TodayWorkHoursModal
 *
 * Features:
 * - Horizontal layout (3 columns: Clock In | Clock Out | Duration)
 * - Area info + Status badge in header
 * - Active shift indicator
 * - Date or shift number display options
 * - Consistent with ShiftHistoryScreen design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
} from '../../constants/nbTokens';
import { formatTime, calculateDuration } from '../../utils/dateUtils';
import { NBCard } from '../nb';
import type { Shift } from '../../types/models.types';

interface ShiftCardProps {
  shift: Shift;
  showDate?: boolean;        // Show date header above card (for history, handled by parent)
  shiftNumber?: number;       // Display "Shift #N" label (for today's modal)
  compact?: boolean;          // Use compact padding
}

export function ShiftCard({
  shift,
  shiftNumber,
  compact = false,
}: ShiftCardProps): JSX.Element {
  const isActive = !shift.clock_out_time;

  // Calculate duration (use current time if shift is still active)
  const duration = calculateDuration(
    new Date(shift.clock_in_time),
    shift.clock_out_time ? new Date(shift.clock_out_time) : new Date()
  );

  return (
    <NBCard style={[styles.card, compact && styles.cardCompact]} variant="outlined">
      {/* Header: Area Info + Status Badge */}
      <View style={styles.header}>
        <View style={styles.areaInfo}>
          {shiftNumber ? (
            <Text style={styles.shiftNumber}>Shift #{shiftNumber}</Text>
          ) : (
            <>
              <Text style={styles.areaName} numberOfLines={1}>
                {shift.area?.name || 'Area tidak diketahui'}
              </Text>
              {shift.area?.area_type?.name && (
                <Text style={styles.areaType}>{shift.area.area_type.name}</Text>
              )}
            </>
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
            {isActive ? 'AKTIF' : 'SELESAI'}
          </Text>
        </View>
      </View>

      {/* Time Row: 3 columns with dividers */}
      <View style={styles.timeRow}>
        {/* Clock In */}
        <View style={styles.timeItem}>
          <MaterialCommunityIcons
            name="login"
            size={18}
            color={nbColors.success}
            style={styles.timeIcon}
          />
          <View>
            <Text style={styles.timeLabel}>CLOCK IN</Text>
            <Text style={styles.timeValue}>{formatTime(shift.clock_in_time)}</Text>
          </View>
        </View>

        <View style={styles.timeDivider} />

        {/* Clock Out */}
        <View style={styles.timeItem}>
          <MaterialCommunityIcons
            name="logout"
            size={18}
            color={isActive ? nbColors.gray['400'] : nbColors.danger}
            style={styles.timeIcon}
          />
          <View>
            <Text style={styles.timeLabel}>CLOCK OUT</Text>
            <Text style={[styles.timeValue, isActive && styles.timeValueInactive]}>
              {shift.clock_out_time ? formatTime(shift.clock_out_time) : '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.timeDivider} />

        {/* Duration */}
        <View style={styles.timeItem}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={18}
            color={nbColors.primary}
            style={styles.timeIcon}
          />
          <View>
            <Text style={styles.timeLabel}>DURASI</Text>
            <Text style={[styles.timeValue, styles.durationValue]}>
              {duration.formatted}
            </Text>
          </View>
        </View>
      </View>
    </NBCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: nbSpacing.sm,
    padding: 12, // Compact padding (matches ShiftHistoryScreen)
  },

  cardCompact: {
    padding: nbSpacing.xs,
  },

  // Header (Area + Status)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nbSpacing.md,
  },

  areaInfo: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },

  areaName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
    marginBottom: nbSpacing.xs / 2,
  },

  areaType: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
  },

  shiftNumber: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['700'],
  },

  statusBadge: {
    width: 70, // Fixed width for consistency
    paddingVertical: nbSpacing.xs / 2,
    borderRadius: nbBorderRadius.sm,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusActive: {
    backgroundColor: nbColors.success,
  },

  statusCompleted: {
    backgroundColor: nbColors.gray['200'],
  },

  statusText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  statusTextActive: {
    color: nbColors.white,
  },

  statusTextCompleted: {
    color: nbColors.gray['600'],
  },

  // Time Row (3 columns)
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
    marginRight: nbSpacing.xs,
  },

  timeDivider: {
    width: nbBorders.thin,
    height: 32,
    backgroundColor: nbColors.black,
    marginHorizontal: nbSpacing.sm,
  },

  timeLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['600'],
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  timeValue: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['700'],
  },

  timeValueInactive: {
    color: nbColors.gray['400'],
  },

  durationValue: {
    color: nbColors.primary,
  },
});
