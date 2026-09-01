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
 * The "belum clock in" banner leads the card and is suppressed when the worker
 * has no roster row (`hasScheduleToday`) — an unscheduled worker owes nothing.
 *
 * Spacing follows the token rhythm: `md` around the card, a uniform `sm` for
 * every internal gap (banner offset, both hairlines, column gaps) so nothing
 * inside reads heavier than its neighbours, and `xs` to bind a label to its
 * value. No raw pixel literals.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBButton, NBCard, NBAlert } from '../nb';
import { AttendanceTimeCell } from './AttendanceTimesRow';
import { AttendanceShiftHeading } from './AttendanceShiftHeading';
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
  /**
   * Whether the worker is rostered today. "Belum clock in pada shift ini" is
   * only meaningful when there IS a shift to be missing — an unscheduled worker
   * owes no clock-in, so the warning would be a false accusation. Defaults to
   * true so existing callers keep their behaviour.
   */
  hasScheduleToday?: boolean;
  /**
   * The worker's OTHER shifts today, already formatted (ADR-053 back-to-back).
   * Listed under the heading so a multi-shift worker sees every shift they hold,
   * not only the one their next punch would attribute to.
   */
  otherShiftLabels?: string[];
  /** Opens the shift picker. Omit when there is nothing to choose between. */
  onChangeShift?: () => void;
  /**
   * Extra detail rendered between the heading and the punch actions — the home
   * screen passes `AttendanceInfoRows` (Status Kehadiran / Status Area / Detail
   * Shift) so an on-duty worker sees the same card as everyone else, with the
   * context the old bespoke hero used to carry.
   */
  infoRows?: React.ReactNode;
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
  hasScheduleToday = true,
  otherShiftLabels,
  onChangeShift,
  infoRows,
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
      {!hasRecordToday && hasScheduleToday && (
        <NBAlert
          variant="warning"
          message={t('attendance:hub.notClockedIn')}
          icon={<MaterialCommunityIcons name="clock-alert-outline" size={20} color={nbColors.white} />}
          style={styles.banner}
        />
      )}

      <AttendanceShiftHeading
        date={date}
        shiftLabel={shiftLabel}
        otherShifts={otherShiftLabels}
        onChangeShift={onChangeShift}
        changeShiftTestID="entry-change-shift"
      />

      {infoRows && <View style={styles.infoRows}>{infoRows}</View>}

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
      <View style={[styles.divider, styles.dividerFooter]} />

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
  card: { padding: nbSpacing.md, paddingBottom: nbSpacing.sm },
  // Leads the card, so the space above it is the card's own top padding (md);
  // match that below. NBAlert ships its own `marginBottom: md` — restated here
  // so the symmetry is explicit rather than inherited by luck.
  banner: { marginTop: 0, marginBottom: nbSpacing.md },
  divider: { height: 1, backgroundColor: nbColors.gray200, marginVertical: nbSpacing.sm },
  infoRows: { marginTop: nbSpacing.sm },
  grid: { flexDirection: 'row', alignItems: 'stretch' },
  gridCol: { flex: 1, alignItems: 'center', gap: nbSpacing.sm },
  gridDivider: { width: 1, backgroundColor: nbColors.gray200, marginHorizontal: nbSpacing.sm },
  // The ghost buttons already carry a 36px touch height, so the footer needs
  // less outer breathing room than the content rows above it.
  dividerFooter: { marginBottom: nbSpacing.xs },
  linksRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.sm },
  linkButton: { flex: 1 },
  linkDivider: { width: 1, height: 24, backgroundColor: nbColors.gray200 },
});

export default AttendanceEntryCard;
