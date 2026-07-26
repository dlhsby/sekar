/**
 * AttendanceEntryCard — the single, reusable "Kehadiran" entry point.
 *
 * One card shape shared by the Home screen and the Kehadiran hub
 * (TimeRecordHubScreen), so both read identically: today's date + shift, the
 * Jam Masuk / Jam Keluar pair, the Clock In / Clock Out buttons, and a bottom
 * row of secondary links (Jadwal Saya / Log Kehadiran). Callers compute the
 * values; this component only presents them, so the missing-time placeholder
 * (`EMPTY_TIME`) is defined in one place instead of drifting per screen.
 *
 * The "belum clock in" banner is opt-in (`showEmptyNote`) — the hub shows it,
 * home hides it (the clock-in / attendance surfaces own that prompt).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBText, NBButton, NBCard, NBAlert } from '../nb';
import { AttendanceTimeCell } from './AttendanceTimesRow';
import { formatLongDate } from '../../utils/dateUtils';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

export interface AttendanceEntryCardProps {
  /** Service-day (YYYY-MM-DD) the card describes. */
  date: string;
  /** Preformatted shift label, e.g. "Shift 1 · 07:00–15:00" or "Tidak Ada Shift". */
  shiftLabel: string;
  /** Earliest clock-in for the day (ISO/parseable), or null when none. */
  jamMasuk?: string | null;
  /** Latest clock-out for the day (ISO/parseable), or null when still open/none. */
  jamKeluar?: string | null;
  /** Whether any time was recorded today (drives the "belum clock in" banner). */
  hasRecordToday: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
  /** When provided, renders the "Jadwal Saya" link (bottom-left). */
  onViewSchedule?: () => void;
  /** When provided, renders the "Log Kehadiran" link (bottom-right). */
  onViewLog?: () => void;
  testID?: string;
}

export function AttendanceEntryCard({
  date,
  shiftLabel,
  jamMasuk,
  jamKeluar,
  hasRecordToday,
  onClockIn,
  onClockOut,
  onViewSchedule,
  onViewLog,
  testID,
}: AttendanceEntryCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasLinks = !!onViewSchedule || !!onViewLog;

  return (
    <NBCard style={styles.card} testID={testID}>
      {!hasRecordToday && (
        <NBAlert
          variant="warning"
          message={t('attendance:hub.notClockedIn')}
          icon={<MaterialCommunityIcons name="clock-alert-outline" size={20} color={nbColors.white} />}
          style={styles.banner}
        />
      )}

      {/* Today's shift */}
      <View style={styles.shiftRow}>
        <NBText variant="body-sm" color="gray600">
          {formatLongDate(`${date}T00:00:00`)}
        </NBText>
        <NBText variant="body" color="black">
          {shiftLabel}
        </NBText>
      </View>

      {/* Divider between the shift info and the times/actions (the "top" rule) */}
      <View style={styles.divider} />

      {/* Two columns — [Jam Masuk / Clock In] │ [Jam Keluar / Clock Out] — with a
          single full-height divider running down the middle (times + buttons). */}
      <View style={styles.grid}>
        <View style={styles.gridCol}>
          <AttendanceTimeCell label={t('attendance:hub.jamMasuk')} time={jamMasuk} />
          <NBButton
            title={t('attendance:list.button.clockIn')}
            leftIcon="login"
            variant="primary"
            fullWidth
            onPress={onClockIn}
            testID="entry-clock-in"
          />
        </View>
        <View style={styles.gridDivider} />
        <View style={styles.gridCol}>
          <AttendanceTimeCell label={t('attendance:hub.jamKeluar')} time={jamKeluar} />
          <NBButton
            title={t('attendance:list.button.clockOut')}
            leftIcon="logout"
            variant="secondary"
            fullWidth
            onPress={onClockOut}
            testID="entry-clock-out"
          />
        </View>
      </View>

      {/* Hairline below the buttons, above the secondary nav */}
      <View style={styles.divider} />

      {/* Secondary nav: Jadwal (left) │ Log Kehadiran (right), split by a
          vertical hairline (mirrors the Jam Masuk │ Jam Keluar divider). */}
      {hasLinks && (
        <View style={styles.linksRow}>
          {onViewSchedule && (
            <NBButton
              title={t('attendance:hub.viewSchedule')}
              leftIcon="calendar-month"
              variant="ghost"
              size="sm"
              style={styles.linkButton}
              onPress={onViewSchedule}
              testID="entry-view-schedule"
            />
          )}
          {onViewSchedule && onViewLog && <View style={styles.linkDivider} />}
          {onViewLog && (
            <NBButton
              title={t('attendance:hub.viewLog')}
              leftIcon="history"
              variant="ghost"
              size="sm"
              style={styles.linkButton}
              onPress={onViewLog}
              testID="entry-view-log"
            />
          )}
        </View>
      )}
    </NBCard>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: nbSpacing.md, paddingVertical: nbSpacing.sm },
  banner: { marginBottom: nbSpacing.sm },
  divider: { height: 1, backgroundColor: nbColors.gray200, marginVertical: nbSpacing.sm },
  shiftRow: { gap: 2 },
  grid: { flexDirection: 'row', alignItems: 'stretch' },
  gridCol: { flex: 1, alignItems: 'center', gap: nbSpacing.sm },
  gridDivider: { width: 1, backgroundColor: nbColors.gray200, marginHorizontal: nbSpacing.sm },
  linksRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.sm, marginTop: nbSpacing.xs },
  linkButton: { flex: 1 },
  linkDivider: { width: 1, height: 24, backgroundColor: nbColors.gray200 },
});

export default AttendanceEntryCard;
