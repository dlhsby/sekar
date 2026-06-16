/**
 * Team Analytics Screen
 * Phase 5-2: Team performance overview for korlap+
 * Shows: summary cards, top performers, needs attention list
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NBBackgroundPattern,
  NBCard,
  NBEmptyState,
  NBPageHeader,
  NBText,
  NBBadge,
} from '../../components/nb';
import {
  SummaryCard,
  TopPerformersCard,
  NeedsAttentionCard,
} from './components';
import {
  fetchTeamAnalytics,
  selectTeamAnalytics,
  selectTeamAnalyticsLoading,
  selectAnalyticsError,
} from '../../store/slices/analyticsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

type Props = {
  route?: { params?: { areaId?: string } };
};

const TEAM_PAGE_SIZE = 10;

export function TeamAnalyticsScreen({ route }: Props): React.JSX.Element {
  const dispatch = useAppDispatch();

  const teamAnalytics = useAppSelector(selectTeamAnalytics);
  const teamLoading = useAppSelector(selectTeamAnalyticsLoading);
  const error = useAppSelector(selectAnalyticsError);

  const [refreshing, setRefreshing] = useState(false);

  const areaId = route?.params?.areaId;

  // Load data on mount and focus
  useFocusEffect(
    React.useCallback(() => {
      dispatch(
        fetchTeamAnalytics({
          page: 1,
          limit: TEAM_PAGE_SIZE,
          area_id: areaId,
          reset: true,
        }),
      );
    }, [areaId, dispatch]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(
      fetchTeamAnalytics({
        page: 1,
        limit: TEAM_PAGE_SIZE,
        area_id: areaId,
        reset: true,
      }),
    );
    setRefreshing(false);
  };


  // Derive top performers and needs attention
  const topPerformers = teamAnalytics
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 3);

  const needsAttention = teamAnalytics
    .filter((w) => w.performance_score < 70)
    .sort((a, b) => a.performance_score - b.performance_score)
    .slice(0, 3);

  // Calculate summary stats
  const avgScore =
    teamAnalytics.length > 0
      ? teamAnalytics.reduce((sum, w) => sum + w.performance_score, 0) / teamAnalytics.length
      : 0;

  // Error state
  if (error && !teamLoading && teamAnalytics.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NBBackgroundPattern pattern="grid" />
        <NBPageHeader title="Analitik Tim" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <NBEmptyState
            variant="error"
            title="Gagal memuat data"
            description={error}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Loading state
  if (teamLoading && teamAnalytics.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NBBackgroundPattern pattern="grid" />
        <NBPageHeader title="Analitik Tim" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No data state
  if (teamAnalytics.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NBBackgroundPattern pattern="grid" />
        <NBPageHeader title="Analitik Tim" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <NBEmptyState
            variant="noData"
            title="Tidak ada data tim"
            description="Data akan muncul setelah anggota tim menyelesaikan pekerjaan."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NBBackgroundPattern pattern="grid" />
      <NBPageHeader title="Analitik Tim" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Anggota Aktif"
            value={teamAnalytics.length}
            subtitle="petugas"
          />
          <SummaryCard
            label="Skor Rata"
            value={Math.round(avgScore * 10) / 10}
            subtitle={avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'D'}
          />
        </View>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <TopPerformersCard workers={topPerformers} />
        )}

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <NeedsAttentionCard workers={needsAttention} />
        )}

        {/* All Team Members List */}
        <NBCard style={styles.listCard}>
          <NBText variant="h3" style={styles.listTitle}>
            Semua Petugas ({teamAnalytics.length})
          </NBText>
          {teamAnalytics.map((worker) => (
            <View key={worker.id} style={styles.workerRow}>
              <View style={styles.workerInfo}>
                <NBText variant="body" style={styles.workerName}>
                  {worker.full_name}
                </NBText>
                <NBText variant="body-sm" color="gray600">
                  Skor: {Math.round(worker.performance_score * 10) / 10}
                </NBText>
              </View>
              <NBBadge
                text={worker.grade}
                color={
                  worker.grade === 'A'
                    ? 'success'
                    : worker.grade === 'B'
                      ? 'primary'
                      : worker.grade === 'C'
                        ? 'warning'
                        : 'primary'
                }
              />
            </View>
          ))}

        </NBCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    gap: nbSpacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: nbSpacing.md,
    justifyContent: 'space-between',
  },
  listCard: {
    padding: nbSpacing.md,
    gap: nbSpacing.md,
  },
  listTitle: {
    marginBottom: nbSpacing.sm,
  },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray200,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    marginBottom: 2,
  },
});
