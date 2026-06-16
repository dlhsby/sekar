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

const STATUS_FILTER_OPTIONS = [
  { key: 'all', label: 'Semua' },
  { key: 'processing', label: 'Sedang Diproses' },
  { key: 'completed', label: 'Selesai' },
  { key: 'failed', label: 'Gagal' },
];

const TYPE_FILTER_OPTIONS = [
  { key: 'all', label: 'Semua' },
  { key: 'daily_operations', label: 'Harian' },
  { key: 'weekly_performance', label: 'Mingguan' },
  { key: 'monthly_summary', label: 'Bulanan' },
  { key: 'worker_performance', label: 'Kinerja Petugas' },
  { key: 'area_status', label: 'Status Area' },
  { key: 'overtime_utilization', label: 'Lembur' },
];

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Reports'>;
};

export function ReportsScreen({ navigation }: Props): React.JSX.Element {
  const dispatch = useAppDispatch();

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
        body: 'Terjadi kesalahan saat memproses laporan.',
      });
      dispatch(clearError());
    }
  }, [error, dispatch]);

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
          title: 'Laporan sedang diproses',
          body: 'Laporan akan muncul di daftar ketika selesai.',
        });
      } catch {
        // Error is handled by the slice and redux state
      }
    },
    [dispatch],
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
      title="Belum Ada Laporan"
      description="Buat laporan baru untuk melihat daftarnya di sini"
      ctaLabel="Buat Laporan"
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
        <NBPageHeader title="Laporan" />

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
              Memuat laporan...
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
            title="Buat Laporan"
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
