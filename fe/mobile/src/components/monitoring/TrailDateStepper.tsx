/**
 * TrailDateStepper
 *
 * Compact date control for the trail viewer's header (NBModal `headerRight`
 * slot). Prev/next chevrons step one day at a time; tapping the label opens
 * NBDatePicker for jumping to any past date. Forward stepping is capped at
 * "today" — there's no future GPS data.
 *
 * Lives separate from the old TrailControlBar (now removed) so it can sit inside
 * NBModal's header alongside the back button + worker-name title.
 */

import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { NBDatePicker } from '../nb/NBDatePicker';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';

interface TrailDateStepperProps {
  /** ISO date (YYYY-MM-DD) of the trail being shown. */
  date: string;
  onDateChange: (date: string) => void;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Compact label — day + short month (no year) keeps the stepper narrow enough
// for the header; the picker shows the full date when needed.
function formatShortDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function shiftDay(dateStr: string, deltaDays: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return toISODate(d);
}

function isToday(dateStr: string): boolean {
  return dateStr >= todayISODate();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrailDateStepper({
  date,
  onDateChange,
}: TrailDateStepperProps): React.JSX.Element {
  const [pickerVisible, setPickerVisible] = useState(false);
  const atToday = isToday(date);

  const handlePrevDay = useCallback(() => {
    onDateChange(shiftDay(date, -1));
  }, [date, onDateChange]);

  const handleNextDay = useCallback(() => {
    if (!atToday) { onDateChange(shiftDay(date, 1)); }
  }, [atToday, date, onDateChange]);

  const handlePickerChange = useCallback((picked: Date) => {
    onDateChange(toISODate(picked));
  }, [onDateChange]);

  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={handlePrevDay}
        style={styles.stepBtn}
        accessibilityLabel="Hari sebelumnya"
        accessibilityRole="button"
        activeOpacity={0.7}
        testID="trail-date-prev"
      >
        <MaterialCommunityIcons name="chevron-left" size={18} color={nbColors.black} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setPickerVisible(true)}
        style={styles.labelWrap}
        accessibilityLabel="Pilih tanggal"
        accessibilityRole="button"
        activeOpacity={0.7}
        testID="trail-date-label"
      >
        <MaterialCommunityIcons name="calendar" size={12} color={nbColors.black} />
        <NBText variant="caption" color="black" style={styles.labelText}>
          {formatShortDate(date)}
        </NBText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleNextDay}
        style={[styles.stepBtn, atToday && styles.stepBtnDisabled]}
        disabled={atToday}
        accessibilityLabel="Hari berikutnya"
        accessibilityRole="button"
        activeOpacity={0.7}
        testID="trail-date-next"
      >
        <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.black} />
      </TouchableOpacity>

      {/* Controlled-modal mode (no built-in trigger). */}
      <NBDatePicker
        triggerless
        visible={pickerVisible}
        onRequestClose={() => setPickerVisible(false)}
        value={parseISODate(date)}
        onChange={handlePickerChange}
        mode="date"
        maximumDate={new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    overflow: 'hidden',
    ...nbShadows.xs,
  },
  stepBtn: {
    paddingHorizontal: nbSpacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28,
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: 6,
    borderLeftWidth: nbBorders.widthThin,
    borderRightWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
  },
  labelText: {
    fontWeight: '600',
  },
});
