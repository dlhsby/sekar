/**
 * useHomeLocation Hook
 * Manages GPS location state and boundary check for HomeScreen LocationStatusCard.
 * Phase 2D-11: Home Screen Location Card
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { readPosition } from '../services/location/verifiedPosition';
import { describeLocationError } from '../services/location/locationErrors';
import { useAppSelector } from '../store/hooks';
import { isWithinAreaBoundary } from '../utils/gpsUtils';
import { locationTracker, type LocationPing } from '../services/location/locationTracker';
import { useTodayRoster } from './useTodayRoster';
import { useAllDistrictAreas, type GeofenceArea } from './useAllDistrictAreas';
import { resolveScheduleScope } from '../utils/scheduleScope';
import { buildMapArea, type MapArea } from '../utils/mapUtils';

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
  // City scope has no single polygon; geofence against every rayon (inside any =
  // inside Surabaya). Only fetched for a city-scope worker.
  const cityAreas = useAllDistrictAreas(scheduleScope.scope === 'city');
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
  // assigned rayon/kawasan boundary → every rayon (city scope) → the standing
  // assignment. A worker is "in area" if inside ANY of these. Empty for a
  // genuinely ad-hoc worker (no boundary to be inside/outside of).
  const boundaryAreas = useMemo<GeofenceArea[]>(() => {
    const rosterLocation =
      roster?.location?.gps_lat != null && roster.location.gps_lng != null ? roster.location : null;
    if (currentShift?.area) return [currentShift.area];
    if (rosterLocation) return [rosterLocation];
    if (scopeBoundary) return [scopeBoundary];
    if (scheduleScope.scope === 'city' && cityAreas.length > 0) return cityAreas;
    if (assignedArea) return [assignedArea];
    return [];
  }, [currentShift, roster, scopeBoundary, scheduleScope, cityAreas, assignedArea]);

  // Whether there is a real polygon to test — drives the hero's inside/outside
  // pill vs a neutral "scope, no boundary" state.
  const hasBoundary = boundaryAreas.some((a) => !!a.boundary_polygon);

  const [location, setLocation] = useState<HomeLocationState>(INITIAL_STATE);

  // The area to draw on the LocationMapModal, built with the SAME shared builder
  // the clock-in/out screen uses so the home hero's map is identical to it. With
  // several areas (city scope → all rayons) draw the one the worker is inside.
  const mapArea = useMemo<MapArea | undefined>(() => {
    if (boundaryAreas.length === 0) return undefined;
    const primary =
      boundaryAreas.length > 1 && location.latitude != null && location.longitude != null
        ? boundaryAreas.find((a) =>
            isWithinAreaBoundary(location.latitude!, location.longitude!, a),
          ) ?? boundaryAreas[0]
        : boundaryAreas[0];
    return buildMapArea(primary);
  }, [boundaryAreas, location.latitude, location.longitude]);

  const fetchLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    // allowMocked: the home card only *displays* where the worker appears to be.
    // Nothing is recorded from it, and the punch flow re-reads position under
    // full enforcement, so blocking here would strand an emulator for no gain.
    readPosition({
      allowMocked: true,
      geoOptions: { timeout: 15000, maximumAge: 10000 },
    })
      .then(({ latitude, longitude, accuracy }) => {
        const withinArea = boundaryAreas.some((a) =>
          isWithinAreaBoundary(latitude, longitude, a),
        );

        setLocation({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          isWithinArea: withinArea,
          loading: false,
          error: null,
          updatedAt: new Date(),
        });
      })
      .catch((error) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: describeLocationError(error),
        }));
      });
  }, [boundaryAreas]);

  const refresh = useCallback(() => {
    fetchLocation();
    // Capture AND upload, in that order. These used to be two calls: the upload
    // ran while the GPS read was still in flight, found an empty buffer and
    // returned, so pressing Refresh updated the card on screen but sent nothing
    // to the server. `upload: true` also keeps the ping past the stationary
    // thinning — a worker who has not moved still pressed the button.
    void locationTracker.captureNow({ upload: true });
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
      const withinArea = boundaryAreas.some((a) =>
        isWithinAreaBoundary(ping.latitude, ping.longitude, a),
      );
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
  }, [hasActiveShift, boundaryAreas]);

  return {
    location,
    refresh,
    hasActiveShift,
    hasBoundary,
    mapArea,
    scheduleScope,
  };
}
