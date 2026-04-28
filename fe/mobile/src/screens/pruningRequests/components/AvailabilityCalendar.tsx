/**
 * AvailabilityCalendar — 8-week-ahead day picker driven by weekly capacity.
 *
 * Used by both the staff_kecamatan submit form (`SubmitScreen`) and the admin
 * reschedule sheet (`RescheduleSheet`). Capacity rows come from the
 * `serviceCapacity` slice; this component projects them to per-day status via
 * `projectWeeklyToDaily` and renders a colored cell per day. Tapping a
 * non-disabled cell calls `onSelect(date)`. Past dates are filtered out.
 *
 * 2026-04-28 amendment to ADR-035: storage stays weekly; this calendar is
 * UX-only.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { nbColors, nbSpacing, nbBorders, nbBorderRadius } from '../../../constants/nbTokens';
import {
  buildEightWeekRange,
  projectWeeklyToDaily,
  toIsoDate,
  type DayAvailability,
  type DayStatus,
  type RawCapacityRow,
} from '../utils/capacityCalendar';

const STATUS_COLOR: Record<DayStatus, string> = {
  available: '#16a34a',
  partial: '#facc15',
  full: '#dc2626',
  unknown: nbColors.gray300,
};

const DAY_LABELS = ['S', 'S', 'R', 'K', 'J', 'S', 'M']; // Senin..Minggu

interface AvailabilityCalendarProps {
  rows: RawCapacityRow[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function chunkByWeek(days: DayAvailability[]): DayAvailability[][] {
  const weeks: DayAvailability[][] = [];
  let current: DayAvailability[] = [];
  let currentKey = '';
  for (const d of days) {
    const key = `${d.isoYear}:${d.isoWeek}`;
    if (key !== currentKey && current.length > 0) {
      weeks.push(current);
      current = [];
    }
    currentKey = key;
    current.push(d);
  }
  if (current.length > 0) {
    weeks.push(current);
  }
  return weeks;
}

export function AvailabilityCalendar({
  rows,
  selectedDate,
  onSelect,
  loading = false,
}: AvailabilityCalendarProps): React.JSX.Element {
  const weeks = useMemo(() => {
    const { start, end } = buildEightWeekRange();
    const days = projectWeeklyToDaily(rows, start, end);
    return chunkByWeek(days);
  }, [rows]);

  const handlePress = (day: DayAvailability) => {
    if (isPast(day.date)) {
      return;
    }
    if (day.status === 'full') {
      Alert.alert('Penuh', 'Minggu ini sedang penuh — pilih tanggal lain.');
      return;
    }
    if (day.status === 'unknown') {
      Alert.alert(
        'Belum Tersedia',
        'Kapasitas minggu ini belum diatur admin. Silakan pilih tanggal lain atau hubungi admin rayon.',
      );
      return;
    }
    onSelect(day.date);
  };

  return (
    <View style={styles.root}>
      <View style={styles.legend}>
        <LegendDot color={STATUS_COLOR.available} label="Tersedia" />
        <LegendDot color={STATUS_COLOR.partial} label="Hampir Penuh" />
        <LegendDot color={STATUS_COLOR.full} label="Penuh" />
        <LegendDot color={STATUS_COLOR.unknown} label="Belum Diatur" />
      </View>

      <View style={styles.headerRow}>
        {DAY_LABELS.map((label, idx) => (
          <Text key={`${label}-${idx}`} style={styles.headerCell}>
            {label}
          </Text>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && <Text style={styles.loading}>Memuat kapasitas…</Text>}
        {weeks.map((week) => {
          const offset = (new Date(week[0].date).getDay() + 6) % 7; // align to Monday
          return (
            <View key={`${week[0].isoYear}-${week[0].isoWeek}`} style={styles.weekRow}>
              {Array.from({ length: offset }).map((_, i) => (
                <View key={`pad-${i}`} style={styles.cellPad} />
              ))}
              {week.map((day) => {
                const past = isPast(day.date);
                const selected = selectedDate === day.date;
                const dayNum = new Date(day.date).getDate();
                return (
                  <TouchableOpacity
                    key={day.date}
                    accessibilityLabel={`Tanggal ${day.date} status ${day.status}`}
                    onPress={() => handlePress(day)}
                    disabled={past}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: past
                          ? nbColors.gray100
                          : STATUS_COLOR[day.status],
                        opacity: past ? 0.4 : 1,
                      },
                      selected && styles.cellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        {
                          color:
                            past || day.status === 'unknown'
                              ? nbColors.gray700
                              : nbColors.black,
                        },
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  legendLabel: {
    fontSize: 12,
    color: nbColors.black,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: nbSpacing.xs,
  },
  headerCell: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontWeight: '700',
    color: nbColors.gray700,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: nbSpacing.xl,
  },
  weekRow: {
    flexDirection: 'row',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: nbBorderRadius.sm,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPad: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  cellSelected: {
    borderWidth: nbBorders.thick,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loading: {
    textAlign: 'center',
    color: nbColors.gray700,
    paddingVertical: nbSpacing.md,
  },
});
