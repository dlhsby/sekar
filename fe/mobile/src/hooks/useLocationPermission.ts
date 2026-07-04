/**
 * useLocationPermission Hook
 * Monitors location permission status and GPS availability
 * Prompts user to enable location when disabled during active shift
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Alert, Linking, Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS, PermissionStatus } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import i18n from '../i18n/config';
import { requestLocationPermission } from '../services/permissions/permissionService';

export interface LocationPermissionState {
  /** Whether location permission is granted */
  permissionGranted: boolean;
  /** Whether GPS/location services are enabled on device */
  gpsEnabled: boolean;
  /** Whether both permission and GPS are available */
  isLocationAvailable: boolean;
  /** Current permission status from react-native-permissions */
  permissionStatus: PermissionStatus | null;
  /** Whether currently checking status */
  isChecking: boolean;
  /** Last error message if any */
  error: string | null;
}

export interface UseLocationPermissionOptions {
  /** Whether to monitor permission changes (default: true) */
  enableMonitoring?: boolean;
  /** Whether to show alerts when permission/GPS is unavailable (default: true) */
  showAlerts?: boolean;
  /** Callback when permission becomes unavailable during active monitoring */
  onPermissionLost?: () => void;
  /** Callback when GPS becomes unavailable during active monitoring */
  onGpsDisabled?: () => void;
  /** Check interval in milliseconds when app is active (default: 300000 = 5 minutes) */
  checkInterval?: number;
}

/**
 * Hook to monitor location permission and GPS status
 * Useful for detecting when user disables GPS or revokes permission mid-shift
 */
export function useLocationPermission(options: UseLocationPermissionOptions = {}) {
  const {
    enableMonitoring = true,
    showAlerts = true,
    onPermissionLost,
    onGpsDisabled,
    checkInterval = 300000, // 5 minutes (Issue 5: was 30 seconds, too aggressive)
  } = options;

  // Store callbacks in refs to avoid dependency changes causing infinite loops
  // This prevents re-creating checkLocationStatus when parent passes inline callbacks
  const onPermissionLostRef = useRef(onPermissionLost);
  const onGpsDisabledRef = useRef(onGpsDisabled);

  // Update refs when callbacks change (without triggering re-renders)
  useEffect(() => {
    onPermissionLostRef.current = onPermissionLost;
  }, [onPermissionLost]);

  useEffect(() => {
    onGpsDisabledRef.current = onGpsDisabled;
  }, [onGpsDisabled]);

  const [state, setState] = useState<LocationPermissionState>({
    permissionGranted: false,
    gpsEnabled: false,
    isLocationAvailable: false,
    permissionStatus: null,
    isChecking: true,
    error: null,
  });

  // Issue 4: Track if component is mounted for cleanup safety
  const mountedRef = useRef(true);
  // Issue 3: Track GPS request ID to prevent race conditions
  const gpsRequestIdRef = useRef(0);
  // Track previous state for detecting changes
  const prevStateRef = useRef<LocationPermissionState>(state);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Store alert functions in refs to avoid circular dependency
  const showPermissionAlertRef = useRef<() => void>(() => {});
  const showGpsAlertRef = useRef<() => void>(() => {});

  /**
   * Check location permission status
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const status = await check(permission);
      const granted = status === RESULTS.GRANTED;

      // Issue 4: Check if still mounted before updating state
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          permissionGranted: granted,
          permissionStatus: status,
        }));
      }

      return granted;
    } catch (error) {
      console.error('[useLocationPermission] Error checking permission:', error);
      return false;
    }
  }, []);

  /**
   * Check if GPS/location services are enabled
   * Issue 3: Uses request ID to prevent race conditions from stale requests
   */
  const checkGpsEnabled = useCallback(async (): Promise<boolean> => {
    // Issue 3: Increment request ID to track this specific request
    const requestId = ++gpsRequestIdRef.current;

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        () => {
          // Issue 3: Ignore stale responses from earlier requests
          if (requestId !== gpsRequestIdRef.current) {
            resolve(true); // Resolve but don't update state
            return;
          }
          // Issue 4: Check if still mounted
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              gpsEnabled: true,
              error: null,
            }));
          }
          resolve(true);
        },
        (error) => {
          // Issue 3: Ignore stale responses from earlier requests
          if (requestId !== gpsRequestIdRef.current) {
            resolve(false); // Resolve but don't update state
            return;
          }
          // Error code 2 = POSITION_UNAVAILABLE (GPS disabled)
          const isGpsDisabled = error.code === 2;
          // Issue 4: Check if still mounted
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              gpsEnabled: !isGpsDisabled,
              error: isGpsDisabled ? i18n.t('location:errors.gpsDisabled') : null,
            }));
          }
          resolve(!isGpsDisabled);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  /**
   * Check both permission and GPS status
   * Issue 2: Inline state change detection to avoid circular dependency
   * Fix: Use refs for callbacks to prevent infinite loops from inline callback props
   */
  const checkLocationStatus = useCallback(async () => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, isChecking: true }));
    }

    try {
      const [permissionOk, gpsOk] = await Promise.all([
        checkPermission(),
        checkGpsEnabled(),
      ]);

      const isAvailable = permissionOk && gpsOk;

      if (mountedRef.current) {
        setState(prev => {
          const newState = {
            ...prev,
            isLocationAvailable: isAvailable,
            isChecking: false,
          };

          // Issue 2: Inline state change detection
          // Use setTimeout to avoid calling callbacks during setState
          const prevState = prevStateRef.current;

          // Check if permission was revoked
          if (prevState.permissionGranted && !permissionOk) {
            console.debug('[useLocationPermission] Permission was revoked');
            setTimeout(() => {
              if (mountedRef.current) {
                // Use ref to get latest callback without causing dependency changes
                onPermissionLostRef.current?.();
                if (showAlerts) {
                  showPermissionAlertRef.current();
                }
              }
            }, 0);
          }

          // Check if GPS was disabled
          if (prevState.gpsEnabled && !gpsOk) {
            console.debug('[useLocationPermission] GPS was disabled');
            setTimeout(() => {
              if (mountedRef.current) {
                // Use ref to get latest callback without causing dependency changes
                onGpsDisabledRef.current?.();
                if (showAlerts) {
                  showGpsAlertRef.current();
                }
              }
            }, 0);
          }

          // Update prevStateRef for next comparison
          prevStateRef.current = newState;

          return newState;
        });
      }

      return { permissionOk, gpsOk, isAvailable };
    } catch (error) {
      console.error('[useLocationPermission] Error checking status:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isChecking: false,
          error: i18n.t('location:checkStatusFailed'),
        }));
      }
      return { permissionOk: false, gpsOk: false, isAvailable: false };
    }
  }, [checkPermission, checkGpsEnabled, showAlerts]);

  /**
   * Internal alert for permission denied/blocked
   * Issue 4: Does not check showAlerts (caller handles that)
   */
  const showPermissionAlertInternal = useCallback(() => {
    // Issue 4: Check if still mounted before showing alert
    if (!mountedRef.current) {return;}

    Alert.alert(
      i18n.t('location:permissionAlert.title'),
      i18n.t('location:permissionAlert.message'),
      [
        { text: i18n.t('location:permissionAlert.later'), style: 'cancel' },
        {
          text: i18n.t('location:permissionAlert.openSettings'),
          onPress: () => {
            // Issue 4: Check mounted before executing callback
            if (mountedRef.current) {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }, []);

  /**
   * Internal alert for GPS disabled
   * Issue 4: Does not check showAlerts (caller handles that)
   */
  const showGpsAlertInternal = useCallback(() => {
    // Issue 4: Check if still mounted before showing alert
    if (!mountedRef.current) {return;}

    Alert.alert(
      i18n.t('location:gpsAlert.title'),
      i18n.t('location:gpsAlert.message'),
      [
        { text: i18n.t('location:gpsAlert.later'), style: 'cancel' },
        {
          text: i18n.t('location:gpsAlert.openSettings'),
          onPress: () => {
            // Issue 4: Check mounted before executing callback
            if (!mountedRef.current) {return;}

            // On Android, we can open location settings directly
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
                if (mountedRef.current) {
                  Linking.openSettings();
                }
              });
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }, []);

  // Update refs when internal alert functions change
  useEffect(() => {
    showPermissionAlertRef.current = showPermissionAlertInternal;
  }, [showPermissionAlertInternal]);

  useEffect(() => {
    showGpsAlertRef.current = showGpsAlertInternal;
  }, [showGpsAlertInternal]);

  /**
   * Show alert for permission denied/blocked (public API)
   */
  const showPermissionAlert = useCallback(() => {
    if (!showAlerts) {return;}
    showPermissionAlertInternal();
  }, [showAlerts, showPermissionAlertInternal]);

  /**
   * Show alert for GPS disabled (public API)
   */
  const showGpsAlert = useCallback(() => {
    if (!showAlerts) {return;}
    showGpsAlertInternal();
  }, [showAlerts, showGpsAlertInternal]);

  /**
   * Handle app state changes (background/foreground)
   */
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    // Check status when app comes to foreground
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.debug('[useLocationPermission] App became active, checking status');
      await checkLocationStatus();
    }
    appStateRef.current = nextAppState;
  }, [checkLocationStatus]);

  // Initial check and setup monitoring
  useEffect(() => {
    // Issue 4: Set mounted flag
    mountedRef.current = true;

    // Initial check
    checkLocationStatus();

    if (!enableMonitoring) {
      return () => {
        mountedRef.current = false;
      };
    }

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Periodic check while app is active
    intervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkLocationStatus();
      }
    }, checkInterval);

    return () => {
      // Issue 4: Mark as unmounted before cleanup
      mountedRef.current = false;
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enableMonitoring, checkInterval, checkLocationStatus, handleAppStateChange]);

  // Issue 2: REMOVED circular dependency effect that watched state
  // State change detection is now inlined in checkLocationStatus

  /**
   * Manually trigger a refresh of permission/GPS status
   */
  const refresh = useCallback(async () => {
    return checkLocationStatus();
  }, [checkLocationStatus]);

  /**
   * Request permission (useful if permission was denied/revoked)
   * Issue 6: Uses static import instead of dynamic import
   */
  const requestPermissionHandler = useCallback(async () => {
    try {
      const result = await requestLocationPermission();

      if (result.granted) {
        await checkLocationStatus();
      }

      return result;
    } catch (error) {
      console.error('[useLocationPermission] Error requesting permission:', error);
      return {
        granted: false,
        status: 'denied' as PermissionStatus,
        message: 'Failed to request permission',
      };
    }
  }, [checkLocationStatus]);

  return {
    ...state,
    refresh,
    requestPermission: requestPermissionHandler,
    showPermissionAlert,
    showGpsAlert,
  };
}

export default useLocationPermission;
