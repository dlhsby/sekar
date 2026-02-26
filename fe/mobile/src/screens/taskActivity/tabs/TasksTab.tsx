/**
 * TasksTab
 * Renders the Tasks tab with server-paginated data and infinite scroll.
 * Filtering and sorting are handled server-side by TasksActivityScreen.
 */

import React from 'react';
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
import { NBEmptyState } from '../../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../../constants/nbTokens';
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
  onRefresh,
  onRetry,
  onLoadMore,
  onNavigateToTask,
}: TasksTabProps): React.JSX.Element {
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
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.centerContentInline}>
          <Text style={styles.errorText}>{tasksError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
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
          variant="noData"
          style={styles.emptyStateStretch}
          title={
            taskFilter === 'tagged' ? 'Belum ada tag' :
            taskFilter === 'created_by_me' ? 'Belum ada tugas yang dibuat' :
            'Belum ada tugas'
          }
          description={
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
            <Text style={styles.footerEndText}>Tidak ada lagi</Text>
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
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
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
  centerContentInline: {
    paddingVertical: nbSpacing.xl,
    alignItems: 'center',
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
  footerLoader: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  footerEnd: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  footerEndText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['400'],
    fontStyle: 'italic',
  },
});
