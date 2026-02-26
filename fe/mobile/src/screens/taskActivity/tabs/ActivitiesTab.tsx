/**
 * ActivitiesTab
 * Renders the Activities tab with server-paginated data and infinite scroll.
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
}: ActivitiesTabProps): React.JSX.Element {
  if (loadingActivities) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={nbColors.primary} />
        <Text style={styles.loadingText}>Memuat aktivitas...</Text>
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
          <Text style={styles.errorText}>{activitiesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
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
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          onPress={() => onNavigateToActivity(item.id)}
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
        ) : !hasMore && activities.length > 0 ? (
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
