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
} from '../../constants/nbTokens';
import { formatTime, calculateDuration } from '../../utils/dateUtils';
import { NBCard, NBText } from '../nb';
import { StatusPill } from '../home/StatusPill';
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
      {/* Header: status pill (left) + shift # / date (right) — matches the shared
          ListItemCard anatomy used by Tugas / Aktivitas / Lembur. */}
      <View style={styles.header}>
        <StatusPill dot tone={isActive ? 'ok' : 'neutral'} label={isActive ? 'Aktif' : 'Selesai'} />
        {shiftNumber ? (
          <NBText variant="mono-sm" color="gray500" style={styles.rightText}>Shift #{shiftNumber}</NBText>
        ) : null}
      </View>

      {/* Title: area */}
      <NBText variant="body" color="black" numberOfLines={1} style={styles.title}>
        {shift.area?.name || 'Area tidak diketahui'}
      </NBText>
      {shift.area?.area_type?.name ? (
        <NBText variant="body-sm" color="gray500" style={styles.areaType}>{shift.area.area_type.name}</NBText>
      ) : null}

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

  // Header (status pill + shift # / date)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.xs,
  },

  rightText: { fontSize: 10 },

  semibold: { fontWeight: '600' },

  title: { fontWeight: '700' },
  areaType: { marginTop: 2 },

  // Time Row (3 columns)
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: nbSpacing.md,
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
