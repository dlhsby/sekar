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
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { formatTime, calculateDuration } from '../../utils/dateUtils';
import { NBCard, NBText } from '../nb';
import type { Shift } from '../../types/models.types';

interface ShiftCardProps {
  shift: Shift;
  showDate?: boolean;        // Show date header above card (for history, handled by parent)
  shiftNumber?: number;       // Display "Shift #N" label (for today's modal)
  compact?: boolean;          // Use compact padding
  onPress?: () => void;       // When set, the card is tappable (e.g. open shift detail)
}

export function ShiftCard({
  shift,
  shiftNumber,
  compact = false,
  onPress,
}: ShiftCardProps): React.JSX.Element {
  const isActive = !shift.clock_out_time;

  // Calculate duration (use current time if shift is still active)
  const duration = calculateDuration(
    new Date(shift.clock_in_time),
    shift.clock_out_time ? new Date(shift.clock_out_time) : new Date()
  );

  const card = (
    <NBCard style={[styles.card, compact && styles.cardCompact]} variant="default">
      {/* Header: Area Info + Status Badge */}
      <View style={styles.header}>
        <View style={styles.areaInfo}>
          {shiftNumber ? (
            <NBText variant="body" color="gray700" style={styles.bold}>Shift #{shiftNumber}</NBText>
          ) : (
            <>
              <NBText variant="body" color="gray700" numberOfLines={1} style={styles.semibold}>
                {shift.area?.name || 'Area tidak diketahui'}
              </NBText>
              {shift.area?.area_type?.name && (
                <NBText variant="body-sm" color="gray500">{shift.area.area_type.name}</NBText>
              )}
            </>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusActive : styles.statusCompleted,
          ]}>
          <NBText
            variant="mono-sm"
            color={isActive ? 'white' : 'gray600'}
            uppercase
            style={styles.statusText}
          >
            {isActive ? 'AKTIF' : 'SELESAI'}
          </NBText>
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
            <NBText variant="mono-sm" color="gray600" style={styles.timeLabel}>CLOCK IN</NBText>
            <NBText variant="body-sm" color="gray700" style={styles.semibold}>{formatTime(shift.clock_in_time)}</NBText>
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
            <NBText variant="mono-sm" color="gray600" style={styles.timeLabel}>CLOCK OUT</NBText>
            <NBText variant="body-sm" color={isActive ? 'gray400' : 'gray700'} style={styles.semibold}>
              {shift.clock_out_time ? formatTime(shift.clock_out_time) : '--:--'}
            </NBText>
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
            <NBText variant="mono-sm" color="gray600" style={styles.timeLabel}>DURASI</NBText>
            <NBText variant="body-sm" color="successDark" style={styles.semibold}>
              {duration.formatted}
            </NBText>
          </View>
        </View>
      </View>
    </NBCard>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Detail shift ${shift.area?.name ?? ''}`}
        accessibilityHint="Ketuk untuk melihat detail shift"
      >
        {card}
      </TouchableOpacity>
    );
  }

  return card;
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

  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },

  statusBadge: {
    width: 70, // Fixed width for consistency
    paddingVertical: nbSpacing.xs / 2,
    borderRadius: nbRadius.sm,
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
    letterSpacing: 0.5,
    textAlign: 'center',
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
    marginBottom: 2,
    letterSpacing: 0.5,
  },
});
