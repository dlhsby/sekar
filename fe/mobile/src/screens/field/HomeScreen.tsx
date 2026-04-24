import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  AccessibilityInfo,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CLOCKABLE_ROLES } from '../../constants/roles';
import { LoadingSpinner } from '../../components/common';
import { NBAlert, NBBackgroundPattern } from '../../components/nb';
import { NBButton, NBCard } from '../../components/nb';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, LocationMapModal } from '../../components/modals';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
// Fix 15: canonical import path is store/hooks (matches majority of screens)
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { shiftsApi, activitiesApi } from '../../services/api';
import { setCurrentShift, setShiftHistory, setError } from '../../store/slices/shiftSlice';
import { setActivities } from '../../store/slices/activitiesSlice';
import { formatDateTime, calculateDuration, isToday } from '../../utils/dateUtils';
import { useLocationPermission } from '../../hooks';
import { useHomeLocation } from '../../hooks/useHomeLocation';
import { LocationStatusCard } from '../../components/home/LocationStatusCard';
import type { Activity } from '../../types/models.types';

/**
 * Worker Home Screen - Main dashboard for field workers
 * Phase 2C: uses activities instead of reports
 */

// Fix 14: pad moved to module scope to avoid re-creation on every render
const pad = (num: number): string => String(num).padStart(2, '0');

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { user, assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift, shiftHistory } = useAppSelector((state) => state.shift);
  const { activitiesList } = useAppSelector((state) => state.activities);
  // Fix 9: Removed unused offline Redux selector (isOnline, isSyncing, pendingShiftsCount)

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [timer, setTimer] = useState('00:00:00');

  // Modal states
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [activitiesModalVisible, setActivitiesModalVisible] = useState(false);
  const [workHoursModalVisible, setWorkHoursModalVisible] = useState(false);
  const [locationMapVisible, setLocationMapVisible] = useState(false);

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
    enableMonitoring: !!currentShift,
    showAlerts: true,
    onPermissionLost: () => {
      // Location permission was revoked - UI will show alert
    },
    onGpsDisabled: () => {
      // GPS was disabled - UI will show alert
    },
  });

  // Phase 2D-11: Home screen location status
  const { location: homeLocation, refresh: refreshHomeLocation, hasActiveShift } = useHomeLocation();

  // Calculate today's activities count from Redux state
  const todayActivitiesCount = useMemo(() => {
    return activitiesList.filter((activity) => isToday(activity.created_at)).length;
  }, [activitiesList]);

  // Filter today's shifts from shift history
  const todayShifts = useMemo(() => {
    return shiftHistory.filter((shift) => isToday(shift.clock_in_time));
  }, [shiftHistory]);

  // Fix 7: loadInitialData no longer calls loadTodayActivities — useFocusEffect
  // fires on initial mount AND on subsequent focus events, so activities are
  // loaded exactly once on mount and refreshed whenever the screen re-focuses.
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update timer every second for real-time display
  useEffect(() => {
    if (!currentShift) {
      setTimer('00:00:00');
      lastAnnouncedMinuteRef.current = -1;
      return;
    }

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

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentShift?.id]);

  // On re-focus (e.g. returning from ClockInOut), reload everything so the shift
  // list and activity counter are immediately up to date without a manual refresh.
  // Skip the very first focus event — useEffect/loadInitialData handles that load.
  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      loadCurrentShift();
      loadShiftHistory();
      loadTodayActivities();
    }, [])
  );

  const loadInitialData = async () => {
    setLoading(true);
    // Load shift data AND today's activities together on mount.
    // useFocusEffect skips first focus (hasMountedRef), so we must include
    // activities here to ensure they appear regardless of shift status.
    await Promise.all([loadCurrentShift(), loadShiftHistory(), loadTodayActivities()]);
    setLoading(false);
  };

  const loadCurrentShift = async () => {
    try {
      const response = await shiftsApi.getCurrentShift();
      if (response.error) {
        // Fix 11: Gate console.warn behind __DEV__
        if (__DEV__) {
          console.warn('[HomeScreen] Failed to load shift:', response.error);
        }
        dispatch(setError(response.error));
        return;
      }
      dispatch(setCurrentShift(response.data ?? null));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load shift';
      // Fix 11: Gate console.warn behind __DEV__
      if (__DEV__) {
        console.warn('[HomeScreen] Unexpected error loading shift:', message);
      }
      dispatch(setError(message));
    }
  };

  const loadShiftHistory = async () => {
    try {
      const response = await shiftsApi.getMyShifts();
      if (response.error) {
        // Fix 11: Gate console.warn behind __DEV__
        if (__DEV__) {
          console.warn('[HomeScreen] Failed to load shift history:', response.error);
        }
        return;
      }
      dispatch(setShiftHistory(response.data ?? []));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load shift history';
      // Fix 11: Gate console.warn behind __DEV__
      if (__DEV__) {
        console.warn('[HomeScreen] Unexpected error loading shift history:', message);
      }
    }
  };

  const loadTodayActivities = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await activitiesApi.getMyActivities({ from_date: today });
      if (response.data) {
        dispatch(setActivities(response.data.data ?? []));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load activities';
      // Fix 11: Gate console.warn behind __DEV__
      if (__DEV__) {
        console.warn('Failed to load activities:', message);
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCurrentShift(), loadShiftHistory(), loadTodayActivities()]);
    setRefreshing(false);
  }, []);

  const handleClockInOut = () => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit' as never);
    } else {
      navigation.navigate('ClockInOut' as never);
    }
  };

  // Fix 10: handleViewActivities is wired to TodayActivitiesModal's onActivityPress
  const handleViewActivities = useCallback((_activity: Activity) => {
    setActivitiesModalVisible(false);
    navigation.navigate('Activities' as never);
  }, [navigation]);

  // totalTodayDuration must stay consistent with TodayWorkHoursModal's own calculation.
  // Both use new Date() for the active shift's end time, so the HomeScreen value
  // must update every second (via timer dep) to match what the modal shows when opened.
  const totalTodayDuration = useMemo(() => {
    let totalMinutes = 0;

    todayShifts.forEach((shift) => {
      const endTime = shift.clock_out_time
        ? new Date(shift.clock_out_time)
        : new Date();

      const duration = calculateDuration(
        new Date(shift.clock_in_time),
        endTime
      );

      totalMinutes += duration.totalMinutes;
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}j ${minutes}m`;
  // timer dep: recalculate every second for the active shift's running duration,
  // keeping HomeScreen card in sync with TodayWorkHoursModal's fresh calculation.
  }, [todayShifts, timer]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
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
        {/* Location Warning Banner */}
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

        {/* Phase 2D-11: Location Status Card - only visible during active shift */}
        {hasActiveShift && (
          <LocationStatusCard
            location={homeLocation}
            onRefresh={refreshHomeLocation}
            onPress={() => setLocationMapVisible(true)}
          />
        )}

        {/* Current Shift Card */}
        {currentShift ? (
          <TouchableOpacity
            onPress={() => setShiftModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={currentShift.is_overtime ? 'Shift Lembur Aktif' : 'Shift Aktif'}
            accessibilityHint="Ketuk untuk melihat detail shift"
          >
            <NBCard variant="elevated" style={[styles.shiftCard, currentShift.is_overtime && styles.shiftCardLembur]}>
              <View style={styles.shiftCardTitleRow}>
                <Text style={styles.shiftCardTitleText}>
                  {currentShift.is_overtime ? 'Lembur Aktif' : 'Shift Aktif'}
                </Text>
                {currentShift.is_overtime && (
                  <View style={styles.lemburBadge}>
                    <Text style={styles.lemburBadgeText}>LEMBUR</Text>
                  </View>
                )}
              </View>
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
                  <Text style={styles.infoLabel}>Mulai:</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTime(currentShift.clock_in_time)}
                  </Text>
                </View>
              </View>
              <Text style={styles.tapHint}>Ketuk untuk detail lengkap</Text>
            </NBCard>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => setActivitiesModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${todayActivitiesCount} Aktivitas`}
              accessibilityHint="Ketuk untuk melihat daftar aktivitas hari ini"
            >
              <Text style={styles.summaryValue}>{todayActivitiesCount}</Text>
              <Text style={styles.summaryLabel}>Aktivitas</Text>
            </TouchableOpacity>
            <View style={styles.summaryDivider} />
            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => setWorkHoursModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${totalTodayDuration} Jam Kerja`}
              accessibilityHint="Ketuk untuk melihat detail jam kerja hari ini"
            >
              <Text style={styles.summaryValue}>{totalTodayDuration}</Text>
              <Text style={styles.summaryLabel}>Jam Kerja</Text>
            </TouchableOpacity>
          </View>
        </NBCard>

        {/* Empty state message if not assigned — hide for rayon-scoped roles */}
        {!assignedArea && !currentShift &&
          user?.role !== 'admin_data' && user?.role !== 'kepala_rayon' && (
          <NBCard style={styles.warningCard}>
            <Text style={styles.warningText}>
              Anda belum ditugaskan ke area manapun. Hubungi supervisor Anda.
            </Text>
          </NBCard>
        )}
      </ScrollView>

      {/* Fixed Clock In/Out button — only for clockable field roles (satgas, linmas, korlap) */}
      {/* Fix 8: user.role is typed as UserRole, no cast needed */}
      {user?.role && CLOCKABLE_ROLES.includes(user.role) && (
        <View style={styles.fab}>
          <NBButton
            title={
              !currentShift ? 'Clock In' :
              currentShift.is_overtime ? 'Clock Out Lembur' : 'Clock Out'
            }
            onPress={handleClockInOut}
            variant={currentShift ? 'danger' : 'primary'}
            size="lg"
            testID="clock-button"
          />
        </View>
      )}
    </View>

    {/* Modals */}
    <ShiftDetailModal
      visible={shiftModalVisible}
      onClose={() => setShiftModalVisible(false)}
      shift={currentShift}
    />
    {/* Fix 10: onActivityPress wired to handleViewActivities which navigates to Activities screen */}
    <TodayActivitiesModal
      visible={activitiesModalVisible}
      onClose={() => setActivitiesModalVisible(false)}
      activities={activitiesList.filter((activity) => isToday(activity.created_at))}
      onActivityPress={handleViewActivities}
    />
    <TodayWorkHoursModal
      visible={workHoursModalVisible}
      onClose={() => setWorkHoursModalVisible(false)}
      shifts={todayShifts}
    />
    <LocationMapModal
      visible={locationMapVisible}
      onClose={() => setLocationMapVisible(false)}
      location={homeLocation}
      area={currentShift?.area ?? assignedArea ?? undefined}
    />
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: nbSpacing.md,
    flexGrow: 1,
  },
  shiftCard: {
    marginBottom: nbSpacing.sm,
    padding: 12,
  },
  shiftCardLembur: {
    borderColor: nbColors.warning,
    borderWidth: 2,
  },
  shiftCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.sm,
  },
  lemburBadge: {
    backgroundColor: nbColors.warning,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nbColors.black,
  },
  lemburBadgeText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    letterSpacing: 0.5,
  },
  shiftCardTitleText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  timer: {
    fontSize: 40,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.warning,
    textAlign: 'center',
    marginVertical: nbSpacing.md,
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
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
  },
  infoValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  noShiftText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
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
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
    marginBottom: nbSpacing.xs,
  },
  assignedAreaValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
  },
  summaryCard: {
    marginBottom: nbSpacing.sm,
    padding: 12,
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
    fontSize: 28,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.accentSky,
    letterSpacing: 0,
  },
  summaryLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
    marginTop: nbSpacing.xs,
  },
  tapHint: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
    fontWeight: nbTypography.fontWeight.regular,
    textAlign: 'center',
    marginTop: nbSpacing.sm,
    fontStyle: 'italic',
  },
  fab: {
    padding: nbSpacing.md,
    paddingTop: nbSpacing.sm,
  },
  warningCard: {
    // Fix 13: Use withAlpha utility instead of hex string concatenation
    backgroundColor: withAlpha(nbColors.warningLight, 0.125),
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

export default HomeScreen;
