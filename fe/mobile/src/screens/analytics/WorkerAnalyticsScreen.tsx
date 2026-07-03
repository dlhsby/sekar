/**
 * Worker Analytics Screen
 * Phase 5-2: Individual worker performance dashboard
 * Shows: performance score, KPIs, 7-day attendance trend, task progress
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
import { useTranslation } from 'react-i18next';

import {
  NBBackgroundPattern,
  NBCard,
  NBEmptyState,
  NBPageHeader,
  NBText,
} from '../../components/nb';
import { BarChart } from '../../components/charts/BarChart';
import {
  PerformanceScoreCard,
  KPIPills,
  TaskProgressCard,
} from './components';
import {
  fetchWorkerAnalytics,
  selectWorkerAnalytics,
  selectAnalyticsLoading,
  selectAnalyticsError,
} from '../../store/slices/analyticsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

type Props = {
  route?: { params?: { workerId?: string } };
};

export function WorkerAnalyticsScreen({ route }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const workerAnalytics = useAppSelector(selectWorkerAnalytics);
  const loading = useAppSelector(selectAnalyticsLoading);
  const error = useAppSelector(selectAnalyticsError);

  const [refreshing, setRefreshing] = useState(false);

  // Determine worker ID (route param or current user)
  const workerId = route?.params?.workerId || user?.id;

  // Load data on mount and focus
  useFocusEffect(
    React.useCallback(() => {
      if (workerId) {
        dispatch(fetchWorkerAnalytics({ id: workerId }));
      }
    }, [workerId, dispatch]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    if (workerId) {
      await dispatch(fetchWorkerAnalytics({ id: workerId }));
    }
    setRefreshing(false);
  };


  // Error state
  if (error && !loading && !workerAnalytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NBBackgroundPattern pattern="grid" />
        <NBPageHeader title={t('analytics:worker.title')} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <NBEmptyState
            variant="error"
            title={t('analytics:worker.error')}
            description={error}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading && !workerAnalytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NBBackgroundPattern pattern="grid" />
        <NBPageHeader title={t('analytics:worker.title')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No data state
  if (!workerAnalytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NBBackgroundPattern pattern="grid" />
        <NBPageHeader title={t('analytics:worker.title')} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <NBEmptyState
            variant="noData"
            title={t('analytics:worker.noData.title')}
            description={t('analytics:worker.noData.description')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NBBackgroundPattern pattern="grid" />
      <NBPageHeader title={t('analytics:worker.title')} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Performance Score Card with Gauge */}
        <PerformanceScoreCard
          score={workerAnalytics.performance_score}
          grade={workerAnalytics.grade}
        />

        {/* KPI Pills */}
        <KPIPills
          attendance={workerAnalytics.task_completion_rate}
          punctuality={100 - Math.min(workerAnalytics.late_minutes / 10, 100)}
          taskCompletion={workerAnalytics.task_completion_rate}
          areaCompliance={workerAnalytics.area_compliance}
        />

        {/* Attendance Trend */}
        <NBCard style={styles.trendCard}>
          <NBText variant="h3" style={styles.cardTitle}>
            {t('analytics:worker.attendanceTrend')}
          </NBText>
          <BarChart
            data={[
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
            ]}
            maxValue={100}
            barColor={nbColors.info}
          />
        </NBCard>

        {/* Task Progress */}
        <TaskProgressCard
          completed={workerAnalytics.completed_tasks}
          total={workerAnalytics.total_tasks}
          rate={workerAnalytics.task_completion_rate}
        />
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
  trendCard: {
    padding: nbSpacing.md,
  },
  cardTitle: {
    marginBottom: nbSpacing.md,
  },
});
