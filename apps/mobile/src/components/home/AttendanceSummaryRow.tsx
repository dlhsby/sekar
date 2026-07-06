/**
 * AttendanceSummaryRow — the "Masuk … Keluar" row in the home Kehadiran hero.
 * Masuk hugs the left, Keluar the right. Instead of a status pill, the times
 * themselves are colour-coded: a late clock-in / early clock-out reads in
 * danger-dark, an on-time one in success-dark (a missing clock-out stays muted).
 * Shared by the field / coordinator / admin_data home heroes.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <NBText variant="caption" color="gray600" uppercase>{t('home:components.attendanceSummary.clockIn')}</NBText>
        <NBText
          variant="h2"
          color={masukColor}
          accessibilityLabel={firstClockIn ? t('home:components.attendanceSummary.a11y.clockIn', { time: formatTime(firstClockIn), status: isLate ? t('home:components.attendanceSummary.a11y.late') : t('home:components.attendanceSummary.a11y.onTime') }) : undefined}
        >
          {formatTime(firstClockIn ?? '')}
        </NBText>
      </View>
      <View style={[styles.stat, styles.statEnd]}>
        <NBText variant="caption" color="gray600" uppercase>{t('home:components.attendanceSummary.clockOut')}</NBText>
        <NBText
          variant="h2"
          color={keluarColor}
          accessibilityLabel={lastClockOut ? t('home:components.attendanceSummary.a11y.clockOut', { time: formatTime(lastClockOut), status: isEarlyLeave ? t('home:components.attendanceSummary.a11y.earlyLeave') : '' }) : undefined}
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
