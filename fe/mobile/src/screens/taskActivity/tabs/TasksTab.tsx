/**
 * TasksTab
 * Renders the Tasks tab with server-paginated data and infinite scroll.
 * Filtering and sorting are handled server-side by TasksActivityScreen.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NBEmptyState, NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../../../types/models.types';

type TaskFilterType = 'all' | 'assigned' | 'tagged' | 'created_by_me';

export interface TasksTabProps {
  tasks: Task[];
  loadingTasks: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  tasksError: string | null;
  refreshing: boolean;
  taskFilter: TaskFilterType;
  /** True when any filter is active — drives the filtered-empty state. */
  isFiltered?: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onNavigateToTask: (taskId: string) => void;
}

export function TasksTab({
  tasks,
  loadingTasks,
  isLoadingMore,
  hasMore,
  tasksError,
  refreshing,
  taskFilter,
  isFiltered = false,
  onRefresh,
  onRetry,
  onLoadMore,
  onNavigateToTask,
}: TasksTabProps): React.JSX.Element {
  if (loadingTasks) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={nbColors.primary} />
        <NBText variant="body" color="gray600" style={styles.loadingText}>Memuat tugas...</NBText>
      </View>
    );
  }

  if (tasksError) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <NBEmptyState
          variant="error"
          illustration="illo-offline"
          style={styles.emptyStateStretch}
          title="Gagal memuat tugas"
          description={tasksError}
          ctaLabel="Coba Lagi"
          onCTA={onRetry}
        />
      </ScrollView>
    );
  }

  if (tasks.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <NBEmptyState
          variant={isFiltered ? 'noResults' : 'noData'}
          illustration={isFiltered ? 'illo-search' : 'illo-reports'}
          style={styles.emptyStateStretch}
          title={
            isFiltered ? 'Tidak ada tugas yang cocok' :
            taskFilter === 'tagged' ? 'Belum ada tag' :
            taskFilter === 'created_by_me' ? 'Belum ada tugas yang dibuat' :
            'Belum ada tugas'
          }
          description={
            isFiltered ? 'Coba ubah atau reset filter' :
            taskFilter === 'tagged' ? 'Tugas yang menandai Anda akan muncul di sini' :
            taskFilter === 'created_by_me' ? 'Tugas yang Anda buat akan muncul di sini' :
            taskFilter === 'assigned' ? 'Tugas yang ditugaskan ke Anda akan muncul di sini' :
            'Belum ada tugas yang tersedia'
          }
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          onPress={() => onNavigateToTask(item.id)}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={nbColors.primary} />
          </View>
        ) : !hasMore && tasks.length > 0 ? (
          <View style={styles.footerEnd}>
            <NBText variant="body-sm" color="gray400" style={styles.footerEndText}>Tidak ada lagi</NBText>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  listContent: {
    paddingBottom: nbSpacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: nbSpacing.lg,
  },
  emptyStateStretch: {
    flex: 0,
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  footerLoader: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  footerEnd: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  footerEndText: {
    fontStyle: 'italic',
  },
});
