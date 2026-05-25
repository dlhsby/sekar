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
import { CLOCKABLE_ROLES, TASK_RECEIVERS } from '../../constants/roles';
import { LoadingSpinner } from '../../components/common';
import { NBAlert, NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, LocationMapModal } from '../../components/modals';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { shiftsApi, activitiesApi, tasksApi } from '../../services/api';
import { setCurrentShift, setShiftHistory, setError } from '../../store/slices/shiftSlice';
import { setActivities } from '../../store/slices/activitiesSlice';
import { setTasks } from '../../store/slices/tasksSlice';
import { formatTime, calculateDuration, isToday } from '../../utils/dateUtils';
import { useLocationPermission } from '../../hooks';
import { useHomeLocation } from '../../hooks/useHomeLocation';
import type { Activity, Task, TaskStatus } from '../../types/models.types';

/**
 * Field Home Screen (hi-fi HOME-1) — dashboard for clockable field roles
 * (satgas, linmas, and — until HOME-2/HOME-3 land — korlap/kepala_rayon/admin_data).
 * Selected by the role-aware `HomeScreen` dispatcher.
 *
 * Layout (hi-fi HOME-1): absensi hero (live clock + in-area pill + clock-out) →
 * "Tugas hari ini" list (real assigned tasks) → "Ringkasan hari ini" stat tiles.
 */

const pad = (num: number): string => String(num).padStart(2, '0');

// Active (actionable) task statuses surfaced under "Tugas hari ini".
const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  'pending',
  'assigned',
  'accepted',
  'in_progress',
  'revision_needed',
];

/** Map a task status to a StatusPill tone + Indonesian label. */
function taskPill(status: TaskStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'in_progress':
      return { tone: 'ok', label: 'Berjalan' };
    case 'assigned':
    case 'accepted':
      return { tone: 'warn', label: 'Siap mulai' };
    case 'revision_needed':
      return { tone: 'bad', label: 'Revisi' };
    default:
      return { tone: 'neutral', label: 'Menunggu' };
  }
}

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

  // Modal states
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [activitiesModalVisible, setActivitiesModalVisible] = useState(false);
  const [workHoursModalVisible, setWorkHoursModalVisible] = useState(false);
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
  const { location: homeLocation, hasActiveShift } = useHomeLocation();

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

  const activeTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return list.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
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

  const handleViewActivities = useCallback((_activity: Activity) => {
    setActivitiesModalVisible(false);
    navigation.navigate('Activities' as never);
  }, [navigation]);

  const openTask = useCallback((task: Task) => {
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
      backgroundColor={nbColors.background}
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

          {/* Absensi hero */}
          {currentShift ? (
            <View
              style={[styles.hero, currentShift.is_overtime ? styles.heroLembur : styles.heroActive]}
              testID="absensi-hero"
            >
              <View style={styles.heroTopRow}>
                <TouchableOpacity
                  style={styles.heroClockArea}
                  onPress={() => setShiftModalVisible(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
                  accessibilityHint="Ketuk untuk detail shift"
                >
                  <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                    {currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
                  </NBText>
                  <NBText
                    variant="display"
                    color="black"
                    style={styles.heroClock}
                    accessibilityLabel={`Waktu shift berjalan: ${timer}`}
                  >
                    {timer}
                  </NBText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLocationMapVisible(true)}
                  disabled={!hasActiveShift}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Status lokasi: ${areaLabel}. Ketuk untuk peta.`}
                >
                  <StatusPill tone={areaTone} label={areaLabel} />
                </TouchableOpacity>
              </View>
              <NBText variant="mono-sm" color="gray700" style={styles.heroMeta}>
                {`Mulai ${formatTime(currentShift.clock_in_time)} · ${heroAreaName}`}
              </NBText>
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
            </View>
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

          {/* Tugas hari ini */}
          {isTaskReceiver && (
            <>
              <HomeSectionDivider
                label="Tugas hari ini"
                trailing={
                  <StatusPill
                    tone={activeTasks.length > 0 ? 'warn' : 'neutral'}
                    label={`${activeTasks.length} tersisa`}
                  />
                }
              />
              {activeTasks.length === 0 ? (
                <NBText variant="body-sm" color="gray500" style={styles.emptyHint}>
                  Tidak ada tugas aktif hari ini.
                </NBText>
              ) : (
                <View style={styles.list}>
                  {activeTasks.slice(0, 5).map((task) => {
                    const p = taskPill(task.status);
                    return (
                      <HomeListRow
                        key={task.id}
                        pill={<StatusPill tone={p.tone} label={p.label} />}
                        title={task.title}
                        meta={task.deadline ? formatTime(task.deadline) : undefined}
                        subMeta={task.area?.name}
                        onPress={() => openTask(task)}
                        testID={`home-task-${task.id}`}
                      />
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Ringkasan hari ini */}
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
              <HomeStatTile label="Tugas" value={activeTasks.length} variant="ok" testID="stat-tasks" />
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
      <ShiftDetailModal visible={shiftModalVisible} onClose={() => setShiftModalVisible(false)} shift={currentShift} />
      <TodayActivitiesModal
        visible={activitiesModalVisible}
        onClose={() => setActivitiesModalVisible(false)}
        activities={activitiesList.filter((activity) => isToday(activity.created_at))}
        onActivityPress={handleViewActivities}
      />
      <TodayWorkHoursModal visible={workHoursModalVisible} onClose={() => setWorkHoursModalVisible(false)} shifts={todayShifts} />
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
  content: { padding: nbSpacing.md, flexGrow: 1 },
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
  heroLabel: { letterSpacing: 0.6, marginBottom: 2 },
  heroClock: { letterSpacing: 1 },
  heroMeta: { marginTop: nbSpacing.sm },
  heroIdleTitle: { marginTop: 2 },
  heroButton: { marginTop: nbSpacing.md },

  /* Lists + tiles */
  list: { gap: nbSpacing.sm },
  emptyHint: { fontStyle: 'italic', paddingVertical: nbSpacing.sm },
  tiles: { flexDirection: 'row', gap: nbSpacing.sm },

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
