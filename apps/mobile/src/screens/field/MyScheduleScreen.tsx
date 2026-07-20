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
  NBDatePicker,
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
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
const hhmm = (t?: string): string => (t ? t.slice(0, 5) : '--:--');

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

// ─── Roster card ──────────────────────────────────────────────────────────────

function RosterRow({
  roster,
  t,
}: {
  roster: Schedule;
  t: ReturnType<typeof useTranslation>['t'];
}): React.JSX.Element {
  const ROSTER_STATUS_PILL = getRosterStatusPill(t);
  const pill = ROSTER_STATUS_PILL[roster.status];
  const shift = roster.shift_definition;
  const areasText =
    roster.schedule_areas.map(a => a.area.name).join(', ') ||
    t('schedules:mySchedule.noAreasAssigned');

  const team = roster.team_category;
  return (
    <View style={[styles.card, styles.rosterCard]} testID={`roster-${roster.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <NBText variant="mono-sm" color="gray700" uppercase>
            {shift ? shift.name : t('schedules:mySchedule.noShiftDefined')}
          </NBText>
          {roster.is_projected && (
            <View style={styles.projectedTag}>
              <NBText variant="caption" uppercase color="gray600">
                {t('schedules:mySchedule.projected')}
              </NBText>
            </View>
          )}
        </View>
        <StatusPill dot tone={pill.tone} label={pill.label} />
      </View>

      {team && (
        <View style={styles.districtRow}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={16}
            color={nbColors.gray600}
          />
          <NBText variant="body-sm" color="gray700" style={styles.shiftText}>
            {t('schedules:mySchedule.team', {name: team.name})}
          </NBText>
        </View>
      )}

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

      {roster.district && (
        <View style={styles.districtRow}>
          <MaterialCommunityIcons
            name="map-outline"
            size={16}
            color={nbColors.gray600}
          />
          <NBText variant="caption" color="gray600" style={styles.shiftText}>
            {roster.district.name}
          </NBText>
        </View>
      )}
    </View>
  );
}

// ─── Screen — daily view with a date picker ───────────────────────────────────

export function MyScheduleScreen(): React.JSX.Element {
  const {t, i18n} = useTranslation();
  const userId = useAppSelector(state => state.auth.user?.id);
  const localeCode = i18n.language?.startsWith('en') ? 'en-US' : 'id-ID';

  const today = useMemo(() => todayKey(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rows, setRows] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepDay = useCallback((dir: number) => {
    setSelectedDate(cur => keyOf(addDays(parseKey(cur), dir)));
  }, []);

  const dateLabel = useMemo(
    () =>
      parseKey(selectedDate).toLocaleDateString(localeCode, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [selectedDate, localeCode],
  );

  const fetchRoster = useCallback(async () => {
    if (!userId) {
      setError(t('schedules:mySchedule.invalidSession'));
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      // A day range so a worker with multiple non-overlapping shifts sees all.
      const res = await getMyRange(selectedDate, selectedDate);
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
  }, [userId, selectedDate, t]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchRoster();
  }, [fetchRoster]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NBBackgroundPattern />

      <View style={styles.navRow}>
        <Pressable
          onPress={() => stepDay(-1)}
          accessibilityLabel={t('schedules:mySchedule.prevDay')}
          hitSlop={8}
          style={styles.navBtn}
          testID="prev-day">
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={nbColors.black}
          />
        </Pressable>

        <View style={styles.navCenter}>
          {/* Tap the date to jump to any day via the picker. */}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={styles.dateBtn}
            accessibilityRole="button"
            testID="date-picker-trigger">
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={16}
              color={nbColors.gray700}
            />
            <NBText variant="body" style={styles.navDate}>
              {dateLabel}
            </NBText>
          </Pressable>
          <Pressable
            onPress={() => setSelectedDate(today)}
            style={styles.todayBtn}
            testID="today-btn">
            <NBText variant="caption" uppercase color="gray700">
              {t('schedules:mySchedule.today')}
            </NBText>
          </Pressable>
        </View>

        <Pressable
          onPress={() => stepDay(1)}
          accessibilityLabel={t('schedules:mySchedule.nextDay')}
          hitSlop={8}
          style={styles.navBtn}
          testID="next-day">
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
      ) : rows.length === 0 ? (
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
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={nbColors.primary}
            />
          }>
          {rows.map(r => (
            <RosterRow key={r.id} roster={r} t={t} />
          ))}
        </ScrollView>
      )}

      <NBDatePicker
        triggerless
        visible={pickerOpen}
        value={parseKey(selectedDate)}
        onChange={d => {
          setSelectedDate(keyOf(d));
          setPickerOpen(false);
        }}
        onRequestClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: nbColors.bgCanvas},
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    ...nbShadows.sm,
  },
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    flexShrink: 1,
  },
  projectedTag: {
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.gray300,
    borderStyle: 'dashed',
    borderRadius: nbRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    flexShrink: 1,
  },
  shiftRow: {flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs},
  shiftText: {flexShrink: 1},
  districtRow: {flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs},
});

export default MyScheduleScreen;
