/**
 * WeekPickerModal — fullscreen NBModal hosting `WeekPicker`.
 *
 * Used by `SubmitScreen` (staff_kecamatan) per ADR-035 amendment 2026-05-01:
 * the submitter picks an ISO week, not a specific day. The admin reschedule
 * flow keeps `AvailabilityModal` + `AvailabilityCalendar` (date-precision).
 */

import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FieldHomeHeader } from '../../../components/navigation/FieldHomeHeader';
import { NBBackgroundPattern } from '../../../components/nb';
import { WeekPicker, type PickedWeek } from './WeekPicker';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import type { RawCapacityRow } from '../utils/capacityCalendar';

interface WeekPickerModalProps {
  visible: boolean;
  onClose: () => void;
  rows: RawCapacityRow[];
  selected: PickedWeek | null;
  onSelect: (week: PickedWeek) => void;
  loading?: boolean;
}

/**
 * Hosts `WeekPicker` in a fullscreen overlay using the same FieldHomeHeader
 * back-button chrome as `SubmitScreen` so the kecamatan submit flow feels
 * like one continuous form rather than a nested modal.
 */
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
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <FieldHomeHeader title="Pilih Minggu Preferensi" onBack={onClose} />
        <NBBackgroundPattern>
          <View style={styles.body}>
            <WeekPicker
              rows={rows}
              selected={selected}
              onSelect={handleSelect}
              loading={loading}
            />
          </View>
        </NBBackgroundPattern>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  body: {
    flex: 1,
    padding: nbSpacing.md,
  },
});
