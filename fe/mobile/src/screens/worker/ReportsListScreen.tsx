/**
 * Reports List Screen
 * Display worker's own submitted reports with sync status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkerTabScreenProps } from '../../types/navigation.types';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorderRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBButton } from '../../components/nb';
import { ReportListItem } from '../../components/worker/ReportListItem';
import { getMyReports } from '../../services/api/reportsApi';
import {
  getQueueByType,
  updateQueueItem,
  type QueueItem,
} from '../../services/sync/offlineQueue';
import { syncManager } from '../../services/sync/syncManager';
import type { MyReportsResponse } from '../../types/api.types';

const REPORTS_CACHE_KEY = 'cached_my_reports';

/**
 * Sync status type
 */
type SyncStatus = 'synced' | 'pending' | 'failed';

/**
 * Report with sync status
 */
interface ReportWithStatus {
  id: string; // Composite ID for list (synced-{uuid} or queue-{id})
  reportId?: string; // UUID for synced reports
  reportType: string;
  description?: string;
  createdAt: string;
  areaName?: string;
  photoUrl?: string;
  syncStatus: SyncStatus;
  queueId?: string;
  originalData?: any;
}

/**
 * Status filter options
 */
type StatusFilter = 'all' | 'synced' | 'pending' | 'failed';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Semua',
  synced: 'Terkirim',
  pending: 'Menunggu',
  failed: 'Gagal',
};

export function ReportsListScreen({
  navigation,
}: WorkerTabScreenProps<'Report'>): React.JSX.Element {
  const [reports, setReports] = useState<ReportWithStatus[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithStatus[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCacheWarning, setShowCacheWarning] = useState(false);

  /**
   * Load reports from API and offline queue
   * Caches synced reports for offline viewing
   */
  const loadReports = useCallback(async (showLoader = true): Promise<void> => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);
      setShowCacheWarning(false);

      let syncedReports: ReportWithStatus[] = [];

      try {
        // Fetch synced reports from API
        const apiResult = await getMyReports();

        // Check for API error
        if (apiResult.error) {
          throw new Error(apiResult.error);
        }

        syncedReports = apiResult.data
          ? apiResult.data.map((report: MyReportsResponse) => {
              console.log('[ReportsListScreen] Processing report from API:', {
                id: report.id,
                shift_id: report.shift_id,
                worker_id: report.worker_id,
                area_id: report.area_id,
              });
              return {
                id: `synced-${report.id}`, // Composite ID for list key
                reportId: report.id, // UUID for navigation
                reportType: 'task_completion', // Default, adjust based on your report type field
                description: report.notes,
                createdAt: report.created_at,
                areaName: report.area?.name,
                photoUrl: report.media_urls?.[0],
                syncStatus: 'synced' as SyncStatus,
                originalData: report,
              };
            })
          : [];

        // Cache synced reports for offline access
        await AsyncStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(syncedReports));
      } catch (apiError: any) {
        console.warn('[ReportsListScreen] API error, trying cache:', apiError.message);

        // Load from cache if API fails (offline)
        const cachedData = await AsyncStorage.getItem(REPORTS_CACHE_KEY);
        if (cachedData) {
          syncedReports = JSON.parse(cachedData);
          setShowCacheWarning(true);
        } else {
          throw apiError; // Re-throw if no cache available
        }
      }

      // Fetch queued reports (pending/failed)
      const queuedItems = await getQueueByType('report');
      const queuedReports: ReportWithStatus[] = queuedItems
        .filter(item => item.status === 'pending' || item.status === 'failed')
        .map((item: QueueItem) => ({
          id: `queue-${item.id}`,
          reportType: item.data.report_type || 'task_completion',
          description: item.data.notes,
          createdAt: new Date(item.timestamp).toISOString(),
          areaName: item.data.area_name,
          photoUrl: item.data.photo_uri,
          syncStatus: item.status === 'failed' ? 'failed' : 'pending',
          queueId: item.id,
          originalData: item,
        }));

      // Combine and sort by date (newest first)
      const allReports = [...syncedReports, ...queuedReports].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setReports(allReports);
    } catch (err: any) {
      console.error('[ReportsListScreen] Error loading reports:', err);
      setError(err.message || 'Gagal memuat laporan');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Load reports on initial mount
   */
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load reports on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      loadReports();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  /**
   * Apply status filter
   */
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(
        reports.filter(report => report.syncStatus === statusFilter)
      );
    }
  }, [reports, statusFilter]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    // Trigger sync first
    syncManager.forceSyncNow();
    // Wait a bit for sync to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Reload reports
    await loadReports(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle retry for failed reports
   */
  const handleRetry = useCallback(async (queueId: string): Promise<void> => {
    try {
      console.log('[ReportsListScreen] Retrying report:', queueId);
      // Reset queue item to pending
      await updateQueueItem(queueId, {
        status: 'pending',
        retryCount: 0,
        error: undefined,
      });
      // Trigger sync
      syncManager.forceSyncNow();
      // Reload reports after a short delay
      setTimeout(() => {
        loadReports(false);
      }, 1000);
    } catch (err: any) {
      console.error('[ReportsListScreen] Error retrying report:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Navigate to create new report
   */
  const handleCreateReport = useCallback((): void => {
    navigation.navigate('Report');
  }, [navigation]);

  /**
   * Navigate to report detail
   */
  const handleReportPress = useCallback((reportId: string): void => {
    console.log('[ReportsListScreen] Navigating to report detail with UUID:', reportId);
    // Validate that reportId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      console.error('[ReportsListScreen] Invalid report ID format. Expected UUID, got:', reportId);
      console.error('[ReportsListScreen] This may indicate old test data or a data migration issue.');
      setError('Format ID laporan tidak valid. Silakan hubungi administrator.');
      return;
    }
    navigation.navigate('ReportDetail', { reportId, isWorkerView: true });
  }, [navigation]);

  /**
   * Render status filter button
   */
  const renderFilterButton = (filter: StatusFilter): React.JSX.Element => {
    const isActive = statusFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setStatusFilter(filter)}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}>
          {STATUS_FILTER_LABELS[filter]}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render report item
   */
  const renderItem = useCallback(
    ({ item }: { item: ReportWithStatus }) => (
      <ReportListItem
        id={item.id}
        reportId={item.reportId}
        reportType={item.reportType}
        description={item.description}
        areaName={item.areaName}
        createdAt={item.createdAt}
        syncStatus={item.syncStatus}
        photoUrl={item.photoUrl}
        queueId={item.queueId}
        onRetry={handleRetry}
        onPress={item.syncStatus === 'synced' ? handleReportPress : undefined}
      />
    ),
    [handleRetry, handleReportPress]
  );

  /**
   * Render empty state
   */
  const renderEmptyState = (): React.JSX.Element => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat laporan...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <NBButton
            title="Coba Lagi"
            onPress={() => loadReports()}
            variant="danger"
          />
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>Belum Ada Laporan</Text>
        <Text style={styles.emptyDescription}>
          {statusFilter === 'all'
            ? 'Anda belum membuat laporan hari ini.\nGunakan tombol di bawah untuk membuat laporan.'
            : `Tidak ada laporan dengan status "${STATUS_FILTER_LABELS[statusFilter]}"`}
        </Text>
      </View>
    );
  };

  /**
   * Render list header with filters
   */
  const renderListHeader = (): React.JSX.Element => (
    <View style={styles.header}>
      <Text style={styles.title}>Laporan Saya</Text>
      {showCacheWarning && (
        <View style={styles.cacheWarning}>
          <Text style={styles.cacheWarningText}>
            ⚠️ Mode offline - Menampilkan data tersimpan
          </Text>
        </View>
      )}
      <View style={styles.filterContainer}>
        {(['all', 'synced', 'pending', 'failed'] as StatusFilter[]).map(
          renderFilterButton
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        testID="reports-list"
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[nbColors.primary]}
            tintColor={nbColors.primary}
          />
        }
      />
      {/* Fixed bottom button - always visible */}
      <View style={styles.bottomButtonContainer}>
        <NBButton
          title="+ Buat Laporan Baru"
          onPress={handleCreateReport}
          variant="primary"
          fullWidth
          accessibilityLabel="Buat Laporan Baru"
          accessibilityHint="Membuat laporan kerja baru"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.gray[100],
  },
  listContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.lg, // Reduced since we have fixed button at bottom
    flexGrow: 1,
  },
  header: {
    marginBottom: nbSpacing.md,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray[700],
    marginBottom: nbSpacing.md,
  },
  cacheWarning: {
    backgroundColor: nbColors.warningLight + '20',
    borderLeftWidth: nbBorders.default,
    borderLeftColor: nbColors.black,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: 0,
  },
  cacheWarningText: {
    color: nbColors.warning,
    fontSize: nbTypography.fontSize.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbBorderRadius.full,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
  },
  filterButtonActive: {
    backgroundColor: nbColors.primary,
    borderColor: nbColors.black,
  },
  filterButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  filterButtonTextActive: {
    color: nbColors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: nbSpacing['3xl'],
    paddingHorizontal: nbSpacing.xl,
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: nbSpacing.md,
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.danger,
    textAlign: 'center',
    marginBottom: nbSpacing.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: nbSpacing.md,
  },
  emptyTitle: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray[700],
    marginBottom: nbSpacing.sm,
  },
  emptyDescription: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
    textAlign: 'center',
    marginBottom: nbSpacing.lg,
  },
  bottomButtonContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    backgroundColor: nbColors.gray[100],
    borderTopWidth: nbBorders.default,
    borderTopColor: nbColors.black,
  },
  fixedCreateButton: {
    // Removed - let NBButton use its own NB styles
  },
  createButton: {
    // Removed - let NBButton use its own NB styles
  },
  createButtonText: {
    // Removed - let NBButton use its own NB styles
  },
  retryButton: {
    // Removed - let NBButton use its own NB styles
  },
  retryButtonText: {
    // Removed - let NBButton use its own NB styles
  },
});
