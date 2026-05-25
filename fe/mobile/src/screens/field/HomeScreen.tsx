import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
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
import { NBButton, NBCard, NBText } from '../../components/nb';
import { ShiftDetailModal, TodayActivitiesModal, TodayWorkHoursModal, LocationMapModal } from '../../components/modals';
import { nbColors, nbSpacing, nbBorders, nbBorderRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
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

  // Collapsible state for the active-shift card
  const [shiftCardCollapsed, setShiftCardCollapsed] = useState(true);

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

  // Calculate today's activities count from Redux state.
  // Array.isArray guard: in dev a stale HMR snapshot occasionally lands
  // with `activitiesList` as undefined / non-array, which crashed the
  // whole HomeScreen tree. Falling back to [] keeps the home screen
  // mountable so the error boundary doesn't black-screen the app.
  const todayActivitiesCount = useMemo(() => {
    const list = Array.isArray(activitiesList) ? activitiesList : [];
    return list.filter((activity) => isToday(activity.created_at)).length;
  }, [activitiesList]);

  // Filter today's shifts from shift history. Same defensive guard —
  // observed `shiftHistory.filter is not a function` crash on admin_data
  // reload (May 11) when HMR/state-hydration produced a non-array value.
  const todayShifts = useMemo(() => {
    const list = Array.isArray(shiftHistory) ? shiftHistory : [];
    return list.filter((shift) => isToday(shift.clock_in_time));
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
          <NBCard variant="elevated" style={[styles.shiftCard, currentShift.is_overtime && styles.shiftCardLembur]}>
            <View style={styles.shiftCardTitleRow}>
              <View style={styles.shiftCardTitleLeft}>
                <NBText variant="body" style={styles.shiftCardTitleText}>
                  {currentShift.is_overtime ? 'Lembur Aktif' : 'Shift Aktif'}
                </NBText>
                {currentShift.is_overtime && (
                  <View style={styles.lemburBadge}>
                    <NBText variant="caption" uppercase style={styles.lemburBadgeText}>LEMBUR</NBText>
                  </View>
                )}
                {shiftCardCollapsed && (
                  <NBText variant="body" color="warning" style={styles.shiftCardTitleTimer} accessibilityLabel={`Waktu shift berjalan: ${timer}`}>
                    {timer}
                  </NBText>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShiftCardCollapsed((v) => !v)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={shiftCardCollapsed ? 'Perluas kartu shift' : 'Ciutkan kartu shift'}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                style={styles.collapseToggle}
                testID="shift-card-collapse-toggle"
              >
                <MaterialCommunityIcons
                  name={shiftCardCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={24}
                  color={nbColors.black}
                />
              </TouchableOpacity>
            </View>
            {!shiftCardCollapsed && (
              <TouchableOpacity
                onPress={() => setShiftModalVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={currentShift.is_overtime ? 'Shift Lembur Aktif' : 'Shift Aktif'}
                accessibilityHint="Ketuk untuk melihat detail shift"
              >
                <NBText
                  variant="display"
                  color="warning"
                  align="center"
                  style={styles.timer}
                  accessibilityLabel={`Waktu shift berjalan: ${timer}`}
                >
                  {timer}
                </NBText>
                <View style={styles.shiftInfo}>
                  <View style={styles.infoRow}>
                    <NBText variant="body" color="gray700" style={styles.infoLabel}>Area:</NBText>
                    <NBText variant="body" style={styles.infoValue}>
                      {currentShift.area?.name || 'Tidak diketahui'}
                    </NBText>
                  </View>
                  <View style={styles.infoRow}>
                    <NBText variant="body" color="gray700" style={styles.infoLabel}>Mulai:</NBText>
                    <NBText variant="body" style={styles.infoValue}>
                      {formatDateTime(currentShift.clock_in_time)}
                    </NBText>
                  </View>
                </View>
                <NBText variant="caption" color="gray500" align="center" style={styles.tapHint}>Ketuk untuk detail lengkap</NBText>
              </TouchableOpacity>
            )}
          </NBCard>
        ) : (
          <NBCard variant="elevated" style={styles.shiftCard}>
            <NBText variant="body" style={styles.cardTitle}>Belum Clock In</NBText>
            <NBText variant="body" color="gray600" style={styles.noShiftText}>
              Anda belum memulai shift hari ini.
            </NBText>
            {assignedArea && (
              <View style={styles.assignedArea}>
                <NBText variant="body-sm" color="gray700" style={styles.assignedAreaLabel}>Area Tugas:</NBText>
                <NBText variant="body" color="primary" style={styles.assignedAreaValue}>
                  {assignedArea.name}
                </NBText>
              </View>
            )}
          </NBCard>
        )}

        {/* Today's Summary Card */}
        <NBCard variant="elevated" style={styles.summaryCard}>
          <NBText variant="body" style={styles.cardTitle}>Ringkasan Hari Ini</NBText>
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => setActivitiesModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${todayActivitiesCount} Aktivitas`}
              accessibilityHint="Ketuk untuk melihat daftar aktivitas hari ini"
            >
              <NBText variant="h1" color="accentSky" style={styles.summaryValue}>{todayActivitiesCount}</NBText>
              <NBText variant="body-sm" color="gray700" style={styles.summaryLabel}>Aktivitas</NBText>
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
              <NBText variant="h1" color="accentSky" style={styles.summaryValue}>{totalTodayDuration}</NBText>
              <NBText variant="body-sm" color="gray700" style={styles.summaryLabel}>Jam Kerja</NBText>
            </TouchableOpacity>
          </View>
        </NBCard>

        {/* Empty state message if not assigned — hide for rayon-scoped roles */}
        {!assignedArea && !currentShift &&
          user?.role !== 'admin_data' && user?.role !== 'kepala_rayon' && (
          <NBCard style={styles.warningCard}>
            <NBText variant="body" color="warning" align="center" style={styles.warningText}>
              Anda belum ditugaskan ke area manapun. Hubungi supervisor Anda.
            </NBText>
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
  shiftCardTitleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  shiftCardTitleTimer: {
    marginLeft: nbSpacing.sm,
    letterSpacing: 0.5,
  },
  collapseToggle: {
    padding: nbSpacing.xs,
    marginLeft: nbSpacing.sm,
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
    letterSpacing: 0.5,
  },
  shiftCardTitleText: {
    // Typography now handled by NBText variant="body"
  },
  cardTitle: {
    marginBottom: nbSpacing.sm,
  },
  timer: {
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
    // Typography now handled by NBText variant="body"
  },
  infoValue: {
    // Typography now handled by NBText variant="body"
  },
  noShiftText: {
    marginVertical: nbSpacing.lg,
  },
  assignedArea: {
    marginTop: nbSpacing.md,
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
  assignedAreaLabel: {
    marginBottom: nbSpacing.xs,
  },
  assignedAreaValue: {
    // Typography now handled by NBText variant="body" color="primary"
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
    letterSpacing: 0,
  },
  summaryLabel: {
    marginTop: nbSpacing.xs,
  },
  tapHint: {
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
    // Typography now handled by NBText variant="body" color="warning"
  },
});

export default HomeScreen;
