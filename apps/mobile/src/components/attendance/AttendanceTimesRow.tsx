/**
 * AttendanceTimesRow — the canonical "Jam Masuk / Jam Keluar" pair, plus the
 * single-column `AttendanceTimeCell` it's built from.
 *
 * The row (two cells split by a hairline) is used by the Rekam Kehadiran
 * clock-in card. The entry card (home + hub) reuses `AttendanceTimeCell`
 * directly so it can stack a Clock In / Clock Out button under each time and
 * run one full-height divider down the middle. Either way the times render
 * identically — same captions, same `EMPTY_TIME` placeholder — instead of
 * drifting per screen. Colours are optional: pass them to flag a late clock-in
 * / early clock-out; omit them for the neutral look.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NBText } from '../nb';
import type { NBTextColor } from '../nb/NBText';
import { formatTime } from '../../utils/dateUtils';
import { nbColors } from '../../constants/nbTokens';

/** Canonical placeholder for a not-yet-recorded time, shared across surfaces. */
export const EMPTY_TIME = '--:--';

export interface AttendanceTimeCellProps {
  /** Uppercase caption, e.g. "Jam Masuk". */
  label: string;
  /** The time (ISO/parseable), or null when none. */
  time?: string | null;
  /** Optional colour override for the value (defaults to black/gray400). */
  color?: NBTextColor;
}

/** One time column: caption + value. Shared by the row and the entry-card grid. */
export function AttendanceTimeCell({ label, time, color }: AttendanceTimeCellProps): React.JSX.Element {
  return (
    <View style={styles.col}>
      <NBText variant="caption" color="gray600" uppercase>
        {label}
      </NBText>
      <NBText variant="h3" color={color ?? (time ? 'black' : 'gray400')}>
        {time ? formatTime(time) : EMPTY_TIME}
      </NBText>
    </View>
  );
}

export interface AttendanceTimesRowProps {
  /** Earliest clock-in for the day (ISO/parseable), or null when none. */
  jamMasuk?: string | null;
  /** Latest clock-out for the day (ISO/parseable), or null when still open/none. */
  jamKeluar?: string | null;
  /** Optional colour override for the Masuk value (defaults to black/gray400). */
  masukColor?: NBTextColor;
  /** Optional colour override for the Keluar value (defaults to black/gray400). */
  keluarColor?: NBTextColor;
}

export function AttendanceTimesRow({
  jamMasuk,
  jamKeluar,
  masukColor,
  keluarColor,
}: AttendanceTimesRowProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <AttendanceTimeCell label={t('attendance:hub.jamMasuk')} time={jamMasuk} color={masukColor} />
      <View style={styles.divider} />
      <AttendanceTimeCell label={t('attendance:hub.jamKeluar')} time={jamKeluar} color={keluarColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { width: 1, height: 28, backgroundColor: nbColors.gray200 },
});

export default AttendanceTimesRow;
