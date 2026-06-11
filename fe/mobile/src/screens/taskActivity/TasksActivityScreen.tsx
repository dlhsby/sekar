/**
 * Tasks & Activity Screen (slim orchestrator)
 * Delegates state to hooks: tab, filters, fetching.
 * Composes tabs, modals, FABs, and filter bar.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { NBBackgroundPattern, NBTab, NBText } from '../../components/nb';
import { TaskFilterModal, ActivityFilterModal } from '../../components/modals';
import { SortModal } from '../../components/modals/SortModal';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { ACTIVITY_SUBMITTERS, TASK_CREATORS } from '../../constants/roles';
import type { MainTabParamList } from '../../types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { TasksTab } from './tabs/TasksTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { FilterBar } from './components/FilterBar';
import { ScreenFABs } from './components/ScreenFABs';
import {
  useTabState,
  useTasksActivityFilters,
  useActivitiesActivityFilters,
  useTasksFetching,
  useActivitiesFetching,
  type TaskSortOption,
  type ActivitySortOption,
} from './hooks';
import { buildTaskFilterChips, buildActivityFilterChips } from './utils/filterChips';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'TasksActivities'>;
  route: RouteProp<MainTabParamList, 'TasksActivities'>;
};

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

export function TasksActivityScreen({ navigation, route }: Props): React.JSX.Element {
  const user = useAppSelector((state) => state.auth.user);
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  // Derive defaults
  const initialAreaId = user?.area_id ?? currentShift?.area_id ?? null;
  const initialRayonId = user?.rayon_id ?? null;

  // Sort & modal state — declare early for use in other hooks
  const [taskSort, setTaskSort] = useState<TaskSortOption>('created_at_desc');
  const [activitySort, setActivitySort] = useState<ActivitySortOption>('created_at_desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isActivityFilterOpen, setIsActivityFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hooks: state management
  const { activeTab, setActiveTab } = useTabState(route.params?.initialTab ?? 'tasks');
  const taskFilters = useTasksActivityFilters({ initialRayonId, initialAreaId });
  const activityFilters = useActivitiesActivityFilters({ initialAreaId });

  // Hooks: data fetching
  const tasksFetching = useTasksFetching({
    taskFilter: taskFilters.taskFilter,
    statusFilter: taskFilters.statusFilter,
    dateFrom: taskFilters.dateFrom,
    dateTo: taskFilters.dateTo,
    createdFrom: taskFilters.createdFrom,
    createdTo: taskFilters.createdTo,
    petugasFilter: taskFilters.petugasFilter,
    rayonFilter: taskFilters.rayonFilter,
    areaFilter: taskFilters.areaFilter,
    taskSort,
  });

  const activitiesFetching = useActivitiesFetching({
    activityFilters: activityFilters.activityFilters,
    activitySort,
    user,
  });

  // Permissions
  const canSubmitActivity = user?.role ? ACTIVITY_SUBMITTERS.includes(user.role) : false;
  const canCreateTask = user?.role ? TASK_CREATORS.includes(user.role) : false;

  // Effect: initial & focus-based fetch
  useFocusEffect(
    useCallback(() => {
      tasksFetching.fetchTasks(1, true);
      activitiesFetching.fetchActivities(1, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTasks/fetchActivities are stable callbacks
    }, [])
  );

  // Effect: re-fetch on filter/sort change (skip first render)
  const isFirstTaskRender = useRef(true);
  useEffect(() => {
    if (isFirstTaskRender.current) { isFirstTaskRender.current = false; return; }
    tasksFetching.fetchTasks(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTasks is stable callback
  }, [
    taskFilters.taskFilter,
    taskFilters.statusFilter,
    taskFilters.dateFrom,
    taskFilters.dateTo,
    taskFilters.createdFrom,
    taskFilters.createdTo,
    taskSort,
  ]);

  const isFirstActivityRender = useRef(true);
  useEffect(() => {
    if (isFirstActivityRender.current) { isFirstActivityRender.current = false; return; }
    activitiesFetching.fetchActivities(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchActivities is stable callback
  }, [activityFilters.activityFilters, activitySort]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([tasksFetching.fetchTasks(1, true), activitiesFetching.fetchActivities(1, true)]);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTasks/fetchActivities are stable callbacks
  }, []);

  const handleSortPress = useCallback(() => {
    setIsSortModalOpen(true);
  }, []);

  // Build filter chips for display
  const taskChips = buildTaskFilterChips(
    taskFilters.taskFilter,
    taskFilters.statusFilter,
    taskFilters.dateFrom,
    taskFilters.dateTo,
    taskFilters.rayonFilter,
    taskFilters.areaFilter,
    initialRayonId,
    initialAreaId
  );

  const activityChips = buildActivityFilterChips(
    activityFilters.activityFilters,
    initialAreaId
  );

  const isSortActiveTask = taskSort !== 'created_at_desc';
  const isSortActiveActivity = activitySort !== 'created_at_desc';

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.contentWrapper,
            {
              paddingBottom:
                (activeTab === 'tasks' && canCreateTask) || (activeTab === 'activities' && canSubmitActivity)
                  ? 80
                  : nbSpacing.sm,
            },
          ]}
        >
          <View style={styles.header}>
            <NBText variant="h3" style={styles.title}>
              Tugas & Aktivitas
            </NBText>
          </View>

          <View style={styles.tabContainer}>
            <NBTab
              tabs={[
                { key: 'tasks', label: 'Tugas' },
                {
                  key: 'activities',
                  label: `Aktivitas${activityFilters.activeActivityFilterCount > 0 ? ` (${activityFilters.activeActivityFilterCount})` : ''}`,
                },
              ]}
              activeTab={activeTab}
              onTabChange={(key) => setActiveTab(key as any)}
              activeTabStyle={{ backgroundColor: nbColors.warning }}
              activeTextStyle={{ color: nbColors.black }}
            />
          </View>

          <FilterBar
            type={activeTab}
            filterCount={activeTab === 'tasks' ? taskFilters.activeFilterCount : activityFilters.activeActivityFilterCount}
            chips={activeTab === 'tasks' ? taskChips : activityChips}
            isSortActive={activeTab === 'tasks' ? isSortActiveTask : isSortActiveActivity}
            onSortPress={handleSortPress}
            onFilterPress={() => (activeTab === 'tasks' ? setIsFilterModalOpen(true) : setIsActivityFilterOpen(true))}
            onReset={activeTab === 'tasks' ? taskFilters.handleResetFilters : activityFilters.handleResetActivityFilters}
          />

          <View style={styles.content}>
            {activeTab === 'tasks' ? (
              <TasksTab
                tasks={tasksFetching.allTasks}
                loadingTasks={tasksFetching.loadingTasks}
                isLoadingMore={tasksFetching.isLoadingMoreTasks}
                hasMore={tasksFetching.hasMoreTasks}
                tasksError={tasksFetching.tasksError}
                refreshing={refreshing}
                taskFilter={taskFilters.taskFilter}
                isFiltered={taskFilters.activeFilterCount > 0}
                onRefresh={handleRefresh}
                onRetry={() => tasksFetching.fetchTasks(1, true)}
                onLoadMore={tasksFetching.loadMoreTasks}
                onNavigateToTask={(taskId) => navigation.navigate('TaskDetail', { taskId })}
              />
            ) : (
              <ActivitiesTab
                activities={activitiesFetching.allActivities}
                loadingActivities={activitiesFetching.loadingActivities}
                isLoadingMore={activitiesFetching.isLoadingMoreActivities}
                hasMore={activitiesFetching.hasMoreActivities}
                activitiesError={activitiesFetching.activitiesError}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onRetry={() => activitiesFetching.fetchActivities(1, true)}
                onLoadMore={activitiesFetching.loadMoreActivities}
                onNavigateToActivity={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
                currentUserId={user?.id}
              />
            )}
          </View>
        </View>

        <ScreenFABs
          activeTab={activeTab}
          canCreateTask={canCreateTask}
          canSubmitActivity={canSubmitActivity}
          currentShift={currentShift}
          onCreateTask={() => navigation.navigate('TaskCreate')}
          onSubmitActivity={() => navigation.navigate('ActivitySubmission')}
        />

        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title={activeTab === 'tasks' ? 'URUTKAN TUGAS' : 'URUTKAN AKTIVITAS'}
          options={activeTab === 'tasks' ? TASK_SORT_OPTIONS : ACTIVITY_SORT_OPTIONS}
          selectedOption={activeTab === 'tasks' ? taskSort : activitySort}
          onSelect={(key) => {
            if (activeTab === 'tasks') {
              setTaskSort(key as TaskSortOption);
              tasksFetching.fetchTasks(1, true);
            } else {
              setActivitySort(key as ActivitySortOption);
              activitiesFetching.fetchActivities(1, true);
            }
          }}
        />

        <TaskFilterModal
          visible={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          taskFilter={taskFilters.taskFilter}
          statusFilter={taskFilters.statusFilter}
          dateFrom={taskFilters.dateFrom}
          dateTo={taskFilters.dateTo}
          createdFrom={taskFilters.createdFrom}
          createdTo={taskFilters.createdTo}
          rayonFilter={taskFilters.rayonFilter}
          areaFilter={taskFilters.areaFilter}
          petugasFilter={taskFilters.petugasFilter}
          onApplyFilters={taskFilters.handleApplyFilters}
          onResetFilters={taskFilters.handleResetFilters}
          userRole={user?.role || 'satgas'}
          userRayonId={user?.rayon_id}
          userAreaId={user?.area_id ?? currentShift?.area_id ?? undefined}
        />

        <ActivityFilterModal
          visible={isActivityFilterOpen}
          onClose={() => setIsActivityFilterOpen(false)}
          filters={activityFilters.activityFilters}
          onApplyFilters={activityFilters.handleApplyActivityFilters}
          onResetFilters={activityFilters.handleResetActivityFilters}
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
  content: {
    flex: 1,
  },
});

export default TasksActivityScreen;
