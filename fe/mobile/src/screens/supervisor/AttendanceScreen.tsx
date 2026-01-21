/**
 * AttendanceScreen
 * Shows daily attendance status for all workers
 * Displays clocked-in and not-clocked-in workers with navigation by date
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { getAttendance } from '../../services/api/supervisorApi';
import { formatDate } from '../../utils/dateUtils';
import AttendanceCard from '../../components/supervisor/AttendanceCard';

const INDONESIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

interface NotClockedInWorker {
  id: string;
  username: string;
  full_name: string;
  area?: {
    id: string;
    name: string;
  } | null;
}

interface AttendanceData {
  date: string;
  total_workers: number;
  clocked_in_count: number;
  not_clocked_in: NotClockedInWorker[];
}

interface SectionData {
  title: string;
  data: any[];
}

/**
 * Format date to Indonesian format: "09 Jan 2026"
 */
function formatDateIndonesian(date: Date): string {
  const day = date.getDate();
  const month = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${String(day).padStart(2, '0')} ${month} ${year}`;
}

/**
 * Check if date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function AttendanceScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch attendance data for selected date
   */
  const fetchAttendance = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const dateStr = formatDate(selectedDate);
      const response = await getAttendance({ date: dateStr });

      if (response.data) {
        setAttendanceData(response.data);
      } else {
        throw new Error(response.error || 'Gagal memuat data kehadiran');
      }
    } catch (error: any) {
      Alert.alert(
        'Gagal Memuat Data',
        error.message || 'Terjadi kesalahan saat memuat data kehadiran',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  /**
   * Initial load and reload when date changes
   */
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  /**
   * Pull to refresh handler
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance(false);
  }, [fetchAttendance]);

  /**
   * Navigate to previous day
   */
  const goToPreviousDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  /**
   * Navigate to next day
   */
  const goToNextDay = useCallback(() => {
    if (isToday(selectedDate)) {
      return; // Cannot go to future
    }
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  /**
   * Prepare sections for SectionList
   */
  const getSections = (): SectionData[] => {
    if (!attendanceData) {
      return [];
    }

    const sections: SectionData[] = [];

    // Note: Backend currently only returns not_clocked_in workers
    // clocked_in workers need to be fetched from active-workers endpoint
    // For MVP, we show only the count for clocked in workers
    // and list not clocked in workers

    // We can't show individual clocked-in workers without the data
    // So we'll only show the not_clocked_in section
    if (attendanceData.not_clocked_in.length > 0) {
      sections.push({
        title: `BELUM MASUK (${attendanceData.not_clocked_in.length})`,
        data: attendanceData.not_clocked_in,
      });
    }

    return sections;
  };

  /**
   * Render section header
   */
  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  /**
   * Render attendance card
   */
  const renderItem = ({ item }: { item: NotClockedInWorker }) => (
    <AttendanceCard
      workerName={item.full_name}
      status="not_clocked_in"
      areaName={item.area?.name}
    />
  );

  /**
   * Render empty state for section
   */
  const renderSectionEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>Semua pekerja sudah masuk</Text>
    </View>
  );

  const sections = getSections();
  const isTodaySelected = isToday(selectedDate);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kehadiran</Text>
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={goToPreviousDay}
          activeOpacity={0.7}>
          <Text style={styles.dateNavButtonText}>◀</Text>
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDateIndonesian(selectedDate)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.dateNavButton, isTodaySelected && styles.dateNavButtonDisabled]}
          onPress={goToNextDay}
          activeOpacity={0.7}
          disabled={isTodaySelected}>
          <Text
            style={[
              styles.dateNavButtonText,
              isTodaySelected && styles.dateNavButtonTextDisabled,
            ]}>
            ▶
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {attendanceData && (
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.summaryCardPresent]}>
            <Text style={styles.summaryCount}>{attendanceData.clocked_in_count}</Text>
            <Text style={styles.summaryLabel}>Hadir</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardAbsent]}>
            <Text style={styles.summaryCount}>{attendanceData.not_clocked_in.length}</Text>
            <Text style={styles.summaryLabel}>Tidak Hadir</Text>
          </View>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data kehadiran...</Text>
        </View>
      )}

      {/* Attendance List */}
      {!loading && attendanceData && (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderSectionEmpty}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Note about clocked-in workers */}
      {!loading && attendanceData && attendanceData.clocked_in_count > 0 && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            💡 {attendanceData.clocked_in_count} pekerja sudah masuk. Lihat lokasi mereka di peta dashboard.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateNavButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  dateNavButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  dateNavButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  dateNavButtonTextDisabled: {
    color: colors.textDisabled,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  summaryCardPresent: {
    backgroundColor: '#4CAF50', // Green
  },
  summaryCardAbsent: {
    backgroundColor: '#F44336', // Red
  },
  summaryCount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
  },
  sectionHeader: {
    backgroundColor: colors.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noteContainer: {
    backgroundColor: '#E3F2FD', // Light blue
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.sm * 1.5,
  },
});
