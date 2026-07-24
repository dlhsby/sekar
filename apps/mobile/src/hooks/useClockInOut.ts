/**
 * useClockInOut Hook
 * Manages GPS location, selfie capture, shift timer, and clock-in/out submission
 * Extracted from ClockInOutScreen for separation of concerns
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Alert } from 'react-native';
import i18n from '../i18n/config';
import { useAppDispatch, useAppSelector } from '../store/store';
import { clockIn, clockOut, getCurrentShift } from '../services/api/shiftsApi';
import { setCurrentShift } from '../store/slices/shiftSlice';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { isToday } from '../utils/dateUtils';
import { deriveAttendanceStatus } from '../utils/attendance';
import { resolveScheduleScope } from '../utils/scheduleScope';
import { useTodayRoster } from './useTodayRoster';
import { requestClockInPermissions, requestCameraPermission } from '../services/permissions';
import { locationTracker } from '../services/location/locationTracker';
import { mediaService, type Photo } from '../services/media';

/** Whether the worker has an area to be inside/outside of at all. */
/**
 * `scope` = assigned city/rayon/kawasan-wide: no polygon to test against, but
 * NOT unassigned. `none` is reserved for a genuinely ad-hoc worker.
 */
export type AreaState = 'within' | 'outside' | 'none' | 'scope';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useClockInOut() {
  const dispatch = useAppDispatch();

  const assignedArea = useAppSelector((state) => state.auth.assignedArea);
  const assignedAreas = useAppSelector((state) => state.auth.assignedAreas);
  const { currentShift, shiftHistory } = useAppSelector((state) => state.shift);
  const { isOnline } = useAppSelector((state) => state.offline);

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const [selfie, setSelfie] = useState<Photo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithinBoundary, setIsWithinBoundary] = useState(false);
  const [timer, setTimer] = useState('00:00:00');

  const isClockIn = !currentShift;

  // Today's roster (from /schedules/my) — the single schedule concept (ADR-013).
  // This is the ONLY source of "scheduled" truth: an unscheduled patrol/ad-hoc
  // worker resolves to hasScheduleToday=false and never reads as late.
  const { roster, rosterShift, hasScheduleToday } = useTodayRoster();

  // Where today's roster row puts the worker — a city/rayon/kawasan-scope
  // assignment names no lokasi but is still an assignment (see resolveScheduleScope).
  const scheduleScope = useMemo(() => resolveScheduleScope(roster), [roster]);

  /**
   * The lokasi TODAY'S assignment covers. ADR-053: one place per row — a worker
   * covering several holds several rows, so this stays a list for the geofence
   * even though each row contributes at most one.
   *
   * Today's roster wins over the standing `assignedAreas`: the permanent
   * assignment is where the worker usually is, the roster is where they are
   * *today*, and clocking in was being geofenced against the wrong one whenever
   * the two differed.
   */
  const rosterAreas = useMemo(
    () => (roster?.location ? [roster.location] : []),
    [roster],
  );

  // A rayon/kawasan assignment names no lokasi, but it DOES have its own
  // boundary polygon (ADR-045/046). Build a geofence area from the assigned
  // scope so the worker is checked against the rayon/kawasan they were actually
  // put on — rather than treated as "no boundary, attendance always recorded",
  // which was both wrong and misleading. Only when a real polygon exists; a
  // scope whose polygon was never computed falls through to the neutral 'scope'
  // state (fail-open, but honestly labelled — not "tanpa batas lokasi").
  const scopeArea = useMemo(() => {
    const scoped =
      scheduleScope.scope === 'region'
        ? roster?.region
        : scheduleScope.scope === 'district'
          ? roster?.district
          : null;
    if (!scoped?.boundary_polygon) return null;
    return {
      name: scoped.name,
      boundary_polygon: scoped.boundary_polygon,
      gps_lat: scoped.center_lat ?? null,
      gps_lng: scoped.center_lng ?? null,
    };
  }, [scheduleScope, roster]);

  // Geofence target priority: today's lokasi → the assigned rayon/kawasan
  // boundary → the standing assignment. A scope with no polygon yields [] and is
  // reported as 'scope' (neutral) below; a genuinely ad-hoc worker also yields
  // [] but resolves to 'none'.
  const areasForGeofence = useMemo(
    () =>
      rosterAreas.length > 0
        ? rosterAreas
        : scopeArea
          ? [scopeArea]
          : scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location'
            ? []
            : (assignedAreas?.length ?? 0) > 0
              ? assignedAreas
              : assignedArea
                ? [assignedArea]
                : [],
    [rosterAreas, scopeArea, scheduleScope, assignedAreas, assignedArea],
  );

  // Today's shifts (for the day's FIRST clock-in, so a clock-out+back-in later
  // never re-triggers "late").
  const todayShifts = useMemo(
    () => (Array.isArray(shiftHistory) ? shiftHistory : []).filter((s) => isToday(s.clock_in_time)),
    [shiftHistory],
  );

  // Lateness is judged only against the roster shift, off the first clock-in.
  const attendance = useMemo(
    () => deriveAttendanceStatus(todayShifts, currentShift, rosterShift),
    [todayShifts, currentShift, rosterShift],
  );
  // The scheduled window shown on screen — roster only (null when unscheduled).
  const scheduledShift = rosterShift;
  const isLate = attendance.isLate;
  const attendanceState = attendance.state;

  const pad = (num: number): string => String(num).padStart(2, '0');

  const handleLocationSuccess = useCallback((position: any) => {
    const { latitude, longitude, accuracy } = position.coords;

    setLocation({
      latitude,
      longitude,
      accuracy: accuracy || null,
      loading: false,
      error: null,
    });

    // Within-boundary if inside ANY assigned area. Ad-hoc workers (no area)
    // are always considered within — there is no boundary to violate.
    if (areasForGeofence.length === 0) {
      setIsWithinBoundary(true);
    } else {
      const within = areasForGeofence.some((area) =>
        isWithinAreaBoundary(latitude, longitude, area),
      );
      setIsWithinBoundary(within);
    }
  }, [areasForGeofence]);

  const getCurrentLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    Geolocation.getCurrentPosition(
      handleLocationSuccess,
      (error) => {
        if (__DEV__) { console.error('Location error:', error); }

        let errorMessage = i18n.t('location:errors.unavailableGeneral');
        switch (error.code) {
          case 1: errorMessage = i18n.t('location:errors.permissionDenied'); break;
          case 2: errorMessage = i18n.t('location:errors.unknown'); break;
          case 3: errorMessage = i18n.t('location:errors.timeout'); break;
          case 4: errorMessage = i18n.t('location:errors.unknown'); break;
          case 5: errorMessage = i18n.t('location:errors.gpsDisabled'); break;
        }

        setLocation({
          latitude: null, longitude: null, accuracy: null,
          loading: false, error: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        forceRequestLocation: true,
        forceLocationManager: false,
        showLocationDialog: true,
      },
    );
  }, [handleLocationSuccess]);

  // Request permissions and watch position
  useEffect(() => {
    let watchId: number | null = null;
    let isMounted = true;

    const initializeLocation = async () => {
      const result = await requestClockInPermissions();
      if (!isMounted) { return; }

      if (!result.success) {
        setLocation((prev) => ({ ...prev, error: result.message || 'Permission denied' }));
        return;
      }

      getCurrentLocation();

      watchId = Geolocation.watchPosition(
        (position) => {
          if (!isMounted) { return; }
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({
            latitude, longitude,
            accuracy: accuracy || null,
            loading: false, error: null,
          });

          if (areasForGeofence.length === 0) {
            setIsWithinBoundary(true);
          } else {
            const within = areasForGeofence.some((area) =>
              isWithinAreaBoundary(latitude, longitude, area),
            );
            setIsWithinBoundary(within);
          }
        },
        (error) => {
          if (!isMounted) { return; }
          if (__DEV__) { console.error('Watch position error:', error); }
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
          forceRequestLocation: true,
          forceLocationManager: false,
          showLocationDialog: true,
        },
      );
    };

    initializeLocation();

    return () => {
      isMounted = false;
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCurrentLocation is a stable callback; effect runs once on mount and when areas change
  }, [areasForGeofence]);

  // Update timer every second when clocked in
  useEffect(() => {
    if (!currentShift) {
      setTimer('00:00:00');
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - new Date(currentShift.clock_in_time).getTime();
      setTimer(
        `${pad(Math.floor(elapsed / 3600000))}:${pad(Math.floor((elapsed % 3600000) / 60000))}:${pad(Math.floor((elapsed % 60000) / 1000))}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshots currentShift on mount intentionally; re-running on every shift change would reset timer unnecessarily
  }, [currentShift?.id]);

  const handleCaptureSelfie = useCallback(async () => {
    const permResult = await requestCameraPermission();
    if (!permResult.granted) {
      Alert.alert(i18n.t('location:clockInOut.cameraPermissionTitle'), i18n.t('location:clockInOut.cameraPermissionMessage'));
      return;
    }
    try {
      const photo = await mediaService.capturePhoto(true);
      if (photo) { setSelfie(photo); }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : i18n.t('location:clockInOut.cameraError'));
    }
  }, []);

  const handleClockIn = useCallback(async (onSuccess: () => void) => {
    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', i18n.t('location:errors.unavailableClockIn'));
      return;
    }

    setIsSubmitting(true);
    try {
      const selfieBase64 = selfie ? await mediaService.convertToBase64(selfie) : undefined;

      const response = await clockIn(location.latitude, location.longitude, selfieBase64);
      if (response.error || !response.data) {
        throw new Error(response.error || i18n.t('location:clockInOut.clockInFail'));
      }

      const shiftResponse = await getCurrentShift();
      if (shiftResponse.data) {
        dispatch(setCurrentShift(shiftResponse.data as any));
        try {
          await locationTracker.initialize(shiftResponse.data.id);
        } catch (trackingError) {
          console.warn('Failed to start location tracking:', trackingError);
        }
      }

      setSelfie(null);
      Alert.alert('OK', i18n.t('location:clockInOut.clockInSuccess'), [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error: any) {
      console.error('Clock-in error:', error);
      Alert.alert(
        i18n.t('location:clockInOut.clockInFail'),
        error.response?.data?.message || error.message || i18n.t('location:clockInOut.clockInFail'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [location, selfie, dispatch]);

  const handleClockOut = useCallback(async (onSuccess: () => void) => {
    if (!currentShift) {
      Alert.alert('Error', i18n.t('location:clockInOut.noActiveShift'));
      return;
    }
    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', i18n.t('location:errors.unavailableClockIn'));
      return;
    }

    Alert.alert(
      i18n.t('location:clockInOut.clockOutConfirmTitle'),
      i18n.t('location:clockInOut.clockOutConfirmMessage'),
      [
        { text: i18n.t('common:actions.cancel'), style: 'cancel' },
        {
          text: i18n.t('location:clockInOut.clockOutButton'),
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              try {
                await locationTracker.forceUpload();
                await locationTracker.stop();
              } catch (trackingError) {
                console.warn('Failed to stop location tracking:', trackingError);
              }

              const selfieBase64 = selfie ? await mediaService.convertToBase64(selfie) : undefined;
              const response = await clockOut(location.latitude!, location.longitude!, selfieBase64);
              if (response.error) {
                const errMsg = response.error;
                Alert.alert(i18n.t('location:clockInOut.clockOutFail'), errMsg);
                return;
              }

              setSelfie(null);
              dispatch(setCurrentShift(null));
              Alert.alert('OK', i18n.t('location:clockInOut.clockOutSuccess'), [
                { text: 'OK', onPress: onSuccess },
              ]);
            } catch (error: any) {
              console.error('Clock-out error:', error);
              Alert.alert(
                i18n.t('location:clockInOut.clockOutFail'),
                error.response?.data?.message || error.message || i18n.t('location:clockInOut.clockOutFail'),
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [currentShift, location, selfie, dispatch]);

  // Area state for the boundary badge. Three cases:
  //  • a geofenceable area — today's lokasi OR a rayon/kawasan with a boundary
  //    polygon → within / outside it. Scope-aware: a rayon assignment is now
  //    checked against the RAYON boundary, a kawasan against its kawasan.
  //  • a scope with no polygon (kota, or a rayon/kawasan whose boundary was
  //    never computed) → 'scope': the worker IS assigned, attendance is still
  //    recorded, but there is nothing to test against. Labelled neutrally, not
  //    "tanpa batas lokasi".
  //  • genuinely unassigned (ad-hoc) → 'none'
  const areaState: AreaState =
    areasForGeofence.length > 0
      ? isWithinBoundary
        ? 'within'
        : 'outside'
      : scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location'
        ? 'scope'
        : 'none';

  return {
    location,
    selfie,
    isSubmitting,
    isWithinBoundary,
    areaState,
    timer,
    isClockIn,
    isOnline,
    assignedArea,
    currentShift,
    scheduledShift,
    isLate,
    attendanceState,
    scheduleScope,
    rosterAreas,
    hasScheduleToday,
    getCurrentLocation,
    handleCaptureSelfie,
    handleClockIn,
    handleClockOut,
  };
}
