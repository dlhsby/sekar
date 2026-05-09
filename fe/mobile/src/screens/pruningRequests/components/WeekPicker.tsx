/**
 * WeekPicker — 8-week-ahead picker for staff_kecamatan submission.
 *
 * Replaces `AvailabilityCalendar` (day-grid) for the kecamatan submit flow per
 * ADR-035 amendment 2026-05-01 + ADR-038. Storage stays weekly; submitter
 * picks an ISO week and `admin_data` (or the convert-to-task auto-pick)
 * decides the concrete day later.
 *
 * UX:
 *   - Vertical list of 8 week cards.
 *   - Each card shows the human-friendly week range, an overall status badge,
 *     and 7 small per-day chips coloured by within-week capacity projection.
 *     The chips are informational only — taps land on the card, not on a day.
 *   - Past weeks (Sun < today) and full weeks are disabled.
 *
 * Token-only: consumes `nbColors` / `nbSpacing` / `NBCard` / `NBBadge` /
 * `NBText`. No inline hex.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NBCard } from '../../../components/nb/NBCard';
import { NBBadge } from '../../../components/nb/NBBadge';
import { NBText } from '../../../components/nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
} from '../../../constants/nbTokens';
import {
  buildThreeMonthRange,
  projectWeeklyToDaily,
  type DayAvailability,
  type DayStatus,
  type RawCapacityRow,
} from '../utils/capacityCalendar';

// ─── Tokens for status visualization ────────────────────────────────────────

const DAY_DOT_COLOR: Record<DayStatus, string> = {
  available: nbColors.successDark,
  partial: nbColors.warning,
  full: nbColors.dangerDark,
  unknown: nbColors.gray300,
};

// Sunday-start day labels — Min/Sen/Sel/Rab/Kam/Jum/Sab. We derive the position
// of each day from `Date.getDay()` (0=Sunday) to handle partial weeks correctly.
const DAY_LABELS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Min..Sab

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PickedWeek {
  year: number;
  isoWeek: number;
}

interface WeekSummary {
  isoYear: number;
  isoWeek: number;
  /** All 7 days, Mon → Sun, with their projected status. */
  days: DayAvailability[];
  /** Aggregate week status (worst-of-the-7 in priority `unknown < full < partial < available`). */
  status: DayStatus;
  /** True if every day in this week is past — entire card is disabled. */
  allPast: boolean;
  /** ISO `YYYY-MM-DD` of Monday (used as the display anchor). */
  startDate: string;
  /** ISO `YYYY-MM-DD` of Sunday. */
  endDate: string;
}

interface WeekPickerProps {
  rows: RawCapacityRow[];
  selected: PickedWeek | null;
  onSelect: (week: PickedWeek) => void;
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/**
 * Aggregate the worst-of-7 status that the submitter most needs to know about.
 * Order: a fully-booked week is "full", a known partial week is "partial",
 * an unknown week (no admin config) is "unknown", otherwise "available".
 */
function aggregateWeekStatus(days: DayAvailability[]): DayStatus {
  const futureDays = days.filter((d) => !isPast(d.date));
  if (futureDays.length === 0) return 'full';
  // Capacity is week-aggregated, so all 7 days share the same projection.
  // We still compute defensively in case projection logic changes.
  if (futureDays.every((d) => d.status === 'full')) return 'full';
  if (futureDays.every((d) => d.status === 'unknown')) return 'unknown';
  if (futureDays.some((d) => d.status === 'available')) {
    return futureDays.some((d) => d.status === 'partial') ? 'partial' : 'available';
  }
  if (futureDays.some((d) => d.status === 'partial')) return 'partial';
  return 'unknown';
}

const ID_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]}`;
}

/**
 * Chunk projected days into Sunday-start calendar weeks. Each chunk also
 * carries the ISO year/week of any non-Sunday day inside it (used as the
 * payload sent to the backend, since `service_capacity` is keyed by ISO
 * week — see ADR-035). When a Sunday-start week straddles two ISO weeks
 * (rare end-of-year edge case) we use the ISO week of Wednesday as the
 * canonical one, matching the convention `getISOWeek` already uses.
 */
function chunkByWeek(days: DayAvailability[]): WeekSummary[] {
  const weeks: WeekSummary[] = [];
  let bucket: DayAvailability[] = [];
  for (const day of days) {
    const dow = new Date(day.date).getDay(); // 0 = Sunday
    if (dow === 0 && bucket.length > 0) {
      weeks.push(toSummary(bucket));
      bucket = [];
    }
    bucket.push(day);
  }
  if (bucket.length > 0) weeks.push(toSummary(bucket));
  return weeks;
}

function toSummary(days: DayAvailability[]): WeekSummary {
  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;
  // Use the middle-of-week (Wednesday-ish) day's ISO key when the chunk
  // straddles two ISO weeks; otherwise the first day's key is fine.
  const anchor = days[Math.min(days.length - 1, 3)] ?? days[0];
  return {
    isoYear: anchor.isoYear,
    isoWeek: anchor.isoWeek,
    days,
    status: aggregateWeekStatus(days),
    allPast: days.every((d) => isPast(d.date)),
    startDate,
    endDate,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WeekPicker({
  rows,
  selected,
  onSelect,
  loading = false,
}: WeekPickerProps): React.JSX.Element {
  const weeks = useMemo(() => {
    const { start, end } = buildThreeMonthRange();
    return chunkByWeek(projectWeeklyToDaily(rows, start, end));
  }, [rows]);

  return (
    <View style={styles.root}>
      <View style={styles.legend}>
        <LegendDot color={DAY_DOT_COLOR.available} label="Tersedia" />
        <LegendDot color={DAY_DOT_COLOR.partial} label="Hampir Penuh" />
        <LegendDot color={DAY_DOT_COLOR.full} label="Penuh" />
        <LegendDot color={DAY_DOT_COLOR.unknown} label="Belum Diatur" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <NBText variant="body-sm" color="gray700" style={styles.loading}>
            Memuat kapasitas…
          </NBText>
        )}
        {weeks.map((week) => (
          <WeekCard
            key={`${week.isoYear}-${week.isoWeek}`}
            week={week}
            isSelected={
              !!selected &&
              selected.year === week.isoYear &&
              selected.isoWeek === week.isoWeek
            }
            onPress={() => onSelect({ year: week.isoYear, isoWeek: week.isoWeek })}
          />
        ))}
        <NBText variant="caption" color="gray500" style={styles.footnote}>
          Admin akan menentukan tanggal pasti dalam minggu yang Anda pilih.
        </NBText>
      </ScrollView>
    </View>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

interface WeekCardProps {
  week: WeekSummary;
  isSelected: boolean;
  onPress: () => void;
}

const STATUS_LABEL: Record<DayStatus, string> = {
  available: 'Tersedia',
  partial: 'Hampir Penuh',
  full: 'Penuh',
  unknown: 'Belum Diatur',
};

const STATUS_BADGE_COLOR: Record<DayStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  available: 'success',
  partial: 'warning',
  full: 'danger',
  unknown: 'gray',
};

function WeekCard({ week, isSelected, onPress }: WeekCardProps): React.JSX.Element {
  const disabled = week.allPast || week.status === 'full' || week.status === 'unknown';
  const headline = `${formatDayMonth(week.startDate)} – ${formatDayMonth(week.endDate)}`;
  const subline = `Minggu ke-${week.isoWeek}, ${week.isoYear}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Pilih minggu ${week.isoWeek} tahun ${week.isoYear}, status ${STATUS_LABEL[week.status]}`}
      accessibilityState={{ disabled, selected: isSelected }}
      style={[styles.cardWrapper, disabled && styles.cardDisabled]}
    >
      <NBCard
        variant={isSelected ? 'elevated' : 'default'}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderText}>
            <NBText variant="body-lg" color="black">{headline}</NBText>
            <NBText variant="caption" color="gray600">{subline}</NBText>
          </View>
          <NBBadge
            text={STATUS_LABEL[week.status]}
            color={STATUS_BADGE_COLOR[week.status]}
            size="sm"
          />
        </View>

        <View style={styles.dayDotRow}>
          {week.days.map((day) => {
            const past = isPast(day.date);
            const dow = new Date(day.date).getDay(); // 0 = Sunday
            return (
              <View key={day.date} style={styles.dayDotCell}>
                <NBText variant="caption" color="gray500" style={styles.dayLabel}>
                  {DAY_LABELS[dow]}
                </NBText>
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: past
                        ? nbColors.gray100
                        : DAY_DOT_COLOR[day.status],
                      opacity: past ? 0.4 : 1,
                    },
                  ]}
                />
                <NBText variant="caption" color="gray600" style={styles.dayNum}>
                  {new Date(day.date).getDate()}
                </NBText>
              </View>
            );
          })}
        </View>
      </NBCard>
    </TouchableOpacity>
  );
}

function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <NBText variant="caption" color="gray700">{label}</NBText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: nbSpacing.xl,
    gap: nbSpacing.sm,
  },
  loading: {
    textAlign: 'center',
    paddingVertical: nbSpacing.md,
  },
  footnote: {
    textAlign: 'center',
    marginTop: nbSpacing.sm,
  },
  cardWrapper: {
    marginBottom: nbSpacing.sm,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  card: {
    padding: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  cardSelected: {
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  dayDotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray200,
    borderRadius: nbBorderRadius.sm,
  },
  dayDotCell: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  dayLabel: {
    fontWeight: '700',
  },
  dayDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  dayNum: {
    fontVariant: ['tabular-nums'],
  },
});
