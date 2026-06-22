/**
 * AttendanceDayCard — one day of attendance in the Kehadiran history list.
 * Built on the shared ListItemCard so it matches the Tugas/Aktivitas/Lembur rows.
 * Shows the day, an on-time/late pill, and Masuk / Keluar / total-duration meta.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { ListItemCard } from '../../../components/common';
import type { StatusTone } from '../../../components/home/StatusPill';
import { formatLongDate, formatTime } from '../../../utils/dateUtils';
import { nbSpacing } from '../../../constants/nbTokens';
import type { AttendanceDaySummary } from '../../../types/api.types';

export interface AttendanceDayCardProps {
  summary: AttendanceDaySummary;
  onPress: () => void;
}

function formatWorkedMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}j ${minutes}m`;
}

export const AttendanceDayCard = React.memo(function AttendanceDayCard({
  summary,
  onPress,
}: AttendanceDayCardProps): React.JSX.Element {
  // is_late is computed server-side (WIB). An active day takes precedence visually.
  let tone: StatusTone;
  let statusLabel: string;
  if (summary.has_active) {
    tone = 'info';
    statusLabel = 'Berlangsung';
  } else if (summary.is_late) {
    tone = 'warn';
    statusLabel = 'Terlambat';
  } else {
    tone = 'ok';
    statusLabel = 'Tepat Waktu';
  }

  // Parse as local midnight so the label shows the WIB calendar date verbatim,
  // independent of the device timezone.
  const dayLabel = formatLongDate(`${summary.date}T00:00:00`);
  const shiftCountText = `${summary.shift_count} shift`;

  return (
    <ListItemCard
      statusTone={tone}
      statusLabel={statusLabel}
      rightText={shiftCountText}
      title={dayLabel}
      titleLines={1}
      meta={[
        { icon: 'login', label: `Masuk ${formatTime(summary.first_clock_in)}` },
        {
          icon: 'logout',
          label: `Keluar ${summary.last_clock_out ? formatTime(summary.last_clock_out) : '—'}`,
        },
        { icon: 'timer-outline', label: formatWorkedMinutes(summary.total_worked_minutes) },
      ]}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={`Kehadiran ${dayLabel}, ${statusLabel}`}
      testID={`attendance-day-${summary.date}`}
    />
  );
});

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});

export default AttendanceDayCard;
