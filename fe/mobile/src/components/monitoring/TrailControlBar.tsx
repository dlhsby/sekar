/**
 * TrailControlBar
 *
 * Header for the trail viewer. Combines back navigation, the worker's name,
 * and a date stepper for browsing historical trails. Styled per Neo Brutalism
 * 2.0: white card, hard 2px black border-bottom, hard-edge shadow.
 *
 * Back button matches FieldHomeHeader (44×44 WCAG touch target, arrow-left
 * icon at 24px, no border) for visual consistency with the rest of the app's
 * sub-screen headers.
 *
 * Tapping the date label opens NBDatePicker for jumping to any past date —
 * faster than stepping through days one at a time. Forward stepping is capped
 * at "today" since there's no future GPS data.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { NBDatePicker } from '../nb/NBDatePicker';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrailControlBarProps {
  userName?: string;
  /** ISO date (YYYY-MM-DD) of the trail being shown. */
  date: string;
  onDateChange: (date: string) => void;
  onClose: () => void;
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

function formatDisplayDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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

// ─── Layout constants ─────────────────────────────────────────────────────────

const STATUS_BAR_PAD =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

// ─── Component ────────────────────────────────────────────────────────────────

export function TrailControlBar({
  userName,
  date,
  onDateChange,
  onClose,
}: TrailControlBarProps): React.JSX.Element {
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
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Back button — matches FieldHomeHeader (44×44, no border, arrow-left 24) */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
        </TouchableOpacity>

        {/* Worker title */}
        <View style={styles.titleWrap}>
          <Text style={styles.titleLabel}>Riwayat Lokasi</Text>
          {userName ? (
            <Text style={styles.titleName} numberOfLines={1}>{userName}</Text>
          ) : null}
        </View>

        {/* Date stepper — chevrons + tappable label */}
        <View style={styles.dateStepper}>
          <TouchableOpacity
            onPress={handlePrevDay}
            style={styles.stepBtn}
            accessibilityLabel="Hari sebelumnya"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chevron-left" size={18} color={nbColors.black} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={styles.dateLabelWrap}
            accessibilityLabel="Pilih tanggal"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="calendar" size={12} color={nbColors.black} />
            <Text style={styles.dateLabel}>{formatDisplayDate(date)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextDay}
            style={[styles.stepBtn, atToday && styles.stepBtnDisabled]}
            disabled={atToday}
            accessibilityLabel="Hari berikutnya"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chevron-right" size={18} color={nbColors.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date picker — controlled-modal mode (no built-in trigger). */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: nbColors.white,
    paddingTop: STATUS_BAR_PAD + nbSpacing.xs,
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
    ...nbShadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
  },
  // Matches FieldHomeHeader.backButton — same metrics so sub-screen headers
  // feel identical across the app.
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: nbSpacing.xs,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleLabel: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['600'],
    fontWeight: nbTypography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleName: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
  },
  dateStepper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
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
  dateLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: 6,
    borderLeftWidth: nbBorders.thin,
    borderRightWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  dateLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
});
