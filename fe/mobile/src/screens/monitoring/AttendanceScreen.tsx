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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { NBCard, NBButton, NBBackgroundPattern } from '../../components/nb';
import { getAttendance } from '../../services/api/monitoringApi';
import { formatDate } from '../../utils/dateUtils';
import AttendanceCard from '../../components/monitoring/AttendanceCard';

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
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kehadiran</Text>
        </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <NBButton
          title="◀"
          onPress={goToPreviousDay}
          variant="secondary"
          size="sm"
          style={styles.dateNavButton}
          testID="date-nav-prev"
        />

        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDateIndonesian(selectedDate)}</Text>
        </View>

        <NBButton
          title="▶"
          onPress={goToNextDay}
          variant="secondary"
          size="sm"
          disabled={isTodaySelected}
          style={styles.dateNavButton}
          testID="date-nav-next"
        />
      </View>

      {/* Summary Cards */}
      {attendanceData && (
        <View style={styles.summaryContainer}>
          <NBCard variant="elevated" style={[styles.summaryCard, styles.summaryCardPresent]}>
            <Text style={styles.summaryCount}>{attendanceData.clocked_in_count}</Text>
            <Text style={styles.summaryLabel}>Hadir</Text>
          </NBCard>
          <NBCard variant="elevated" style={[styles.summaryCard, styles.summaryCardAbsent]}>
            <Text style={styles.summaryCount}>{attendanceData.not_clocked_in.length}</Text>
            <Text style={styles.summaryLabel}>Tidak Hadir</Text>
          </NBCard>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
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
              colors={[nbColors.primary]}
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
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  headerTitle: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  dateNavButton: {
    width: 44,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: nbSpacing.md,
  },
  dateText: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: nbSpacing.md,
    gap: nbSpacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  summaryCardPresent: {
    backgroundColor: nbColors.successLight,
  },
  summaryCardAbsent: {
    backgroundColor: nbColors.dangerLight,
  },
  summaryCount: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
    marginBottom: nbSpacing.xs,
  },
  summaryLabel: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: nbSpacing.xl,
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
  },
  listContent: {
    padding: nbSpacing.md,
  },
  sectionHeader: {
    backgroundColor: nbColors.gray['200'],
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderRadius: nbBorderRadius.sm,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  sectionHeaderText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['600'],
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: nbSpacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
    textAlign: 'center',
  },
  noteContainer: {
    backgroundColor: nbColors.gray['50'],
    padding: nbSpacing.md,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    borderLeftWidth: nbBorders.thick,
    borderLeftColor: nbColors.primary,
  },
  noteText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    lineHeight: nbTypography.fontSize.sm * 1.5,
  },
});
