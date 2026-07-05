/**
 * Reports List Screen
 * Phase 5-1: View and generate reports
 * Audience: korlap+
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  NBBackgroundPattern,
  NBButton,
  NBEmptyState,
  NBPageHeader,
  NBText,
  NBFabBar,
  NB_FAB_BAR_HEIGHT,
  NBToast,
} from '../../components/nb';
import { ReportCard, GenerateReportSheet } from './components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchReports,
  fetchTemplates,
  generateNewReport,
  selectReports,
  selectReportsLoading,
  selectReportsRefreshing,
  selectReportsSubmitting,
  selectReportsError,
  selectReportsHasMore,
  selectTemplates,
  clearError,
} from '../../store/slices/reportsSlice';
import {
  nbColors,
  nbSpacing,
} from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { GeneratedReportStatus, ReportType, ReportFormat } from '../../types/reports.types';

const REPORTS_PAGE_LIMIT = 10;

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Reports'>;
};

export function ReportsScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const STATUS_FILTER_OPTIONS = useMemo(
    () => [
      { key: 'all', label: t('reports:filters.status.all') },
      { key: 'processing', label: t('reports:filters.status.processing') },
      { key: 'completed', label: t('reports:filters.status.completed') },
      { key: 'failed', label: t('reports:filters.status.failed') },
    ],
    [t]
  );

  const TYPE_FILTER_OPTIONS = useMemo(
    () => [
      { key: 'all', label: t('reports:filters.type.all') },
      { key: 'daily_operations', label: t('reports:filters.type.daily') },
      { key: 'weekly_performance', label: t('reports:filters.type.weekly') },
      { key: 'monthly_summary', label: t('reports:filters.type.monthly') },
      { key: 'worker_performance', label: t('reports:filters.type.workerPerformance') },
      { key: 'area_status', label: t('reports:filters.type.areaStatus') },
      { key: 'overtime_utilization', label: t('reports:filters.type.overtime') },
    ],
    [t]
  );

  const reports = useAppSelector(selectReports);
  const templates = useAppSelector(selectTemplates);
  const isLoading = useAppSelector(selectReportsLoading);
  const isRefreshing = useAppSelector(selectReportsRefreshing);
  const isSubmitting = useAppSelector(selectReportsSubmitting);
  const error = useAppSelector(selectReportsError);
  const hasMore = useAppSelector(selectReportsHasMore);

  // Local state
  const [statusFilter, setStatusFilter] = useState<GeneratedReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [isGenerateSheetVisible, setIsGenerateSheetVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const isFetching = useRef(false);

  // Filter reports based on selected filters
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.report_type !== typeFilter) return false;
      return true;
    });
  }, [reports, statusFilter, typeFilter]);

  // Fetch templates on mount
  useFocusEffect(
    useCallback(() => {
      if (templates.length === 0) {
        void dispatch(fetchTemplates());
      }
      // Fetch initial reports
      void dispatch(fetchReports({ page: 1, limit: REPORTS_PAGE_LIMIT, reset: true }));
    }, [dispatch, templates.length]),
  );

  // Show error toast
  React.useEffect(() => {
    if (error) {
      NBToast.show({
        level: 'danger',
        title: error,
        body: t('reports:toast.processing'),
      });
      dispatch(clearError());
    }
  }, [error, dispatch, t]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    void dispatch(fetchReports({ page: 1, limit: REPORTS_PAGE_LIMIT, reset: true }));
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (isFetching.current || isRefreshing || !hasMore) return;

    isFetching.current = true;
    const nextPage = currentPage + 1;

    void dispatch(fetchReports({
      page: nextPage,
      limit: REPORTS_PAGE_LIMIT,
      reset: false,
    })).finally(() => {
      isFetching.current = false;
      setCurrentPage(nextPage);
    });
  }, [dispatch, currentPage, isRefreshing, hasMore]);

  const handleGenerateReport = useCallback(
    async (data: { reportType: ReportType; format: string }) => {
      try {
        await dispatch(generateNewReport({
          report_type: data.reportType,
          format: data.format as ReportFormat,
        })).unwrap();

        setIsGenerateSheetVisible(false);
        NBToast.show({
          level: 'success',
          title: t('reports:toast.generating.title'),
          body: t('reports:toast.generating.description'),
        });
      } catch {
        // Error is handled by the slice and redux state
      }
    },
    [dispatch, t],
  );

  const handleReportPress = useCallback(
    (reportId: string) => {
      navigation.navigate('ReportDetail', { reportId });
    },
    [navigation],
  );

  const renderEmptyState = () => (
    <NBEmptyState
      variant="empty"
      title={t('reports:emptyState.title')}
      description={t('reports:emptyState.description')}
      ctaLabel={t('reports:emptyState.cta')}
      onCTA={() => setIsGenerateSheetVisible(true)}
    />
  );

  const renderItem = ({ item }: { item: any }) => (
    <ReportCard
      report={item}
      onPress={() => handleReportPress(item.id)}
    />
  );

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NBPageHeader title={t('reports:pageTitle')} />

        {/* Status Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setStatusFilter(opt.key as any)}
              style={[
                styles.filterChip,
                statusFilter === opt.key && styles.filterChipActive,
              ]}
            >
              <NBText
                variant="caption"
                color={statusFilter === opt.key ? 'white' : 'gray700'}
              >
                {opt.label}
              </NBText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setTypeFilter(opt.key as any)}
              style={[
                styles.filterChip,
                typeFilter === opt.key && styles.filterChipActive,
              ]}
            >
              <NBText
                variant="caption"
                color={typeFilter === opt.key ? 'white' : 'gray700'}
              >
                {opt.label}
              </NBText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reports List */}
        {isLoading && reports.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              {t('reports:loading')}
            </NBText>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            {renderEmptyState()}
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[nbColors.primary]}
                tintColor={nbColors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              hasMore && filteredReports.length > 0 ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={nbColors.primary} />
                </View>
              ) : null
            }
          />
        )}

        {/* FAB Bar */}
        <NBFabBar>
          <NBButton
            title={t('reports:createButton')}
            variant="primary"
            size="lg"
            onPress={() => setIsGenerateSheetVisible(true)}
            leftIcon="plus"
          />
        </NBFabBar>
      </SafeAreaView>

      {/* Generate Report Sheet */}
      <GenerateReportSheet
        visible={isGenerateSheetVisible}
        onClose={() => setIsGenerateSheetVisible(false)}
        onSubmit={handleGenerateReport}
        isSubmitting={isSubmitting}
        templates={templates}
      />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.sm,
  },
  filterContent: {
    gap: nbSpacing.sm,
  },
  filterChip: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderRadius: 20,
    backgroundColor: nbColors.gray100,
    marginRight: nbSpacing.sm,
  },
  filterChipActive: {
    backgroundColor: nbColors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: nbSpacing.lg,
  },
  listContent: {
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.lg,
    paddingBottom: NB_FAB_BAR_HEIGHT + nbSpacing.lg,
  },
  footerLoader: {
    paddingVertical: nbSpacing.lg,
    alignItems: 'center',
  },
});
