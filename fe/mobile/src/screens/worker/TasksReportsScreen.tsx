/**
 * Tasks & Reports Screen (Tabbed)
 * Worker's main screen for viewing tasks and reports
 * Replaces the old "Laporan Saya" screen with tabbed interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
  setError,
  selectFilteredTasks,
  selectTasksLoading,
  selectTasksError,
} from '../../store/slices/tasksSlice';
import { NBTab, NBBackgroundPattern, NBCard, NBBadge, NBEmptyState } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbShadows } from '../../constants/nbTokens';
import type { WorkerTabScreenProps } from '../../types/navigation.types';
import { getMyReports } from '../../services/api/reportsApi';
import { getMyTasks } from '../../services/api/tasksApi';
import type { MyReportsResponse, Task } from '../../types/api.types';

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

type TabType = 'tasks' | 'reports';

export function TasksReportsScreen({
  navigation,
  route,
}: WorkerTabScreenProps<'TasksReports'>): React.JSX.Element {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.activeTab || 'tasks');
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<MyReportsResponse[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Redux state for tasks
  const tasks = useAppSelector(selectFilteredTasks);
  const loadingTasks = useAppSelector(selectTasksLoading);
  const tasksError = useAppSelector(selectTasksError);

  const tabs = [
    { key: 'tasks', label: 'Tugas' },
    { key: 'reports', label: 'Laporan' },
  ];

  const fetchTasks = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await getMyTasks();
      console.log('📋 Tasks API response:', response);

      // Backend returns Task[] directly (not wrapped in { data, meta })
      if (response.data && Array.isArray(response.data)) {
        console.log('📋 Tasks count:', response.data.length);
        dispatch(setTasks(response.data));
      } else {
        console.log('⚠️ Invalid response format or no tasks');
        dispatch(setTasks([]));
      }
    } catch (error) {
      console.error('❌ Failed to fetch tasks:', error);
      dispatch(setError('Gagal memuat tugas'));
    }
  }, [dispatch]);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const response = await getMyReports();
      if (response.data) {
        setReports(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchReports();
  }, [fetchTasks, fetchReports]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchReports();
    }, [fetchTasks, fetchReports])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTasks(), fetchReports()]);
    setRefreshing(false);
  };

  const getTaskStatusBadgeVariant = (
    status: string
  ): 'default' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'assigned':
      case 'accepted':
        return 'warning';
      case 'in_progress':
        return 'default';
      case 'declined':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getTaskStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'assigned':
        return 'Ditugaskan';
      case 'accepted':
        return 'Diterima';
      case 'in_progress':
        return 'Dikerjakan';
      case 'completed':
        return 'Selesai';
      case 'declined':
        return 'Ditolak';
      default:
        return status;
    }
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
            variant={getTaskStatusBadgeVariant(item.status)}
          />
        </View>
        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.area && (
          <Text style={styles.taskArea}>📍 {item.area.name}</Text>
        )}
        {item.deadline && (
          <Text style={styles.taskDeadline}>
            ⏰ Deadline: {new Date(item.deadline).toLocaleDateString('id-ID')}
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
          <Text style={styles.errorText}>❌ {tasksError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchTasks}
          >
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NBCard variant="elevated" style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              📋 Daftar tugas akan ditampilkan di sini
            </Text>
          </NBCard>
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

  const renderReportItem = ({ item }: { item: MyReportsResponse }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
    >
      <NBCard variant="elevated" style={styles.cardInner}>
        <View style={styles.reportHeader}>
          <View style={styles.reportTitleRow}>
            <Text style={styles.reportType}>
              {item.report_type || 'Laporan'}
            </Text>
          </View>
          <Text style={styles.reportDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={styles.reportDescription} numberOfLines={2}>
          {item.description || item.notes || 'Tidak ada deskripsi'}
        </Text>
        <View style={styles.reportMeta}>
          {item.area && (
            <Text style={styles.reportMetaItem}>📍 {item.area.name}</Text>
          )}
          {item.media_urls && item.media_urls.length > 0 && (
            <Text style={styles.reportMetaItem}>📷 {item.media_urls.length} foto</Text>
          )}
          <Text style={styles.reportTime}>{formatTime(item.created_at)}</Text>
        </View>
      </NBCard>
    </TouchableOpacity>
  );

  const renderReportsTab = () => {
    if (loadingReports) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat laporan...</Text>
        </View>
      );
    }

    if (reports.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NBCard variant="elevated" style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              📊 Daftar laporan akan ditampilkan di sini
            </Text>
          </NBCard>
        </View>
      );
    }

    return (
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.id.toString()}
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
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tugas & Laporan</Text>
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
            {activeTab === 'tasks' ? renderTasksTab() : renderReportsTab()}
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
    color: nbColors.gray[700],
    marginBottom: nbSpacing.sm,
    lineHeight: 20,
  },
  taskArea: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
  },
  taskDeadline: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.warning,
    fontWeight: nbTypography.fontWeight.semibold,
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
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    borderRadius: 0,
    ...nbShadows.sm,
  },
  retryButtonText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
  reportCard: {
    marginBottom: nbSpacing.md,
  },
  cardInner: {
    padding: nbSpacing.md,
  },
  reportHeader: {
    marginBottom: nbSpacing.sm,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportType: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  reportDate: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.primary,
  },
  reportDescription: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[700],
    marginBottom: nbSpacing.sm,
    lineHeight: 20,
  },
  reportMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
    alignItems: 'center',
  },
  reportMetaItem: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
  },
  reportTime: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
    marginLeft: 'auto',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
  },
  emptyCard: {
    padding: nbSpacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[600],
    textAlign: 'center',
  },
});

export default TasksReportsScreen;
