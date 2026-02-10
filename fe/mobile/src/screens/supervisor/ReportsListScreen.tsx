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
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorderRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import { formatDate } from '../../utils/dateUtils';
import { getReports } from '../../services/api/supervisorApi';
import ReportCard, { type ReportCardData } from '../../components/supervisor/ReportCard';
import { NBAlert } from '../../components/nb';
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
        <NBButton
          title={`${selectedFilterLabel} ▼`}
          onPress={() => setShowFilterModal(true)}
          variant="secondary"
          size="sm"
          style={styles.filterButton}
          testID="filter-button"
        />

        {/* Date filter */}
        {!filters.date ? (
          <NBButton
            title="📅 Hari Ini"
            onPress={handleDateFilter}
            variant="secondary"
            size="sm"
            style={styles.dateButton}
            testID="date-filter-button"
          />
        ) : (
          <NBButton
            title={`${filters.date} ✕`}
            onPress={clearDateFilter}
            variant="primary"
            size="sm"
            style={[styles.dateButton, styles.dateButtonActive]}
            testID="clear-date-button"
          />
        )}
      </View>
    );
  };

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        {error && (
          <NBAlert
            variant="danger"
            title="Gagal Memuat Laporan"
            message={error}
            actionLabel="Coba Lagi"
            onAction={loadReports}
            testID="reports-list-error"
          />
        )}

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
            colors={[nbColors.primary]}
            tintColor={nbColors.primary}
          />
        }
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={
          loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={nbColors.primary} />
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
          <NBCard style={styles.modalContent} testID="filter-modal-card">
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
            <NBButton
              title="Tutup"
              onPress={() => setShowFilterModal(false)}
              variant="primary"
              fullWidth
              style={styles.modalCloseButton}
              testID="close-modal-button"
            />
          </NBCard>
        </TouchableOpacity>
      </Modal>
    </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterBar: {
    flexDirection: 'row',
    padding: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: nbColors.gray['100'],
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbBorderRadius.none,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    marginRight: nbSpacing.sm,
  },
  filterButtonText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  filterButtonIcon: {
    fontSize: 12,
    color: nbColors.gray['500'],
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.gray['100'],
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbBorderRadius.none,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  dateButtonActive: {
    backgroundColor: nbColors.primary,
    borderColor: nbColors.black,
  },
  dateButtonText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  clearIcon: {
    marginLeft: nbSpacing.xs,
    fontSize: 16,
    color: nbColors.white,
  },
  listContent: {
    paddingVertical: nbSpacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: nbSpacing['3xl'],
  },
  emptyText: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['500'],
    marginBottom: nbSpacing.xs,
  },
  emptySubtext: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['400'],
  },
  loaderContainer: {
    paddingVertical: nbSpacing.lg,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: nbBorderRadius.none,
    borderTopRightRadius: nbBorderRadius.none,
    borderTopWidth: nbBorders.thick,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    paddingTop: nbSpacing.lg,
    paddingBottom: Platform.OS === 'ios' ? nbSpacing.xl : nbSpacing.lg,
    paddingHorizontal: nbSpacing.md,
  },
  modalTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbBorderRadius.none,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.gray['200'],
    marginBottom: nbSpacing.xs,
    backgroundColor: nbColors.white,
  },
  modalOptionSelected: {
    backgroundColor: nbColors.gray['50'],
    borderColor: nbColors.primary,
    borderWidth: nbBorders.base,
  },
  modalOptionText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['700'],
  },
  modalOptionTextSelected: {
    color: nbColors.primary,
    fontWeight: nbTypography.fontWeight.bold,
  },
  checkmark: {
    fontSize: 20,
    color: nbColors.primary,
    fontWeight: nbTypography.fontWeight.bold,
  },
  modalCloseButton: {
    marginTop: nbSpacing.md,
    backgroundColor: nbColors.gray['200'],
    paddingVertical: nbSpacing.md,
    borderRadius: nbBorderRadius.none,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
    ...nbShadows.sm,
  },
  modalCloseButtonText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
  },
});

export default ReportsListScreen;
