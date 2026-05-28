import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LoadingSpinner } from '../../components/common';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, TodayTasksModal } from '../../components/modals';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { CLOCKABLE_ROLES, TASK_RECEIVERS } from '../../constants/roles';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminPruningRequests } from '../../store/slices/pruningRequestsSlice';
import { setCurrentShift, setShiftHistory, setError } from '../../store/slices/shiftSlice';
import { setActivities } from '../../store/slices/activitiesSlice';
import { setTasks } from '../../store/slices/tasksSlice';
import { activitiesApi, tasksApi, shiftsApi } from '../../services/api';
import { formatDate, formatTime, isToday, calculateDuration } from '../../utils/dateUtils';
import { ACTIVE_TASK_STATUSES } from '../../utils/taskStatus';
import type { PruningRequest, PruningRequestStatus, Activity, Task, Shift } from '../../types/models.types';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Admin Data Home Screen (hi-fi HOME-3) — perantingan-disposition dashboard for
 * admin_data. Selected by the role-aware `HomeScreen` dispatcher. Reads the
 * rayon-scoped `pruningRequests.adminList`.
 */

const EMPTY_COUNTS = {
  submitted: 0,
  under_review: 0,
  approved: 0,
  rejected: 0,
  assigned: 0,
  in_progress: 0,
  done: 0,
  cancelled: 0,
} as const;

const INFLIGHT_STATUSES: PruningRequestStatus[] = ['assigned', 'in_progress'];

function inflightPill(status: PruningRequestStatus): { tone: StatusTone; label: string } {
  return status === 'in_progress'
    ? { tone: 'ok', label: 'Berjalan' }
    : { tone: 'warn', label: 'Ditugaskan' };
}

export function AdminDataHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { adminList, adminListLoading } = useAppSelector((state) => state.pruningRequests);
  const { currentShift, shiftHistory } = useAppSelector((state) => state.shift);
  const { activitiesList } = useAppSelector((state) => state.activities);
  const { tasks } = useAppSelector((state) => state.tasks);
  const viewerRole = useAppSelector((state) => state.auth.user?.role);

  const isClockable = !!viewerRole && CLOCKABLE_ROLES.includes(viewerRole as any);
  const isTaskReceiver = !!viewerRole && TASK_RECEIVERS.includes(viewerRole as any);

  const [refreshing, setRefreshing] = useState(false);
  const [absensiExpanded, setAbsensiExpanded] = useState(false);
  const [detailShift, setDetailShift] = useState<Shift | null>(null);
  const [activitiesModalVisible, setActivitiesModalVisible] = useState(false);
  const [workHoursModalVisible, setWorkHoursModalVisible] = useState(false);
  const [tasksModalVisible, setTasksModalVisible] = useState(false);
  const [timer, setTimer] = useState('00:00:00');

  useEffect(() => {
    if (!currentShift) { setTimer('00:00:00'); return; }
    const update = () => {
      const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      setTimer(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [currentShift?.id]);

  const loadShift = useCallback(async () => {
    try {
      const response = await shiftsApi.getCurrentShift();
      if (!response.error) dispatch(setCurrentShift(response.data ?? null));
      else dispatch(setError(response.error));
    } catch {
      dispatch(setCurrentShift(null));
    }
  }, [dispatch]);

  const loadPersonalData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const promises: Promise<void>[] = [
      activitiesApi.getMyActivities({ from_date: today })
        .then(r => { if (r.data) dispatch(setActivities(r.data.data ?? [])); })
        .catch(() => {}),
      shiftsApi.getMyShifts()
        .then(r => { if (!r.error) dispatch(setShiftHistory(r.data ?? [])); })
        .catch(() => {}),
    ];
    if (isTaskReceiver) {
      promises.push(
        tasksApi.getMyTasks({ scope: 'assigned', sort_by: 'deadline', sort_dir: 'asc' })
          .then(r => { if (r.data) dispatch(setTasks(r.data.data ?? [])); })
          .catch(() => {})
      );
    }
    await Promise.all(promises);
  }, [dispatch, isTaskReceiver]);

  const load = useCallback(async () => {
    await Promise.all([dispatch(fetchAdminPruningRequests({})), loadShift(), loadPersonalData()]);
  }, [dispatch, loadShift, loadPersonalData]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      void load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleClockInOut = useCallback(() => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit' as never);
    } else {
      navigation.navigate('ClockInOut' as never);
    }
  }, [currentShift, navigation]);

  const handleViewActivity = useCallback((activity: Activity) => {
    setActivitiesModalVisible(false);
    navigation.navigate('ActivityDetail', { activityId: activity.id, from: 'Home' });
  }, [navigation]);

  const handleViewShift = useCallback((shift: Shift) => {
    setWorkHoursModalVisible(false);
    setDetailShift(shift);
  }, []);

  const handleViewTask = useCallback((task: Task) => {
    setTasksModalVisible(false);
    navigation.navigate('TaskDetail', { taskId: task.id, from: 'Home' });
  }, [navigation]);

  const counts = useMemo(() => {
    const c = { ...EMPTY_COUNTS } as Record<PruningRequestStatus, number>;
    const list = Array.isArray(adminList) ? adminList : [];
    list.forEach((r) => {
      if (r.status in c) c[r.status] += 1;
    });
    return c;
  }, [adminList]);

  const incoming = counts.submitted + counts.under_review;

  const inflight = useMemo(
    () => (Array.isArray(adminList) ? adminList : []).filter((r) => INFLIGHT_STATUSES.includes(r.status)),
    [adminList]
  );

  const todayActivitiesCount = useMemo(() => {
    const list = Array.isArray(activitiesList) ? activitiesList : [];
    return list.filter((a) => isToday(a.created_at)).length;
  }, [activitiesList]);

  const todayShifts = useMemo(() => {
    const list = Array.isArray(shiftHistory) ? shiftHistory : [];
    return list.filter((s) => isToday(s.clock_in_time));
  }, [shiftHistory]);

  const totalTodayDuration = useMemo(() => {
    let totalMinutes = 0;
    todayShifts.forEach((shift) => {
      const endTime = shift.clock_out_time ? new Date(shift.clock_out_time) : new Date();
      totalMinutes += calculateDuration(new Date(shift.clock_in_time), endTime).totalMinutes;
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}j ${m}m`;
  }, [todayShifts]);

  const activeTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const eod = new Date();
    eod.setHours(23, 59, 59, 999);
    return list.filter((t) => {
      if (!ACTIVE_TASK_STATUSES.includes(t.status)) return false;
      if (!t.deadline) return true;
      return new Date(t.deadline) <= eod;
    });
  }, [tasks]);

  const goToQueue = useCallback(() => {
    navigation.navigate('PruningReviewQueue');
  }, [navigation]);

  const openRequest = useCallback(
    (request: PruningRequest) => {
      navigation.navigate('PruningDetail', { requestId: request.id, adminMode: true });
    },
    [navigation]
  );

  if (adminListLoading && adminList.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} />}
        >
          {/* Absensi saya — clock-in card (matches FieldHomeScreen structure) */}
          <HomeSectionDivider label="Absensi saya" />
          {currentShift ? (
            <TouchableOpacity
              style={[styles.absensi, currentShift.is_overtime ? styles.absensiLembur : styles.absensiActive]}
              testID="absensi-card"
              activeOpacity={0.9}
              onPress={() => setAbsensiExpanded((prev) => !prev)}
              accessibilityRole="button"
              accessibilityState={{ expanded: absensiExpanded }}
              accessibilityLabel={currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
            >
              <View style={styles.absensiTopRow}>
                <View style={styles.absensiClockArea}>
                  <NBText variant="mono-sm" color="gray700" uppercase style={styles.absensiLabel}>
                    {currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
                  </NBText>
                  <NBText
                    variant="display"
                    color="black"
                    style={styles.absensiClock}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {timer}
                  </NBText>
                </View>
                <MaterialCommunityIcons
                  name={absensiExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={nbColors.gray700}
                  style={styles.absensiChevron}
                />
              </View>
              {absensiExpanded && (
                <>
                  <NBText variant="mono-sm" color="gray700" style={styles.absensiMeta}>
                    {`Mulai ${formatTime(currentShift.clock_in_time)}`}
                  </NBText>
                  <View style={styles.absensiButton}>
                    <NBButton
                      title={currentShift.is_overtime ? 'Clock Out Lembur' : 'Clock Out'}
                      onPress={handleClockInOut}
                      variant="danger"
                      size="md"
                      testID="absensi-clock-button"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setDetailShift(currentShift)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    style={styles.absensiDetailLink}
                    testID="shift-detail-link"
                  >
                    <NBText variant="mono-sm" color="gray700" uppercase style={styles.absensiDetailText}>
                      Detail shift →
                    </NBText>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.absensi, styles.absensiIdle]} testID="absensi-card">
              <NBText variant="mono-sm" color="gray600" uppercase style={styles.absensiLabel}>
                Belum clock in
              </NBText>
              <NBText variant="h2" color="black" style={styles.absensiIdleTitle}>
                Mulai shift hari ini
              </NBText>
              <View style={styles.absensiButton}>
                <NBButton
                  title="Clock In"
                  onPress={handleClockInOut}
                  variant="primary"
                  size="md"
                  testID="absensi-clock-button"
                />
              </View>
            </View>
          )}

          {/* Ringkasan hari ini — personal stats + perantingan overview */}
          <HomeSectionDivider label="Ringkasan hari ini" />

          {/* Personal stat tiles (activities, work hours, tasks) */}
          <View style={styles.statTiles}>
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

          {/* Tim hari ini — perantingan-queue hero */}
          <View style={styles.hero} testID="perantingan-hero">
            <View style={styles.heroTopRow}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                Perantingan masuk
              </NBText>
              <StatusPill tone={counts.submitted > 0 ? 'warn' : 'neutral'} label={`${counts.submitted} baru`} />
            </View>
            <NBText variant="display" color="black" style={styles.heroValue}>
              {String(incoming)}
            </NBText>
            <NBText variant="mono-sm" color="gray700" style={styles.heroMeta}>
              menunggu disposisi
            </NBText>
            <View style={styles.heroButton}>
              <NBButton title="Buka antrian →" onPress={goToQueue} variant="primary" size="md" testID="open-queue" />
            </View>
          </View>

          {/* Disposition breakdown */}
          <HomeSectionDivider label="Breakdown disposisi" />
          <View style={styles.tilesRow}>
            <HomeStatTile label="Baru masuk" value={counts.submitted} variant="neutral" testID="disp-submitted" />
            <HomeStatTile label="Review" value={counts.under_review} variant="warn" testID="disp-review" />
          </View>
          <View style={styles.tilesRow}>
            <HomeStatTile label="Disetujui" value={counts.approved} variant="ok" testID="disp-approved" />
            <HomeStatTile label="Ditolak" value={counts.rejected} variant="bad" testID="disp-rejected" />
          </View>

          {/* Perantingan berjalan (assigned + in progress) */}
          {inflight.length > 0 && (
            <>
              <HomeSectionDivider
                label="Perantingan berjalan"
                trailing={<StatusPill tone="ok" label={`${inflight.length} aktif`} />}
              />
              <View style={styles.list}>
                {inflight.slice(0, 5).map((req) => {
                  const p = inflightPill(req.status);
                  return (
                    <HomeListRow
                      key={req.id}
                      pill={<StatusPill tone={p.tone} label={p.label} />}
                      title={req.kecamatanName || req.referenceCode}
                      meta={req.scheduledDate ? formatDate(req.scheduledDate) : 'Belum dijadwalkan'}
                      subMeta={req.referenceCode}
                      onPress={() => openRequest(req)}
                      testID={`inflight-${req.id}`}
                    />
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {/* Personal data modals */}
      <ShiftDetailModal visible={detailShift !== null} onClose={() => setDetailShift(null)} shift={detailShift} />
      <TodayActivitiesModal
        visible={activitiesModalVisible}
        onClose={() => setActivitiesModalVisible(false)}
        activities={Array.isArray(activitiesList) ? activitiesList.filter((a) => isToday(a.created_at)) : []}
        onActivityPress={handleViewActivity}
      />
      <TodayWorkHoursModal
        visible={workHoursModalVisible}
        onClose={() => setWorkHoursModalVisible(false)}
        shifts={todayShifts}
        onShiftPress={handleViewShift}
      />
      {isTaskReceiver && (
        <TodayTasksModal
          visible={tasksModalVisible}
          onClose={() => setTasksModalVisible(false)}
          tasks={activeTasks}
          onTaskPress={handleViewTask}
        />
      )}
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.sm, paddingBottom: nbSpacing.md, flexGrow: 1 },

  hero: {
    backgroundColor: nbColors.bgAccentLilac,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { letterSpacing: 0.6 },
  heroValue: { marginTop: nbSpacing.xs, letterSpacing: 1 },
  heroMeta: { marginTop: 2 },
  heroButton: { marginTop: nbSpacing.md },

  tilesRow: { flexDirection: 'row', gap: nbSpacing.sm, marginBottom: nbSpacing.sm },
  statTiles: { flexDirection: 'row', gap: nbSpacing.sm, marginBottom: nbSpacing.md },
  list: { gap: nbSpacing.sm },

  absensi: {
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  absensiActive: { backgroundColor: nbColors.statusActiveBg },
  absensiLembur: { backgroundColor: nbColors.statusIdleBg },
  absensiIdle: { backgroundColor: nbColors.white },
  absensiTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: nbSpacing.sm },
  absensiClockArea: { flex: 1 },
  absensiChevron: { marginTop: 1 },
  absensiLabel: { letterSpacing: 0.6, marginBottom: 2 },
  absensiClock: { fontSize: 34, lineHeight: 38, letterSpacing: 0.5 },
  absensiMeta: { marginTop: nbSpacing.sm },
  absensiIdleTitle: { marginTop: 2 },
  absensiButton: { marginTop: nbSpacing.md },
  absensiDetailLink: { marginTop: nbSpacing.sm, alignSelf: 'flex-start' },
  absensiDetailText: { letterSpacing: 0.6 },
});

export default AdminDataHomeScreen;
