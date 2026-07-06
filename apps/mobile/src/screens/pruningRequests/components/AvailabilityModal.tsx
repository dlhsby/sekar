/**
 * AvailabilityModal — fullscreen NBModal hosting `AvailabilityCalendar`.
 *
 * Used by `SubmitScreen` for the staff_kecamatan preferred-date pick.
 * The admin reschedule flow uses `RescheduleSheet` (sheet variant) which
 * embeds the same `AvailabilityCalendar` directly.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBModal } from '../../../components/nb';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { nbSpacing } from '../../../constants/nbTokens';
import type { RawCapacityRow } from '../utils/capacityCalendar';

interface AvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
  rows: RawCapacityRow[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
}

export function AvailabilityModal({
  visible,
  onClose,
  rows,
  selectedDate,
  onSelect,
  loading,
}: AvailabilityModalProps): React.JSX.Element {
  const { t } = useTranslation();

  const handleSelect = (date: string | null) => {
    // AvailabilityCalendar can emit null (clear); the modal only commits a
    // concrete date pick.
    if (!date) { return; }
    onSelect(date);
    onClose();
  };

  return (
    <NBModal visible={visible} onClose={onClose} title={t('pruning:calendar.selectDateLabel')} type="fullscreen">
      <View style={styles.body}>
        <AvailabilityCalendar
          rows={rows}
          selectedDate={selectedDate}
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
