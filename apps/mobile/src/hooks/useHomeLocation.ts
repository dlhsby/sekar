/**
 * useHomeLocation Hook
 * Manages GPS location state and boundary check for HomeScreen LocationStatusCard.
 * Phase 2D-11: Home Screen Location Card
 */

import { useState, useEffect, useCallback } from 'react';
import i18n from '../i18n/config';
import Geolocation from 'react-native-geolocation-service';
import { useAppSelector } from '../store/hooks';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { locationTracker, type LocationPing } from '../services/location/locationTracker';

export interface HomeLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isWithinArea: boolean;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
}

const INITIAL_STATE: HomeLocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  isWithinArea: false,
  loading: false,
  error: null,
  updatedAt: null,
};

export function useHomeLocation() {
  const { assignedArea } = useAppSelector((state) => state.auth);
  const { currentShift } = useAppSelector((state) => state.shift);
  const hasActiveShift = !!currentShift;
  // During an active shift, check against the area actually clocked into; fall
  // back to the standing assigned area. Null for unscheduled/ad-hoc workers.
  const boundaryArea = currentShift?.location ?? assignedArea ?? null;

  const [location, setLocation] = useState<HomeLocationState>(INITIAL_STATE);

  const fetchLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const withinArea = boundaryArea
          ? isWithinAreaBoundary(latitude, longitude, boundaryArea)
          : false;

        setLocation({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          isWithinArea: withinArea,
          loading: false,
          error: null,
          updatedAt: new Date(),
        });
      },
      (error) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: error.message || i18n.t('location:getFailed'),
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  }, [boundaryArea]);

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

  // Auto-update location card on every GPS capture from the tracker
  useEffect(() => {
    if (!hasActiveShift) return;

    const handleLocationUpdate = (ping: LocationPing) => {
      const withinArea = boundaryArea
        ? isWithinAreaBoundary(ping.latitude, ping.longitude, boundaryArea)
        : false;
      setLocation({
        latitude: ping.latitude,
        longitude: ping.longitude,
        accuracy: ping.accuracy,
        isWithinArea: withinArea,
        loading: false,
        error: null,
        updatedAt: new Date(),
      });
    };

    locationTracker.on('locationUpdate', handleLocationUpdate);
    return () => {
      locationTracker.off('locationUpdate', handleLocationUpdate);
    };
  }, [hasActiveShift, boundaryArea]);

  return { location, refresh, hasActiveShift };
}
