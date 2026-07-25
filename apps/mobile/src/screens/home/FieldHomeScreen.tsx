import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  AccessibilityInfo,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { CLOCKABLE_ROLES, TASK_RECEIVERS } from '../../constants/roles';
import { LoadingSpinner, AppUpdateBanner, InfoTableRow } from '../../components/common';
import { NBAlert, NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, TodayTasksModal, LocationMapModal } from '../../components/modals';
import { AttendanceStatusSheet, type AttendanceStatusKind } from '../../components/modals/AttendanceStatusSheet';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { AttendanceInfoRows } from '../../components/attendance/AttendanceInfoRows';
import { AttendanceEntryCard } from '../../components/attendance/AttendanceEntryCard';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { AttendanceSummaryRow } from '../../components/home/AttendanceSummaryRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { workerMapMarker, scopeAreaMarker } from '../../utils/mapUtils';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { shiftsApi, activitiesApi, tasksApi } from '../../services/api';
import { setCurrentShift, setShiftHistory, setError } from '../../store/slices/shiftSlice';
import { setActivities } from '../../store/slices/activitiesSlice';
import { setTasks } from '../../store/slices/tasksSlice';
import { calculateDuration, isToday } from '../../utils/dateUtils';
import { deriveAttendanceStatus } from '../../utils/attendance';
import { isTaskScopedToday } from '../../utils/taskStatus';
import { useLocationPermission, useCollapsible } from '../../hooks';
import { useHomeLocation } from '../../hooks/useHomeLocation';
import { useTodayRoster } from '../../hooks/useTodayRoster';
import { useCurrentShiftState } from '../../hooks/useCurrentShiftState';
import { screenContentGrow } from '../../constants/layout';
import { resolveNextShift } from '../../utils/nextShift';
import { resolveScheduleScope } from '../../utils/scheduleScope';
import { formatShiftLabel } from '../../utils/shiftDisplay';
import type { Activity, Task, Shift, Schedule } from '../../types/models.types';

/**
 * Field Home Screen (hi-fi HOME-1) — dashboard for clockable field roles
 * (satgas, linmas, and — until HOME-2/HOME-3 land — korlap/kepala_rayon/admin_rayon).
 * Selected by the role-aware `HomeScreen` dispatcher.
 *
 * Layout (hi-fi HOME-1): absensi hero (live clock + in-area pill + clock-out) →
 * "Tugas hari ini" list (real assigned tasks) → "Ringkasan hari ini" stat tiles.
 */

const pad = (num: number): string => String(num).padStart(2, '0');

export function FieldHomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);
  const { currentShift, shiftHistory } = useAppSelector((state) => state.shift);
  const { activitiesList } = useAppSelector((state) => state.activities);
  const { tasks } = useAppSelector((state) => state.tasks);

  const isClockable = !!user?.role && CLOCKABLE_ROLES.includes(user.role);
  const isTaskReceiver = !!user?.role && TASK_RECEIVERS.includes(user.role);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live shift timer
  const [timer, setTimer] = useState('00:00:00');
  // Live wall clock for the shared "Waktu Sekarang" row.
  const [now, setNow] = useState(() => new Date());

  // Active-shift hero collapse (default closed). Toggled by tapping the whole card;
  // resets to closed when the screen blurs (useCollapsible).
  const { expanded: shiftExpanded, toggle: toggleShiftCard } = useCollapsible(false);

  // Modal states
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [activitiesModalVisible, setActivitiesModalVisible] = useState(false);
  const [workHoursModalVisible, setWorkHoursModalVisible] = useState(false);
  const [tasksModalVisible, setTasksModalVisible] = useState(false);
  const [locationMapVisible, setLocationMapVisible] = useState(false);

  // Announce shift time every 5 minutes for screen-reader users.
  const lastAnnouncedMinuteRef = useRef<number>(-1);

  // Monitor location permission + GPS during an active shift (drives the banner).
  const {
    isLocationAvailable,
    permissionGranted,
    gpsEnabled,
    showPermissionAlert,
    showGpsAlert,
    refresh: refreshLocationStatus,
  } = useLocationPermission({
    enableMonitoring: !!currentShift,
    showAlerts: true,
    onPermissionLost: () => {},
    onGpsDisabled: () => {},
  });

  // Home-screen location (drives the in-area pill + the map modal).
  const {
    location: homeLocation,
    refresh: refreshLocation,
    hasActiveShift,
    hasBoundary,
    mapArea: homeMapArea,
  } = useHomeLocation();

  // Today's roster — the "am I scheduled?" signal (shared with the clock-in
  // screen so both agree on lateness / area semantics).
  const { roster, rosterShift, hasScheduleToday, allToday, refetch: refetchRoster } = useTodayRoster();
  // Same live-attendance source the clock-in screen uses, so the Kehadiran card
  // shows the identical shift (attribution-first, roster fallback) — and stays
  // fresh across a day boundary instead of showing yesterday's resolved shift.
  const { displayShift, refetch: refetchShiftState } = useCurrentShiftState();
  // A city/rayon/kawasan-scope roster row assigns the worker without naming a
  // lokasi — it must NOT read as "not assigned to any area".
  const scheduleScope = useMemo(() => resolveScheduleScope(roster), [roster]);

  // Defensive Array.isArray guards: stale HMR/hydration snapshots have crashed
  // this tree before when a list briefly hydrated as a non-array.
  const todayActivitiesCount = useMemo(() => {
    const list = Array.isArray(activitiesList) ? activitiesList : [];
    return list.filter((activity) => isToday(activity.created_at)).length;
  }, [activitiesList]);

  const todayShifts = useMemo(() => {
    const list = Array.isArray(shiftHistory) ? shiftHistory : [];
    return list.filter((shift) => isToday(shift.clock_in_time));
  }, [shiftHistory]);

  // Today's attendance status for the hero (roster-gated — see utils/attendance).
  // Lateness is judged only against today's roster shift; an unscheduled worker
  // (patrol / ad-hoc) reads as "no schedule", never late.
  const attendance = useMemo(
    () => deriveAttendanceStatus(todayShifts, currentShift, rosterShift),
    [todayShifts, currentShift, rosterShift],
  );

  // "Tugas hari ini" — all statuses, scoped to today (deadline, created_at,
  // or completed_at falls today). Shared with the Monitoring user detail sheet
  // via isTaskScopedToday so both surfaces always agree.
  const activeTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return list.filter(isTaskScopedToday);
  }, [tasks]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader is a stable callback defined below; effect runs on mount by design
  }, []);

  // Live wall clock (every second) for the "Waktu Sekarang" row.
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Live timer (every second) for the active shift.
  useEffect(() => {
    if (!currentShift) {
      setTimer('00:00:00');
      lastAnnouncedMinuteRef.current = -1;
      return;
    }
    const updateTimer = () => {
      const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setTimer(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);

      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes > 0 && totalMinutes % 5 === 0 && totalMinutes !== lastAnnouncedMinuteRef.current) {
        lastAnnouncedMinuteRef.current = totalMinutes;
        AccessibilityInfo.announceForAccessibility(t('home:field.a11y.shiftTime', { hours, minutes }));
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshots currentShift on mount by design
  }, [currentShift?.id]);

  // On re-focus (e.g. returning from ClockInOut) reload so counts stay fresh.
  // Skip the first focus — useEffect/loadInitialData covers initial mount.
  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      loadCurrentShift();
      loadShiftHistory();
      loadTodayActivities();
      loadTasks();
      // Roster + live shift state are fetch-once-on-mount hooks; refresh them on
      // focus so the Kehadiran card never shows a stale shift after the app has
      // been left open (e.g. across a day boundary).
      void refetchRoster();
      void refetchShiftState();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are stable callbacks defined below; effect runs on focus by design
    }, [refetchRoster, refetchShiftState])
  );

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadCurrentShift(), loadShiftHistory(), loadTodayActivities(), loadTasks()]);
    setLoading(false);
  };

  const loadCurrentShift = async () => {
    try {
      const response = await shiftsApi.getCurrentShift();
      if (response.error) {
        if (__DEV__) console.warn('[FieldHomeScreen] Failed to load shift:', response.error);
        dispatch(setError(response.error));
        return;
      }
      dispatch(setCurrentShift(response.data ?? null));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load shift';
      if (__DEV__) console.warn('[FieldHomeScreen] Unexpected error loading shift:', message);
      dispatch(setError(message));
    }
  };

  const loadShiftHistory = async () => {
    try {
      const response = await shiftsApi.getMyShifts();
      if (response.error) {
        if (__DEV__) console.warn('[FieldHomeScreen] Failed to load shift history:', response.error);
        return;
      }
      dispatch(setShiftHistory(response.data ?? []));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load shift history';
      if (__DEV__) console.warn('[FieldHomeScreen] Unexpected error loading shift history:', message);
    }
  };

  const loadTodayActivities = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await activitiesApi.getMyActivities({ from_date: today });
      if (response.data) {
        dispatch(setActivities(response.data.data ?? []));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load activities';
      if (__DEV__) console.warn('Failed to load activities:', message);
    }
  };

  const loadTasks = async () => {
    if (!isTaskReceiver) return;
    try {
      const response = await tasksApi.getMyTasks({ scope: 'assigned', sort_by: 'deadline', sort_dir: 'asc' });
      if (response.data) {
        dispatch(setTasks(response.data.data ?? []));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      if (__DEV__) console.warn('Failed to load tasks:', message);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadCurrentShift(),
      loadShiftHistory(),
      loadTodayActivities(),
      loadTasks(),
      refetchRoster(),
      refetchShiftState(),
    ]);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are stable callbacks defined below; isTaskReceiver only affects loadTasks internals
  }, [isTaskReceiver, refetchRoster, refetchShiftState]);

  const handleClockInOut = () => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit' as never);
    } else {
      navigation.navigate('Absensi' as never);
    }
  };

  const handleViewActivities = useCallback((activity: Activity) => {
    setActivitiesModalVisible(false);
    navigation.navigate('ActivityDetail', { activityId: activity.id, from: 'Home' });
  }, [navigation]);

  const handleViewShift = useCallback((shift: Shift) => {
    setWorkHoursModalVisible(false);
    setDetailShift(shift);
  }, []);

  const openTask = useCallback((task: Task) => {
    setTasksModalVisible(false);
    navigation.navigate('TaskDetail', { taskId: task.id, from: 'Home' });
  }, [navigation]);

  // Kept in sync (every second) with TodayWorkHoursModal's own calculation.
  const totalTodayDuration = useMemo(() => {
    let totalMinutes = 0;
    todayShifts.forEach((shift) => {
      const endTime = shift.clock_out_time ? new Date(shift.clock_out_time) : new Date();
      totalMinutes += calculateDuration(new Date(shift.clock_in_time), endTime).totalMinutes;
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}j ${minutes}m`;
  }, [todayShifts]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // In-area pill tone/label for the active-shift hero. A worker with no assigned
  // area has no boundary to be inside/outside of — show a neutral "no area".
  // Scope label is now just the area name (e.g. "Rayon Barat 1"), not the long
  // "Lingkup Rayon Rayon Barat 1" — the scope i18n keys dropped the prefix.
  const scopeLabelText =
    scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location'
      ? t(`attendance:clockInOut.scope.${scheduleScope.scope}`, { name: scheduleScope.name ?? '' })
      : null;
  const locUnknown = homeLocation.loading || homeLocation.latitude === null;
  // With a real boundary (lokasi OR the assigned rayon/kawasan polygon) the pill
  // reports inside/outside; otherwise it names the scope (or "no area").
  const areaTone: StatusTone = hasBoundary
    ? locUnknown
      ? 'neutral'
      : homeLocation.isWithinArea
        ? 'ok'
        : 'bad'
    : scopeLabelText
      ? 'info'
      : 'neutral';
  const areaLabel = hasBoundary
    ? locUnknown
      ? t('home:field.hero.location.loading')
      : homeLocation.isWithinArea
        ? t('home:field.hero.location.inArea')
        : t('home:field.hero.location.outArea')
    : (scopeLabelText ?? t('home:field.hero.location.noArea'));
  // Shift window for the Detail Shift modal (e.g. "Shift 3 · 21:00–05:00").
  const heroShiftDef = currentShift?.shift_definition ?? rosterShift;
  const heroShiftText = heroShiftDef
    ? `${heroShiftDef.name} · ${heroShiftDef.start_time.slice(0, 5)}–${heroShiftDef.end_time.slice(0, 5)}`
    : null;
  // "Shift 2 · 14:00–22:00 · Rayon Barat 1" for a roster row — used to name the
  // next shift on the hero so a multi-shift worker sees what's coming.
  const shiftLine = (s: Schedule | null): string | null => {
    const sd = s?.shift_definition;
    if (!sd) return null;
    const scope = resolveScheduleScope(s);
    const area = scope.scope !== 'none' ? (scope.name ?? '') : '';
    const window = `${sd.name} · ${sd.start_time.slice(0, 5)}–${sd.end_time.slice(0, 5)}`;
    return area ? `${window} · ${area}` : window;
  };
  // The shift after the current one today (ADR-053: clock out, then clock in the
  // next). Null when there's nothing later today.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextShift = resolveNextShift(allToday, nowMinutes, currentShift?.shift_definition?.id ?? null);
  const nextShiftLine = shiftLine(nextShift);
  // The idle case (naming the shift they'd clock INTO) is no longer this
  // screen's job: the idle hero is now AttendanceEntryCard, which carries its
  // own `shiftLabel` from the unified attribution source (`displayShift`).
  // Which explanation the Status Kehadiran pill opens.
  const statusKind: AttendanceStatusKind = !hasScheduleToday
    ? 'noSchedule'
    : attendance.isLate
      ? 'late'
      : 'onTime';

  // Idle-state entry card (shared with the Pencatatan Waktu hub). Reuses the same
  // shift label + Jam Masuk/Keluar shape so home and the hub read identically.
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  // Attribution-first (same mechanism as the clock-in screen), roster fallback.
  const entryShiftLabel = formatShiftLabel(displayShift(rosterShift), t('attendance:hub.noShift'));

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} />
          }
        >
          {/* App update prompt (newer build available in the registry) */}
          <AppUpdateBanner style={styles.updateBanner} />

          {/* Location warning banner (active shift + GPS/permission problem) */}
          {currentShift && !isLocationAvailable && (
            <NBAlert
              variant="warning"
              message={
                !permissionGranted
                  ? t('home:field.alerts.permissionRevoked')
                  : !gpsEnabled
                    ? t('home:field.alerts.gpsDisabled')
                    : t('home:field.alerts.locationUnavailable')
              }
              actionLabel={t('home:field.alerts.fix')}
              onAction={() => {
                if (!permissionGranted) showPermissionAlert();
                else if (!gpsEnabled) showGpsAlert();
                else refreshLocationStatus();
              }}
              style={styles.banner}
              testID="worker-home-location-warning"
            />
          )}

          {/* Kehadiran — clock-in hero + today's schedule, one section (the
              schedule used to be its own divider; merged in per UX review). */}
          <HomeSectionDivider label={t('home:field.sections.attendance')} first />

          {/* Kehadiran hero — collapsible; the whole card toggles open/closed. */}
          {currentShift ? (
            <TouchableOpacity
              style={[styles.hero, currentShift.is_overtime ? styles.heroLembur : styles.heroActive]}
              testID="absensi-hero"
              activeOpacity={0.9}
              onPress={toggleShiftCard}
              accessibilityRole="button"
              accessibilityState={{ expanded: shiftExpanded }}
              accessibilityLabel={currentShift.is_overtime ? t('home:field.hero.a11y.overtimeActive') : t('home:field.hero.a11y.onDuty')}
              accessibilityHint={shiftExpanded ? t('home:field.hero.a11y.tapToClose') : t('home:field.hero.a11y.tapToOpen')}
            >
              <View style={styles.heroTopRow}>
                <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                  {currentShift.is_overtime ? t('home:field.hero.overtimeActive') : t('home:field.hero.onDuty')}
                </NBText>
                <View style={styles.heroStatusRow}>
                  {/* Collapsed only: the in/out-area pill lives in the header at a
                      glance; expanded, it moves into the body (Status Area row). */}
                  {!shiftExpanded && (
                    <TouchableOpacity
                      onPress={() => setLocationMapVisible(true)}
                      disabled={!hasActiveShift}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('home:field.hero.a11y.locationStatus', { status: areaLabel })}
                    >
                      <StatusPill tone={areaTone} label={areaLabel} />
                    </TouchableOpacity>
                  )}
                  <MaterialCommunityIcons
                    name={shiftExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={nbColors.gray700}
                    style={styles.heroChevron}
                  />
                </View>
              </View>
              <AttendanceSummaryRow
                firstClockIn={attendance.firstClockIn}
                lastClockOut={attendance.lastClockOut}
                isLate={attendance.isLate}
                isEarlyLeave={attendance.isEarlyLeave}
                neutral={!hasScheduleToday}
              />
              {/* Next shift today — clock out of this one, then clock in for it. */}
              {nextShiftLine && (
                <NBText variant="body-sm" color="gray700" style={styles.heroNextShift}>
                  {t('home:field.hero.nextShift', { shift: nextShiftLine })}
                </NBText>
              )}
              {shiftExpanded && (
                <View style={styles.heroDetails}>
                  {/* Shared, simplified rows — identical to the Rekam Kehadiran card:
                      Status Kehadiran (tap → why) + Status Area (pill → map, refresh
                      beside). The rest lives in the Detail Shift modal. */}
                  <AttendanceInfoRows
                    status={{
                      tone: !hasScheduleToday ? 'neutral' : attendance.isLate ? 'bad' : 'ok',
                      label: !hasScheduleToday
                        ? t('home:field.hero.status.noSchedule')
                        : attendance.isLate
                          ? t('home:field.hero.status.late')
                          : t('home:field.hero.status.onTime'),
                      onPress: () => setStatusSheetVisible(true),
                      a11yLabel: t('attendance:infoCard.whyStatus'),
                    }}
                    areaStatus={{
                      tone: areaTone,
                      label: areaLabel,
                      onPress: () => setLocationMapVisible(true),
                      disabled: !hasActiveShift,
                      a11yLabel: t('home:field.hero.a11y.locationStatus', { status: areaLabel }),
                    }}
                    onRefreshLocation={refreshLocation}
                    refreshingLocation={homeLocation.loading}
                    onDetailShift={() => setDetailShift(currentShift)}
                  />
                  {isClockable && (
                    <View style={styles.heroButton}>
                      <NBButton
                        title={currentShift.is_overtime ? t('home:field.hero.button.clockOutOvertime') : t('home:field.hero.button.clockOut')}
                        onPress={handleClockInOut}
                        variant="danger"
                        size="md"
                        testID="clock-button"
                      />
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ) : isClockable ? (
            // Idle (no active shift): the reusable Kehadiran entry card — same
            // shape as the hub, with the schedule/log links built in. Only for
            // clockable roles (mirrors the active hero's clock-button guard); a
            // non-clockable role that lands here gets no clock affordance.
            <AttendanceEntryCard
              date={todayStr}
              shiftLabel={entryShiftLabel}
              jamMasuk={attendance.firstClockIn}
              jamKeluar={attendance.lastClockOut}
              hasRecordToday={todayShifts.length > 0}
              onClockIn={() => navigation.navigate('Absensi', { action: 'clock_in' })}
              onClockOut={() => navigation.navigate('Absensi', { action: 'clock_out' })}
              onViewSchedule={() => navigation.navigate('MySchedule')}
              onViewLog={() => navigation.navigate('Attendance')}
              testID="absensi-hero"
            />
          ) : null}

          {/* Jadwal saya — today's roster row at a glance, nested inside the
              Kehadiran section. Only shown during an active shift; when idle, the
              entry card above carries the "Jadwal Saya" link instead (no duplicate).
              Tapping opens the full day view. */}
          {isClockable && currentShift && (
            <>
              <TouchableOpacity
                style={styles.scheduleCard}
                onPress={() => navigation.navigate('MySchedule' as never)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('home:field.schedule.a11y.open')}
                testID="home-schedule-card"
              >
                {rosterShift ? (
                  <>
                    {/* One line per assignment: a worker can cover several places
                        in one shift (ADR-053), and showing only the first would
                        hide the rest of their day. */}
                    {allToday.map((row) => {
                      const rowScope = resolveScheduleScope(row);
                      const sd = row.shift_definition;
                      return (
                        <InfoTableRow
                          key={row.id}
                          label={
                            sd
                              ? `${sd.name} · ${sd.start_time.slice(0, 5)}–${sd.end_time.slice(0, 5)}`
                              : t('home:field.schedule.shift')
                          }
                          value={
                            rowScope.scope === 'none'
                              ? t('home:field.schedule.noAssignment')
                              : t(`attendance:clockInOut.scope.${rowScope.scope}`, {
                                  name: rowScope.name ?? '',
                                })
                          }
                          numberOfLines={2}
                        />
                      );
                    })}
                    {roster?.team_category?.name ? (
                      <InfoTableRow
                        label={t('home:field.schedule.team')}
                        value={roster.team_category.name}
                      />
                    ) : null}
                  </>
                ) : (
                  <NBText variant="body-sm" color="gray700">
                    {t('home:field.schedule.none')}
                  </NBText>
                )}
                <NBText variant="body-sm" color="primary" style={styles.scheduleLink}>
                  {t('home:field.schedule.viewAll')}
                </NBText>
              </TouchableOpacity>
            </>
          )}

          {/* Ringkasan hari ini — at-a-glance counters; each tile opens its detail sheet */}
          <HomeSectionDivider label={t('home:field.sections.summary')} />
          <View style={styles.tiles}>
            <HomeStatTile
              label={t('home:field.tiles.attendance')}
              value={totalTodayDuration}
              variant="yellow"
              onPress={() => setWorkHoursModalVisible(true)}
              testID="stat-workhours"
            />
            {isTaskReceiver && (
              <HomeStatTile
                label={t('home:field.tiles.tasks')}
                value={activeTasks.length}
                variant="ok"
                onPress={() => setTasksModalVisible(true)}
                testID="stat-tasks"
              />
            )}
            <HomeStatTile
              label={t('home:field.tiles.activities')}
              value={todayActivitiesCount}
              variant="neutral"
              onPress={() => setActivitiesModalVisible(true)}
              testID="stat-activities"
            />
          </View>

          {/* The "not assigned to any area" state is surfaced by the attendance +
              clock-in screens (Status Area + the "Tidak ada area penugasan" note),
              so home no longer repeats it as a bottom banner. */}
        </ScrollView>
      </View>

      {/* Modals */}
      <ShiftDetailModal
        visible={detailShift !== null}
        onClose={() => setDetailShift(null)}
        shift={detailShift}
        scopeLabel={scopeLabelText}
        shiftText={heroShiftText}
        durationText={currentShift ? timer.slice(0, 5) : null}
        currentTime={now}
        currentLocation={{
          latitude: homeLocation.latitude,
          longitude: homeLocation.longitude,
          accuracy: homeLocation.accuracy,
        }}
      />
      <AttendanceStatusSheet
        visible={statusSheetVisible}
        onClose={() => setStatusSheetVisible(false)}
        status={statusKind}
        clockInTime={currentShift?.clock_in_time ?? null}
        shiftStart={rosterShift?.start_time ?? null}
      />
      <TodayActivitiesModal
        visible={activitiesModalVisible}
        onClose={() => setActivitiesModalVisible(false)}
        activities={activitiesList.filter((activity) => isToday(activity.created_at))}
        onActivityPress={handleViewActivities}
      />
      <TodayWorkHoursModal
        visible={workHoursModalVisible}
        onClose={() => setWorkHoursModalVisible(false)}
        shifts={todayShifts}
        onShiftPress={handleViewShift}
      />
      <TodayTasksModal
        visible={tasksModalVisible}
        onClose={() => setTasksModalVisible(false)}
        tasks={activeTasks}
        onTaskPress={openTask}
      />
      <LocationMapModal
        visible={locationMapVisible}
        onClose={() => setLocationMapVisible(false)}
        title={t('attendance:clockInOut.mapTitle')}
        location={homeLocation}
        // `homeMapArea` is resolved by useHomeLocation with the SAME shared
        // builder the clock-in/out screen uses (active clock-in lokasi → today's
        // roster lokasi → assigned rayon/kawasan boundary → standing assignment),
        // so this map draws exactly the same area + markers as that one.
        area={homeMapArea}
        hideAreaStatus={!hasBoundary}
        workerMarker={workerMapMarker(user?.role, hasBoundary && !homeLocation.isWithinArea)}
        areaMarker={homeMapArea ? scopeAreaMarker(scheduleScope.scope) : undefined}
        onRefresh={refreshLocation}
        refreshing={homeLocation.loading}
      />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  content: screenContentGrow,
  updateBanner: { marginBottom: nbSpacing.sm },
  banner: { marginBottom: nbSpacing.md },

  /* Absensi hero */
  hero: {
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    ...nbShadows.md,
  },
  heroActive: { backgroundColor: nbColors.statusActiveBg },
  heroLembur: { backgroundColor: nbColors.statusIdleBg },
  heroTopRow: {
    flexDirection: 'row',
    // Center so the status pill + chevron line up with the "SEDANG BERTUGAS"
    // label (the pill is taller than the text — top-align read as misaligned).
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  heroChevron: { marginTop: 1 },
  heroLabel: { letterSpacing: 0.6, marginBottom: 2 },
  heroNextShift: { marginTop: nbSpacing.xs },
  // Expanded hero: label:value table rows — sm gap so the rows breathe.
  heroDetails: { marginTop: nbSpacing.md, gap: nbSpacing.sm },
  // Status Area value: the in/out pill + the GPS refresh button, right-aligned.
  heroButton: { marginTop: nbSpacing.md },

  /* Tiles */
  tiles: { flexDirection: 'row', gap: nbSpacing.sm },

  scheduleCard: {
    backgroundColor: nbColors.bgSurface,
    borderColor: nbColors.black,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    gap: nbSpacing.xs,
    // Intra-section gap from the clock-in hero above (same Kehadiran section).
    marginTop: nbSpacing.sm,
  },
  scheduleLink: {
    marginTop: nbSpacing.xs,
  },
});

export default FieldHomeScreen;
