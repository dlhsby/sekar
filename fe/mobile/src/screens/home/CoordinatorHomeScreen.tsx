import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LoadingSpinner, RoleAvatar } from '../../components/common';
import { NBBackgroundPattern, NBBadge, NBButton, NBText } from '../../components/nb';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, TodayTasksModal } from '../../components/modals';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { TASK_RECEIVERS } from '../../constants/roles';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLiveUsers } from '../../store/slices/monitoringSlice';
import { setCurrentShift, setShiftHistory, setError } from '../../store/slices/shiftSlice';
import { setActivities } from '../../store/slices/activitiesSlice';
import { setTasks } from '../../store/slices/tasksSlice';
import { activitiesApi, tasksApi, shiftsApi } from '../../services/api';
import { formatRelativeTime, formatTime, isToday, calculateDuration, isClockInLate } from '../../utils/dateUtils';
import { ACTIVE_TASK_STATUSES } from '../../utils/taskStatus';
import type { Activity, Task, Shift } from '../../types/models.types';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Coordinator Home Screen (hi-fi HOME-2) — team-oversight dashboard for korlap
 * and kepala_rayon. Selected by the role-aware `HomeScreen` dispatcher.
 *
 * Reads the role-scoped monitoring slice (the backend scopes `getLiveUsers` to
 * the caller's team): team-status hero → 5-status KPI grid → derived alerts.
 */

interface TeamAlert {
  id: string;
  tone: StatusTone;
  pill: string;
  title: string;
  meta?: string;
  sub?: string;
}

export function CoordinatorHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { liveUsers, statusCounts, isLoading } = useAppSelector((state) => state.monitoring);
  const viewerRole = useAppSelector((state) => state.auth.user?.role);
  const { currentShift, shiftHistory } = useAppSelector((state) => state.shift);
  const { activitiesList } = useAppSelector((state) => state.activities);
  const { tasks } = useAppSelector((state) => state.tasks);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshots currentShift on mount by design
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
    await Promise.all([dispatch(fetchLiveUsers(undefined)), loadShift(), loadPersonalData()]);
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
      navigation.navigate('Absensi' as never);
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

  const total = liveUsers.length;
  const active = statusCounts.active;

  // Derived alerts: out-of-area + missing personnel (no SLA feed on mobile).
  const alerts = useMemo<TeamAlert[]>(() => {
    const out = liveUsers
      .filter((u) => u.status === 'outside_area' || u.outside_boundary)
      .map((u) => ({
        id: `out-${u.id}`,
        tone: 'bad' as StatusTone,
        pill: 'Di luar area',
        title: `${u.full_name} keluar area`,
        meta: formatRelativeTime(u.last_update),
        sub: u.area_name || undefined,
      }));
    const missing = liveUsers
      .filter((u) => u.status === 'missing')
      .map((u) => ({
        id: `miss-${u.id}`,
        tone: 'warn' as StatusTone,
        pill: 'Tidak hadir',
        title: `${u.full_name} tidak hadir`,
        meta: formatRelativeTime(u.last_update),
        sub: u.area_name || undefined,
      }));
    return [...out, ...missing];
  }, [liveUsers]);

  const outsideNames = useMemo(
    () =>
      liveUsers
        .filter((u) => u.status === 'outside_area' || u.outside_boundary)
        .map((u) => u.full_name.split(/\s+/)[0])
        .slice(0, 2)
        .join(' · '),
    [liveUsers]
  );

  const todayActivitiesCount = useMemo(() => {
    const list = Array.isArray(activitiesList) ? activitiesList : [];
    return list.filter((a) => isToday(a.created_at)).length;
  }, [activitiesList]);

  const todayShifts = useMemo(() => {
    const list = Array.isArray(shiftHistory) ? shiftHistory : [];
    return list.filter((s) => isToday(s.clock_in_time));
  }, [shiftHistory]);

  // Today's attendance summary for the hero (first clock-in, last clock-out, late
  // flag). todayShifts is clock_in DESC, so the earliest is the last element.
  const attendance = useMemo(() => {
    const earliest = todayShifts.length ? todayShifts[todayShifts.length - 1] : currentShift;
    const firstClockIn = earliest?.clock_in_time ?? currentShift?.clock_in_time;
    const lastClockOut = todayShifts.reduce<string | undefined>((latest, s) => {
      if (!s.clock_out_time) return latest;
      return !latest || s.clock_out_time > latest ? s.clock_out_time : latest;
    }, currentShift?.clock_out_time);
    const scheduledDef = earliest?.shift_definition ?? currentShift?.shift_definition;
    return {
      firstClockIn,
      lastClockOut,
      isLate:
        !currentShift?.is_overtime &&
        isClockInLate(firstClockIn, scheduledDef?.start_time, scheduledDef?.crosses_midnight),
    };
  }, [todayShifts, currentShift]);

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

  const goToMonitoring = useCallback(() => {
    navigation.navigate('Monitoring');
  }, [navigation]);

  if (isLoading && total === 0) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} />}
        >
          {/* Kehadiran saya — clock-in card (matches FieldHomeScreen structure) */}
          <HomeSectionDivider label="Kehadiran saya" />
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
                  <View style={styles.absensiTimes}>
                    <View style={styles.absensiTimeStat}>
                      <NBText variant="caption" color="gray600" uppercase>Masuk</NBText>
                      <View style={styles.absensiTimeValueRow}>
                        <NBText variant="h2" color="black">{formatTime(attendance.firstClockIn ?? '')}</NBText>
                        {attendance.isLate && <NBBadge text="Terlambat" color="danger" size="sm" />}
                      </View>
                    </View>
                    <View style={styles.absensiTimeStat}>
                      <NBText variant="caption" color="gray600" uppercase>Keluar</NBText>
                      <NBText variant="h2" color="black">
                        {attendance.lastClockOut ? formatTime(attendance.lastClockOut) : '—'}
                      </NBText>
                    </View>
                  </View>
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
                    {`Mulai ${formatTime(currentShift.clock_in_time)} · Berjalan ${timer}`}
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

          {/* Ringkasan hari ini — personal stats + team overview */}
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

          {/* Tim hari ini — team-status hero */}
          <View style={styles.hero} testID="team-hero">
            <View style={styles.heroTopRow}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                Tim hari ini
              </NBText>
              <StatusPill tone={active > 0 ? 'ok' : 'neutral'} label={`${active}/${total} aktif`} />
            </View>
            {total > 0 ? (
              <View
                style={styles.avatars}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {liveUsers.slice(0, 6).map((u) => (
                  <RoleAvatar
                    key={u.id}
                    name={u.full_name}
                    role={viewerRole}
                    size={30}
                    radius={nbRadius.full}
                  />
                ))}
                {total > 6 && (
                  <View style={[styles.avatar, styles.avatarMore]}>
                    <NBText variant="mono-sm" color="gray700" style={styles.avatarText}>
                      {`+${total - 6}`}
                    </NBText>
                  </View>
                )}
              </View>
            ) : (
              <NBText variant="body-sm" color="gray600" style={styles.heroEmpty}>
                Belum ada anggota tim aktif.
              </NBText>
            )}
            <View style={styles.heroButton}>
              <NBButton title="Lihat semua →" onPress={goToMonitoring} variant="secondary" size="md" testID="team-see-all" />
            </View>
          </View>

          {/* KPI grid (5-status breakdown — the data cleanly available to korlap) */}
          <View style={styles.tilesRow}>
            <HomeStatTile label="Tim aktif" value={active} detail={`dari ${total}`} variant="ok" testID="kpi-active" />
            <HomeStatTile
              label="Di luar area"
              value={statusCounts.outside_area}
              detail={outsideNames || undefined}
              variant="bad"
              testID="kpi-outside"
            />
          </View>
          <View style={styles.tilesRow}>
            <HomeStatTile label="Tidak hadir" value={statusCounts.missing} variant="warn" testID="kpi-missing" />
            <HomeStatTile label="Offline" value={statusCounts.offline} variant="neutral" testID="kpi-offline" />
          </View>

          {/* Peringatan — derived from live users (out-of-area + missing) */}
          {alerts.length > 0 && (
            <>
              <HomeSectionDivider label={`Peringatan · ${alerts.length}`} />
              <View style={styles.list}>
                {alerts.slice(0, 4).map((a) => (
                  <HomeListRow
                    key={a.id}
                    pill={<StatusPill tone={a.tone} label={a.pill} />}
                    title={a.title}
                    meta={a.meta}
                    subMeta={a.sub}
                    onPress={goToMonitoring}
                    testID={`alert-${a.id}`}
                  />
                ))}
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
    backgroundColor: nbColors.bgAccentMint,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { letterSpacing: 0.6 },
  heroEmpty: { marginTop: nbSpacing.sm },
  heroButton: { marginTop: nbSpacing.md },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: nbSpacing.xs, marginTop: nbSpacing.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: nbRadius.full,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMore: { backgroundColor: nbColors.gray200 },
  avatarText: { fontSize: 11, fontWeight: '700' },

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
  absensiTimes: { flexDirection: 'row', gap: nbSpacing.lg, marginTop: nbSpacing.xs },
  absensiTimeStat: { gap: 2 },
  absensiTimeValueRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs },
  absensiMeta: { marginTop: nbSpacing.sm },
  absensiIdleTitle: { marginTop: 2 },
  absensiButton: { marginTop: nbSpacing.md },
  absensiDetailLink: { marginTop: nbSpacing.sm, alignSelf: 'flex-start' },
  absensiDetailText: { letterSpacing: 0.6 },
});

export default CoordinatorHomeScreen;
