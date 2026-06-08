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
import { CLOCKABLE_ROLES, TASK_RECEIVERS } from '../../constants/roles';
import { LoadingSpinner } from '../../components/common';
import { NBAlert, NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, TodayTasksModal, LocationMapModal } from '../../components/modals';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { shiftsApi, activitiesApi, tasksApi } from '../../services/api';
import { setCurrentShift, setShiftHistory, setError } from '../../store/slices/shiftSlice';
import { setActivities } from '../../store/slices/activitiesSlice';
import { setTasks } from '../../store/slices/tasksSlice';
import { formatTime, calculateDuration, isToday } from '../../utils/dateUtils';
import { isTaskScopedToday } from '../../utils/taskStatus';
import { useLocationPermission } from '../../hooks';
import { useHomeLocation } from '../../hooks/useHomeLocation';
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

  // Active-shift hero collapse (default closed). Toggled by tapping the whole card.
  const [shiftExpanded, setShiftExpanded] = useState(false);

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

  // "Tugas hari ini" — all statuses, scoped to today (deadline, created_at,
  // or completed_at falls today). Shared with the Monitoring user detail sheet
  // via isTaskScopedToday so both surfaces always agree.
  const activeTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return list.filter(isTaskScopedToday);
  }, [tasks]);

  useEffect(() => {
    loadInitialData();
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
        AccessibilityInfo.announceForAccessibility(`Waktu shift: ${hours} jam ${minutes} menit`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
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
  }, [isTaskReceiver]);

  const handleClockInOut = () => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit' as never);
    } else {
      navigation.navigate('ClockInOut' as never);
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
  }, [todayShifts, timer]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // In-area pill tone/label for the active-shift hero.
  const locUnknown = homeLocation.loading || homeLocation.latitude === null;
  const areaTone: StatusTone = locUnknown ? 'neutral' : homeLocation.isWithinArea ? 'ok' : 'bad';
  const areaLabel = locUnknown ? 'Lokasi…' : homeLocation.isWithinArea ? 'Di area' : 'Di luar area';
  const heroAreaName = currentShift?.area?.name ?? assignedArea?.name ?? 'Area tidak diketahui';

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
          {/* Location warning banner (active shift + GPS/permission problem) */}
          {currentShift && !isLocationAvailable && (
            <NBAlert
              variant="warning"
              message={
                !permissionGranted
                  ? 'Izin lokasi dicabut. Pelacakan lokasi tidak aktif.'
                  : !gpsEnabled
                    ? 'GPS tidak aktif. Pelacakan lokasi tidak aktif.'
                    : 'Lokasi tidak tersedia. Periksa pengaturan GPS.'
              }
              actionLabel="Perbaiki"
              onAction={() => {
                if (!permissionGranted) showPermissionAlert();
                else if (!gpsEnabled) showGpsAlert();
                else refreshLocationStatus();
              }}
              style={styles.banner}
              testID="worker-home-location-warning"
            />
          )}

          {/* Absensi saya — clock-in hero first */}
          <HomeSectionDivider label="Absensi saya" />

          {/* Absensi hero — collapsible; the whole card toggles open/closed. */}
          {currentShift ? (
            <TouchableOpacity
              style={[styles.hero, currentShift.is_overtime ? styles.heroLembur : styles.heroActive]}
              testID="absensi-hero"
              activeOpacity={0.9}
              onPress={() => setShiftExpanded((prev) => !prev)}
              accessibilityRole="button"
              accessibilityState={{ expanded: shiftExpanded }}
              accessibilityLabel={currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
              accessibilityHint={shiftExpanded ? 'Ketuk untuk tutup detail' : 'Ketuk untuk buka detail'}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroClockArea}>
                  <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                    {currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
                  </NBText>
                  <NBText
                    variant="display"
                    color="black"
                    style={styles.heroClock}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    accessibilityLabel={`Waktu shift berjalan: ${timer}`}
                  >
                    {timer}
                  </NBText>
                </View>
                <View style={styles.heroTopRight}>
                  <TouchableOpacity
                    onPress={() => setLocationMapVisible(true)}
                    disabled={!hasActiveShift}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Status lokasi: ${areaLabel}. Ketuk untuk peta.`}
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
              {shiftExpanded && (
                <>
                  <NBText variant="mono-sm" color="gray700" style={styles.heroMeta}>
                    {`Mulai ${formatTime(currentShift.clock_in_time)} · ${heroAreaName}`}
                  </NBText>
                  {/* Current GPS + force-refresh (force-uploads the location). */}
                  <View style={styles.heroGpsRow}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={16} color={nbColors.gray700} />
                    <NBText variant="mono-sm" color="gray700" numberOfLines={1} style={styles.heroGpsText}>
                      {homeLocation.latitude !== null && homeLocation.longitude !== null
                        ? `${homeLocation.latitude.toFixed(5)}, ${homeLocation.longitude.toFixed(5)}${
                            homeLocation.accuracy !== null ? ` · ±${Math.round(homeLocation.accuracy)}m` : ''
                          }`
                        : homeLocation.loading
                        ? 'Mencari lokasi…'
                        : 'Lokasi tidak tersedia'}
                    </NBText>
                    <TouchableOpacity
                      onPress={refreshLocation}
                      disabled={homeLocation.loading}
                      style={styles.heroGpsRefresh}
                      accessibilityRole="button"
                      accessibilityLabel="Perbarui lokasi"
                      testID="hero-refresh-location"
                    >
                      {homeLocation.loading ? (
                        <ActivityIndicator size="small" color={nbColors.black} />
                      ) : (
                        <MaterialCommunityIcons name="refresh" size={18} color={nbColors.black} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {isClockable && (
                    <View style={styles.heroButton}>
                      <NBButton
                        title={currentShift.is_overtime ? 'Clock Out Lembur' : 'Clock Out'}
                        onPress={handleClockInOut}
                        variant="danger"
                        size="md"
                        testID="clock-button"
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => setDetailShift(currentShift)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    style={styles.heroDetailLink}
                    testID="shift-detail-link"
                  >
                    <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroDetailText}>
                      Detail shift →
                    </NBText>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.hero, styles.heroIdle]} testID="absensi-hero">
              <NBText variant="mono-sm" color="gray600" uppercase style={styles.heroLabel}>
                Belum clock in
              </NBText>
              <NBText variant="h2" color="black" style={styles.heroIdleTitle}>
                Mulai shift hari ini
              </NBText>
              {assignedArea && (
                <NBText variant="body-sm" color="gray700" style={styles.heroMeta}>
                  {`Area: ${assignedArea.name}`}
                </NBText>
              )}
              {isClockable && (
                <View style={styles.heroButton}>
                  <NBButton title="Clock In" onPress={handleClockInOut} variant="primary" size="md" testID="clock-button" />
                </View>
              )}
            </View>
          )}

          {/* Ringkasan hari ini — at-a-glance counters; each tile opens its detail sheet */}
          <HomeSectionDivider label="Ringkasan hari ini" />
          <View style={styles.tiles}>
            <HomeStatTile
              label="Aktivitas"
              value={todayActivitiesCount}
              variant="neutral"
              onPress={() => setActivitiesModalVisible(true)}
              testID="stat-activities"
            />
            <HomeStatTile
              label="Jam kerja"
              value={totalTodayDuration}
              variant="yellow"
              onPress={() => setWorkHoursModalVisible(true)}
              testID="stat-workhours"
            />
            {isTaskReceiver && (
              <HomeStatTile
                label="Tugas"
                value={activeTasks.length}
                variant="ok"
                onPress={() => setTasksModalVisible(true)}
                testID="stat-tasks"
              />
            )}
          </View>

          {/* Not-assigned hint (field roles only — rayon-scoped roles excluded) */}
          {!assignedArea && !currentShift &&
            user?.role !== 'admin_data' && user?.role !== 'kepala_rayon' && (
              <View style={styles.warningCard}>
                <NBText variant="body-sm" color="statusIdle" align="center">
                  Anda belum ditugaskan ke area manapun. Hubungi supervisor Anda.
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
  heroClockArea: { flex: 1 },
  heroTopRight: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  heroChevron: { marginTop: 1 },
  heroLabel: { letterSpacing: 0.6, marginBottom: 2 },
  // Smaller than the display default (40) so "HH:MM:SS" stays on one line next
  // to the status pill + chevron on narrow phones (one-off; adjustsFontSizeToFit
  // shrinks further if needed). Applies to both collapsed + expanded states.
  heroClock: { fontSize: 34, lineHeight: 38, letterSpacing: 0.5 },
  heroMeta: { marginTop: nbSpacing.sm },
  heroIdleTitle: { marginTop: 2 },
  // Plain inline coords (no card) + a compact white refresh button right after.
  heroGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginTop: nbSpacing.xs,
  },
  // flexShrink (not flex:1) so the button hugs the coords instead of being
  // pushed to the far right; text truncates only if the row is too narrow.
  heroGpsText: { flexShrink: 1, fontSize: 11 },
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
