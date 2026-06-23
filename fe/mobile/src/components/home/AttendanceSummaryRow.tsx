/**
 * AttendanceSummaryRow — the "Masuk … Keluar" row in the home Kehadiran hero.
 * Masuk hugs the left, Keluar the right. Instead of a status pill, the times
 * themselves are colour-coded: a late clock-in / early clock-out reads in
 * danger-dark, an on-time one in success-dark (a missing clock-out stays muted).
 * Shared by the field / coordinator / admin_data home heroes.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBText } from '../nb';
import type { NBTextColor } from '../nb/NBText';
import { formatTime } from '../../utils/dateUtils';
import { nbSpacing } from '../../constants/nbTokens';

export interface AttendanceSummaryRowProps {
  firstClockIn?: string;
  lastClockOut?: string;
  isLate: boolean;
  isEarlyLeave?: boolean;
}

export function AttendanceSummaryRow({
  firstClockIn,
  lastClockOut,
  isLate,
  isEarlyLeave = false,
}: AttendanceSummaryRowProps): React.JSX.Element {
  const masukColor: NBTextColor = firstClockIn
    ? isLate
      ? 'dangerDark'
      : 'successDark'
    : 'black';
  const keluarColor: NBTextColor = lastClockOut
    ? isEarlyLeave
      ? 'dangerDark'
      : 'successDark'
    : 'gray600';

  return (
    <View style={styles.row}>
      <View style={styles.stat}>
        <NBText variant="caption" color="gray600" uppercase>Masuk</NBText>
        <NBText
          variant="h2"
          color={masukColor}
          accessibilityLabel={firstClockIn ? `Masuk ${formatTime(firstClockIn)}${isLate ? ', terlambat' : ', tepat waktu'}` : undefined}
        >
          {formatTime(firstClockIn ?? '')}
        </NBText>
      </View>
      <View style={[styles.stat, styles.statEnd]}>
        <NBText variant="caption" color="gray600" uppercase>Keluar</NBText>
        <NBText
          variant="h2"
          color={keluarColor}
          accessibilityLabel={lastClockOut ? `Keluar ${formatTime(lastClockOut)}${isEarlyLeave ? ', pulang cepat' : ''}` : undefined}
        >
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
});

export default AttendanceSummaryRow;
