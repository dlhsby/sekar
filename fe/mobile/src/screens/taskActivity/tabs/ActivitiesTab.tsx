/**
 * ActivitiesTab
 * Renders the Activities tab with server-paginated data and infinite scroll.
 * Filtering and sorting are handled server-side by TasksActivityScreen.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NBEmptyState, NBSkeleton, NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../../constants/nbTokens';
import { ActivityCard } from '../components/ActivityCard';
import type { Activity } from '../../../types/models.types';

export interface ActivitiesTabProps {
  activities: Activity[];
  loadingActivities: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  activitiesError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onNavigateToActivity: (activityId: string) => void;
  /** Current user id — passed to ActivityCard so it can flag tagged-in items (ADR-038). */
  currentUserId?: string;
}

export function ActivitiesTab({
  activities,
  loadingActivities,
  isLoadingMore,
  hasMore,
  activitiesError,
  refreshing,
  onRefresh,
  onRetry,
  onLoadMore,
  onNavigateToActivity,
  currentUserId,
}: ActivitiesTabProps): React.JSX.Element {
  const renderItem = useCallback(
    ({ item }: { item: Activity }) => (
      <ActivityCard
        activity={item}
        onPress={() => onNavigateToActivity(item.id)}
        currentUserId={currentUserId}
      />
    ),
    [onNavigateToActivity, currentUserId],
  );

  if (loadingActivities) {
    return (
      <View style={styles.skeletonContainer}>
        <NBSkeleton variant="list" count={5} />
      </View>
    );
  }

  if (activitiesError) {
    return (
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.centerContentInline}>
          <NBText variant="body" color="danger" style={styles.errorText}>{activitiesError}</NBText>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <NBText variant="body" color="white" style={styles.retryButtonText}>Coba Lagi</NBText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (activities.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <NBEmptyState
          variant="noData"
          illustration="illo-reports"
          style={styles.emptyStateStretch}
          title="Belum ada aktivitas"
          description="Aktivitas yang Anda buat akan muncul di sini"
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={activities}
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
        ) : !hasMore && activities.length > 0 ? (
          <View style={styles.footerEnd}>
            <NBText variant="body-sm" color="gray400" style={styles.footerEndText}>Tidak ada lagi</NBText>
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
  centerContentInline: {
    paddingVertical: nbSpacing.xl,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: nbSpacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.sm,
  },
  retryButtonText: {
    fontWeight: '700',
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
