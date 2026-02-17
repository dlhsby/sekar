/**
 * Tasks & Activity Screen (2 Tabs with Filters Inside)
 * Phase 2C: Tab 1 = Tugas (with assigned/tagged filter), Tab 2 = Aktivitas
 * Each tab has date filters inside
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setLoading,
  setTasks,
  setTaggedTasks,
  setError,
  selectFilteredTasks,
  selectTaggedTasks,
  selectTasksLoading,
  selectTasksError,
} from '../../store/slices/tasksSlice';
import { NBBackgroundPattern, NBCard, NBBadge, NBEmptyState, NBButton, NBTab } from '../../components/nb';
import { TaskFilterModal } from '../../components/modals';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import { ACTIVITY_SUBMITTERS, TASK_CREATORS } from '../../constants/roles';
import type { MainTabParamList } from '../../types/navigation.types';
import { getMyActivities } from '../../services/api/activitiesApi';
import { getMyTasks, getTaggedTasks } from '../../services/api/tasksApi';
import type { Task, Activity, TaskStatus } from '../../types/models.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'TasksActivities'>;
  route: RouteProp<MainTabParamList, 'TasksActivities'>;
};

type MainTabType = 'tasks' | 'activities';
type TaskFilterType = 'assigned' | 'tagged';

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Phase 2C: 4-status badge mapping
 */
function getTaskStatusBadgeVariant(
  status: TaskStatus
): 'gray' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'assigned':
      return 'warning';
    case 'in_progress':
      return 'gray';
    default:
      return 'gray';
  }
}

function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Menunggu',
    assigned: 'Ditugaskan',
    in_progress: 'Dikerjakan',
    completed: 'Selesai',
  };
  return labels[status] || status;
}

export function TasksActivityScreen({ navigation, route }: Props): React.JSX.Element {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  // Main tab state
  const [activeTab, setActiveTab] = useState<MainTabType>('tasks');

  // Task filter state
  const [taskFilter, setTaskFilter] = useState<TaskFilterType>('assigned');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [rayonFilter, setRayonFilter] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivitiesState] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Redux state for tasks
  const tasks = useAppSelector(selectFilteredTasks);
  const taggedTasks = useAppSelector(selectTaggedTasks);
  const loadingTasks = useAppSelector(selectTasksLoading);
  const tasksError = useAppSelector(selectTasksError);

  // Permissions
  const canSubmitActivity = user?.role ? ACTIVITY_SUBMITTERS.includes(user.role) : false;
  const canCreateTask = user?.role ? TASK_CREATORS.includes(user.role) : false;

  // Memoize filter params to prevent infinite re-renders
  const filterParams = useMemo(() => {
    const filters: any = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (dateFrom) filters.from_date = dateFrom;
    if (dateTo) filters.to_date = dateTo;
    if (rayonFilter) filters.rayon_id = rayonFilter;
    if (areaFilter) filters.area_id = areaFilter;
    return filters;
  }, [statusFilter, dateFrom, dateTo, rayonFilter, areaFilter]);

  const fetchTasks = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await getMyTasks(filterParams);
      if (response.data && Array.isArray(response.data)) {
        dispatch(setTasks(response.data));
      } else {
        dispatch(setTasks([]));
      }
    } catch (error) {
      dispatch(setError('Gagal memuat tugas'));
    }
  }, [dispatch, filterParams]);

  const fetchTaggedTasks = useCallback(async () => {
    try {
      const response = await getTaggedTasks(filterParams);
      if (response.data && Array.isArray(response.data)) {
        dispatch(setTaggedTasks(response.data));
      } else {
        dispatch(setTaggedTasks([]));
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to fetch tagged tasks:', error);
      }
    }
  }, [dispatch, filterParams]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const response = await getMyActivities();
      if (response.data) {
        setActivitiesState(response.data);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to fetch activities:', error);
      }
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // HIGH 2 FIX: Remove duplicate useEffect, keep only useFocusEffect to avoid double API calls
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchTaggedTasks();
      fetchActivities();
    }, [fetchTasks, fetchTaggedTasks, fetchActivities])
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (taskFilter !== 'assigned') count++;
    if (statusFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (rayonFilter) count++;
    if (areaFilter) count++;
    return count;
  }, [taskFilter, statusFilter, dateFrom, dateTo, rayonFilter, areaFilter]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setTaskFilter('assigned');
    setRayonFilter(null);
    setAreaFilter(null);
  }, []);

  const handleApplyFilters = useCallback((filters: {
    taskFilter: 'assigned' | 'tagged';
    statusFilter: TaskStatus | 'all';
    dateFrom: string;
    dateTo: string;
    rayonFilter: string | null;
    areaFilter: string | null;
  }) => {
    setTaskFilter(filters.taskFilter);
    setStatusFilter(filters.statusFilter);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setRayonFilter(filters.rayonFilter);
    setAreaFilter(filters.areaFilter);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTasks(), fetchTaggedTasks(), fetchActivities()]);
    setRefreshing(false);
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
    >
      <NBCard variant="elevated" style={styles.cardInner}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <NBBadge
            text={getTaskStatusLabel(item.status)}
            color={getTaskStatusBadgeVariant(item.status)}
          />
        </View>
        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.area && (
          <Text style={styles.taskArea}>Area: {item.area.name}</Text>
        )}
        {item.rayon && (
          <Text style={styles.taskArea}>Rayon: {item.rayon.name}</Text>
        )}
        {item.deadline && (
          <Text style={styles.taskDeadline}>
            Deadline: {new Date(item.deadline).toLocaleDateString('id-ID')}
          </Text>
        )}
        {item.tags && item.tags.length > 0 && (
          <Text style={styles.taskTags}>
            {item.tags.length} tag
          </Text>
        )}
      </NBCard>
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
    >
      <NBCard variant="elevated" style={styles.cardInner}>
        <View style={styles.activityHeader}>
          <View style={styles.activityHeaderLeft}>
            <Text style={styles.activityType}>
              {item.activityType?.name || 'Aktivitas'}
            </Text>
            <Text style={styles.activityDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <Text style={styles.activityTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.activityDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.activityMeta}>
          {item.area && (
            <Text style={styles.activityMetaItem}>📍 {item.area.name}</Text>
          )}
          {item.photo_urls && item.photo_urls.length > 0 && (
            <Text style={styles.activityMetaItem}>📸 {item.photo_urls.length} foto</Text>
          )}
        </View>
      </NBCard>
    </TouchableOpacity>
  );

  // Render Tugas Tab Content (with filters inside)
  const renderTasksTabContent = () => {
    const currentTasks = taskFilter === 'assigned' ? tasks : taggedTasks;

    if (loadingTasks) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat tugas...</Text>
        </View>
      );
    }

    if (tasksError) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{tasksError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTasks}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentTasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NBEmptyState
            variant="noData"
            title={taskFilter === 'assigned' ? "Belum ada tugas" : "Belum ada tag"}
            description={taskFilter === 'assigned'
              ? "Tugas yang ditugaskan kepada Anda akan muncul di sini"
              : "Tugas di mana Anda ditandai akan muncul di sini"
            }
          />
        </View>
      );
    }

    return (
      <FlatList
        data={currentTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    );
  };

  // Render Aktivitas Tab Content
  const renderActivitiesTabContent = () => {
    if (loadingActivities) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat aktivitas...</Text>
        </View>
      );
    }

    if (activities.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NBEmptyState
            variant="noData"
            title="Belum ada aktivitas"
            description="Aktivitas yang Anda buat akan muncul di sini"
          />
        </View>
      );
    }

    return (
      <FlatList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
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
                           (activeTab === 'activities' && canSubmitActivity && currentShift)
              ? 80  // Reserve space for FAB
              : nbSpacing.md  // No FAB, use normal padding
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tugas & Aktivitas</Text>
          </View>

          {/* Main Tabs */}
          <View style={styles.tabContainer}>
            <NBTab
              tabs={[
                { key: 'tasks', label: 'Tugas' },
                { key: 'activities', label: 'Aktivitas' },
              ]}
              activeTab={activeTab}
              onTabChange={(key) => {
                const newTab = key as MainTabType;
                setActiveTab(newTab);
                // Clear filters when switching tabs
                if (newTab === 'activities') {
                  handleResetFilters();
                }
              }}
            />
          </View>

          {/* Filter Button Row (opens modal) */}
          {activeTab === 'tasks' && (
            <View style={[
              styles.filterBarCollapsed,
              activeFilterCount > 0 && styles.filterBarActive
            ]}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setIsFilterModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Filter tugas${activeFilterCount > 0 ? `, ${activeFilterCount} filter aktif` : ''}`}
              >
                <MaterialCommunityIcons name="filter-variant" size={20} color={nbColors.black} />
                <Text style={styles.filterButtonText}>Filter</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Active filter mini chips */}
              {activeFilterCount > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.miniChipsContainer}
                  contentContainerStyle={styles.miniChipsContent}
                >
                  {taskFilter === 'tagged' && (
                    <View style={[styles.miniChip, styles.miniChipAssignment]}>
                      <Text style={styles.miniChipText}>Tag Saya</Text>
                    </View>
                  )}
                  {statusFilter !== 'all' && (
                    <View style={[styles.miniChip, styles.miniChipStatus]}>
                      <Text style={styles.miniChipText}>{getTaskStatusLabel(statusFilter)}</Text>
                    </View>
                  )}
                  {(dateFrom || dateTo) && (
                    <View style={[styles.miniChip, styles.miniChipDate]}>
                      <Text style={styles.miniChipText}>
                        {dateFrom && dateTo ? `${dateFrom.slice(5)} — ${dateTo.slice(5)}` : 'Tanggal'}
                      </Text>
                    </View>
                  )}
                  {rayonFilter && (
                    <View style={[styles.miniChip, styles.miniChipLocation]}>
                      <Text style={styles.miniChipText}>Rayon</Text>
                    </View>
                  )}
                  {areaFilter && (
                    <View style={[styles.miniChip, styles.miniChipLocation]}>
                      <Text style={styles.miniChipText}>Area</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.filterResetButtonTop}
                  onPress={handleResetFilters}
                  accessibilityRole="button"
                  accessibilityLabel="Reset semua filter"
                >
                  <MaterialCommunityIcons name="close" size={20} color={nbColors.black} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tab Content */}
          <View style={styles.content}>
            {activeTab === 'tasks' ? renderTasksTabContent() : renderActivitiesTabContent()}
          </View>
        </View>

        {/* FAB: Tambah Aktivitas - Only show on activities tab if canSubmitActivity and clocked in */}
        {activeTab === 'activities' && canSubmitActivity && currentShift && (
          <View style={styles.fab}>
            <NBButton
              title="+ Tambah Aktivitas"
              onPress={() => navigation.navigate('ActivitySubmission')}
              variant="primary"
              size="lg"
            />
          </View>
        )}

        {/* FAB: Buat Tugas - Only show on tasks tab if canCreateTask */}
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

        {/* Task Filter Modal (bottom sheet) */}
        <TaskFilterModal
          visible={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          taskFilter={taskFilter}
          statusFilter={statusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          rayonFilter={rayonFilter}
          areaFilter={areaFilter}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          userRole={user?.role || 'satgas'}
          userRayonId={user?.rayon_id}
          userAreaId={user?.area_id}
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
    padding: nbSpacing.md,
    // paddingBottom is now dynamic based on FAB visibility
  },
  header: {
    marginBottom: nbSpacing.md,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
  },
  tabContainer: {
    marginBottom: nbSpacing.md,
  },
  // Collapsed Filter Bar
  filterBarCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.extra,
    borderBottomColor: nbColors.gray[300],
    ...nbShadows.md,
    marginBottom: nbSpacing.md,
    height: 56,
  },
  filterBarActive: {
    borderBottomColor: nbColors.primary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.md,
    backgroundColor: nbColors.white,
    gap: nbSpacing.xs,
    minWidth: 44,
    height: 40,
  },
  filterButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: nbColors.danger,
    borderWidth: nbBorders.base,
    borderColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
  miniChipsContainer: {
    flex: 1,
    marginHorizontal: nbSpacing.sm,
  },
  miniChipsContent: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  miniChip: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
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
  miniChipText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  filterResetButtonTop: {
    width: 40,
    height: 40,
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.md,
    backgroundColor: nbColors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: nbSpacing.md,
  },
  taskCard: {
    marginBottom: nbSpacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.sm,
  },
  taskTitle: {
    flex: 1,
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginRight: nbSpacing.sm,
  },
  taskDescription: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['700'],
    marginBottom: nbSpacing.sm,
    lineHeight: 20,
  },
  taskArea: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginBottom: nbSpacing.xs,
  },
  taskDeadline: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.warning,
    fontWeight: nbTypography.fontWeight.semibold,
  },
  taskTags: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.accentSky,
    fontWeight: nbTypography.fontWeight.medium,
    marginTop: nbSpacing.xs,
  },
  activityCard: {
    marginBottom: nbSpacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nbSpacing.sm,
  },
  activityHeaderLeft: {
    flex: 1,
  },
  activityType: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  activityDate: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.primary,
  },
  activityTime: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
  },
  activityDescription: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['700'],
    marginBottom: nbSpacing.sm,
    lineHeight: 20,
  },
  activityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  activityMetaItem: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.danger,
    marginBottom: nbSpacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.sm,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    ...nbShadows.sm,
  },
  retryButtonText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
  cardInner: {
    padding: nbSpacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    right: nbSpacing.md,
    left: nbSpacing.md,
    zIndex: 10,
  },
});

export default TasksActivityScreen;
