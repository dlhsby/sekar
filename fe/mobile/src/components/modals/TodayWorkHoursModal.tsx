/**
 * TodayWorkHoursModal — v2.1 bottom sheet listing today's shifts + total hours.
 * Opened from the Home "Kehadiran" Ringkasan tile. Rebuilt on `NBModal` +
 * `NBText` + design tokens (Phase 4 M3 Checkpoint 7).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { nbSpacing } from '../../constants/nbTokens';
import { formatDate, formatLongDate, calculateDuration } from '../../utils/dateUtils';
import { ShiftCard } from '../common';
import type { Shift } from '../../types/models.types';

interface TodayWorkHoursModalProps {
  visible: boolean;
  onClose: () => void;
  shifts: Shift[];
  onShiftPress?: (shift: Shift) => void;
  /**
   * The day these shifts belong to. Omit for "today" (home Ringkasan tile);
   * pass a WIB `YYYY-MM-DD` (or Date) when listing a past day's shifts so the
   * title reads "Kehadiran <date>" instead of "Kehadiran Hari Ini".
   */
  date?: string | Date;
}

export function TodayWorkHoursModal({
  visible,
  onClose,
  shifts,
  onShiftPress,
  date,
}: TodayWorkHoursModalProps): React.JSX.Element {
  const { t } = useTranslation('attendance');

  // Total duration across all shifts (active shift uses current time).
  const totalDuration = shifts.reduce((acc, shift) => {
    const endTime = shift.clock_out_time ? new Date(shift.clock_out_time) : new Date();
    return acc + calculateDuration(new Date(shift.clock_in_time), endTime).totalMinutes;
  }, 0);

  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;
  // Parse a YYYY-MM-DD string as local midnight so the date reads verbatim.
  const headerSource = typeof date === 'string' ? `${date}T00:00:00` : date ?? new Date();
  const dateLine = formatDate(headerSource);
  const titlePrefix = date ? `Kehadiran ${formatLongDate(headerSource)}` : t('shifts.today');
  const titleSuffix = shifts.length > 0 ? ` (${totalHours}j ${totalMinutes}m)` : '';

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={`${titlePrefix}${titleSuffix}`}
      type="sheet"
      testID="today-workhours-modal"
    >
      <NBText variant="mono-sm" color="gray600" style={styles.dateLine}>
        {dateLine}
      </NBText>

      {shifts.length === 0 ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" align="center">
            {t('shifts.empty')}
          </NBText>
          <NBText variant="body-sm" color="gray500" align="center" style={styles.emptySub}>
            {t('shifts.startShiftHint')}
          </NBText>
        </View>
      ) : (
        <View style={styles.list}>
          {shifts.map((shift, index) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              shiftNumber={index + 1}
              onPress={onShiftPress ? () => onShiftPress(shift) : undefined}
            />
          ))}
        </View>
      )}
    </NBModal>
  );
}

const styles = StyleSheet.create({
  dateLine: { marginBottom: nbSpacing.sm, letterSpacing: 0.4 },
  list: { gap: nbSpacing.xs },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: nbSpacing.xl },
  emptySub: { marginTop: nbSpacing.xs },
});
