/**
 * useHomeLocation Hook
 * Manages GPS location state and boundary check for HomeScreen LocationStatusCard.
 * Phase 2D-11: Home Screen Location Card
 */

import { useState, useEffect, useCallback } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { useAppSelector } from '../store/hooks';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { locationTracker } from '../services/location/locationTracker';

export interface HomeLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isWithinArea: boolean;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: HomeLocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isWithinArea: false,
  loading: false,
  error: null,
};

export function useHomeLocation() {
  const { assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
  const hasActiveShift = !!currentShift;

  const [location, setLocation] = useState<HomeLocationState>(INITIAL_STATE);

  const fetchLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const withinArea = assignedArea
          ? isWithinAreaBoundary(latitude, longitude, assignedArea)
          : false;

        setLocation({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          isWithinArea: withinArea,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: error.message || 'Gagal mendapatkan lokasi',
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  }, [assignedArea]);

  const refresh = useCallback(() => {
    fetchLocation();
    // Trigger location tracker capture + upload for backend sync
    locationTracker.captureNow();
    locationTracker.forceUpload();
  }, [fetchLocation]);

  // Auto-fetch on mount when shift is active
  useEffect(() => {
    if (hasActiveShift) {
      fetchLocation();
    } else {
      setLocation(INITIAL_STATE);
    }
  }, [hasActiveShift, fetchLocation]);

  return { location, refresh, hasActiveShift };
}
