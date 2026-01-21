/**
 * Permission Service Tests
 * Unit tests for permission handling (location and camera)
 */

import { Platform, Alert, Linking } from 'react-native';
import { check, request, RESULTS } from 'react-native-permissions';
import {
  requestLocationPermission,
  requestCameraPermission,
  checkLocationPermission,
  checkCameraPermission,
  checkClockInPermissions,
  showPermissionBlockedAlert,
  showPermissionDeniedAlert,
  requestClockInPermissions,
} from '../permissionService';

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
}));

// Mock react-native-permissions is already done in jest.setup.js

describe('permissionService', () => {
  beforeEach(() => {
    // Use resetAllMocks to also clear mockResolvedValueOnce queues
    jest.resetAllMocks();
    (Platform as any).OS = 'android';
  });

  describe('requestLocationPermission', () => {
    it('should return granted when permission is already granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await requestLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.status).toBe(RESULTS.GRANTED);
      expect(result.message).toBe('Location permission granted');
    });

    it('should request permission when denied and return granted if approved', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await requestLocationPermission();

      expect(request).toHaveBeenCalled();
      expect(result.granted).toBe(true);
      expect(result.status).toBe(RESULTS.GRANTED);
    });

    it('should return denied when user denies permission', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.DENIED);
      expect(result.message).toContain('denied');
    });

    it('should return blocked when permission is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const result = await requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.BLOCKED);
      expect(result.message).toContain('blocked');
    });

    it('should return limited when permission is limited', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.LIMITED);

      const result = await requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.LIMITED);
      expect(result.message).toContain('blocked'); // Same message for limited
    });

    it('should return unavailable when permission is unavailable', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.UNAVAILABLE);

      const result = await requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.UNAVAILABLE);
      expect(result.message).toContain('not available');
    });

    it('should handle errors gracefully', async () => {
      (check as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.UNAVAILABLE);
      expect(result.message).toContain('Failed to request');
    });

    it('should use iOS permission on iOS platform', async () => {
      (Platform as any).OS = 'ios';
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await requestLocationPermission();

      expect(check).toHaveBeenCalledWith('ios.permission.LOCATION_WHEN_IN_USE');
    });

    it('should use Android permission on Android platform', async () => {
      (Platform as any).OS = 'android';
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await requestLocationPermission();

      expect(check).toHaveBeenCalledWith('android.permission.ACCESS_FINE_LOCATION');
    });
  });

  describe('requestCameraPermission', () => {
    it('should return granted when permission is already granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await requestCameraPermission();

      expect(result.granted).toBe(true);
      expect(result.status).toBe(RESULTS.GRANTED);
      expect(result.message).toBe('Camera permission granted');
    });

    it('should request permission when denied and return granted if approved', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await requestCameraPermission();

      expect(request).toHaveBeenCalled();
      expect(result.granted).toBe(true);
    });

    it('should return denied when user denies permission', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await requestCameraPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.DENIED);
      expect(result.message).toContain('denied');
    });

    it('should return blocked when permission is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const result = await requestCameraPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.BLOCKED);
    });

    it('should handle errors gracefully', async () => {
      (check as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await requestCameraPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(RESULTS.UNAVAILABLE);
    });

    it('should use iOS permission on iOS platform', async () => {
      (Platform as any).OS = 'ios';
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await requestCameraPermission();

      expect(check).toHaveBeenCalledWith('ios.permission.CAMERA');
    });

    it('should use Android permission on Android platform', async () => {
      (Platform as any).OS = 'android';
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await requestCameraPermission();

      expect(check).toHaveBeenCalledWith('android.permission.CAMERA');
    });
  });

  describe('checkLocationPermission', () => {
    it('should return true when permission is granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await checkLocationPermission();

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await checkLocationPermission();

      expect(result).toBe(false);
    });

    it('should return false when permission is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const result = await checkLocationPermission();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (check as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await checkLocationPermission();

      expect(result).toBe(false);
    });
  });

  describe('checkCameraPermission', () => {
    it('should return true when permission is granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await checkCameraPermission();

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await checkCameraPermission();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (check as jest.Mock).mockRejectedValue(new Error('Test error'));

      const result = await checkCameraPermission();

      expect(result).toBe(false);
    });
  });

  describe('checkClockInPermissions', () => {
    it('should return all granted when both permissions are granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await checkClockInPermissions();

      expect(result.location).toBe(true);
      expect(result.camera).toBe(true);
      expect(result.allGranted).toBe(true);
    });

    it('should return allGranted false when location is not granted', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.DENIED)  // location
        .mockResolvedValueOnce(RESULTS.GRANTED); // camera

      const result = await checkClockInPermissions();

      expect(result.location).toBe(false);
      expect(result.camera).toBe(true);
      expect(result.allGranted).toBe(false);
    });

    it('should return allGranted false when camera is not granted', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.GRANTED)  // location
        .mockResolvedValueOnce(RESULTS.DENIED);  // camera

      const result = await checkClockInPermissions();

      expect(result.location).toBe(true);
      expect(result.camera).toBe(false);
      expect(result.allGranted).toBe(false);
    });

    it('should return allGranted false when both are not granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await checkClockInPermissions();

      expect(result.location).toBe(false);
      expect(result.camera).toBe(false);
      expect(result.allGranted).toBe(false);
    });
  });

  describe('showPermissionBlockedAlert', () => {
    it('should show alert for location permission', () => {
      showPermissionBlockedAlert('location');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        expect.stringContaining('Location access is required'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open Settings' }),
        ])
      );
    });

    it('should show alert for camera permission', () => {
      showPermissionBlockedAlert('camera');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission Required',
        expect.stringContaining('Camera access is required'),
        expect.any(Array)
      );
    });

    it('should call openSettings when Open Settings button is pressed', () => {
      showPermissionBlockedAlert('location');

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const openSettingsButton = buttons.find((btn: any) => btn.text === 'Open Settings');

      openSettingsButton.onPress();

      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });

  describe('showPermissionDeniedAlert', () => {
    it('should show alert for location permission', () => {
      showPermissionDeniedAlert('location');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Permission Denied',
        expect.stringContaining('Location access is required'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'OK' }),
        ])
      );
    });

    it('should show alert for camera permission', () => {
      showPermissionDeniedAlert('camera');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission Denied',
        expect.stringContaining('Camera access is required'),
        expect.any(Array)
      );
    });
  });

  describe('requestClockInPermissions', () => {
    it('should return success when both permissions are granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const result = await requestClockInPermissions();

      expect(result.success).toBe(true);
      expect(result.message).toBe('All permissions granted');
    });

    it('should return failure when location permission is denied', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.DENIED)  // location check
        .mockResolvedValueOnce(RESULTS.DENIED); // location request
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await requestClockInPermissions();

      expect(result.success).toBe(false);
      expect(result.message).toContain('denied');
    });

    it('should return failure when location permission is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const result = await requestClockInPermissions();

      expect(result.success).toBe(false);
      expect(Alert.alert).toHaveBeenCalled(); // Should show blocked alert
    });

    it('should return failure when camera permission is denied', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.GRANTED)  // location check
        .mockResolvedValueOnce(RESULTS.DENIED)   // camera check
        .mockResolvedValueOnce(RESULTS.DENIED);  // camera request
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const result = await requestClockInPermissions();

      expect(result.success).toBe(false);
    });

    it('should return failure when camera permission is blocked', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.GRANTED)   // location
        .mockResolvedValueOnce(RESULTS.BLOCKED);  // camera

      const result = await requestClockInPermissions();

      expect(result.success).toBe(false);
      expect(Alert.alert).toHaveBeenCalled(); // Should show blocked alert
    });

    it('should show blocked alert when location is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      await requestClockInPermissions();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should show blocked alert when camera is blocked', async () => {
      (check as jest.Mock)
        .mockResolvedValueOnce(RESULTS.GRANTED)   // location
        .mockResolvedValueOnce(RESULTS.BLOCKED);  // camera

      await requestClockInPermissions();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission Required',
        expect.any(String),
        expect.any(Array)
      );
    });
  });
});
