/**
 * TodayWorkHoursModal — v2.1 bottom sheet listing today's shifts + total hours.
 * Opened from the Home "Jam kerja" Ringkasan tile. Rebuilt on `NBModal` +
 * `NBText` + design tokens (Phase 4 M3 Checkpoint 7).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { nbSpacing } from '../../constants/nbTokens';
import { formatDate, calculateDuration } from '../../utils/dateUtils';
import { ShiftCard } from '../common';
import type { Shift } from '../../types/models.types';

interface TodayWorkHoursModalProps {
  visible: boolean;
  onClose: () => void;
  shifts: Shift[];
}

export function TodayWorkHoursModal({
  visible,
  onClose,
  shifts,
}: TodayWorkHoursModalProps): React.JSX.Element {
  // Total duration across all shifts (active shift uses current time).
  const totalDuration = shifts.reduce((acc, shift) => {
    const endTime = shift.clock_out_time ? new Date(shift.clock_out_time) : new Date();
    return acc + calculateDuration(new Date(shift.clock_in_time), endTime).totalMinutes;
  }, 0);

  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;
  const todayDate = formatDate(new Date());
  const titleSuffix = shifts.length > 0 ? ` (${totalHours}j ${totalMinutes}m)` : '';

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={`Jam Kerja Hari Ini${titleSuffix}`}
      type="sheet"
      size="lg"
      scrollable
      testID="today-workhours-modal"
    >
      <NBText variant="mono-sm" color="gray600" style={styles.dateLine}>
        {todayDate}
      </NBText>

      {shifts.length === 0 ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" align="center">
            Belum ada shift hari ini
          </NBText>
          <NBText variant="body-sm" color="gray500" align="center" style={styles.emptySub}>
            Clock in terlebih dahulu untuk memulai shift
          </NBText>
        </View>
      ) : (
        <View style={styles.list}>
          {shifts.map((shift, index) => (
            <ShiftCard key={shift.id} shift={shift} shiftNumber={index + 1} />
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
