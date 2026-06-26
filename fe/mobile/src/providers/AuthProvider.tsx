/**
 * Auth Provider
 * Handles authentication restoration on app startup
 * Starts location tracking if worker has an active shift
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { restoreAuth, setRestoring, logout, setAssignedAreas } from '../store/slices/authSlice';
import { setCurrentShift } from '../store/slices/shiftSlice';
import { getToken, getUser, clearAll } from '../services/storage/secureStorage';
import { getMe } from '../services/api/authApi';
import { getMyAreas } from '../services/api/usersApi';
import { getCurrentShift } from '../services/api/shiftsApi';
import { locationTracker } from '../services/location/locationTracker';
import { permissionManager } from '../services/permissions/PermissionManager';
import { nbColors } from '../constants/nbTokens';
import type { AppDispatch } from '../store/store';
import { CLOCKABLE_ROLES } from '../constants/roles';
import type { UserRole } from '../types/models.types';
import type { CurrentShiftResponse } from '../types/api.types';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Load current shift for clockable role users and start location tracking if active.
 * Only clockable roles (satgas, linmas, korlap) have shifts.
 * This is called after auth restoration to sync shift state with the backend.
 */
/**
 * Fetch the worker's assigned areas (permanent + task_based) for multi-area
 * geofencing + the "Jadwal Saya" screen. Boundary polygons are flattened to
 * [lng,lat][] for the mobile gpsUtils. Best-effort — never blocks auth.
 */
async function loadAssignedAreas(userRole: string, dispatch: AppDispatch): Promise<void> {
  if (!CLOCKABLE_ROLES.includes(userRole as UserRole)) {
    return;
  }
  try {
    const response = await getMyAreas();
    if (response.data) {
      const areas = response.data.map((a) => {
        const poly = (a as any)?.boundary_polygon;
        return { ...a, boundary_polygon: poly?.coordinates?.[0] ?? poly ?? undefined };
      });
      dispatch(setAssignedAreas(areas));
    }
  } catch (error) {
    if (__DEV__) { console.warn('[AuthProvider] Failed to load assigned areas:', error); }
  }
}

async function loadShiftForClockableRole(userRole: string, dispatch: AppDispatch): Promise<void> {
  if (!CLOCKABLE_ROLES.includes(userRole as UserRole)) {
    return;
  }

  try {
    const response = await getCurrentShift();

    if (response.data) {
      // Worker has an active shift
      const shift = response.data as CurrentShiftResponse;
      dispatch(setCurrentShift(shift));

      // Start location tracking only if permission onboarding is complete
      if (shift.id) {
        const onboardingComplete = await permissionManager.hasCompletedOnboarding();
        const hasLocationPermission = await permissionManager.checkLocationPermission();

        if (onboardingComplete && hasLocationPermission) {
          if (__DEV__) { console.debug('[AuthProvider] Active shift found and permissions granted, starting location tracking'); }
          await locationTracker.initialize(String(shift.id));
        } else {
          if (__DEV__) { console.debug('[AuthProvider] Active shift found but permissions not complete, skipping location tracking'); }
        }
      }
    } else {
      // No active shift (404 or no data)
      dispatch(setCurrentShift(null));
    }
  } catch (error: any) {
    // 404 = no active shift, set null (expected state for workers who haven't clocked in)
    if (error?.response?.status === 404) {
      dispatch(setCurrentShift(null));
      return;
    }
    // Other errors: log but don't crash app - shift state will remain as-is
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (__DEV__) { console.warn('[AuthProvider] Failed to load current shift:', message); }
  }
}

/**
 * AuthProvider component
 * Restores authentication state from secure storage on app startup
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { isRestoring } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getToken();
        const storedUser = await getUser();

        if (token && storedUser) {
          // Validate token by fetching current user from API with timeout
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 10000)
          );

          try {
            const meResponse = await Promise.race([getMe(), timeoutPromise]);

            if (meResponse.data) {
              // Token is valid, restore auth state with latest area/rayon data
              // Transform GeoJSON Polygon → flat [lng, lat][] for mobile gpsUtils
              const rawArea = meResponse.data.assigned_area;
              const rawPolygon = (rawArea as any)?.boundary_polygon;
              const assignedArea = rawArea
                ? { ...rawArea, boundary_polygon: rawPolygon?.coordinates?.[0] ?? undefined }
                : null;
              const updatedUser = {
                ...storedUser,
                area_id: meResponse.data.area_id ?? storedUser.area_id,
                rayon_id: meResponse.data.rayon_id ?? storedUser.rayon_id,
              };
              dispatch(
                restoreAuth({
                  user: updatedUser,
                  area: assignedArea,
                }),
              );
            } else {
              // Token invalid or API error, fall back to cached data
              if (__DEV__) { console.warn('[AuthProvider] API validation failed, using cached credentials'); }
              dispatch(
                restoreAuth({
                  user: storedUser,
                  area: null,
                }),
              );
            }
            // Load shift after auth restoration (workers only)
            // This will also start location tracking if there's an active shift
            await loadShiftForClockableRole(storedUser.role, dispatch);
            // Load the worker's assigned areas (multi-area geofence + Jadwal Saya)
            await loadAssignedAreas(storedUser.role, dispatch);
          } catch (networkError) {
            // Network timeout or error - use cached credentials
            if (__DEV__) { console.warn('[AuthProvider] Network timeout, using cached credentials:', networkError); }
            dispatch(
              restoreAuth({
                user: storedUser,
                area: null,
              }),
            );
            // Still try to load shift (might work if it's just API server being slow)
            await loadShiftForClockableRole(storedUser.role, dispatch);
          }
        } else {
          // No stored credentials, just finish restoring
          dispatch(setRestoring(false));
        }
      } catch (error) {
        if (__DEV__) { console.error('[AuthProvider] Failed to restore session:', error); }
        // On critical error, clear storage and finish restoring
        await clearAll();
        dispatch(logout());
        dispatch(setRestoring(false));
      }
    };

    restoreSession();
  }, [dispatch]);

  if (isRestoring) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={nbColors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.bgCanvas,
  },
});
