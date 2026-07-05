/**
 * Permission Manager Service
 *
 * Comprehensive permission management for SEKAR mobile app.
 * Handles requesting and checking all app permissions in the correct order:
 * 1. Notification Permission (POST_NOTIFICATIONS on Android 13+)
 * 2. Location Permission (ACCESS_FINE_LOCATION)
 * 3. Background Location Permission (ACCESS_BACKGROUND_LOCATION on Android 10+)
 * 4. Camera Permission (lazy - only when needed)
 *
 * Features:
 * - Sequential permission requests with user-friendly explanations
 * - Permission status persistence to avoid re-requesting
 * - MIUI-specific guidance for background location
 * - Fallback handling for denied permissions
 */

import { Platform, Linking } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  PermissionStatus,
  checkNotifications,
  requestNotifications,
} from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../i18n/config';

/**
 * Permission types supported by the app
 */
export enum PermissionType {
  NOTIFICATIONS = 'notifications',
  LOCATION = 'location',
  BACKGROUND_LOCATION = 'background_location',
  CAMERA = 'camera',
  GALLERY = 'gallery',
}

/**
 * Permission status result
 */
export interface PermissionResult {
  granted: boolean;
  status: PermissionStatus;
  canRequest: boolean; // Whether we can request permission (not blocked)
  message?: string;
}

/**
 * All permissions status
 */
export interface AllPermissionsStatus {
  notifications: PermissionResult;
  location: PermissionResult;
  backgroundLocation: PermissionResult;
  camera: PermissionResult;
  gallery: PermissionResult;
}

/**
 * Storage keys for permission status
 */
const STORAGE_KEYS = {
  NOTIFICATIONS_REQUESTED: '@permissions/notifications_requested',
  LOCATION_REQUESTED: '@permissions/location_requested',
  BACKGROUND_LOCATION_REQUESTED: '@permissions/background_location_requested',
  CAMERA_REQUESTED: '@permissions/camera_requested',
  GALLERY_REQUESTED: '@permissions/gallery_requested',
  ONBOARDING_COMPLETED: '@permissions/onboarding_completed',
} as const;

/**
 * Resolve the right gallery permission for the current platform / API level.
 *
 * - Android 13+ (API 33+): READ_MEDIA_IMAGES (scoped media access).
 * - Android < 13: READ_EXTERNAL_STORAGE.
 * - iOS: PHOTO_LIBRARY.
 */
function resolveGalleryPermission() {
  if (Platform.OS === 'ios') {
    return PERMISSIONS.IOS.PHOTO_LIBRARY;
  }
  if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
    return PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
  }
  return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
}

/**
 * Permission Manager Class
 *
 * Singleton service to manage all app permissions
 */
class PermissionManager {
  private static instance: PermissionManager;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Check if permission onboarding has been completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return completed === 'true';
    } catch (error) {
      console.error('[PermissionManager] Failed to check onboarding status:', error);
      return false;
    }
  }

  /**
   * Check if permission onboarding has been completed
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return completed === 'true';
    } catch (error) {
      console.error('[PermissionManager] Failed to check onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark permission onboarding as completed
   */
  async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (error) {
      console.error('[PermissionManager] Failed to set onboarding completed:', error);
    }
  }

  /**
   * Reset onboarding status (for testing)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeMany(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('[PermissionManager] Failed to reset onboarding:', error);
    }
  }

  /**
   * Check notification permission status
   */
  async checkNotificationPermission(): Promise<PermissionResult> {
    try {
      const { status } = await checkNotifications();

      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED || status === RESULTS.LIMITED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.notifications.granted')
          : i18n.t('profile:permissions.notifications.required'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to check notification permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.notifications.checkFailed'),
      };
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<PermissionResult> {
    try {
      console.debug('[PermissionManager] Requesting notification permission');

      // Check if already requested before
      const alreadyRequested = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_REQUESTED);

      const { status } = await requestNotifications(['alert', 'badge', 'sound']);

      // Mark as requested
      if (!alreadyRequested) {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_REQUESTED, 'true');
      }

      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED || status === RESULTS.LIMITED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.notifications.requestSuccess')
          : status === RESULTS.BLOCKED
          ? i18n.t('profile:permissions.notifications.requestBlocked')
          : i18n.t('profile:permissions.notifications.requestDenied'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to request notification permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.notifications.requestFailed'),
      };
    }
  }

  /**
   * Check location permission status
   */
  async checkLocationPermission(): Promise<PermissionResult> {
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const status = await check(permission);
      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.location.granted')
          : i18n.t('profile:permissions.location.required'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to check location permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.location.checkFailed'),
      };
    }
  }

  /**
   * Request location permission (fine location)
   */
  async requestLocationPermission(): Promise<PermissionResult> {
    try {
      console.debug('[PermissionManager] Requesting location permission');

      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      // Check if already requested before
      const alreadyRequested = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_REQUESTED);

      const status = await request(permission);

      // Mark as requested
      if (!alreadyRequested) {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_REQUESTED, 'true');
      }

      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.location.requestSuccess')
          : status === RESULTS.BLOCKED
          ? i18n.t('profile:permissions.location.requestBlocked')
          : i18n.t('profile:permissions.location.requestDenied'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to request location permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.location.requestFailed'),
      };
    }
  }

  /**
   * Check background location permission status (Android 10+)
   */
  async checkBackgroundLocationPermission(): Promise<PermissionResult> {
    // Background location only needed on Android
    if (Platform.OS === 'ios') {
      return {
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
        message: i18n.t('profile:permissions.backgroundLocation.iosNote'),
      };
    }

    // Only available on Android 10+ (API 29+)
    if (typeof Platform.Version === 'number' && Platform.Version < 29) {
      return {
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
        message: i18n.t('profile:permissions.backgroundLocation.androidOldNote'),
      };
    }

    try {
      const status = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.backgroundLocation.granted')
          : i18n.t('profile:permissions.backgroundLocation.required'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to check background location permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.backgroundLocation.checkFailed'),
      };
    }
  }

  /**
   * Request background location permission (Android 10+)
   * MUST be requested AFTER foreground location is granted
   */
  async requestBackgroundLocationPermission(): Promise<PermissionResult> {
    // Background location only needed on Android
    if (Platform.OS === 'ios') {
      return {
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
        message: i18n.t('profile:permissions.backgroundLocation.iosNote'),
      };
    }

    // Only available on Android 10+ (API 29+)
    if (typeof Platform.Version === 'number' && Platform.Version < 29) {
      return {
        granted: true,
        status: RESULTS.GRANTED,
        canRequest: false,
        message: i18n.t('profile:permissions.backgroundLocation.androidOldNote'),
      };
    }

    try {
      console.debug('[PermissionManager] Requesting background location permission');

      // Verify foreground location is granted first
      const foregroundStatus = await this.checkLocationPermission();
      if (!foregroundStatus.granted) {
        return {
          granted: false,
          status: RESULTS.DENIED,
          canRequest: false,
          message: i18n.t('profile:permissions.backgroundLocation.foregroundRequired'),
        };
      }

      // Check if already requested before
      const alreadyRequested = await AsyncStorage.getItem(
        STORAGE_KEYS.BACKGROUND_LOCATION_REQUESTED
      );

      const status = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);

      // Mark as requested
      if (!alreadyRequested) {
        await AsyncStorage.setItem(STORAGE_KEYS.BACKGROUND_LOCATION_REQUESTED, 'true');
      }

      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.backgroundLocation.requestSuccess')
          : status === RESULTS.BLOCKED
          ? i18n.t('profile:permissions.backgroundLocation.requestBlocked')
          : i18n.t('profile:permissions.backgroundLocation.requestDenied'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to request background location permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.backgroundLocation.requestFailed'),
      };
    }
  }

  /**
   * Check camera permission status
   */
  async checkCameraPermission(): Promise<PermissionResult> {
    try {
      const permission =
        Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

      const status = await check(permission);
      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.camera.granted')
          : i18n.t('profile:permissions.camera.required'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to check camera permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.camera.checkFailed'),
      };
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<PermissionResult> {
    try {
      console.debug('[PermissionManager] Requesting camera permission');

      const permission =
        Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

      // Check if already requested before
      const alreadyRequested = await AsyncStorage.getItem(STORAGE_KEYS.CAMERA_REQUESTED);

      const status = await request(permission);

      // Mark as requested
      if (!alreadyRequested) {
        await AsyncStorage.setItem(STORAGE_KEYS.CAMERA_REQUESTED, 'true');
      }

      const granted = status === RESULTS.GRANTED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.camera.requestSuccess')
          : status === RESULTS.BLOCKED
          ? i18n.t('profile:permissions.camera.requestBlocked')
          : i18n.t('profile:permissions.camera.requestDenied'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to request camera permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.camera.requestFailed'),
      };
    }
  }

  /**
   * Check gallery (photo library) permission status
   */
  async checkGalleryPermission(): Promise<PermissionResult> {
    try {
      const status = await check(resolveGalleryPermission());
      const granted = status === RESULTS.GRANTED || status === RESULTS.LIMITED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.gallery.granted')
          : i18n.t('profile:permissions.gallery.required'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to check gallery permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.gallery.checkFailed'),
      };
    }
  }

  /**
   * Request gallery (photo library) permission
   */
  async requestGalleryPermission(): Promise<PermissionResult> {
    try {
      console.debug('[PermissionManager] Requesting gallery permission');

      const alreadyRequested = await AsyncStorage.getItem(STORAGE_KEYS.GALLERY_REQUESTED);
      const status = await request(resolveGalleryPermission());

      if (!alreadyRequested) {
        await AsyncStorage.setItem(STORAGE_KEYS.GALLERY_REQUESTED, 'true');
      }

      const granted = status === RESULTS.GRANTED || status === RESULTS.LIMITED;
      const canRequest = status === RESULTS.DENIED;

      return {
        granted,
        status,
        canRequest,
        message: granted
          ? i18n.t('profile:permissions.gallery.requestSuccess')
          : status === RESULTS.BLOCKED
          ? i18n.t('profile:permissions.gallery.requestBlocked')
          : i18n.t('profile:permissions.gallery.requestDenied'),
      };
    } catch (error) {
      console.error('[PermissionManager] Failed to request gallery permission:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canRequest: false,
        message: i18n.t('profile:permissions.gallery.requestFailed'),
      };
    }
  }

  /**
   * Check all permissions status
   */
  async checkAllPermissions(): Promise<AllPermissionsStatus> {
    const [notifications, location, backgroundLocation, camera, gallery] = await Promise.all([
      this.checkNotificationPermission(),
      this.checkLocationPermission(),
      this.checkBackgroundLocationPermission(),
      this.checkCameraPermission(),
      this.checkGalleryPermission(),
    ]);

    return {
      notifications,
      location,
      backgroundLocation,
      camera,
      gallery,
    };
  }

  /**
   * Request all critical permissions sequentially
   * (Notifications → Location → Background Location)
   * Camera is requested lazily when needed
   *
   * @returns Array of results for each step
   */
  async requestAllCriticalPermissions(): Promise<{
    notifications: PermissionResult;
    location: PermissionResult;
    backgroundLocation: PermissionResult;
    allGranted: boolean;
  }> {
    // Step 1: Request notification permission
    const notifications = await this.requestNotificationPermission();

    // Step 2: Request location permission
    const location = await this.requestLocationPermission();

    // Step 3: Request background location (only if foreground granted and Android 10+)
    let backgroundLocation: PermissionResult;
    if (location.granted && Platform.OS === 'android' && Platform.Version >= 29) {
      backgroundLocation = await this.requestBackgroundLocationPermission();
    } else {
      backgroundLocation = await this.checkBackgroundLocationPermission();
    }

    const allGranted =
      notifications.granted && location.granted && backgroundLocation.granted;

    return {
      notifications,
      location,
      backgroundLocation,
      allGranted,
    };
  }

  /**
   * Open app settings
   */
  async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('[PermissionManager] Failed to open settings:', error);
    }
  }

  /**
   * Check if we should show permission request (not already completed or blocked)
   */
  async shouldShowPermissionRequest(): Promise<boolean> {
    const completed = await this.isOnboardingCompleted();
    if (completed) {
      return false;
    }

    // Check if critical permissions are already granted
    const { notifications, location, backgroundLocation, camera, gallery } =
      await this.checkAllPermissions();

    return !(
      notifications.granted &&
      location.granted &&
      backgroundLocation.granted &&
      camera.granted &&
      gallery.granted
    );
  }
}

/**
 * Singleton instance
 */
export const permissionManager = PermissionManager.getInstance();
