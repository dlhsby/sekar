/**
 * AttendanceScreen
 * Shows daily attendance status for all workers
 * Displays clocked-in and not-clocked-in workers with navigation by date
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { NBButton, NBBackgroundPattern, NBText } from '../../components/nb';
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
      <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionHeaderText}>{section.title}</NBText>
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
      <NBText variant="body" color="gray600" align="center" style={styles.emptyStateText}>Semua pekerja sudah masuk</NBText>
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <NBText variant="h1" style={styles.headerTitle}>Kehadiran</NBText>
        </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <NBButton
          leftIcon="chevron-left"
          title=""
          onPress={goToPreviousDay}
          variant="secondary"
          size="sm"
          style={styles.dateNavButton}
          testID="date-nav-prev"
        />

        <View style={styles.dateDisplay}>
          <NBText variant="h3" style={styles.dateText}>{formatDateIndonesian(selectedDate)}</NBText>
        </View>

        <NBButton
          leftIcon="chevron-right"
          title=""
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
          <View style={[styles.summaryCard, styles.summaryCardPresent]}>
            <NBText variant="display" color="white" align="center" style={styles.summaryCount}>{attendanceData.clocked_in_count}</NBText>
            <NBText variant="body" color="white" align="center" style={styles.summaryLabel}>Hadir</NBText>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardAbsent]}>
            <NBText variant="display" color="white" align="center" style={styles.summaryCount}>{attendanceData.not_clocked_in.length}</NBText>
            <NBText variant="body" color="white" align="center" style={styles.summaryLabel}>Tidak Hadir</NBText>
          </View>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600" style={styles.loadingText}>Memuat data kehadiran...</NBText>
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
          <View style={styles.noteContent}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={nbColors.primary}
              style={{ marginTop: 2 }}
            />
            <NBText variant="body-sm" color="gray600" style={{ flex: 1 }}>
              {attendanceData.clocked_in_count} pekerja sudah masuk. Lihat lokasi mereka di peta dashboard.
            </NBText>
          </View>
        </View>
      )}
      </View>
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
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.black,
  },
  headerTitle: {
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.widthBase,
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
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: nbSpacing.md,
    gap: nbSpacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: nbSpacing.md,
    borderRadius: nbRadius.base,
    alignItems: 'center',
    borderWidth: nbBorders.widthBase,
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
    marginBottom: nbSpacing.xs,
  },
  summaryLabel: {
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: nbSpacing.xl,
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  listContent: {
    padding: nbSpacing.md,
  },
  sectionHeader: {
    backgroundColor: nbColors.gray200,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  sectionHeaderText: {
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: nbSpacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
  },
  noteContainer: {
    backgroundColor: nbColors.gray50,
    padding: nbSpacing.md,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderLeftWidth: nbBorders.widthThick,
    borderLeftColor: nbColors.primary,
  },
  noteContent: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    alignItems: 'flex-start',
  },
});
