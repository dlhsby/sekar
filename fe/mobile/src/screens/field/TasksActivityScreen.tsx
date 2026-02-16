/**
 * Tasks & Activity Screen (Tabbed)
 * Phase 2C: 3 tabs — "Tugas Saya" | "Tag Saya" | "Aktivitas"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { NBTab, NBBackgroundPattern, NBCard, NBBadge, NBEmptyState } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import { getMyActivities } from '../../services/api/activitiesApi';
import { getMyTasks, getTaggedTasks } from '../../services/api/tasksApi';
import type { Task, Activity, TaskStatus } from '../../types/models.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Activities' | 'Tasks'>;
  route: RouteProp<MainTabParamList, 'Activities' | 'Tasks'>;
};

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

type TabType = 'tasks' | 'tagged' | 'activities';

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
  const [activeTab, setActiveTab] = useState<TabType>(
    (route.params as any)?.activeTab || 'tasks'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivitiesState] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Redux state for tasks
  const tasks = useAppSelector(selectFilteredTasks);
  const taggedTasks = useAppSelector(selectTaggedTasks);
  const loadingTasks = useAppSelector(selectTasksLoading);
  const tasksError = useAppSelector(selectTasksError);

  const tabs = [
    { key: 'tasks', label: 'Tugas Saya' },
    { key: 'tagged', label: 'Tag Saya' },
    { key: 'activities', label: 'Aktivitas' },
  ];

  const fetchTasks = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await getMyTasks();
      if (response.data && Array.isArray(response.data)) {
        dispatch(setTasks(response.data));
      } else {
        dispatch(setTasks([]));
      }
    } catch (error) {
      dispatch(setError('Gagal memuat tugas'));
    }
  }, [dispatch]);

  const fetchTaggedTasks = useCallback(async () => {
    try {
      const response = await getTaggedTasks();
      if (response.data && Array.isArray(response.data)) {
        dispatch(setTaggedTasks(response.data));
      } else {
        dispatch(setTaggedTasks([]));
      }
    } catch (error) {
      console.warn('Failed to fetch tagged tasks:', error);
    }
  }, [dispatch]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const response = await getMyActivities();
      if (response.data) {
        setActivitiesState(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchTaggedTasks();
    fetchActivities();
  }, [fetchTasks, fetchTaggedTasks, fetchActivities]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchTaggedTasks();
      fetchActivities();
    }, [fetchTasks, fetchTaggedTasks, fetchActivities])
  );

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

  const renderTasksTab = () => {
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

    if (tasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NBEmptyState
            variant="noData"
            title="Belum ada tugas"
            description="Tugas yang ditugaskan kepada Anda akan muncul di sini"
          />
        </View>
      );
    }

    return (
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    );
  };

  const renderTaggedTab = () => {
    if (loadingTasks) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat tugas...</Text>
        </View>
      );
    }

    if (taggedTasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NBEmptyState
            variant="noData"
            title="Belum ada tag"
            description="Tugas di mana Anda ditandai akan muncul di sini"
          />
        </View>
      );
    }

    return (
      <FlatList
        data={taggedTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    );
  };

  const renderActivityItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity style={styles.activityCard}>
      <NBCard variant="elevated" style={styles.cardInner}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityType}>
            {item.activityType?.name || 'Aktivitas'}
          </Text>
          <Text style={styles.activityDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={styles.activityDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.activityMeta}>
          {item.area && (
            <Text style={styles.activityMetaItem}>Area: {item.area.name}</Text>
          )}
          {item.photo_urls && item.photo_urls.length > 0 && (
            <Text style={styles.activityMetaItem}>{item.photo_urls.length} foto</Text>
          )}
          <Text style={styles.activityTime}>{formatTime(item.created_at)}</Text>
        </View>
      </NBCard>
    </TouchableOpacity>
  );

  const renderActivitiesTab = () => {
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tasks':
        return renderTasksTab();
      case 'tagged':
        return renderTaggedTab();
      case 'activities':
        return renderActivitiesTab();
    }
  };

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tugas & Aktivitas</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <NBTab
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(key) => setActiveTab(key as TabType)}
            />
          </View>

          {/* Tab Content */}
          <View style={styles.content}>
            {renderTabContent()}
          </View>
        </View>
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
  },
  header: {
    marginBottom: nbSpacing.md,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
  },
  tabsContainer: {
    marginBottom: nbSpacing.md,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: nbSpacing.lg,
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
    marginBottom: nbSpacing.sm,
  },
  activityType: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  activityDate: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.primary,
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
    alignItems: 'center',
  },
  activityMetaItem: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
  activityTime: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
    marginLeft: 'auto',
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
});

export default TasksActivityScreen;
