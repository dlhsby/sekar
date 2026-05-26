/**
 * Tasks & Activity Screen (slim orchestrator)
 * Phase 2C: Tab 1 = Tugas (with assigned/tagged filter), Tab 2 = Aktivitas
 * State management, data fetching, filter bar, sort modal, FABs, and modals live here.
 * Tab content is delegated to TasksTab and ActivitiesTab.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../store/hooks';
import { NBBackgroundPattern, NBButton, NBTab, NBText } from '../../components/nb';
import { TaskFilterModal, ActivityFilterModal } from '../../components/modals';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { ACTIVITY_SUBMITTERS, TASK_CREATORS, canMonitor } from '../../constants/roles';
import { getTaskStatusLabel } from '../../utils/statusHelpers';
import type { MainTabParamList } from '../../types/navigation.types';
import { getMyActivities, getActivities } from '../../services/api/activitiesApi';
import { getMyTasks, getTaggedTasks } from '../../services/api/tasksApi';
import type { Task, Activity, TaskStatus } from '../../types/models.types';
import type { ActivitiesFilter } from '../../types/api.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { TasksTab } from './tabs/TasksTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { SortModal } from '../../components/modals/SortModal';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'TasksActivities'>;
  route: RouteProp<MainTabParamList, 'TasksActivities'>;
};

type MainTabType = 'tasks' | 'activities';
type TaskFilterType = 'all' | 'assigned' | 'tagged' | 'created_by_me';
type TaskSortOption = 'created_at_desc' | 'created_at_asc' | 'deadline_asc' | 'priority_desc';
type ActivitySortOption = 'created_at_desc' | 'created_at_asc';

const TASK_SORT_OPTIONS = [
  { key: 'created_at_desc', label: 'Terbaru (default)' },
  { key: 'created_at_asc', label: 'Terlama' },
  { key: 'deadline_asc', label: 'Deadline Terdekat' },
  { key: 'priority_desc', label: 'Prioritas Tertinggi' },
];

const ACTIVITY_SORT_OPTIONS = [
  { key: 'created_at_desc', label: 'Terbaru (default)' },
  { key: 'created_at_asc', label: 'Terlama' },
];


const TASKS_PAGE_LIMIT = 10;
const ACTIVITIES_PAGE_LIMIT = 10;

function sortToParams(sort: TaskSortOption): { sort_by: string; sort_dir: 'asc' | 'desc' } {
  switch (sort) {
    case 'created_at_asc': return { sort_by: 'created_at', sort_dir: 'asc' };
    case 'deadline_asc': return { sort_by: 'deadline', sort_dir: 'asc' };
    case 'priority_desc': return { sort_by: 'priority', sort_dir: 'desc' };
    default: return { sort_by: 'created_at', sort_dir: 'desc' };
  }
}

export function TasksActivityScreen({ navigation, route }: Props): React.JSX.Element {
  const user = useAppSelector((state) => state.auth.user);
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  // Main tab state — initialTab from route params
  const [activeTab, setActiveTab] = useState<MainTabType>(
    route.params?.initialTab ?? 'tasks'
  );

  // Default area/rayon from user profile or current shift
  const initialAreaId = user?.area_id ?? currentShift?.area_id ?? null;
  const initialRayonId = user?.rayon_id ?? null;

  // Task filter state
  const [taskFilter, setTaskFilter] = useState<TaskFilterType>('assigned');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [petugasFilter, setPetugasFilter] = useState<string | null>(null);
  const [rayonFilter, setRayonFilter] = useState<string | null>(initialRayonId);
  const [areaFilter, setAreaFilter] = useState<string | null>(initialAreaId);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [taskSort, setTaskSort] = useState<TaskSortOption>('created_at_desc');
  const [activitySort, setActivitySort] = useState<ActivitySortOption>('created_at_desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  // Activity filter state — no default area filter. Backend already scopes by role:
  //   - satgas/linmas → own activities (via involving_me=true in fetchActivities below)
  //   - korlap        → activities across all `user_areas` assignments
  //   - kepala_rayon  → activities in their rayon
  // User may apply an area filter explicitly via the filter modal.
  const [activityFilters, setActivityFilters] = useState<ActivitiesFilter>({});
  const [isActivityFilterOpen, setIsActivityFilterOpen] = useState(false);

  // Tasks pagination state
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isLoadingMoreTasks, setIsLoadingMoreTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Activities pagination state
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Permissions
  const canSubmitActivity = user?.role ? ACTIVITY_SUBMITTERS.includes(user.role) : false;
  const canCreateTask = user?.role ? TASK_CREATORS.includes(user.role) : false;

  // Track in-flight requests to avoid duplicate fetches; queue latest pending call
  const isFetchingTasks = useRef(false);
  const isFetchingActivities = useRef(false);
  const pendingTaskFetch = useRef<{ page: number; reset: boolean } | null>(null);
  const pendingActivityFetch = useRef<{ page: number; reset: boolean } | null>(null);

  const buildTaskParams = useCallback((page: number) => {
    const { sort_by, sort_dir } = sortToParams(taskSort);
    return {
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dateFrom ? { deadline_after: dateFrom } : {}),
      ...(dateTo ? { deadline_before: dateTo } : {}),
      ...(createdFrom ? { created_after: createdFrom } : {}),
      ...(createdTo ? { created_before: createdTo } : {}),
      sort_by,
      sort_dir,
      page,
      limit: TASKS_PAGE_LIMIT,
      ...(rayonFilter ? { rayon_id: rayonFilter } : {}),
      ...(areaFilter ? { area_id: areaFilter } : {}),
      ...(petugasFilter ? { assigned_to: petugasFilter } : {}),
    };
  }, [taskSort, statusFilter, dateFrom, dateTo, createdFrom, createdTo, rayonFilter, areaFilter, petugasFilter]);

  const fetchTasks = useCallback(async (page: number, reset: boolean) => {
    if (isFetchingTasks.current) {
      pendingTaskFetch.current = { page, reset };
      return;
    }
    isFetchingTasks.current = true;

    if (page === 1) {
      setLoadingTasks(true);
    } else {
      setIsLoadingMoreTasks(true);
    }
    setTasksError(null);

    try {
      const params = buildTaskParams(page);
      // Strip fields not accepted by /my-tasks or /tagged endpoints (rayon_id, area_id, assigned_to)
      const allParams = params as Record<string, unknown>;
      const baseParams = {
        ...(allParams.status ? { status: allParams.status as string } : {}),
        ...(allParams.deadline_after ? { deadline_after: allParams.deadline_after as string } : {}),
        ...(allParams.deadline_before ? { deadline_before: allParams.deadline_before as string } : {}),
        ...(allParams.created_after ? { created_after: allParams.created_after as string } : {}),
        ...(allParams.created_before ? { created_before: allParams.created_before as string } : {}),
        sort_by: allParams.sort_by as string,
        sort_dir: allParams.sort_dir as 'asc' | 'desc',
        page: allParams.page as number,
        limit: allParams.limit as number,
      };
      const myTasksParams = baseParams;
      let fetchedTasks: Task[] = [];
      let totalPages = 1;

      if (taskFilter === 'tagged') {
        const response = await getTaggedTasks(baseParams);
        const paged = response.data;
        fetchedTasks = paged?.data ?? [];
        totalPages = paged?.meta?.totalPages ?? 1;
      } else if (taskFilter === 'all') {
        // Fetch both assigned + tagged, merge, no multi-page for 'all'.
        // scope=all keeps legacy assigned-OR-created union for /my-tasks.
        const [myRes, tagRes] = await Promise.all([
          getMyTasks({ ...myTasksParams, scope: 'all', limit: 50, page: 1 }),
          getTaggedTasks({ ...baseParams, limit: 50, page: 1 }),
        ]);
        const seen = new Set<string>();
        const merged: Task[] = [];
        for (const t of [...(myRes.data?.data ?? []), ...(tagRes.data?.data ?? [])]) {
          if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
        }
        fetchedTasks = merged;
        totalPages = 1; // single fetch for 'all'
      } else {
        // 'assigned' → only tasks where caller is assigned_to.
        // 'created_by_me' → only tasks the caller created.
        const scope = taskFilter === 'created_by_me' ? 'created' : 'assigned';
        const response = await getMyTasks({ ...myTasksParams, scope });
        const paged = response.data;
        fetchedTasks = paged?.data ?? [];
        totalPages = paged?.meta?.totalPages ?? 1;
      }

      if (reset || page === 1) {
        setAllTasks(fetchedTasks);
      } else {
        setAllTasks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          return [...prev, ...fetchedTasks.filter((t) => !existingIds.has(t.id))];
        });
      }
      setTaskPage(page);
      setHasMoreTasks(page < totalPages);
    } catch {
      setTasksError('Gagal memuat tugas');
    } finally {
      setLoadingTasks(false);
      setIsLoadingMoreTasks(false);
      isFetchingTasks.current = false;
      if (pendingTaskFetch.current) {
        const { page: p, reset: r } = pendingTaskFetch.current;
        pendingTaskFetch.current = null;
        fetchTasks(p, r);
      }
    }
  }, [buildTaskParams, taskFilter]);

  const fetchActivities = useCallback(async (page: number, reset: boolean) => {
    if (isFetchingActivities.current) {
      pendingActivityFetch.current = { page, reset };
      return;
    }
    isFetchingActivities.current = true;

    if (page === 1) {
      setLoadingActivities(true);
    } else {
      setIsLoadingMoreActivities(true);
    }
    setActivitiesError(null);

    try {
      const isSupervisor = user?.role ? canMonitor(user.role) : false;
      const sortDir = activitySort === 'created_at_asc' ? 'asc' : 'desc';
      const filters: ActivitiesFilter = {
        ...activityFilters,
        sort_by: 'created_at',
        sort_dir: sortDir,
        page,
        limit: ACTIVITIES_PAGE_LIMIT,
      };

      const response = isSupervisor
        ? await getActivities(filters)
        // ADR-038: workers see activities they own OR are tagged on.
        : await getMyActivities({ ...filters, involving_me: true });

      const paged = response.data;
      const fetchedActivities = paged?.data ?? [];
      const totalPages = paged?.meta?.totalPages ?? 1;

      if (reset || page === 1) {
        setAllActivities(fetchedActivities);
      } else {
        setAllActivities((prev) => [...prev, ...fetchedActivities]);
      }
      setActivityPage(page);
      setHasMoreActivities(page < totalPages);
    } catch {
      if (__DEV__) {
        console.warn('Failed to fetch activities');
      }
      setActivitiesError('Gagal memuat aktivitas. Silakan coba lagi.');
    } finally {
      setLoadingActivities(false);
      setIsLoadingMoreActivities(false);
      isFetchingActivities.current = false;
      if (pendingActivityFetch.current) {
        const { page: p, reset: r } = pendingActivityFetch.current;
        pendingActivityFetch.current = null;
        fetchActivities(p, r);
      }
    }
  }, [activityFilters, activitySort, user?.role]);

  const loadMoreTasks = useCallback(() => {
    if (!hasMoreTasks || isLoadingMoreTasks || loadingTasks) return;
    fetchTasks(taskPage + 1, false);
  }, [hasMoreTasks, isLoadingMoreTasks, loadingTasks, taskPage, fetchTasks]);

  const loadMoreActivities = useCallback(() => {
    if (!hasMoreActivities || isLoadingMoreActivities || loadingActivities) return;
    fetchActivities(activityPage + 1, false);
  }, [hasMoreActivities, isLoadingMoreActivities, loadingActivities, activityPage, fetchActivities]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks(1, true);
      fetchActivities(1, true);
    }, [fetchTasks, fetchActivities])
  );

  // Re-fetch tasks when filter/sort changes (after initial mount)
  const isFirstTaskRender = useRef(true);
  React.useEffect(() => {
    if (isFirstTaskRender.current) { isFirstTaskRender.current = false; return; }
    fetchTasks(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskFilter, statusFilter, dateFrom, dateTo, createdFrom, createdTo, taskSort]);

  // Re-fetch activities when filter/sort changes (after initial mount)
  const isFirstActivityRender = useRef(true);
  React.useEffect(() => {
    if (isFirstActivityRender.current) { isFirstActivityRender.current = false; return; }
    fetchActivities(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilters, activitySort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (taskFilter !== 'assigned') count++;
    if (statusFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (rayonFilter && rayonFilter !== initialRayonId) count++;
    if (areaFilter && areaFilter !== initialAreaId) count++;
    return count;
  }, [taskFilter, statusFilter, dateFrom, dateTo, rayonFilter, areaFilter, initialRayonId, initialAreaId]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCreatedFrom('');
    setCreatedTo('');
    setPetugasFilter(null);
    setTaskFilter('assigned');
    setRayonFilter(initialRayonId);
    setAreaFilter(initialAreaId);
  }, [initialRayonId, initialAreaId]);

  const activeActivityFilterCount = useMemo(() => {
    let count = 0;
    if (activityFilters.status) count++;
    if (activityFilters.from_date || activityFilters.to_date) count++;
    if (activityFilters.activity_type_id) count++;
    if (activityFilters.area_id && activityFilters.area_id !== initialAreaId) count++;
    if (activityFilters.rayon_id) count++;
    return count;
  }, [activityFilters, initialAreaId]);

  const handleApplyActivityFilters = useCallback((filters: ActivitiesFilter) => {
    setActivityFilters(filters);
    // Reset pagination — fetchActivities will be called via effect
  }, []);

  const handleResetActivityFilters = useCallback(() => {
    setActivityFilters(initialAreaId ? { area_id: initialAreaId } : {});
  }, [initialAreaId]);

  const handleApplyFilters = useCallback((filters: {
    taskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me';
    statusFilter: TaskStatus | 'all';
    dateFrom: string;
    dateTo: string;
    createdFrom: string;
    createdTo: string;
    rayonFilter: string | null;
    areaFilter: string | null;
    petugasFilter: string | null;
  }) => {
    setTaskFilter(filters.taskFilter);
    setStatusFilter(filters.statusFilter);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setCreatedFrom(filters.createdFrom);
    setCreatedTo(filters.createdTo);
    setRayonFilter(filters.rayonFilter);
    setAreaFilter(filters.areaFilter);
    setPetugasFilter(filters.petugasFilter);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTasks(1, true), fetchActivities(1, true)]);
    setRefreshing(false);
  };

  const handleSortPress = useCallback(() => {
    setIsSortModalOpen(true);
  }, []);

  const renderFilterBar = () => {
    const isTasksTab = activeTab === 'tasks';
    const count = isTasksTab ? activeFilterCount : activeActivityFilterCount;
    const onOpenFilter = isTasksTab
      ? () => setIsFilterModalOpen(true)
      : () => setIsActivityFilterOpen(true);
    const onReset = isTasksTab ? handleResetFilters : handleResetActivityFilters;
    const label = isTasksTab ? 'tugas' : 'aktivitas';

    const chips: { text: string; style: typeof styles.miniChipStatus }[] = [];
    if (isTasksTab) {
      if (taskFilter !== 'assigned') {
        chips.push({
          text: taskFilter === 'tagged' ? 'Tag Saya' : taskFilter === 'created_by_me' ? 'Dibuat Saya' : 'Semua',
          style: styles.miniChipAssignment,
        });
      }
      if (statusFilter !== 'all') {
        chips.push({ text: getTaskStatusLabel(statusFilter), style: styles.miniChipStatus });
      }
      if (dateFrom || dateTo) {
        chips.push({
          text: dateFrom && dateTo ? `${dateFrom.slice(5)} — ${dateTo.slice(5)}` : 'Tanggal',
          style: styles.miniChipDate,
        });
      }
      if (rayonFilter && rayonFilter !== initialRayonId) {
        chips.push({ text: 'Rayon', style: styles.miniChipLocation });
      }
      if (areaFilter && areaFilter !== initialAreaId) {
        chips.push({ text: 'Area', style: styles.miniChipLocation });
      }
    } else {
      if (activityFilters.status) {
        const activityStatusLabels: Record<string, string> = {
          pending: 'Menunggu Persetujuan',
          approved: 'Disetujui',
          rejected: 'Ditolak',
        };
        chips.push({
          text: activityStatusLabels[activityFilters.status] || activityFilters.status,
          style: styles.miniChipStatus,
        });
      }
      if (activityFilters.from_date || activityFilters.to_date) {
        const from = activityFilters.from_date;
        const to = activityFilters.to_date;
        chips.push({
          text: from && to ? `${from.slice(5)} — ${to.slice(5)}` : 'Tanggal',
          style: styles.miniChipDate,
        });
      }
      if (activityFilters.activity_type_id) {
        chips.push({ text: 'Tipe', style: styles.miniChipAssignment });
      }
      if (activityFilters.area_id && activityFilters.area_id !== initialAreaId) {
        chips.push({ text: 'Area', style: styles.miniChipLocation });
      }
      if (activityFilters.rayon_id) {
        chips.push({ text: 'Rayon dipilih', style: styles.miniChipLocation });
      }
    }

    const isSortActive = activeTab === 'tasks'
      ? taskSort !== 'created_at_desc'
      : activitySort !== 'created_at_desc';

    return (
      <View style={[styles.filterBarCollapsed, count > 0 && styles.filterBarActive]}>
        <View style={styles.filterBarLeft}>
          {chips.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.miniChipsContent}
            >
              {chips.map((chip, i) => (
                <View key={i} style={[styles.miniChip, chip.style]}>
                  <NBText variant="caption" style={styles.miniChipText}>{chip.text}</NBText>
                </View>
              ))}
            </ScrollView>
          ) : (
            <NBText variant="body-sm" color="gray400" style={styles.filterBarPlaceholder}>Semua {label}</NBText>
          )}
          {count > 0 && (
            <TouchableOpacity
              style={styles.filterClearButton}
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel={`Reset filter ${label}`}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.danger} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterBarRight}>
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={handleSortPress}
            accessibilityRole="button"
            accessibilityLabel="Urutkan"
          >
            <MaterialCommunityIcons
              name="sort"
              size={22}
              color={isSortActive ? nbColors.primary : nbColors.black}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={onOpenFilter}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${label}${count > 0 ? `, ${count} filter aktif` : ''}`}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={22}
              color={count > 0 ? nbColors.primary : nbColors.black}
            />
            {count > 0 && (
              <View style={styles.filterBadge}>
                <NBText variant="caption" color="white" style={styles.filterBadgeText}>{count}</NBText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <View style={[
          styles.contentWrapper,
          {
            paddingBottom: (activeTab === 'tasks' && canCreateTask) ||
                           (activeTab === 'activities' && canSubmitActivity)
              ? 80
              : nbSpacing.sm,
          },
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <NBText variant="h3" style={styles.title}>Tugas & Aktivitas</NBText>
          </View>

          {/* Main Tabs */}
          <View style={styles.tabContainer}>
            <NBTab
              tabs={[
                { key: 'tasks', label: 'Tugas' },
                { key: 'activities', label: `Aktivitas${activeActivityFilterCount > 0 ? ` (${activeActivityFilterCount})` : ''}` },
              ]}
              activeTab={activeTab}
              onTabChange={(key) => setActiveTab(key as MainTabType)}
              activeTabStyle={{ backgroundColor: nbColors.warning }}
              activeTextStyle={{ color: nbColors.black }}
            />
          </View>

          {/* Filter Bar */}
          {renderFilterBar()}

          {/* Tab Content */}
          <View style={styles.content}>
            {activeTab === 'tasks' ? (
              <TasksTab
                tasks={allTasks}
                loadingTasks={loadingTasks}
                isLoadingMore={isLoadingMoreTasks}
                hasMore={hasMoreTasks}
                tasksError={tasksError}
                refreshing={refreshing}
                taskFilter={taskFilter}
                onRefresh={handleRefresh}
                onRetry={() => fetchTasks(1, true)}
                onLoadMore={loadMoreTasks}
                onNavigateToTask={(taskId) => navigation.navigate('TaskDetail', { taskId })}
              />
            ) : (
              <ActivitiesTab
                activities={allActivities}
                loadingActivities={loadingActivities}
                isLoadingMore={isLoadingMoreActivities}
                hasMore={hasMoreActivities}
                activitiesError={activitiesError}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onRetry={() => fetchActivities(1, true)}
                onLoadMore={loadMoreActivities}
                onNavigateToActivity={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
                currentUserId={user?.id}
              />
            )}
          </View>
        </View>

        {/* FAB: Tambah Aktivitas */}
        {activeTab === 'activities' && canSubmitActivity && (
          <View style={[styles.fab, !currentShift && styles.fabDisabled]}>
            <NBButton
              title="+ Tambah Aktivitas"
              onPress={() => {
                if (!currentShift) {
                  Alert.alert(
                    'Belum Clock In',
                    'Anda harus melakukan Clock In terlebih dahulu untuk menambahkan aktivitas',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                navigation.navigate('ActivitySubmission');
              }}
              variant="primary"
              size="lg"
              disabled={!currentShift}
            />
          </View>
        )}

        {/* FAB: Buat Tugas */}
        {activeTab === 'tasks' && canCreateTask && (
          <View style={styles.fab}>
            <NBButton
              title="+ Buat Tugas"
              onPress={() => navigation.navigate('TaskCreate')}
              variant="primary"
              size="lg"
            />
          </View>
        )}

        {/* Sort Modal */}
        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title={activeTab === 'tasks' ? 'URUTKAN TUGAS' : 'URUTKAN AKTIVITAS'}
          options={activeTab === 'tasks' ? TASK_SORT_OPTIONS : ACTIVITY_SORT_OPTIONS}
          selectedOption={activeTab === 'tasks' ? taskSort : activitySort}
          onSelect={(key) => {
            if (activeTab === 'tasks') {
              setTaskSort(key as TaskSortOption);
              fetchTasks(1, true);
            } else {
              setActivitySort(key as ActivitySortOption);
              fetchActivities(1, true);
            }
          }}
        />

        {/* Task Filter Modal */}
        <TaskFilterModal
          visible={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          taskFilter={taskFilter}
          statusFilter={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          createdFrom={createdFrom}
          createdTo={createdTo}
          rayonFilter={rayonFilter}
          areaFilter={areaFilter}
          petugasFilter={petugasFilter}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          userRole={user?.role || 'satgas'}
          userRayonId={user?.rayon_id}
          userAreaId={user?.area_id ?? currentShift?.area_id ?? undefined}
        />

        {/* Activity Filter Modal */}
        <ActivityFilterModal
          visible={isActivityFilterOpen}
          onClose={() => setIsActivityFilterOpen(false)}
          filters={activityFilters}
          onApplyFilters={handleApplyActivityFilters}
          onResetFilters={handleResetActivityFilters}
          userRole={user?.role}
          userRayonId={user?.rayon_id}
          userAreaId={user?.area_id ?? currentShift?.area_id ?? undefined}
          userId={user?.id}
        />
      </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
  },
  header: {
    marginBottom: nbSpacing.sm,
  },
  title: {},
  tabContainer: {
    marginBottom: nbSpacing.sm,
  },
  filterBarCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.gray300,
    ...nbShadows.md,
    marginBottom: nbSpacing.sm,
    minHeight: 48,
  },
  filterBarActive: {
    borderBottomColor: nbColors.primary,
  },
  filterBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  filterBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: nbSpacing.xs,
  },
  filterBarPlaceholder: {
    fontStyle: 'italic',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterClearButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: nbColors.danger,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {},
  miniChipsContent: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  miniChip: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    height: 32,
    justifyContent: 'center',
  },
  miniChipAssignment: {
    backgroundColor: nbColors.primary,
  },
  miniChipStatus: {
    backgroundColor: nbColors.info,
  },
  miniChipDate: {
    backgroundColor: nbColors.warning,
  },
  miniChipLocation: {
    backgroundColor: nbColors.infoLight,
  },
  miniChipText: {},
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    right: nbSpacing.md,
    left: nbSpacing.md,
    zIndex: 10,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});

export default TasksActivityScreen;
