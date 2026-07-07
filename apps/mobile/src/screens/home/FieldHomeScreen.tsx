import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  AccessibilityInfo,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { CLOCKABLE_ROLES, TASK_RECEIVERS } from '../../constants/roles';
import { LoadingSpinner, AppUpdateBanner, InfoTableRow, DateTimeValue } from '../../components/common';
import { NBAlert, NBBackgroundPattern, NBBadge, NBButton, NBText } from '../../components/nb';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, TodayTasksModal, LocationMapModal } from '../../components/modals';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { AttendanceSummaryRow } from '../../components/home/AttendanceSummaryRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
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
import type { Activity, Task, Shift } from '../../types/models.types';

/**
 * Field Home Screen (hi-fi HOME-1) — dashboard for clockable field roles
 * (satgas, linmas, and — until HOME-2/HOME-3 land — korlap/kepala_rayon/admin_data).
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

  const { user, assignedArea } = useAppSelector((state) => state.auth);
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

  // Active-shift hero collapse (default closed). Toggled by tapping the whole card;
  // resets to closed when the screen blurs (useCollapsible).
  const { expanded: shiftExpanded, toggle: toggleShiftCard } = useCollapsible(false);

  // Modal states
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
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
  const { location: homeLocation, refresh: refreshLocation, hasActiveShift } = useHomeLocation();

  // Today's roster — the "am I scheduled?" signal (shared with the clock-in
  // screen so both agree on lateness / area semantics).
  const { rosterShift, hasScheduleToday } = useTodayRoster();

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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are stable callbacks defined below; effect runs on focus by design
    }, [])
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
    await Promise.all([loadCurrentShift(), loadShiftHistory(), loadTodayActivities(), loadTasks()]);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are stable callbacks defined below; isTaskReceiver only affects loadTasks internals
  }, [isTaskReceiver]);

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
  const hasArea = !!(currentShift?.area || assignedArea);
  const locUnknown = homeLocation.loading || homeLocation.latitude === null;
  const areaTone: StatusTone = !hasArea ? 'neutral' : locUnknown ? 'neutral' : homeLocation.isWithinArea ? 'ok' : 'bad';
  const areaLabel = !hasArea
    ? t('home:field.hero.location.noArea')
    : locUnknown
      ? t('home:field.hero.location.loading')
      : homeLocation.isWithinArea
        ? t('home:field.hero.location.inArea')
        : t('home:field.hero.location.outArea');
  const heroAreaName = currentShift?.area?.name ?? assignedArea?.name ?? t('home:field.hero.location.noArea');

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

          {/* Kehadiran saya — clock-in hero first */}
          <HomeSectionDivider label={t('home:field.sections.attendance')} />

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
                  <TouchableOpacity
                    onPress={() => setLocationMapVisible(true)}
                    disabled={!hasActiveShift}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('home:field.hero.a11y.locationStatus', { status: areaLabel })}
                  >
                    <StatusPill tone={areaTone} label={areaLabel} />
                  </TouchableOpacity>
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
              {shiftExpanded && (
                <View style={styles.heroDetails}>
                  <InfoTableRow label={t('home:field.hero.labels.clockInStart')} value={<DateTimeValue source={currentShift.clock_in_time} />} />
                  <InfoTableRow
                    label={t('home:field.hero.labels.status')}
                    value={
                      hasScheduleToday ? (
                        <NBBadge
                          text={attendance.isLate ? t('home:field.hero.status.late') : t('home:field.hero.status.onTime')}
                          color={attendance.isLate ? 'danger' : 'success'}
                          size="sm"
                        />
                      ) : (
                        <NBBadge text={t('home:field.hero.status.noSchedule')} color="gray" size="sm" />
                      )
                    }
                  />
                  <InfoTableRow label={t('home:field.hero.labels.assignedArea')} value={heroAreaName} numberOfLines={1} />
                  <InfoTableRow label={t('home:field.hero.labels.duration')} value={timer.slice(0, 5)} />
                  <InfoTableRow
                    label={t('home:field.hero.labels.currentLocation')}
                    value={
                      <>
                        <NBText variant="mono-sm" color="black" numberOfLines={1} style={styles.heroLocText}>
                          {homeLocation.latitude !== null && homeLocation.longitude !== null
                            ? `${homeLocation.latitude.toFixed(5)}, ${homeLocation.longitude.toFixed(5)}${
                                homeLocation.accuracy !== null ? ` ±${Math.round(homeLocation.accuracy)}m` : ''
                              }`
                            : homeLocation.loading
                            ? t('home:field.hero.location.searching')
                            : t('home:field.hero.location.unavailable')}
                        </NBText>
                        <TouchableOpacity
                          onPress={refreshLocation}
                          disabled={homeLocation.loading}
                          style={styles.heroGpsRefresh}
                          accessibilityRole="button"
                          accessibilityLabel={t('home:field.hero.a11y.refreshLocation')}
                          testID="hero-refresh-location"
                        >
                          {homeLocation.loading ? (
                            <ActivityIndicator size="small" color={nbColors.black} />
                          ) : (
                            <MaterialCommunityIcons name="refresh" size={18} color={nbColors.black} />
                          )}
                        </TouchableOpacity>
                      </>
                    }
                  />
                  <TouchableOpacity
                    onPress={() => setDetailShift(currentShift)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    style={styles.heroDetailLink}
                    testID="shift-detail-link"
                  >
                    <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroDetailText}>
                      {t('home:field.hero.link.shiftDetail')}
                    </NBText>
                  </TouchableOpacity>
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
          ) : (
            <View style={[styles.hero, styles.heroIdle]} testID="absensi-hero">
              <NBText variant="mono-sm" color="gray600" uppercase style={styles.heroLabel}>
                {t('home:field.hero.idle.label')}
              </NBText>
              <NBText variant="h2" color="black" style={styles.heroIdleTitle}>
                {t('home:field.hero.idle.title')}
              </NBText>
              {assignedArea && (
                <NBText variant="body-sm" color="gray700" style={styles.heroMeta}>
                  {t('home:field.hero.idle.assignedArea', { area: assignedArea.name })}
                </NBText>
              )}
              {isClockable && (
                <View style={styles.heroButton}>
                  <NBButton title={t('home:field.hero.button.clockIn')} onPress={handleClockInOut} variant="primary" size="md" testID="clock-button" />
                </View>
              )}
            </View>
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

          {/* Not-assigned hint (field roles only — rayon-scoped roles excluded) */}
          {!assignedArea && !currentShift &&
            user?.role !== 'admin_data' && user?.role !== 'kepala_rayon' && (
              <View style={styles.warningCard}>
                <NBText variant="body-sm" color="statusIdle" align="center">
                  {t('home:field.warning.noAssignedArea')}
                </NBText>
              </View>
            )}
        </ScrollView>
      </View>

      {/* Modals */}
      <ShiftDetailModal visible={detailShift !== null} onClose={() => setDetailShift(null)} shift={detailShift} />
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
        location={homeLocation}
        area={currentShift?.area ?? assignedArea ?? undefined}
      />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.sm, paddingBottom: nbSpacing.md, flexGrow: 1 },
  updateBanner: { marginBottom: nbSpacing.sm },
  banner: { marginBottom: nbSpacing.md },

  /* Absensi hero */
  hero: {
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  heroActive: { backgroundColor: nbColors.statusActiveBg },
  heroLembur: { backgroundColor: nbColors.statusIdleBg },
  heroIdle: { backgroundColor: nbColors.white },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  heroChevron: { marginTop: 1 },
  heroLabel: { letterSpacing: 0.6, marginBottom: 2 },
  heroMeta: { marginTop: nbSpacing.sm },
  // Expanded hero: label:value table rows.
  heroDetails: { marginTop: nbSpacing.md, gap: nbSpacing.xs },
  heroLocText: { flexShrink: 1 },
  heroIdleTitle: { marginTop: 2 },
  // Compact white refresh button beside the inline coords.
  heroGpsRefresh: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // Extra breathing room from the coords (on top of the row gap).
    marginLeft: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
  },
  heroButton: { marginTop: nbSpacing.md },
  heroDetailLink: { marginTop: nbSpacing.sm, alignSelf: 'flex-start' },
  heroDetailText: { letterSpacing: 0.6 },

  /* Tiles */
  tiles: { flexDirection: 'row', gap: nbSpacing.sm, marginBottom: nbSpacing.md },

  warningCard: {
    backgroundColor: withAlpha(nbColors.warningLight, 0.125),
    borderColor: nbColors.warning,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    marginTop: nbSpacing.md,
  },
});

export default FieldHomeScreen;
