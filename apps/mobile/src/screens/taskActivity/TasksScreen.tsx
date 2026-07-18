/**
 * Tasks Screen — standalone tasks list (split from the former Tugas/Aktivitas tabs).
 * Reuses the shared TasksTab body + filter/sort chrome; no NBTab switcher.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { NBBackgroundPattern } from '../../components/nb';
import { TaskFilterModal } from '../../components/modals';
import { SortModal } from '../../components/modals/SortModal';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { TASK_CREATORS } from '../../constants/roles';
import type { MainTabParamList } from '../../types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TasksTab } from './tabs/TasksTab';
import { FilterBar } from '../../components/common';
import { ScreenFABs } from './components/ScreenFABs';
import { useTasksActivityFilters, useTasksFetching, type TaskSortOption } from './hooks';
import { buildTaskFilterChips } from './utils/filterChips';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Tasks'>;
};

export function TasksScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  const TASK_SORT_OPTIONS = [
    { key: 'created_at_desc', label: t('tasks:sort.newest') },
    { key: 'created_at_asc', label: t('tasks:sort.oldest') },
    { key: 'deadline_asc', label: t('tasks:sort.deadlineNearest') },
    { key: 'priority_desc', label: t('tasks:sort.priorityHighest') },
  ];

  const initialAreaId = user?.location_id ?? currentShift?.location_id ?? null;
  const initialRayonId = user?.rayon_id ?? null;

  const [taskSort, setTaskSort] = useState<TaskSortOption>('created_at_desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const taskFilters = useTasksActivityFilters({ initialRayonId, initialAreaId });
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

  const canCreateTask = user?.role ? TASK_CREATORS.includes(user.role) : false;

  useFocusEffect(
    useCallback(() => {
      tasksFetching.fetchTasks(1, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTasks is a stable callback
    }, []),
  );

  const isFirstTaskRender = useRef(true);
  useEffect(() => {
    if (isFirstTaskRender.current) {
      isFirstTaskRender.current = false;
      return;
    }
    tasksFetching.fetchTasks(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTasks is a stable callback
  }, [
    taskFilters.taskFilter,
    taskFilters.statusFilter,
    taskFilters.dateFrom,
    taskFilters.dateTo,
    taskFilters.createdFrom,
    taskFilters.createdTo,
    taskSort,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await tasksFetching.fetchTasks(1, true);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTasks is a stable callback
  }, []);

  const taskChips = buildTaskFilterChips(
    taskFilters.taskFilter,
    taskFilters.statusFilter,
    taskFilters.dateFrom,
    taskFilters.dateTo,
    taskFilters.rayonFilter,
    taskFilters.areaFilter,
    initialRayonId,
    initialAreaId,
  );

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { paddingBottom: canCreateTask ? 80 : nbSpacing.sm }]}>
          {/* Title lives in the navigator header (top bar) — not repeated here. */}
          <FilterBar
            label={t('tasks:filter.label')}
            filterCount={taskFilters.activeFilterCount}
            chips={taskChips}
            isSortActive={taskSort !== 'created_at_desc'}
            onSortPress={() => setIsSortModalOpen(true)}
            onFilterPress={() => setIsFilterModalOpen(true)}
            onReset={taskFilters.handleResetFilters}
          />

          <View style={styles.content}>
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
          </View>
        </View>

        <ScreenFABs
          activeTab="tasks"
          canCreateTask={canCreateTask}
          canSubmitActivity={false}
          currentShift={currentShift}
          onCreateTask={() => navigation.navigate('TaskCreate')}
          onSubmitActivity={() => {}}
        />

        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title={t('tasks:header.sort')}
          options={TASK_SORT_OPTIONS}
          selectedOption={taskSort}
          onSelect={(key) => {
            setTaskSort(key as TaskSortOption);
            tasksFetching.fetchTasks(1, true);
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
          userAreaId={user?.location_id ?? currentShift?.location_id ?? undefined}
        />
      </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentWrapper: { flex: 1, paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.md },
  header: { marginBottom: nbSpacing.sm },
  content: { flex: 1 },
});

export default TasksScreen;
