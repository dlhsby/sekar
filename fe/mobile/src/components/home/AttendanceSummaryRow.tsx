/**
 * AttendanceSummaryRow — the "Masuk … Keluar" row in the home Kehadiran hero.
 * Masuk hugs the left, Keluar the right; a "Terlambat" badge sits beside Masuk
 * when the worker clocked in after the scheduled start. Shared by the field /
 * coordinator / admin_data home heroes.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBBadge, NBText } from '../nb';
import { formatTime } from '../../utils/dateUtils';
import { nbSpacing } from '../../constants/nbTokens';

export interface AttendanceSummaryRowProps {
  firstClockIn?: string;
  lastClockOut?: string;
  isLate: boolean;
}

export function AttendanceSummaryRow({
  firstClockIn,
  lastClockOut,
  isLate,
}: AttendanceSummaryRowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.stat}>
        <NBText variant="caption" color="gray600" uppercase>Masuk</NBText>
        <View style={styles.valueRow}>
          <NBText variant="h2" color="black">{formatTime(firstClockIn ?? '')}</NBText>
          {isLate && <NBBadge text="Terlambat" color="danger" size="sm" />}
        </View>
      </View>
      <View style={[styles.stat, styles.statEnd]}>
        <NBText variant="caption" color="gray600" uppercase>Keluar</NBText>
        <NBText variant="h2" color="black">
          {lastClockOut ? formatTime(lastClockOut) : '—'}
        </NBText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: nbSpacing.sm,
  },
  stat: { gap: 2 },
  statEnd: { alignItems: 'flex-end' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
});

export default AttendanceSummaryRow;
