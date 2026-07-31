/**
 * useClockInOut Hook
 * Manages GPS location, selfie capture, shift timer, and clock-in/out submission
 * Extracted from ClockInOutScreen for separation of concerns
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Alert } from 'react-native';
import uuid from 'react-native-uuid';
import i18n from '../i18n/config';
import { useAppDispatch, useAppSelector } from '../store/store';
import { clockIn, clockOut, getCurrentShift, getCurrentState } from '../services/api/shiftsApi';
import { addToQueue } from '../services/sync/offlineQueue';
import type { ShiftOption } from '../types/api.types';
import { setCurrentShift } from '../store/slices/shiftSlice';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { isToday } from '../utils/dateUtils';
import { deriveAttendanceStatus } from '../utils/attendance';
import { resolveScheduleScope } from '../utils/scheduleScope';
import { buildMapArea, type MapArea } from '../utils/mapUtils';
import { buildPunchWarnings, type PunchAction, type PunchWarning } from '../utils/punchWarnings';
import { buildPunchConfirmMessage, punchConfirmTitle } from '../utils/punchWarningText';
import { resolveActiveShift } from '../utils/shiftDisplay';
import { useTodayRoster } from './useTodayRoster';
import { useAllDistrictAreas } from './useAllDistrictAreas';
import { requestClockInPermissions, requestCameraPermission } from '../services/permissions';
import { locationTracker } from '../services/location/locationTracker';
import { mediaService, type Photo } from '../services/media';

export type { MapArea } from '../utils/mapUtils';

/** Whether the worker has an area to be inside/outside of at all. */
/**
 * `scope` = assigned city/rayon/kawasan-wide: no polygon to test against, but
 * NOT unassigned. `none` is reserved for a genuinely ad-hoc worker.
 */
export type AreaState = 'within' | 'outside' | 'none' | 'scope';

/**
 * Ask the worker to confirm a punch that will be recorded unfavourably (outside
 * the area, late, early, or unscheduled). There is no approval workflow — this
 * informs, it never gates: dismissing simply abandons the punch.
 *
 * Resolves `false` on cancel or dismiss so the caller can `await` it inline.
 */
function confirmPunch(action: PunchAction, warnings: PunchWarning[]): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      punchConfirmTitle(action),
      buildPunchConfirmMessage(warnings),
      [
        { text: i18n.t('common:actions.cancel'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: i18n.t(
            action === 'clock_in'
              ? 'attendance:punchConfirm.confirmClockIn'
              : 'attendance:punchConfirm.confirmClockOut',
          ),
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

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

  // ADR-055 Phase 3: live attendance state from the server — the open session
  // (drives the Clock-Out gate) + the ranked shift options (drives the picker).
  const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
  const [hasOpenSession, setHasOpenSession] = useState<boolean | null>(null);

  const loadCurrentState = useCallback(async () => {
    if (!isOnline) return; // offline: fall back to the local currentShift for gating
    try {
      const res = await getCurrentState();
      if (res.data) {
        setShiftOptions(res.data.options ?? []);
        setHasOpenSession(res.data.open_session != null);
      }
    } catch {
      // non-fatal — the screen degrades to the local shift state
    }
  }, [isOnline]);

  useEffect(() => {
    loadCurrentState();
  }, [loadCurrentState]);
  const [timer, setTimer] = useState('00:00:00');

  // Wall clock at minute granularity — drives the time-dependent derivations
  // below (lateness, shift window) so they stay true while the screen is open.
  const [nowMinute, setNowMinute] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMinute(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const isClockIn = !currentShift;

  // Today's roster (from /schedules/my) — the single schedule concept (ADR-013).
  // This is the ONLY source of "scheduled" truth: an unscheduled patrol/ad-hoc
  // worker resolves to hasScheduleToday=false and never reads as late.
  const { roster, rosterShift, hasScheduleToday, allToday } = useTodayRoster();

  // Where today's roster row puts the worker — a city/rayon/kawasan-scope
  // assignment names no lokasi but is still an assignment (see resolveScheduleScope).
  const scheduleScope = useMemo(() => resolveScheduleScope(roster), [roster]);

  // City-scope has no single polygon; geofence against EVERY rayon instead (the
  // rayons tile Surabaya, so "inside the city" = inside ANY rayon). Only fetched
  // for a city-scope worker (see useAllDistrictAreas).
  const cityAreas = useAllDistrictAreas(scheduleScope.scope === 'city');

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
          : // City scope: every rayon polygon (inside any = inside the city).
            scheduleScope.scope === 'city' && cityAreas.length > 0
            ? cityAreas
            : scheduleScope.scope !== 'none' && scheduleScope.scope !== 'location'
              ? []
              : (assignedAreas?.length ?? 0) > 0
                ? assignedAreas
                : assignedArea
                  ? [assignedArea]
                  : [],
    [rosterAreas, scopeArea, cityAreas, scheduleScope, assignedAreas, assignedArea],
  );

  // DERIVED (not state): within-boundary if inside ANY assigned area. Deriving it
  // from the current location + areas — rather than setting it inside the GPS
  // callbacks — keeps it in lock-step with both. The callback approach went stale
  // whenever `areasForGeofence` changed after the last position update (roster
  // loads async, and a fixed/mock GPS never emits another tick), which is how the
  // map could read "di dalam" while the marker sat outside. No area → within
  // (nothing to violate); no fix yet → false.
  const isWithinBoundary = useMemo(() => {
    if (location.latitude == null || location.longitude == null) return false;
    if (areasForGeofence.length === 0) return true;
    return areasForGeofence.some((area) =>
      isWithinAreaBoundary(location.latitude!, location.longitude!, area),
    );
  }, [location.latitude, location.longitude, areasForGeofence]);

  // The single area to draw on the map modal — the boundary we geofence
  // against (today's lokasi, or the assigned rayon/kawasan). `buildMapArea` is
  // the shared builder the home hero uses too, so both screens frame the SAME
  // area. Undefined when there's nothing to show.
  const mapArea = useMemo((): MapArea | undefined => {
    if (areasForGeofence.length === 0) return undefined;
    // With several areas (city scope → all rayons) draw the one the worker is
    // inside; otherwise the first. A single-area scope is unaffected.
    const primary =
      areasForGeofence.length > 1 && location.latitude != null && location.longitude != null
        ? areasForGeofence.find((a) =>
            isWithinAreaBoundary(location.latitude!, location.longitude!, a),
          ) ?? areasForGeofence[0]
        : areasForGeofence[0];
    return buildMapArea(primary);
  }, [areasForGeofence, location.latitude, location.longitude]);

  // Today's shifts (for the day's FIRST clock-in, so a clock-out+back-in later
  // never re-triggers "late").
  const todayShifts = useMemo(
    () => (Array.isArray(shiftHistory) ? shiftHistory : []).filter((s) => isToday(s.clock_in_time)),
    [shiftHistory],
  );

  // The ONE shift this screen reasons about: the server's attribution default,
  // falling back to whichever roster row is operative right now. Label, lateness
  // and status all read this — deriving the label from attribution while judging
  // lateness against `/schedules/my`'s single (possibly not-yet-started) row is
  // what let a worker four hours late for Shift 2 be graded against Shift 3.
  const scheduledShift = useMemo(
    () => resolveActiveShift(shiftOptions, [...allToday.map((r) => r.shift_definition), rosterShift]),
    [shiftOptions, allToday, rosterShift],
  );

  // Lateness is judged against that same shift, off the day's first clock-in.
  //
  // `deriveAttendanceStatus` projects against NOW when there is no clock-in yet,
  // so the memo must age with the clock: a screen left open across the shift
  // start would otherwise keep reading TEPAT WAKTU while the punch dialog
  // (evaluated fresh at press time) says the worker is late. Minute granularity
  // — the states it drives never turn on a finer boundary than that.
  const attendance = useMemo(
    () => deriveAttendanceStatus(todayShifts, currentShift, scheduledShift, new Date(nowMinute)),
    [todayShifts, currentShift, scheduledShift, nowMinute],
  );
  const isLate = attendance.isLate;
  const attendanceState = attendance.state;

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

  /**
   * Warnings for the punch about to be submitted, evaluated at press time so
   * `now` is the moment of the punch rather than of the last render.
   */
  const collectWarnings = useCallback(
    (action: PunchAction) =>
      buildPunchWarnings({
        action,
        areaState,
        attendanceState: attendance.state,
        rosterShift: scheduledShift,
        areaName: mapArea?.name ?? scheduleScope.name ?? null,
      }),
    [areaState, attendance.state, scheduledShift, mapArea, scheduleScope],
  );

  const pad = (num: number): string => String(num).padStart(2, '0');

  const handleLocationSuccess = useCallback((position: any) => {
    const { latitude, longitude, accuracy } = position.coords;

    // Only update the location — `isWithinBoundary` is derived from it (above).
    setLocation({
      latitude,
      longitude,
      accuracy: accuracy || null,
      loading: false,
      error: null,
    });
  }, []);

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
        // Fresh fix, never a cached one — the clock-in screen opens to answer
        // "where am I right now", and a stale cache (e.g. after moving a mock
        // GPS) would answer for where the worker just was.
        maximumAge: 0,
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
          // Location only — isWithinBoundary is derived from it.
          setLocation({
            latitude, longitude,
            accuracy: accuracy || null,
            loading: false, error: null,
          });
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
    // Runs once on mount: the watch callback only updates location now (the
    // geofence is derived), so it no longer needs to re-subscribe when areas
    // change — which also stops the clearWatch/re-watch churn on roster load.
  }, [getCurrentLocation]);

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

  const handleClockIn = useCallback(async (onSuccess: () => void, shift?: ShiftOption | null) => {
    // Null-checked, not truthy-checked: latitude 0 is a valid fix.
    if (location.latitude == null || location.longitude == null) {
      Alert.alert('Error', i18n.t('location:errors.unavailableClockIn'));
      return;
    }

    // Tell the worker what is about to be recorded against them before it is.
    const warnings = collectWarnings('clock_in');
    if (warnings.length > 0 && !(await confirmPunch('clock_in', warnings))) {
      return;
    }

    setIsSubmitting(true);
    try {
      const selfieBase64 = selfie ? await mediaService.convertToBase64(selfie) : undefined;

      // ADR-055: every punch carries a client uuid so a retry (an offline sync)
      // is idempotent server-side, plus the capture time so an offline punch
      // records when it happened, not when the queue drains.
      const clientUuid = uuid.v4() as string;
      const punchedAt = new Date().toISOString();

      // Offline-first (ADR-002): queue the punch and let the sync manager replay
      // it when connectivity returns. Idempotent on the client uuid.
      if (!isOnline) {
        await addToQueue('clock-in', {
          gps_lat: location.latitude,
          gps_lng: location.longitude,
          selfie_photo: selfieBase64,
          client_uuid: clientUuid,
          accuracy_m: location.accuracy ?? undefined,
          shift_definition_id: shift?.shift_definition_id,
          service_day: shift?.service_day,
          punched_at: punchedAt,
        });
        setSelfie(null);
        Alert.alert('OK', i18n.t('attendance:clockInOut.offlineQueued'), [
          { text: 'OK', onPress: onSuccess },
        ]);
        return;
      }

      const response = await clockIn(location.latitude, location.longitude, selfieBase64, undefined, {
        clientUuid,
        accuracyM: location.accuracy ?? undefined,
        shiftDefinitionId: shift?.shift_definition_id,
        serviceDay: shift?.service_day,
        punchedAt,
      });
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
  }, [location, selfie, dispatch, isOnline, collectWarnings]);

  const handleClockOut = useCallback(async (onSuccess: () => void) => {
    if (!currentShift) {
      Alert.alert('Error', i18n.t('location:clockInOut.noActiveShift'));
      return;
    }
    if (location.latitude == null || location.longitude == null) {
      Alert.alert('Error', i18n.t('location:errors.unavailableClockIn'));
      return;
    }

    // Clock-out always confirms — ending a shift is the irreversible half of the
    // pair. When something is off (outside the area, leaving early, unscheduled)
    // the generic "are you sure" is replaced by the specific reasons.
    const warnings = collectWarnings('clock_out');
    const confirmed =
      warnings.length > 0
        ? await confirmPunch('clock_out', warnings)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              i18n.t('location:clockInOut.clockOutConfirmTitle'),
              i18n.t('location:clockInOut.clockOutConfirmMessage'),
              [
                { text: i18n.t('common:actions.cancel'), style: 'cancel', onPress: () => resolve(false) },
                {
                  text: i18n.t('location:clockInOut.clockOutButton'),
                  style: 'destructive',
                  onPress: () => resolve(true),
                },
              ],
              { cancelable: true, onDismiss: () => resolve(false) },
            );
          });
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      try {
        await locationTracker.forceUpload();
        await locationTracker.stop();
      } catch (trackingError) {
        console.warn('Failed to stop location tracking:', trackingError);
      }

      const selfieBase64 = selfie ? await mediaService.convertToBase64(selfie) : undefined;
      const clientUuid = uuid.v4() as string;
      const punchedAt = new Date().toISOString();

      // Offline-first (ADR-002): queue + optimistically end the shift.
      if (!isOnline) {
        await addToQueue('clock-out', {
          gps_lat: location.latitude!,
          gps_lng: location.longitude!,
          client_uuid: clientUuid,
          accuracy_m: location.accuracy ?? undefined,
          punched_at: punchedAt,
        });
        setSelfie(null);
        dispatch(setCurrentShift(null));
        Alert.alert('OK', i18n.t('attendance:clockInOut.offlineQueued'), [
          { text: 'OK', onPress: onSuccess },
        ]);
        return;
      }

      const response = await clockOut(location.latitude!, location.longitude!, selfieBase64, {
        clientUuid,
        accuracyM: location.accuracy ?? undefined,
        punchedAt,
      });
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
  }, [currentShift, location, selfie, dispatch, isOnline, collectWarnings]);

  return {
    location,
    selfie,
    isSubmitting,
    isWithinBoundary,
    areaState,
    attendance,
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
    mapArea,
    hasScheduleToday,
    // ADR-055 Phase 3
    shiftOptions,
    hasOpenSession,
    loadCurrentState,
    getCurrentLocation,
    handleCaptureSelfie,
    handleClockIn,
    handleClockOut,
  };
}
