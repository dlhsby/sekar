/**
 * Permission Service
 * Handles runtime permission requests for location and camera
 */

import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, PermissionStatus } from 'react-native-permissions';

export type PermissionType = 'location' | 'camera';

interface PermissionResult {
  granted: boolean;
  status: PermissionStatus;
  message?: string;
}

/**
 * Request location permission (fine location for GPS)
 */
export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    // Check current status
    let status = await check(permission);

    // If not determined, request permission
    if (status === RESULTS.DENIED) {
      status = await request(permission);
    }

    // Handle different statuses
    switch (status) {
      case RESULTS.GRANTED:
        return {
          granted: true,
          status,
          message: 'Location permission granted',
        };

      case RESULTS.DENIED:
        return {
          granted: false,
          status,
          message: 'Location permission denied. Please enable it in settings to clock in.',
        };

      case RESULTS.BLOCKED:
      case RESULTS.LIMITED:
        return {
          granted: false,
          status,
          message:
            'Location permission is blocked. Please enable it in your device settings to use this feature.',
        };

      default:
        return {
          granted: false,
          status,
          message: 'Location permission is not available on this device.',
        };
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return {
      granted: false,
      status: RESULTS.UNAVAILABLE,
      message: 'Failed to request location permission. Please try again.',
    };
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  try {
    const permission =
      Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

    // Check current status
    let status = await check(permission);

    // If not determined, request permission
    if (status === RESULTS.DENIED) {
      status = await request(permission);
    }

    // Handle different statuses
    switch (status) {
      case RESULTS.GRANTED:
        return {
          granted: true,
          status,
          message: 'Camera permission granted',
        };

      case RESULTS.DENIED:
        return {
          granted: false,
          status,
          message: 'Camera permission denied. Please enable it in settings to take photos.',
        };

      case RESULTS.BLOCKED:
      case RESULTS.LIMITED:
        return {
          granted: false,
          status,
          message:
            'Camera permission is blocked. Please enable it in your device settings to use this feature.',
        };

      default:
        return {
          granted: false,
          status,
          message: 'Camera permission is not available on this device.',
        };
    }
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return {
      granted: false,
      status: RESULTS.UNAVAILABLE,
      message: 'Failed to request camera permission. Please try again.',
    };
  }
}

/**
 * Check if location permission is granted
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const status = await check(permission);
    return status === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

/**
 * Check if camera permission is granted
 */
export async function checkCameraPermission(): Promise<boolean> {
  try {
    const permission =
      Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

    const status = await check(permission);
    return status === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
}

/**
 * Check all required permissions for clock-in
 */
export async function checkClockInPermissions(): Promise<{
  location: boolean;
  camera: boolean;
  allGranted: boolean;
}> {
  const location = await checkLocationPermission();
  const camera = await checkCameraPermission();

  return {
    location,
    camera,
    allGranted: location && camera,
  };
}

/**
 * Show alert for blocked permission with option to open settings
 */
export function showPermissionBlockedAlert(permissionType: PermissionType): void {
  const permissionName = permissionType === 'location' ? 'Location' : 'Camera';

  Alert.alert(
    `${permissionName} Permission Required`,
    `${permissionName} access is required for this feature. Please enable it in your device settings.`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ],
  );
}

/**
 * Show alert for denied permission
 */
export function showPermissionDeniedAlert(permissionType: PermissionType): void {
  const permissionName = permissionType === 'location' ? 'Location' : 'Camera';

  Alert.alert(
    `${permissionName} Permission Denied`,
    `${permissionName} access is required for this feature. Please grant permission to continue.`,
    [{ text: 'OK' }],
  );
}

/**
 * Request all permissions required for clock-in
 */
export async function requestClockInPermissions(): Promise<{
  success: boolean;
  message?: string;
}> {
  // Request location permission
  const locationResult = await requestLocationPermission();
  if (!locationResult.granted) {
    if (locationResult.status === RESULTS.BLOCKED) {
      showPermissionBlockedAlert('location');
    }
    return {
      success: false,
      message: locationResult.message,
    };
  }

  // Request camera permission
  const cameraResult = await requestCameraPermission();
  if (!cameraResult.granted) {
    if (cameraResult.status === RESULTS.BLOCKED) {
      showPermissionBlockedAlert('camera');
    }
    return {
      success: false,
      message: cameraResult.message,
    };
  }

  return {
    success: true,
    message: 'All permissions granted',
  };
}
