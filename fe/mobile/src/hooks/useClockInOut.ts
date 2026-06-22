/**
 * useClockInOut Hook
 * Manages GPS location, selfie capture, shift timer, and clock-in/out submission
 * Extracted from ClockInOutScreen for separation of concerns
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/store';
import { clockIn, clockOut, getCurrentShift } from '../services/api/shiftsApi';
import { getMySchedule } from '../services/api/schedulesApi';
import { setCurrentShift } from '../store/slices/shiftSlice';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { isClockInLate } from '../utils/dateUtils';
import { requestClockInPermissions, requestCameraPermission } from '../services/permissions';
import { locationTracker } from '../services/location/locationTracker';
import { mediaService, type Photo } from '../services/media';
import type { ShiftDefinition } from '../types/models.types';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useClockInOut() {
  const dispatch = useAppDispatch();

  const { assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
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
  // The worker's ASSIGNED shift (from their roster /schedules/my) — the source of
  // truth for "your scheduled shift", independent of what time they clock in.
  const [assignedShiftDef, setAssignedShiftDef] = useState<ShiftDefinition | null>(null);

  const isClockIn = !currentShift;

  // Prefer the roster assignment; fall back to the shift they clocked into.
  const scheduledShift: ShiftDefinition | null =
    assignedShiftDef ?? currentShift?.shift_definition ?? null;

  // Late = clocked in (or, before clock-in, the current moment) after the
  // scheduled start_time. False when no schedule or for overtime shifts.
  const isLate = useMemo(() => {
    if (!scheduledShift?.start_time || currentShift?.is_overtime) {
      return false;
    }
    const reference = currentShift?.clock_in_time ?? new Date().toISOString();
    return isClockInLate(reference, scheduledShift.start_time);
  }, [scheduledShift, currentShift]);

  // Fetch the worker's assigned schedule so the screen can show the scheduled
  // shift window + a late indicator (in both clock-in and clock-out modes).
  useEffect(() => {
    let active = true;
    getMySchedule()
      .then((res) => {
        if (active && res.data?.shift_definition) {
          setAssignedShiftDef(res.data.shift_definition);
        }
      })
      .catch(() => {
        /* non-blocking — schedule info is supplementary */
      });
    return () => {
      active = false;
    };
  }, []);

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

    if (assignedArea) {
      const within = isWithinAreaBoundary(latitude, longitude, assignedArea);
      setIsWithinBoundary(within);
    }
  }, [assignedArea]);

  const getCurrentLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    Geolocation.getCurrentPosition(
      handleLocationSuccess,
      (error) => {
        if (__DEV__) { console.error('Location error:', error); }

        let errorMessage = 'Tidak dapat mendapatkan lokasi.';
        switch (error.code) {
          case 1: errorMessage = 'Izin lokasi ditolak. Aktifkan di pengaturan.'; break;
          case 2: errorMessage = 'GPS tidak tersedia. Pastikan GPS aktif.'; break;
          case 3: errorMessage = 'Waktu habis. Coba di area terbuka.'; break;
          case 4: errorMessage = 'Google Play Services tidak tersedia.'; break;
          case 5: errorMessage = 'Pengaturan lokasi tidak memenuhi. Aktifkan GPS.'; break;
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

          if (assignedArea) {
            const within = isWithinAreaBoundary(latitude, longitude, assignedArea);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCurrentLocation is a stable callback; effect runs once on mount and when assignedArea changes
  }, [assignedArea]);

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
      Alert.alert('Izin Kamera', 'Akses kamera diperlukan. Aktifkan di Pengaturan aplikasi.');
      return;
    }
    try {
      const photo = await mediaService.capturePhoto(true);
      if (photo) { setSelfie(photo); }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Gagal membuka kamera');
    }
  }, []);

  const handleClockIn = useCallback(async (onSuccess: () => void) => {
    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', 'Lokasi belum tersedia. Tunggu GPS mendapatkan lokasi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selfieBase64 = selfie ? await mediaService.convertToBase64(selfie) : undefined;

      const response = await clockIn(location.latitude, location.longitude, selfieBase64);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Gagal clock in');
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
      Alert.alert('Berhasil', 'Berhasil clock in!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error: any) {
      console.error('Clock-in error:', error);
      Alert.alert(
        'Gagal Clock In',
        error.response?.data?.message || error.message || 'Gagal clock in. Silakan coba lagi.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [location, selfie, dispatch]);

  const handleClockOut = useCallback(async (onSuccess: () => void) => {
    if (!currentShift) {
      Alert.alert('Error', 'Tidak ada shift aktif');
      return;
    }
    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', 'Lokasi belum tersedia. Tunggu GPS mendapatkan lokasi.');
      return;
    }

    Alert.alert(
      'Konfirmasi Clock Out',
      'Apakah Anda yakin ingin mengakhiri shift?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Clock Out',
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
                Alert.alert('Gagal Clock Out', errMsg);
                return;
              }

              setSelfie(null);
              dispatch(setCurrentShift(null));
              Alert.alert('Berhasil', 'Berhasil clock out!', [
                { text: 'OK', onPress: onSuccess },
              ]);
            } catch (error: any) {
              console.error('Clock-out error:', error);
              Alert.alert(
                'Gagal Clock Out',
                error.response?.data?.message || error.message || 'Gagal clock out. Silakan coba lagi.',
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

  return {
    location,
    selfie,
    isSubmitting,
    isWithinBoundary,
    timer,
    isClockIn,
    isOnline,
    assignedArea,
    currentShift,
    scheduledShift,
    isLate,
    getCurrentLocation,
    handleCaptureSelfie,
    handleClockIn,
    handleClockOut,
  };
}
