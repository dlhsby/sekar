import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  AccessibilityInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, SyncStatusIndicator, LoadingSpinner, ErrorBanner } from '../../components/common';
import { theme } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { shiftsApi, reportsApi } from '../../services/api';
import { setCurrentShift, setError } from '../../store/slices/shiftSlice';
import { setReports } from '../../store/slices/reportSlice';
import { formatTime, formatDateTime, calculateDuration, isToday } from '../../utils/dateUtils';
import { useLocationPermission } from '../../hooks';

/**
 * Worker Home Screen - Main dashboard for workers
 * Shows current shift status, summary stats, and quick actions
 */
export function WorkerHomeScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { user, assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
  const { reports } = useAppSelector((state) => state.report);
  const { isOnline, isSyncing, pendingShiftsCount, pendingReportsCount } = useAppSelector(
    (state) => state.offline
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timer, setTimer] = useState('00:00:00');

  // Issue 8: Track last announced minute for accessibility (announce every 5 minutes)
  const lastAnnouncedMinuteRef = useRef<number>(-1);

  // Monitor location permission and GPS status during active shift
  const {
    isLocationAvailable,
    permissionGranted,
    gpsEnabled,
    showPermissionAlert,
    showGpsAlert,
    refresh: refreshLocationStatus,
  } = useLocationPermission({
    // Only monitor when there's an active shift
    enableMonitoring: !!currentShift,
    showAlerts: true,
    onPermissionLost: () => {
      console.log('[WorkerHomeScreen] Location permission was revoked');
    },
    onGpsDisabled: () => {
      console.log('[WorkerHomeScreen] GPS was disabled');
    },
  });

  // Calculate today's reports count from Redux state
  const todayReportsCount = useMemo(() => {
    return reports.filter((report) => isToday(report.created_at)).length;
  }, [reports]);

  // Load current shift and reports on mount
  useEffect(() => {
    loadCurrentShift();
    loadTodayReports();
  }, []);

  // Update timer every second for real-time display
  // Issue 5: Using currentShift?.id as dependency - stable unique identifier for the shift
  useEffect(() => {
    if (!currentShift) {
      setTimer('00:00:00');
      lastAnnouncedMinuteRef.current = -1;
      return;
    }

    // Update immediately
    const updateTimer = () => {
      const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setTimer(
        `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      );

      // Issue 8: Announce every 5 minutes for screen reader users
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes > 0 && totalMinutes % 5 === 0 && totalMinutes !== lastAnnouncedMinuteRef.current) {
        lastAnnouncedMinuteRef.current = totalMinutes;
        AccessibilityInfo.announceForAccessibility(
          `Waktu shift: ${hours} jam ${minutes} menit`
        );
      }
    };

    updateTimer(); // Initial update

    // Update every 1 second for real-time timer display
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentShift?.id]);

  const pad = (num: number): string => String(num).padStart(2, '0');

  const loadCurrentShift = async () => {
    try {
      setLoading(true);
      const response = await shiftsApi.getCurrentShift();

      // Check if API returned an error
      if (response.error) {
        // API error - log warning but DON'T clear cached shift state
        // This preserves the shift data on network errors during refresh
        console.warn('[WorkerHomeScreen] Failed to load shift:', response.error);
        dispatch(setError(response.error));
        return; // Keep existing shift state
      }

      // Success - update with server data (could be null if no active shift)
      dispatch(setCurrentShift(response.data ?? null));
    } catch (error: any) {
      // Unexpected error (should rarely happen as API client catches most errors)
      // Don't clear shift state on network errors to preserve offline experience
      console.warn('[WorkerHomeScreen] Unexpected error loading shift:', error.message);
      dispatch(setError(error.message || 'Failed to load shift'));
    } finally {
      setLoading(false);
    }
  };

  const loadTodayReports = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const response = await reportsApi.getMyReports(today);
      if (response.data) {
        // Convert MyReportsResponse[] to WorkReport[] format
        const workReports = response.data.map((report) => ({
          id: report.id,
          shift_id: report.shift_id,
          report_type: report.report_type,
          description: report.description,
          photo_urls: report.photo_urls,
          video_url: report.video_url,
          gps_lat: report.gps_lat,
          gps_lng: report.gps_lng,
          created_at: report.created_at,
          updated_at: report.updated_at || report.created_at,
        }));
        dispatch(setReports(workReports));
      }
    } catch (error: any) {
      // Silent fail for reports - not critical
      console.warn('Failed to load reports:', error.message);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCurrentShift(), loadTodayReports()]);
    setRefreshing(false);
  }, []);

  const handleClockInOut = () => {
    navigation.navigate('ClockInOut' as never);
  };

  const handleNewReport = () => {
    navigation.navigate('Report' as never);
  };

  // Derived state - must be before any early returns to satisfy React's rules of hooks
  const pendingCount = pendingShiftsCount + pendingReportsCount;

  // Memoize duration calculation - updates when timer's HH:MM changes (once per minute)
  // This avoids recalculating on every second tick while still staying accurate
  const timerMinutes = timer.slice(0, 5); // Extract HH:MM from HH:MM:SS
  const shiftDuration = useMemo(() => {
    if (!currentShift) return '0h';
    return calculateDuration(
      new Date(currentShift.clock_in_time),
      new Date()
    ).formatted;
  }, [currentShift?.clock_in_time, timerMinutes]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {user?.full_name}! 👋</Text>
          <Text style={styles.role}>Pekerja</Text>
        </View>
        <SyncStatusIndicator
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        {/* Location Warning Banner - show when GPS/permission unavailable during active shift */}
        {currentShift && !isLocationAvailable && (
          <ErrorBanner
            message={
              !permissionGranted
                ? 'Izin lokasi dicabut. Pelacakan lokasi tidak aktif.'
                : !gpsEnabled
                  ? 'GPS tidak aktif. Pelacakan lokasi tidak aktif.'
                  : 'Lokasi tidak tersedia. Periksa pengaturan GPS.'
            }
            variant="warning"
            actionText="Perbaiki"
            onAction={() => {
              if (!permissionGranted) {
                showPermissionAlert();
              } else if (!gpsEnabled) {
                showGpsAlert();
              } else {
                refreshLocationStatus();
              }
            }}
            style={styles.locationWarning}
          />
        )}

        {/* Current Shift Card */}
        {currentShift ? (
          <Card style={styles.shiftCard}>
            <Text style={styles.cardTitle}>Shift Aktif</Text>
            {/* Issue 8: Removed accessibilityLiveRegion to prevent constant announcements */}
            {/* Announcements are now made every 5 minutes via AccessibilityInfo */}
            <Text
              style={styles.timer}
              accessibilityLabel={`Waktu shift berjalan: ${timer}`}
            >
              {timer}
            </Text>
            <View style={styles.shiftInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Area:</Text>
                <Text style={styles.infoValue}>
                  {currentShift.area?.name || 'Tidak diketahui'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Clock In:</Text>
                <Text style={styles.infoValue}>
                  {formatDateTime(currentShift.clock_in_time)}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.shiftCard}>
            <Text style={styles.cardTitle}>Belum Clock In</Text>
            <Text style={styles.noShiftText}>
              Anda belum memulai shift hari ini.
            </Text>
            {assignedArea && (
              <View style={styles.assignedArea}>
                <Text style={styles.assignedAreaLabel}>Area Tugas:</Text>
                <Text style={styles.assignedAreaValue}>
                  {assignedArea.name}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ringkasan Hari Ini</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{todayReportsCount}</Text>
              <Text style={styles.summaryLabel}>Laporan</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{shiftDuration}</Text>
              <Text style={styles.summaryLabel}>Jam</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Button
            title={currentShift ? 'Clock Out' : 'Clock In'}
            onPress={handleClockInOut}
            variant="primary"
            style={styles.primaryAction}
            isCritical={true}
            accessibilityHint={
              currentShift
                ? 'Akhiri shift kerja saat ini'
                : 'Mulai shift kerja baru dengan verifikasi lokasi'
            }
          />
          {currentShift && (
            <Button
              title="Laporan Baru"
              onPress={handleNewReport}
              variant="outline"
              style={styles.secondaryAction}
              accessibilityHint="Buat laporan kerja baru dengan foto dan deskripsi"
            />
          )}
        </View>

        {/* Empty state message if not assigned */}
        {!assignedArea && !currentShift && (
          <Card style={styles.warningCard}>
            <Text style={styles.warningText}>
              Anda belum ditugaskan ke area manapun. Hubungi supervisor Anda.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  role: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  shiftCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  timer: {
    fontSize: 48,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  shiftInfo: {
    marginTop: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.gray900, // Improved contrast from gray600 for outdoor visibility
    fontWeight: theme.typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  noShiftText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  assignedArea: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  assignedAreaLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray900, // Improved contrast from gray600 for outdoor visibility
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.xs,
  },
  assignedAreaValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray900, // Improved contrast from gray600 for outdoor visibility
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: theme.spacing.xs,
  },
  actions: {
    marginTop: theme.spacing.md,
  },
  primaryAction: {
    marginBottom: theme.spacing.md,
  },
  secondaryAction: {
    marginBottom: theme.spacing.md,
  },
  warningCard: {
    backgroundColor: theme.colors.warning + '20', // 20% opacity
    borderColor: theme.colors.warning,
    borderWidth: 1,
    marginTop: theme.spacing.md,
  },
  locationWarning: {
    marginBottom: theme.spacing.md,
  },
  warningText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.warning,
    textAlign: 'center',
  },
});

export default WorkerHomeScreen;
