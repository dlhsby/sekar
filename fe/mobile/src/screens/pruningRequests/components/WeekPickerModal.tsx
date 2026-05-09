/**
 * WeekPickerModal — fullscreen NBModal hosting `WeekPicker`.
 *
 * Used by `SubmitScreen` (staff_kecamatan) per ADR-035 amendment 2026-05-01:
 * the submitter picks an ISO week, not a specific day. The admin reschedule
 * flow keeps `AvailabilityModal` + `AvailabilityCalendar` (date-precision).
 */

import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBBackgroundPattern } from '../../../components/nb';
import { WeekPicker, type PickedWeek } from './WeekPicker';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
} from '../../../constants/nbTokens';
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            accessibilityLabel="Kembali"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Pilih Minggu Preferensi</Text>
        </View>
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
  // Mirrors React Navigation's screenOptions header chrome (see
  // MainNavigator): 76 dp height, white background, thick black bottom
  // border, NB shadow. Children (back arrow + title) are vertically
  // centered via `alignItems: 'center'`.
  header: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.thick,
    borderBottomColor: nbColors.black,
    ...nbShadows.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: nbSpacing.xs,
  },
  title: {
    flex: 1,
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  body: {
    flex: 1,
    padding: nbSpacing.md,
  },
});
