/**
 * useHomeLocation Hook
 * Manages GPS location state and boundary check for HomeScreen LocationStatusCard.
 * Phase 2D-11: Home Screen Location Card
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import i18n from '../i18n/config';
import Geolocation from 'react-native-geolocation-service';
import { useAppSelector } from '../store/hooks';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { locationTracker, type LocationPing } from '../services/location/locationTracker';
import { useTodayRoster } from './useTodayRoster';
import { resolveScheduleScope } from '../utils/scheduleScope';

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

  // Today's roster carries the assigned scope. A rayon/kawasan assignment names
  // no lokasi but HAS its own boundary polygon — geofence against it so the home
  // hero shows real inside/outside for scope workers too (mirrors useClockInOut).
  const { roster } = useTodayRoster();
  const scheduleScope = useMemo(() => resolveScheduleScope(roster), [roster]);
  const scopeBoundary = useMemo(() => {
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

  // Boundary priority: the lokasi clocked into → today's roster lokasi → the
  // assigned rayon/kawasan boundary → the standing assignment. Null for a
  // genuinely ad-hoc worker (no boundary to be inside/outside of).
  const boundaryArea = useMemo(() => {
    const rosterLocation =
      roster?.location?.gps_lat != null && roster.location.gps_lng != null ? roster.location : null;
    return currentShift?.area ?? rosterLocation ?? scopeBoundary ?? assignedArea ?? null;
  }, [currentShift, roster, scopeBoundary, assignedArea]);

  // Whether there is a real polygon to test — drives the hero's inside/outside
  // pill vs a neutral "scope, no boundary" state.
  const hasBoundary = !!(boundaryArea && (boundaryArea as { boundary_polygon?: unknown }).boundary_polygon);

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

  return { location, refresh, hasActiveShift, hasBoundary };
}
