import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTranslation} from 'react-i18next';
import {
  NBEmptyState,
  NBBackgroundPattern,
  NBText,
  NBSkeleton,
  NBTab,
  NBModal,
} from '../../components/nb';
import {StatusPill} from '../../components/home/StatusPill';
import {getMyRange} from '../../services/api/schedulesApi';
import {useAppSelector} from '../../store/hooks';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type {Schedule} from '../../types/shift.types';

type CalView = 'day' | 'week' | 'month';

// ─── Date helpers (WIB-naive YYYY-MM-DD, matching the API's DATE columns) ─────

function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function todayKey(): string {
  return keyOf(new Date());
}
function parseKey(k: string): Date {
  return new Date(`${k}T00:00:00`);
}
/** Monday-first weekday index (Mon=0 … Sun=6). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
const hhmm = (t?: string): string => (t ? t.slice(0, 5) : '--:--');

/** The visible [from, to] for a view around `dateKey`. */
function rangeFor(view: CalView, dateKey: string): {from: string; to: string} {
  const d = parseKey(dateKey);
  if (view === 'day') {
    return {from: dateKey, to: dateKey};
  }
  if (view === 'week') {
    const mon = addDays(d, -mondayIndex(d));
    return {from: keyOf(mon), to: keyOf(addDays(mon, 6))};
  }
  // month grid (full Mon–Sun weeks covering the month)
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const gridStart = addDays(first, -mondayIndex(first));
  const gridEnd = addDays(last, 6 - mondayIndex(last));
  return {from: keyOf(gridStart), to: keyOf(gridEnd)};
}

const getRosterStatusPill = (t: ReturnType<typeof useTranslation>['t']) => ({
  present: {tone: 'ok' as const, label: t('schedules:status.present')},
  planned: {tone: 'ok' as const, label: t('schedules:status.planned')},
  absent: {tone: 'bad' as const, label: t('schedules:status.absent')},
  leave_sick: {tone: 'warn' as const, label: t('schedules:status.leave_sick')},
  leave_annual: {
    tone: 'warn' as const,
    label: t('schedules:status.leave_annual'),
  },
  replaced: {tone: 'neutral' as const, label: t('schedules:status.replaced')},
  off: {tone: 'neutral' as const, label: t('schedules:status.off')},
});

// ─── Roster card (tap → detail) ───────────────────────────────────────────────

function RosterRow({
  roster,
  t,
  onPress,
}: {
  roster: Schedule;
  t: ReturnType<typeof useTranslation>['t'];
  onPress?: () => void;
}): React.JSX.Element {
  const ROSTER_STATUS_PILL = getRosterStatusPill(t);
  const pill = ROSTER_STATUS_PILL[roster.status];
  const shift = roster.shift_definition;
  const areasText =
    roster.schedule_areas.map(a => a.area.name).join(', ') ||
    t('schedules:mySchedule.noAreasAssigned');

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, styles.rosterCard]}
      testID={`roster-${roster.id}`}>
      <View style={styles.cardHeader}>
        <NBText variant="mono-sm" color="gray700" uppercase>
          {shift ? shift.name : t('schedules:mySchedule.noShiftDefined')}
        </NBText>
        <StatusPill dot tone={pill.tone} label={pill.label} />
      </View>

      <View style={styles.shiftRow}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={16}
          color={nbColors.gray600}
        />
        <NBText variant="body-sm" color="gray700" style={styles.shiftText}>
          {shift
            ? `${hhmm(shift.start_time)}–${hhmm(shift.end_time)}`
            : t('schedules:mySchedule.noShiftDefined')}
        </NBText>
      </View>

      <View style={styles.areaRow}>
        <MaterialCommunityIcons
          name="map-marker-outline"
          size={16}
          color={nbColors.gray600}
        />
        <NBText variant="body-sm" color="gray700" style={styles.shiftText}>
          {areasText}
        </NBText>
      </View>

      {roster.rayon && (
        <View style={styles.rayonRow}>
          <MaterialCommunityIcons
            name="map-outline"
            size={16}
            color={nbColors.gray600}
          />
          <NBText variant="caption" color="gray600" style={styles.shiftText}>
            {roster.rayon.name}
          </NBText>
        </View>
      )}
    </Pressable>
  );
}

// ─── Detail modal row ─────────────────────────────────────────────────────────

function DetailRow({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={18} color={nbColors.gray600} />
      <NBText variant="body-sm" color="gray800" style={styles.shiftText}>
        {children}
      </NBText>
    </View>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  weekDays,
  byDate,
  today,
  localeCode,
  t,
  onPressItem,
}: {
  weekDays: string[];
  byDate: Map<string, Schedule[]>;
  today: string;
  localeCode: string;
  t: ReturnType<typeof useTranslation>['t'];
  onPressItem: (s: Schedule) => void;
}): React.JSX.Element {
  return (
    <View style={styles.weekWrap}>
      {weekDays.map(dk => {
        const rows = byDate.get(dk) ?? [];
        const d = parseKey(dk);
        const label = d.toLocaleDateString(localeCode, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        const isToday = dk === today;
        return (
          <View key={dk} style={styles.weekDay}>
            <NBText
              variant="caption"
              uppercase
              color={isToday ? 'primary' : 'gray600'}
              style={styles.weekDayLabel}>
              {label}
            </NBText>
            {rows.length === 0 ? (
              <NBText variant="body-sm" color="gray400" style={styles.weekOff}>
                {t('schedules:status.off')}
              </NBText>
            ) : (
              rows.map(r => (
                <RosterRow
                  key={r.id}
                  roster={r}
                  t={t}
                  onPress={() => onPressItem(r)}
                />
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Month view (mini calendar) ───────────────────────────────────────────────

function MonthView({
  cells,
  monthDate,
  byDate,
  today,
  weekdayHeaders,
  onSelectDay,
}: {
  cells: string[];
  monthDate: string;
  byDate: Map<string, Schedule[]>;
  today: string;
  weekdayHeaders: string[];
  onSelectDay: (dk: string) => void;
}): React.JSX.Element {
  const month = parseKey(monthDate).getMonth();
  return (
    <View style={styles.monthWrap}>
      <View style={styles.monthHeaderRow}>
        {weekdayHeaders.map((w, i) => (
          <NBText
            key={i}
            variant="caption"
            uppercase
            color="gray500"
            style={styles.monthHeaderCell}>
            {w}
          </NBText>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {cells.map(dk => {
          const d = parseKey(dk);
          const inMonth = d.getMonth() === month;
          const has = (byDate.get(dk)?.length ?? 0) > 0;
          const isToday = dk === today;
          return (
            <Pressable
              key={dk}
              onPress={() => onSelectDay(dk)}
              style={[styles.monthCell, isToday && styles.monthCellToday]}>
              <NBText
                variant="body-sm"
                color={inMonth ? 'black' : 'gray400'}
                style={styles.monthCellText}>
                {String(d.getDate())}
              </NBText>
              <View
                style={[styles.monthDot, has && inMonth && styles.monthDotOn]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function MyScheduleScreen(): React.JSX.Element {
  const {t, i18n} = useTranslation();
  const userId = useAppSelector(state => state.auth.user?.id);
  const localeCode = i18n.language?.startsWith('en') ? 'en-US' : 'id-ID';

  const [view, setView] = useState<CalView>('day');
  const today = useMemo(() => todayKey(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [rows, setRows] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Schedule | null>(null);

  const {from, to} = useMemo(
    () => rangeFor(view, selectedDate),
    [view, selectedDate],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Schedule[]>();
    for (const r of rows) {
      const list = m.get(r.schedule_date);
      if (list) {
        list.push(r);
      } else {
        m.set(r.schedule_date, [r]);
      }
    }
    return m;
  }, [rows]);

  // Navigation steps by the current view's period.
  const step = useCallback(
    (dir: number) => {
      setSelectedDate(cur => {
        const d = parseKey(cur);
        if (view === 'day') {
          return keyOf(addDays(d, dir));
        }
        if (view === 'week') {
          return keyOf(addDays(d, dir * 7));
        }
        return keyOf(new Date(d.getFullYear(), d.getMonth() + dir, 1));
      });
    },
    [view],
  );

  const periodLabel = useMemo(() => {
    const d = parseKey(selectedDate);
    if (view === 'day') {
      return d.toLocaleDateString(localeCode, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
    if (view === 'week') {
      const mon = parseKey(from);
      const sun = parseKey(to);
      const f = (x: Date) =>
        x.toLocaleDateString(localeCode, {day: 'numeric', month: 'short'});
      return `${f(mon)} – ${f(sun)}`;
    }
    return d.toLocaleDateString(localeCode, {month: 'long', year: 'numeric'});
  }, [view, selectedDate, from, to, localeCode]);

  const fetchRange = useCallback(async () => {
    if (!userId) {
      setError(t('schedules:mySchedule.invalidSession'));
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await getMyRange(from, to);
      if (res.error) {
        setError(res.error);
        return;
      }
      setRows(res.data ?? []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('schedules:mySchedule.loadFailed'),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, from, to, t]);

  useEffect(() => {
    void fetchRange();
  }, [fetchRange]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchRange();
  }, [fetchRange]);

  const weekDays = useMemo(() => {
    const mon = parseKey(from);
    return Array.from({length: 7}, (_, i) => keyOf(addDays(mon, i)));
  }, [from]);

  const monthCells = useMemo(() => {
    if (view !== 'month') {
      return [];
    }
    const end = parseKey(to);
    const out: string[] = [];
    for (let d = parseKey(from); d <= end; d = addDays(d, 1)) {
      out.push(keyOf(d));
    }
    return out;
  }, [view, from, to]);

  const weekdayHeaders = useMemo(
    () =>
      Array.from({length: 7}, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(localeCode, {
          weekday: 'short',
        }),
      ),
    [localeCode],
  );

  const dayRows = byDate.get(selectedDate) ?? [];
  const detailShift = detail?.shift_definition;
  const detailPill = detail ? getRosterStatusPill(t)[detail.status] : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NBBackgroundPattern />

      <View style={styles.switcher}>
        <NBTab
          tabs={[
            {key: 'day', label: t('schedules:mySchedule.viewDay')},
            {key: 'week', label: t('schedules:mySchedule.viewWeek')},
            {key: 'month', label: t('schedules:mySchedule.viewMonth')},
          ]}
          activeTab={view}
          onTabChange={k => setView(k as CalView)}
        />
      </View>

      <View style={styles.navRow}>
        <Pressable
          onPress={() => step(-1)}
          accessibilityLabel={t('schedules:mySchedule.prevDay')}
          hitSlop={8}
          style={styles.navBtn}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={nbColors.black}
          />
        </Pressable>
        <View style={styles.navCenter}>
          <NBText variant="body" style={styles.navDate}>
            {periodLabel}
          </NBText>
          <Pressable
            onPress={() => setSelectedDate(today)}
            style={styles.todayBtn}>
            <NBText variant="caption" uppercase color="gray700">
              {t('schedules:mySchedule.today')}
            </NBText>
          </Pressable>
        </View>
        <Pressable
          onPress={() => step(1)}
          accessibilityLabel={t('schedules:mySchedule.nextDay')}
          hitSlop={8}
          style={styles.navBtn}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={nbColors.black}
          />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <NBSkeleton height={96} style={styles.skeleton} />
          <NBSkeleton height={96} style={styles.skeleton} />
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <NBEmptyState
            icon={
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={48}
                color={nbColors.danger}
              />
            }
            title={t('schedules:mySchedule.loadFailed')}
            description={error}
            ctaLabel={t('schedules:mySchedule.retryLabel')}
            onCTA={onRefresh}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={nbColors.primary}
            />
          }>
          {view === 'day' &&
            (dayRows.length === 0 ? (
              <View style={styles.stateWrap}>
                <NBEmptyState
                  icon={
                    <MaterialCommunityIcons
                      name="calendar-blank-outline"
                      size={48}
                      color={nbColors.gray500}
                    />
                  }
                  title={t('schedules:mySchedule.emptyTitle')}
                  description={t('schedules:mySchedule.emptyDescription')}
                />
              </View>
            ) : (
              dayRows.map(r => (
                <RosterRow
                  key={r.id}
                  roster={r}
                  t={t}
                  onPress={() => setDetail(r)}
                />
              ))
            ))}

          {view === 'week' && (
            <WeekView
              weekDays={weekDays}
              byDate={byDate}
              today={today}
              localeCode={localeCode}
              t={t}
              onPressItem={setDetail}
            />
          )}

          {view === 'month' && (
            <MonthView
              cells={monthCells}
              monthDate={selectedDate}
              byDate={byDate}
              today={today}
              weekdayHeaders={weekdayHeaders}
              onSelectDay={dk => {
                setSelectedDate(dk);
                setView('day');
              }}
            />
          )}
        </ScrollView>
      )}

      <NBModal
        visible={detail !== null}
        onClose={() => setDetail(null)}
        title={
          detail
            ? parseKey(detail.schedule_date).toLocaleDateString(localeCode, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : ''
        }>
        {detail && (
          <View style={styles.detailBody}>
            {detailPill && (
              <StatusPill dot tone={detailPill.tone} label={detailPill.label} />
            )}
            <DetailRow icon="clock-outline">
              {detailShift
                ? `${detailShift.name} · ${hhmm(detailShift.start_time)}–${hhmm(
                    detailShift.end_time,
                  )}`
                : t('schedules:mySchedule.noShiftDefined')}
            </DetailRow>
            <DetailRow icon="map-marker-outline">
              {detail.schedule_areas.map(a => a.area.name).join(', ') ||
                t('schedules:mySchedule.noAreasAssigned')}
            </DetailRow>
            {detail.rayon && (
              <DetailRow icon="map-outline">{detail.rayon.name}</DetailRow>
            )}
          </View>
        )}
      </NBModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: nbColors.bgCanvas},
  switcher: {paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.sm},
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    ...nbShadows.sm,
  },
  navCenter: {flex: 1, alignItems: 'center', gap: nbSpacing.xs},
  navDate: {textAlign: 'center'},
  todayBtn: {
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 2,
    ...nbShadows.sm,
  },
  listContent: {padding: nbSpacing.md, gap: nbSpacing.sm},
  stateWrap: {flex: 1, justifyContent: 'center', padding: nbSpacing.xl},
  skeleton: {borderRadius: nbRadius.base, marginBottom: nbSpacing.sm},
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    gap: nbSpacing.sm,
    ...nbShadows.sm,
  },
  rosterCard: {borderColor: nbColors.primary},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    flexShrink: 1,
  },
  shiftRow: {flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs},
  shiftText: {flexShrink: 1},
  rayonRow: {flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs},
  // Week
  weekWrap: {gap: nbSpacing.md},
  weekDay: {gap: nbSpacing.xs},
  weekDayLabel: {marginBottom: 2},
  weekOff: {fontStyle: 'italic', paddingVertical: nbSpacing.xs},
  // Month
  monthWrap: {gap: nbSpacing.xs},
  monthHeaderRow: {flexDirection: 'row'},
  monthHeaderCell: {flex: 1, textAlign: 'center', paddingVertical: 4},
  monthGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  monthCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  monthCellToday: {
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.primary,
    borderRadius: nbRadius.base,
  },
  monthCellText: {textAlign: 'center'},
  monthDot: {width: 6, height: 6, borderRadius: 3},
  monthDotOn: {backgroundColor: nbColors.primary},
  // Detail
  detailBody: {gap: nbSpacing.sm, paddingVertical: nbSpacing.xs},
  detailRow: {flexDirection: 'row', alignItems: 'center', gap: nbSpacing.sm},
});

export default MyScheduleScreen;
