/**
 * Permission Manager Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  checkNotifications,
  requestNotifications,
} from 'react-native-permissions';
import { Platform, Linking } from 'react-native';
import { permissionManager, PermissionType } from '../PermissionManager';

// Mock dependencies
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  checkNotifications: jest.fn(),
  requestNotifications: jest.fn(),
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_BACKGROUND_LOCATION: 'android.permission.ACCESS_BACKGROUND_LOCATION',
      CAMERA: 'android.permission.CAMERA',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      CAMERA: 'ios.permission.CAMERA',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
    LIMITED: 'limited',
  },
}));
jest.mock('@react-native-async-storage/async-storage');

// Mock Linking.openSettings
jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn().mockResolvedValue(undefined));

describe('PermissionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset storage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeMany as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Notification Permission', () => {
    it('should check notification permission status', async () => {
      (checkNotifications as jest.Mock).mockResolvedValue({
        status: RESULTS.GRANTED,
        settings: {},
      });

      const result = await permissionManager.checkNotificationPermission();

      expect(result.granted).toBe(true);
      expect(result.status).toBe(RESULTS.GRANTED);
      expect(result.canRequest).toBe(false);
    });

    it('should request notification permission', async () => {
      (requestNotifications as jest.Mock).mockResolvedValue({
        status: RESULTS.GRANTED,
        settings: {},
      });

      const result = await permissionManager.requestNotificationPermission();

      expect(result.granted).toBe(true);
      expect(requestNotifications).toHaveBeenCalledWith(['alert', 'badge', 'sound']);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@permissions/notifications_requested',
        'true'
      );
    });

    it('should handle denied notification permission', async () => {
      (requestNotifications as jest.Mock).mockResolvedValue({
        status: RESULTS.DENIED,
        settings: {},
      });

      const result = await permissionManager.requestNotificationPermission();

      expect(result.granted).toBe(false);
      expect(result.canRequest).toBe(true);
    });

    it('should handle blocked notification permission', async () => {
      (requestNotifications as jest.Mock).mockResolvedValue({
        status: RESULTS.BLOCKED,
        settings: {},
      });

      const result = await permissionManager.requestNotificationPermission();

      expect(result.granted).toBe(false);
      expect(result.canRequest).toBe(false);
      expect(result.message).toContain('diblokir');
    });
  });

  describe('Location Permission', () => {
    it('should check location permission on Android', async () => {
      Platform.OS = 'android';
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.checkLocationPermission();

      expect(check).toHaveBeenCalledWith(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      expect(result.granted).toBe(true);
    });

    it('should request location permission', async () => {
      Platform.OS = 'android';
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.requestLocationPermission();

      expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      expect(result.granted).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@permissions/location_requested',
        'true'
      );
    });

    it('should handle denied location permission', async () => {
      Platform.OS = 'android';
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await permissionManager.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.canRequest).toBe(true);
    });

    it('should handle blocked location permission', async () => {
      Platform.OS = 'android';
      (request as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const result = await permissionManager.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.canRequest).toBe(false);
      expect(result.message).toContain('diblokir');
    });
  });

  describe('Background Location Permission', () => {
    it('should return granted for iOS (not needed)', async () => {
      Platform.OS = 'ios';

      const result = await permissionManager.checkBackgroundLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.message).toContain('iOS');
    });

    it('should return granted for Android < 10', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 28, writable: true });

      const result = await permissionManager.checkBackgroundLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.message).toContain('tidak diperlukan');
    });

    it('should check background location on Android 10+', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.checkBackgroundLocationPermission();

      expect(check).toHaveBeenCalledWith(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
      expect(result.granted).toBe(true);
    });

    it('should request background location on Android 10+', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED); // Foreground granted
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.requestBackgroundLocationPermission();

      expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
      expect(result.granted).toBe(true);
    });

    it('should fail if foreground location not granted', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED); // Foreground denied

      const result = await permissionManager.requestBackgroundLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.message).toContain('foreground');
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('Camera Permission', () => {
    it('should check camera permission', async () => {
      Platform.OS = 'android';
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.checkCameraPermission();

      expect(check).toHaveBeenCalledWith(PERMISSIONS.ANDROID.CAMERA);
      expect(result.granted).toBe(true);
    });

    it('should request camera permission', async () => {
      Platform.OS = 'android';
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.requestCameraPermission();

      expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.CAMERA);
      expect(result.granted).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@permissions/camera_requested',
        'true'
      );
    });
  });

  describe('Onboarding', () => {
    it('should check onboarding completed status', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await permissionManager.isOnboardingCompleted();

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@permissions/onboarding_completed');
    });

    it('should set onboarding completed', async () => {
      await permissionManager.setOnboardingCompleted();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@permissions/onboarding_completed',
        'true'
      );
    });

    it('should reset onboarding', async () => {
      await permissionManager.resetOnboarding();

      expect(AsyncStorage.removeMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          '@permissions/notifications_requested',
          '@permissions/location_requested',
          '@permissions/background_location_requested',
          '@permissions/camera_requested',
          '@permissions/onboarding_completed',
        ])
      );
    });

    it('should show permission request when onboarding not completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (checkNotifications as jest.Mock).mockResolvedValue({ status: RESULTS.DENIED });
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await permissionManager.shouldShowPermissionRequest();

      expect(result).toBe(true);
    });

    it('should not show permission request when all granted', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (checkNotifications as jest.Mock).mockResolvedValue({ status: RESULTS.GRANTED });
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.shouldShowPermissionRequest();

      expect(result).toBe(false);
    });

    it('should not show permission request when onboarding completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await permissionManager.shouldShowPermissionRequest();

      expect(result).toBe(false);
    });
  });

  describe('Check All Permissions', () => {
    it('should check all permissions status', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (checkNotifications as jest.Mock).mockResolvedValue({ status: RESULTS.GRANTED });
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await permissionManager.checkAllPermissions();

      expect(result.notifications.granted).toBe(true);
      expect(result.location.granted).toBe(true);
      expect(result.backgroundLocation.granted).toBe(true);
      expect(result.camera.granted).toBe(true);
    });
  });

  describe('Request All Critical Permissions', () => {
    it('should request all critical permissions sequentially', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (requestNotifications as jest.Mock).mockResolvedValue({ status: RESULTS.GRANTED });
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED); // For foreground check

      const result = await permissionManager.requestAllCriticalPermissions();

      expect(result.notifications.granted).toBe(true);
      expect(result.location.granted).toBe(true);
      expect(result.backgroundLocation.granted).toBe(true);
      expect(result.allGranted).toBe(true);
    });

    it('should skip background location if foreground denied', async () => {
      Platform.OS = 'android';
      Object.defineProperty(Platform, 'Version', { value: 29, writable: true });
      (requestNotifications as jest.Mock).mockResolvedValue({ status: RESULTS.GRANTED });
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED); // Foreground denied
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await permissionManager.requestAllCriticalPermissions();

      expect(result.location.granted).toBe(false);
      expect(result.backgroundLocation.granted).toBe(false);
      expect(result.allGranted).toBe(false);
    });
  });

  describe('Open Settings', () => {
    it('should open app settings', async () => {
      await permissionManager.openSettings();

      expect(Linking.openSettings).toHaveBeenCalled();
    });

    it('should handle errors when opening settings', async () => {
      (Linking.openSettings as jest.Mock).mockRejectedValue(new Error('Failed to open'));

      // Should not throw
      await expect(permissionManager.openSettings()).resolves.toBeUndefined();
    });
  });
});
