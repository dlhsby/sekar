/**
 * Reports List Screen
 * Shows list of work reports with filtering
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { formatDate } from '../../utils/dateUtils';
import { getReports } from '../../services/api/supervisorApi';
import ReportCard, { type ReportCardData } from '../../components/supervisor/ReportCard';
import ErrorBanner from '../../components/common/ErrorBanner';
import type { ReportsFilter } from '../../types/api.types';
import type { SupervisorTabScreenProps } from '../../types/navigation.types';

// Report type filter options
const REPORT_TYPE_OPTIONS = [
  { value: '', label: 'Semua Jenis' },
  { value: 'task_completion', label: 'Penyelesaian Tugas' },
  { value: 'incident', label: 'Insiden' },
  { value: 'maintenance_request', label: 'Permintaan Pemeliharaan' },
];

/**
 * Reports List Screen
 * List of reports with filtering and pagination
 */
function ReportsListScreen({
  navigation,
}: SupervisorTabScreenProps<'ReportsList'>): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportCardData[]>([]);
  const [filters, setFilters] = useState<ReportsFilter>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('');

  useEffect(() => {
    loadReports();
  }, [filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build filter params
      const params: ReportsFilter = {};
      if (filters.date) {
        params.date = filters.date;
      }
      if (filters.worker_id) {
        params.worker_id = filters.worker_id;
      }
      if (filters.area_id) {
        params.area_id = filters.area_id;
      }

      const response = await getReports(params);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        // Response is now paginated: { data: [], meta: {} }
        const reportsData = response.data.data || [];
        // Transform API response to ReportCardData format
        const transformedReports: ReportCardData[] = reportsData.map((report: any) => ({
          id: report.id,
          worker_name: report.worker?.full_name || 'Nama tidak tersedia',
          area_name: report.area?.name || 'Area tidak tersedia',
          report_type: report.report_type as 'task_completion' | 'incident' | 'maintenance_request',
          created_at: report.created_at,
          thumbnail_url: report.photo_url,
          reviewed: report.is_reviewed || false,
        }));

        // Apply client-side report type filter
        if (selectedFilter) {
          setReports(
            transformedReports.filter((r) => r.report_type === selectedFilter),
          );
        } else {
          setReports(transformedReports);
        }
      }
    } catch (err) {
      setError('Gagal memuat laporan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [filters, selectedFilter]);

  const handleReportPress = (reportId: number) => {
    // Navigate to detail screen
    (navigation as any).navigate('ReportDetail', { reportId });
  };

  const handleFilterSelect = (value: string) => {
    setSelectedFilter(value);
    setShowFilterModal(false);
  };

  const handleDateFilter = () => {
    // TODO: Implement date range picker
    // For now, filter by today
    const today = formatDate(new Date());
    setFilters({ ...filters, date: today });
  };

  const clearDateFilter = () => {
    const newFilters = { ...filters };
    delete newFilters.date;
    setFilters(newFilters);
  };

  // Trigger reload when filter changes
  useEffect(() => {
    if (!loading) {
      loadReports();
    }
  }, [selectedFilter]);

  const renderReportCard = ({ item }: { item: ReportCardData }) => (
    <ReportCard
      report={item}
      onPress={() => handleReportPress(item.id)}
      testID={`report-card-${item.id}`}
    />
  );

  const renderListEmpty = () => {
    if (loading) {return null;}

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Belum ada laporan</Text>
        <Text style={styles.emptySubtext}>
          Laporan dari pekerja akan muncul di sini
        </Text>
      </View>
    );
  };

  const renderHeader = () => {
    const selectedFilterLabel =
      REPORT_TYPE_OPTIONS.find((opt) => opt.value === selectedFilter)?.label ||
      'Semua Jenis';

    return (
      <View style={styles.filterBar}>
        {/* Filter by type */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          testID="filter-button">
          <Text style={styles.filterButtonText}>{selectedFilterLabel}</Text>
          <Text style={styles.filterButtonIcon}>▼</Text>
        </TouchableOpacity>

        {/* Date filter */}
        {!filters.date ? (
          <TouchableOpacity
            style={styles.dateButton}
            onPress={handleDateFilter}
            testID="date-filter-button">
            <Text style={styles.dateButtonText}>📅 Hari Ini</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.dateButton, styles.dateButtonActive]}
            onPress={clearDateFilter}
            testID="clear-date-button">
            <Text style={styles.dateButtonText}>{filters.date}</Text>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {error && <ErrorBanner message={error} onRetry={loadReports} />}

      {renderHeader()}

      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={
          loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        testID="reports-list"
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
        testID="filter-modal">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Jenis Laporan</Text>
            {REPORT_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  selectedFilter === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => handleFilterSelect(option.value)}
                testID={`filter-option-${option.value || 'all'}`}>
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedFilter === option.value &&
                      styles.modalOptionTextSelected,
                  ]}>
                  {option.label}
                </Text>
                {selectedFilter === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFilterModal(false)}
              testID="close-modal-button">
              <Text style={styles.modalCloseButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  filterBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  dateButtonActive: {
    backgroundColor: colors.primary,
  },
  dateButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  clearIcon: {
    marginLeft: spacing.xs,
    fontSize: 16,
    color: colors.white,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textHint,
  },
  loaderContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    paddingHorizontal: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  modalOptionText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  checkmark: {
    fontSize: 20,
    color: colors.primary,
  },
  modalCloseButton: {
    marginTop: spacing.md,
    backgroundColor: colors.gray200,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default ReportsListScreen;
