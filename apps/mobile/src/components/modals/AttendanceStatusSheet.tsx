import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbBorders } from '../../constants/nbTokens';
import { formatTime } from '../../utils/dateUtils';

export type AttendanceStatusKind = 'late' | 'onTime' | 'noSchedule';

interface AttendanceStatusSheetProps {
  visible: boolean;
  onClose: () => void;
  status: AttendanceStatusKind;
  /** When the worker clocked in (null when not clocked in yet). */
  clockInTime?: string | Date | null;
  /** Scheduled shift start "HH:mm[:ss]" — null when unscheduled. */
  shiftStart?: string | null;
}

const hhmm = (t?: string | null): string => (t ? t.slice(0, 5) : '--:--');

/**
 * AttendanceStatusSheet — explains WHY the attendance reads Terlambat / Tepat
 * Waktu / Tanpa Jadwal, opened by tapping the Status Kehadiran pill. Shared by
 * the home hero and the Rekam Kehadiran card.
 */
export function AttendanceStatusSheet({
  visible,
  onClose,
  status,
  clockInTime,
  shiftStart,
}: AttendanceStatusSheetProps): React.JSX.Element {
  const { t } = useTranslation();

  const tone =
    status === 'late'
      ? { icon: 'clock-alert-outline', color: nbColors.dangerDark, bg: nbColors.dangerLight }
      : status === 'onTime'
        ? { icon: 'clock-check-outline', color: nbColors.successDark, bg: nbColors.successLight }
        : { icon: 'clock-outline', color: nbColors.gray700, bg: nbColors.gray100 };

  const explanation = t(`attendance:statusSheet.why.${status}`);

  return (
    <NBModal
      type="sheet"
      visible={visible}
      onClose={onClose}
      title={t('attendance:infoCard.status')}
      testID="attendance-status-sheet"
    >
      <View style={styles.body}>
        <View style={[styles.iconBox, { backgroundColor: tone.bg, borderColor: tone.color }]}>
          <MaterialCommunityIcons name={tone.icon} size={28} color={tone.color} />
        </View>
        <NBText variant="body" color="black" style={styles.explanation}>
          {explanation}
        </NBText>

        {status !== 'noSchedule' && (
          <View style={styles.rows}>
            <Row label={t('attendance:statusSheet.clockIn')} value={clockInTime ? formatTime(clockInTime) : '--:--'} />
            <Row label={t('attendance:statusSheet.scheduledStart')} value={hhmm(shiftStart)} last />
          </View>
        )}
      </View>
    </NBModal>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }): React.JSX.Element {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <NBText variant="body-sm" color="gray600">{label}</NBText>
      <NBText variant="body" color="black">{value}</NBText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanation: {
    textAlign: 'center',
  },
  rows: {
    alignSelf: 'stretch',
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray200,
    paddingTop: nbSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
});

export default AttendanceStatusSheet;
