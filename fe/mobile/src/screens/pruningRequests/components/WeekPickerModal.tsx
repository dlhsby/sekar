/**
 * WeekPickerModal — fullscreen NBModal hosting `WeekPicker`.
 *
 * Used by `SubmitScreen` (staff_kecamatan) per ADR-035 amendment 2026-05-01:
 * the submitter picks an ISO week, not a specific day. The admin reschedule
 * flow keeps `AvailabilityModal` + `AvailabilityCalendar` (date-precision).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBModal } from '../../../components/nb';
import { WeekPicker, type PickedWeek } from './WeekPicker';
import { nbSpacing } from '../../../constants/nbTokens';
import type { RawCapacityRow } from '../utils/capacityCalendar';

interface WeekPickerModalProps {
  visible: boolean;
  onClose: () => void;
  rows: RawCapacityRow[];
  selected: PickedWeek | null;
  onSelect: (week: PickedWeek) => void;
  loading?: boolean;
}

export function WeekPickerModal({
  visible,
  onClose,
  rows,
  selected,
  onSelect,
  loading,
}: WeekPickerModalProps): React.JSX.Element {
  const handleSelect = (week: PickedWeek) => {
    onSelect(week);
    onClose();
  };

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Pilih Minggu Preferensi"
      type="fullscreen"
    >
      <View style={styles.body}>
        <WeekPicker
          rows={rows}
          selected={selected}
          onSelect={handleSelect}
          loading={loading}
        />
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    padding: nbSpacing.md,
  },
});
