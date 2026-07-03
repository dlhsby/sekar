/**
 * AvailabilityCalendar — month-grouped, Sunday-start day picker driven by
 * weekly capacity rows.
 *
 * Used by the admin reschedule sheet (`RescheduleSheet`). Capacity rows come
 * from the `serviceCapacity` slice; this component projects them to per-day
 * status via `projectWeeklyToDaily` and renders a colored cell per day.
 *
 * UX (May 10, 2026 redesign):
 *   - Week starts on **Sunday** (Indonesian convention — Minggu first).
 *   - Range starts from **today** and extends to `rangeEnd` (caller passes
 *     today + 3 months for the reschedule flow).
 *   - Cells are **grouped by month**, with a sticky "Mei 2026" header above
 *     each month's grid. Months render as a Sunday-start `Date` × `Sun..Sat`
 *     matrix so day-of-week labels always sit directly above their dates;
 *     no overlap, no drift.
 *   - The submitter's preferred ISO week gets a soft yellow tint (the orange
 *     border was visually noisy when the calendar redrew on date selection).
 *   - Tapping a date selects it. Tapping the **same date again clears the
 *     selection** (`onSelect(null)`), so admins can reset without a separate
 *     button.
 *   - The currently selected date is echoed in a "Tanggal Terpilih" banner
 *     placed between the preferred-week banner and the legend so the admin
 *     always sees what they've chosen, even when the calendar has scrolled.
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBText } from '../../../components/nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../../constants/nbTokens';
import {
  buildEightWeekRange,
  projectWeeklyToDaily,
  toIsoDate,
  type DayAvailability,
  type DayStatus,
  type RawCapacityRow,
} from '../utils/capacityCalendar';
import {
  formatDateLong,
  formatIsoWeekLabel,
  getSundayWeekBoundsForIso,
} from '../../../utils/dateUtils';

// Audit H7: capacity day-status colors map cleanly to plant-status semantics
// (available ≈ ok, partial ≈ due_soon, full ≈ overdue). Was '#16a34a' /
// '#facc15' / '#dc2626' hardcoded; plantOk + plantDue + plantOverdue tokens
// give an exact (overdue) and visually-equivalent (ok / due) substitute.
const STATUS_COLOR: Record<DayStatus, string> = {
  available: nbColors.plantOk,
  partial: nbColors.plantDue,
  full: nbColors.plantOverdue,
  unknown: nbColors.gray300,
};

// Sunday-start labels (Indonesian convention).
// These are static abbreviations used as grid headers — keep these unchanged.
// Full month names are localized via i18n in the component
const DAY_LABELS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu..Sabtu (abbreviations)

interface AvailabilityCalendarProps {
  rows: RawCapacityRow[];
  selectedDate: string | null;
  /** Receives `null` when the user taps the currently selected date. */
  onSelect: (date: string | null) => void;
  loading?: boolean;
  /**
   * Override the default 8-week-from-today range. The reschedule sheet passes
   * today → today + 3 months.
   */
  rangeStart?: Date;
  rangeEnd?: Date;
  /**
   * When set, renders a "Minggu Preferensi" banner above the legend AND tints
   * cells inside that ISO week so the admin can locate the warga's
   * preferred days at a glance.
   */
  preferredWeek?: { year: number; week: number } | null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isPast(dateStr: string, today: Date): boolean {
  const d = startOfDay(new Date(dateStr));
  return d.getTime() < today.getTime();
}

interface MonthBucket {
  year: number;
  month: number; // 0-indexed
  daysByIso: Map<string, DayAvailability>;
}

function bucketByMonth(days: DayAvailability[]): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();
  for (const day of days) {
    const d = new Date(day.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        year: d.getFullYear(),
        month: d.getMonth(),
        daysByIso: new Map(),
      };
      buckets.set(key, bucket);
    }
    bucket.daysByIso.set(day.date, day);
  }
  return Array.from(buckets.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
}

/**
 * Build a Sunday-start matrix for one month. Each row has 7 slots (Sun..Sat).
 * Slots before the 1st and after the last day of the month are `null` (rendered
 * as inert pad cells). Days outside our `daysByIso` (e.g. before today) also
 * show as pad cells so we never invite the user to tap a day that has no
 * capacity row.
 */
function buildMonthMatrix(
  bucket: MonthBucket,
): (DayAvailability | null)[][] {
  const firstOfMonth = new Date(bucket.year, bucket.month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(bucket.year, bucket.month + 1, 0).getDate();
  const cells: (DayAvailability | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const iso = toIsoDate(new Date(bucket.year, bucket.month, dayNum));
    cells.push(bucket.daysByIso.get(iso) ?? null);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (DayAvailability | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function AvailabilityCalendar({
  rows,
  selectedDate,
  onSelect,
  loading = false,
  rangeStart,
  rangeEnd,
  preferredWeek,
}: AvailabilityCalendarProps): React.JSX.Element {
  const { t } = useTranslation('pruning');
  const today = useMemo(() => startOfDay(new Date()), []);

  const months = useMemo(() => {
    const { start: defaultStart, end: defaultEnd } = buildEightWeekRange();
    // Always clamp the floor to today — past dates never make sense for a
    // forward-looking schedule and the spec says "start from today".
    const rawStart = rangeStart ?? defaultStart;
    const start =
      rawStart.getTime() < today.getTime() ? today : startOfDay(rawStart);
    const end = rangeEnd ?? defaultEnd;
    const days = projectWeeklyToDaily(rows, start, end);
    return bucketByMonth(days);
  }, [rows, rangeStart, rangeEnd, today]);

  // Highlight range is the Sunday-start week that the kecamatan actually
  // saw on the submit form's WeekPicker (Sun..Sat), NOT the literal ISO
  // Mon..Sun bounds — otherwise the label says "17–23 Mei" but the blue
  // ring lights up 18–24 Mei, which mismatches what the kecamatan picked.
  const preferredRange = useMemo(() => {
    if (!preferredWeek) return null;
    const { sunday, saturday } = getSundayWeekBoundsForIso(
      preferredWeek.year,
      preferredWeek.week,
    );
    return { startIso: toIsoDate(sunday), endIso: toIsoDate(saturday) };
  }, [preferredWeek]);

  const handlePress = (day: DayAvailability) => {
    if (isPast(day.date, today)) return;
    if (selectedDate === day.date) {
      onSelect(null);
      return;
    }
    if (day.status === 'full') {
      Alert.alert(
        t('calendar.legendFull'),
        t('calendar.dateFullError'),
      );
      return;
    }
    if (day.status === 'unknown') {
      Alert.alert(
        t('calendar.legendUnset'),
        t('calendar.capacityUnsetError'),
      );
      return;
    }
    onSelect(day.date);
  };

  return (
    <View style={styles.root}>
      {/* Compact info strip — Minggu Preferensi (when set) + Tanggal Terpilih
          stacked as inline label/value rows so the calendar grid below gets
          the lion's share of vertical space. The previous stacked banners
          consumed ~180 dp before the grid even started; this collapses that
          to ~80 dp while keeping both pieces of information glanceable. */}
      {preferredWeek ? (
        <View style={styles.infoStripRow}>
          <NBText style={styles.infoStripLabel}>{t('calendar.preferenceWeekLabel')}</NBText>
          <NBText style={styles.infoStripValue} numberOfLines={1}>
            {formatIsoWeekLabel(preferredWeek.year, preferredWeek.week)}
          </NBText>
        </View>
      ) : null}

      <View
        style={[
          styles.infoStripRow,
          selectedDate && styles.infoStripRowSelected,
        ]}
      >
        <NBText
          style={[
            styles.infoStripLabel,
            selectedDate && styles.infoStripLabelOnDark,
          ]}
        >
          {t('calendar.selectedDateLabel')}
        </NBText>
        <NBText
          style={[
            styles.infoStripValue,
            selectedDate && styles.infoStripValueOnDark,
          ]}
          numberOfLines={1}
        >
          {selectedDate ? formatDateLong(selectedDate) : t('calendar.notSelectedYet')}
        </NBText>
        {selectedDate ? (
          <TouchableOpacity
            onPress={() => onSelect(null)}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.clearDateLabel')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.infoStripClear}
            testID="perantingan-calendar-clear"
          >
            <NBText style={styles.infoStripClearText}>{t('calendar.clearDateLabel')}</NBText>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.legend}>
        <LegendDot color={STATUS_COLOR.available} label={t('calendar.legendAvailable')} />
        <LegendDot color={STATUS_COLOR.partial} label={t('calendar.legendPartial')} />
        <LegendDot color={STATUS_COLOR.full} label={t('calendar.legendFull')} />
        <LegendDot color={STATUS_COLOR.unknown} label={t('calendar.legendUnset')} />
        {preferredWeek ? (
          <LegendRing color={nbColors.info} label={t('calendar.preferenceWeekLabel')} />
        ) : null}
      </View>

      {/* Day-of-week header. Each label sits inside a `flex: 1` column shared
          with every cell underneath, so the 7 columns are mathematically
          equal-width regardless of viewport — no chance of horizontal drift.
          The header is rendered ONCE here (not per-month) because every
          month grid below uses the same Sun..Sat order. */}
      <View style={styles.headerRow}>
        {DAY_LABELS.map((label, idx) => (
          <View key={`${label}-${idx}`} style={styles.col}>
            <NBText style={styles.headerCell}>{label}</NBText>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && <NBText style={styles.loading}>{t('calendar.loading')}</NBText>}
        {months.map((bucket) => {
          const matrix = buildMonthMatrix(bucket);
          const monthDate = new Date(bucket.year, bucket.month, 1);
          const monthName = monthDate.toLocaleDateString('id-ID', { month: 'long' });
          return (
            <View
              key={`${bucket.year}-${bucket.month}`}
              style={styles.monthBlock}
            >
              <NBText style={styles.monthHeader}>
                {monthName} {bucket.year}
              </NBText>
              {matrix.map((row, rowIdx) => (
                <View
                  key={`${bucket.year}-${bucket.month}-row-${rowIdx}`}
                  style={styles.weekRow}
                >
                  {row.map((day, colIdx) => {
                    if (!day) {
                      return (
                        <View
                          key={`pad-${rowIdx}-${colIdx}`}
                          style={styles.col}
                        />
                      );
                    }
                    const past = isPast(day.date, today);
                    const selected = selectedDate === day.date;
                    const inPreferredWeek =
                      preferredRange != null &&
                      day.date >= preferredRange.startIso &&
                      day.date <= preferredRange.endIso;
                    const dayNum = new Date(day.date).getDate();
                    const cellTextColor = selected
                      ? nbColors.white
                      : past || day.status === 'unknown'
                      ? nbColors.gray700
                      : nbColors.black;
                    // Style precedence (last wins): base → status background
                    // (always, so the green/yellow/red chip is never hidden
                    // by the preferred-week indicator) → preferred-week
                    // blue ring → selected black fill + ring → past tint.
                    // Earlier the preferred-week style overrode the status
                    // background with `warningLight` (pale yellow), which
                    // disguised a `full` day as `partial` and then surprised
                    // the user with the "Penuh" alert (PR-1778385950945).
                    const cellBgOverride = selected
                      ? null
                      : past
                      ? { backgroundColor: nbColors.gray100 }
                      : { backgroundColor: STATUS_COLOR[day.status] };
                    return (
                      <View key={day.date} style={styles.col}>
                        <TouchableOpacity
                          accessibilityLabel={
                            `Tanggal ${day.date} status ${day.status}` +
                            (inPreferredWeek ? ' (di dalam minggu preferensi)' : '') +
                            (selected ? ' (terpilih, ketuk untuk batal)' : '')
                          }
                          onPress={() => handlePress(day)}
                          disabled={past}
                          style={[
                            styles.cell,
                            cellBgOverride,
                            inPreferredWeek && styles.cellPreferred,
                            selected && styles.cellSelected,
                            past && { opacity: 0.4 },
                          ]}
                        >
                          <NBText
                            style={[
                              styles.cellText,
                              { color: cellTextColor },
                            ]}
                          >
                            {dayNum}
                          </NBText>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <NBText style={styles.legendLabel}>{label}</NBText>
    </View>
  );
}

/** Hollow ring variant — used for indicator-only legend entries (no fill). */
function LegendRing({
  color,
  label,
}: {
  color: string;
  label: string;
}): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: 'transparent', borderColor: color, borderWidth: 2 },
        ]}
      />
      <NBText style={styles.legendLabel}>{label}</NBText>
    </View>
  );
}

const CELL_SIZE = 34;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Compact one-line info strip used for both Minggu Preferensi and Tanggal
  // Terpilih. Each row is ~36 dp tall (vs the previous 60 dp banners), so
  // both rows + legend now fit in roughly the height the old single banner
  // used to occupy.
  infoStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: 6,
    paddingHorizontal: nbSpacing.sm,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.gray100,
    marginBottom: 6,
  },
  infoStripRowSelected: {
    backgroundColor: nbColors.black,
  },
  infoStripLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: nbColors.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoStripLabelOnDark: {
    color: nbColors.gray300,
  },
  infoStripValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: nbColors.black,
  },
  infoStripValueOnDark: {
    color: nbColors.white,
  },
  infoStripClear: {
    paddingVertical: 3,
    paddingHorizontal: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
  },
  infoStripClearText: {
    fontSize: 11,
    fontWeight: '700',
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
  },
  legendLabel: {
    fontSize: 11,
    color: nbColors.black,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.black,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  headerCell: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: nbColors.gray700,
  },
  // Preferred-week indicator: thick BLUE ring on top of the day's actual
  // status color. Background is intentionally NOT overridden — the prior
  // soft-yellow tint disguised `full` (red) days as `partial` (yellow) and
  // surprised the user with a "Penuh" alert on what looked like an
  // available cell. Blue is also the only ring color that doesn't collide
  // with green/yellow/red status fills.
  cellPreferred: {
    borderColor: nbColors.info,
    borderWidth: 3,
  },
  // Selected indicator: filled black + white text + 3 dp black border. The
  // border bulges slightly past the preferred-week ring beneath it so a
  // selected day inside the preferred week reads as "selected first".
  cellSelected: {
    backgroundColor: nbColors.black,
    borderColor: nbColors.black,
    borderWidth: 3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: nbSpacing.xl,
  },
  monthBlock: {
    marginBottom: nbSpacing.sm,
  },
  monthHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: nbSpacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loading: {
    textAlign: 'center',
    color: nbColors.gray700,
    paddingVertical: nbSpacing.md,
  },
});
