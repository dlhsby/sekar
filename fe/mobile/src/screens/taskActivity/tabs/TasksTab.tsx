/**
 * TasksTab
 * Renders the Tasks tab with server-paginated data and infinite scroll.
 * Filtering and sorting are handled server-side by TasksActivityScreen.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NBEmptyState, NBSkeleton, NBText } from '../../../components/nb';
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
  const { t } = useTranslation('common');
  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskCard
        task={item}
        onPress={() => onNavigateToTask(item.id)}
      />
    ),
    [onNavigateToTask],
  );

  if (loadingTasks) {
    return (
      <View style={styles.skeletonContainer}>
        <NBSkeleton variant="list" count={5} />
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
          title={t('tasks:tab.tabLoadErrorTitle')}
          description={tasksError}
          ctaLabel={t('tasks:tab.tabRetry')}
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
            isFiltered ? t('tasks:tab.tabNoMatchTitle') :
            taskFilter === 'tagged' ? t('tasks:tab.tabTaggedEmptyTitle') :
            taskFilter === 'created_by_me' ? t('tasks:tab.tabCreatedEmptyTitle') :
            t('tasks:tab.tabEmptyTitle')
          }
          description={
            isFiltered ? t('tasks:tab.tabFilteredHint') :
            taskFilter === 'tagged' ? t('tasks:tab.tabTaggedEmpty') :
            taskFilter === 'created_by_me' ? t('tasks:tab.tabCreatedEmpty') :
            taskFilter === 'assigned' ? t('tasks:tab.tabAssignedEmpty') :
            t('tasks:tab.tabNoTasksAvailable')
          }
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={nbColors.primary} />
          </View>
        ) : !hasMore && tasks.length > 0 ? (
          <View style={styles.footerEnd}>
            <NBText variant="body-sm" color="gray400" style={styles.footerEndText}>{t('ui.noMore')}</NBText>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    padding: nbSpacing.md,
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
