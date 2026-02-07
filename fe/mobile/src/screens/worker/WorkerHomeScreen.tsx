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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LoadingSpinner } from '../../components/common';
import { NBAlert, NBBackgroundPattern } from '../../components/nb';
import { NBButton, NBCard } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { shiftsApi, reportsApi } from '../../services/api';
import { setCurrentShift, setError } from '../../store/slices/shiftSlice';
import { setReports } from '../../store/slices/reportSlice';
import { formatTime, formatDateTime, calculateDuration, isToday } from '../../utils/dateUtils';
import { useLocationPermission } from '../../hooks';

/**
 * Worker Home Screen - Main dashboard for workers
 * Shows current shift status, today's summary, and quick actions
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

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
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
    loadInitialData();
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

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadCurrentShift(), loadTodayReports()]);
    setLoading(false);
  };

  const loadCurrentShift = async () => {
    try {
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

  const handleViewReports = () => {
    navigation.navigate('TasksReports' as never);
  };

  // Derived state - must be before any early returns to satisfy React's rules of hooks
  const pendingCount = pendingShiftsCount + pendingReportsCount;

  // Memoize duration calculation - updates when timer's HH:MM changes (once per minute)
  // This avoids recalculating on every second tick while still staying accurate
  const timerMinutes = timer.slice(0, 5); // Extract HH:MM from HH:MM:SS
  const shiftDuration = useMemo(() => {
    if (!currentShift) {return '0h';}
    return calculateDuration(
      new Date(currentShift.clock_in_time),
      new Date()
    ).formatted;
  }, [currentShift?.clock_in_time, timerMinutes]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}  // #FDFD96 pastel yellow (avoiding "everything green")
      patternColor={nbColors.primary}        // #7FBC8C medium green
      opacity={0.06}                          // Slightly less visible on yellow
    >
      <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[nbColors.primary]}
          />
        }>
        {/* Location Warning Banner - show when GPS/permission unavailable during active shift */}
        {currentShift && !isLocationAvailable && (
          <NBAlert
            variant="warning"
            message={
              !permissionGranted
                ? 'Izin lokasi dicabut. Pelacakan lokasi tidak aktif.'
                : !gpsEnabled
                  ? 'GPS tidak aktif. Pelacakan lokasi tidak aktif.'
                  : 'Lokasi tidak tersedia. Periksa pengaturan GPS.'
            }
            actionLabel="Perbaiki"
            onAction={() => {
              if (!permissionGranted) {
                showPermissionAlert();
              } else if (!gpsEnabled) {
                showGpsAlert();
              } else {
                refreshLocationStatus();
              }
            }}
            style={{ marginBottom: nbSpacing.md }}
            testID="worker-home-location-warning"
          />
        )}

        {/* Current Shift Card */}
        {currentShift ? (
          <NBCard variant="elevated" style={styles.shiftCard}>
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
          </NBCard>
        ) : (
          <NBCard variant="elevated" style={styles.shiftCard}>
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
          </NBCard>
        )}

        {/* Today's Summary Card */}
        <NBCard variant="elevated" style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Ringkasan Hari Ini</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{todayReportsCount}</Text>
              <Text style={styles.summaryLabel}>Laporan</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{shiftDuration}</Text>
              <Text style={styles.summaryLabel}>Jam Kerja</Text>
            </View>
          </View>
          {todayReportsCount > 0 && (
            <View style={styles.viewReportsButtonContainer}>
              <NBButton
                title="Lihat Semua Laporan"
                onPress={handleViewReports}
                variant="secondary"
                fullWidth
                icon="arrow-right"
              />
            </View>
          )}
        </NBCard>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <NBButton
            title={currentShift ? 'Clock Out' : 'Clock In'}
            onPress={handleClockInOut}
            variant="primary"
            fullWidth
            style={{ marginBottom: nbSpacing.sm }}
            testID="clock-button"
          />
          {currentShift && (
            <NBButton
              title="Buat Laporan Baru"
              onPress={handleNewReport}
              variant="info"
              fullWidth
              testID="new-report-button"
            />
          )}
        </View>

        {/* Empty state message if not assigned */}
        {!assignedArea && !currentShift && (
          <NBCard variant="outlined" style={styles.warningCard}>
            <Text style={styles.warningText}>
              Anda belum ditugaskan ke area manapun. Hubungi supervisor Anda.
            </Text>
          </NBCard>
        )}
      </ScrollView>
    </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Let NBBackgroundPattern handle background
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: nbSpacing.md, // Reduced padding
    flexGrow: 1,
    justifyContent: 'center',
  },
  shiftCard: {
    marginBottom: nbSpacing.md, // Reduced margin
    padding: 12, // Minimal padding - very compact
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base, // 16px - compact
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.sm, // Minimal spacing
  },
  timer: {
    fontSize: 40, // Very compact
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.accentGrass, // Bright green for active timer
    textAlign: 'center',
    marginVertical: nbSpacing.md, // Minimal vertical space
    letterSpacing: 1,
  },
  shiftInfo: {
    marginTop: nbSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.sm,
  },
  infoLabel: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[700],
    fontWeight: nbTypography.fontWeight.medium,
  },
  infoValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  noShiftText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
    textAlign: 'center',
    marginVertical: nbSpacing.lg,
  },
  assignedArea: {
    marginTop: nbSpacing.md,
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
  assignedAreaLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[700],
    fontWeight: nbTypography.fontWeight.medium,
    marginBottom: nbSpacing.xs,
  },
  assignedAreaValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
  },
  summaryCard: {
    marginBottom: nbSpacing.md, // Reduced margin
    padding: 12, // Minimal padding - very compact
  },
  viewReportsButtonContainer: {
    marginTop: nbSpacing.md, // Minimal spacing
    paddingTop: nbSpacing.sm, // Minimal separation
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray[200], // Subtle divider
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
    width: nbBorders.base,
    height: 40,
    backgroundColor: nbColors.black,
  },
  summaryValue: {
    fontSize: 28, // Very compact
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.accentSky, // Bright sky blue for stats
    letterSpacing: 0,
  },
  summaryLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[700],
    fontWeight: nbTypography.fontWeight.medium,
    marginTop: nbSpacing.xs,
  },
  actions: {
    marginTop: nbSpacing.sm, // Minimal spacing from summary card
  },
  warningCard: {
    backgroundColor: nbColors.warningLight + '20', // 20% opacity
    borderColor: nbColors.warning,
    borderWidth: nbBorders.base,
    borderRadius: nbBorderRadius.base,
    marginTop: nbSpacing.md,
  },
  warningText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.warning,
    textAlign: 'center',
  },
});

export default WorkerHomeScreen;
