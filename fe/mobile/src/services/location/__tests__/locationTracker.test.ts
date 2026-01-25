/**
 * Location Tracker Tests
 * Unit tests for location tracking service
 */

import { locationTracker } from '../locationTracker';
import * as locationApi from '../../api/locationApi';
import * as offlineQueue from '../../sync/offlineQueue';
import * as permissionService from '../../permissions/permissionService';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('react-native-geolocation-service');
jest.mock('react-native-device-info');
jest.mock('../../api/locationApi');
jest.mock('../../sync/offlineQueue');
jest.mock('../../permissions/permissionService');
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
}));


describe('LocationTracker', () => {
  const mockShiftId = 'test-shift-123';
  const mockLocation = {
    coords: {
      latitude: -7.2905,
      longitude: 112.7398,
      accuracy: 10.5,
      altitude: 0,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    locationTracker.cleanup();

    // Add global error listener to prevent unhandled errors
    locationTracker.on('error', jest.fn());

    // Default mocks
    (permissionService.checkLocationPermission as jest.Mock).mockResolvedValue(true);
    (permissionService.requestLocationPermission as jest.Mock).mockResolvedValue({
      granted: true,
      status: 'granted',
    });
    // Mock battery level (75% = 0.75)
    (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(0.75);
  });

  afterEach(() => {
    // Full cleanup to prevent worker process leaks
    locationTracker.cleanup();
    locationTracker.removeAllListeners();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should start tracking when permission granted', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);

      expect(locationTracker.isTracking()).toBe(true);
      expect(locationTracker.getCurrentShiftId()).toBe(mockShiftId);
    });

    it('should request permission if not granted', async () => {
      (permissionService.checkLocationPermission as jest.Mock).mockResolvedValue(false);
      (permissionService.requestLocationPermission as jest.Mock).mockResolvedValue({
        granted: true,
        status: 'granted',
      });
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);

      expect(permissionService.requestLocationPermission).toHaveBeenCalled();
      expect(locationTracker.isTracking()).toBe(true);
    });

    it('should not start tracking if permission denied', async () => {
      (permissionService.checkLocationPermission as jest.Mock).mockResolvedValue(false);
      (permissionService.requestLocationPermission as jest.Mock).mockResolvedValue({
        granted: false,
        status: 'denied',
      });

      await locationTracker.initialize(mockShiftId);

      expect(locationTracker.isTracking()).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should capture location but not restart tracking if already tracking same shift', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
      const firstCall = (Geolocation.getCurrentPosition as jest.Mock).mock.calls.length;

      await locationTracker.initialize(mockShiftId);
      const secondCall = (Geolocation.getCurrentPosition as jest.Mock).mock.calls.length;

      // Should have captured one more location but not restarted tracking
      expect(secondCall).toBe(firstCall + 1);
      expect(locationTracker.isTracking()).toBe(true);
    });

    it('should emit trackingStarted event', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      const listener = jest.fn();
      locationTracker.on('trackingStarted', listener);

      await locationTracker.initialize(mockShiftId);

      expect(listener).toHaveBeenCalledWith(mockShiftId);
    });

    it('should show alert if GPS disabled', async () => {
      // Add error listener to prevent unhandled error
      const errorListener = jest.fn();
      locationTracker.on('error', errorListener);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 2, message: 'GPS disabled' });
      });

      await locationTracker.initialize(mockShiftId);

      expect(Alert.alert).toHaveBeenCalled();
      expect(locationTracker.isTracking()).toBe(false);

      locationTracker.off('error', errorListener);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 1 } });

      // Prevent unhandled error events
      locationTracker.on('error', jest.fn());

      await locationTracker.initialize(mockShiftId);
    });

    it('should stop tracking', async () => {
      await locationTracker.stop();

      expect(locationTracker.isTracking()).toBe(false);
      expect(locationTracker.getCurrentShiftId()).toBeNull();
    });

    it('should upload remaining locations', async () => {
      // Simulate some buffered locations
      jest.runOnlyPendingTimers(); // Trigger first location capture

      await locationTracker.stop();

      expect(locationApi.uploadLocationBatch).toHaveBeenCalled();
    });

    it('should emit trackingStopped event', async () => {
      const listener = jest.fn();
      locationTracker.on('trackingStopped', listener);

      await locationTracker.stop();

      expect(listener).toHaveBeenCalled();
    });

    it('should clear buffer after stop', async () => {
      await locationTracker.stop();

      expect(locationTracker.getBufferCount()).toBe(0);
    });
  });

  describe('getCurrentLocation', () => {
    beforeEach(async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
    });

    it('should return current location with battery level', async () => {
      const location = await locationTracker.getCurrentLocation();

      expect(location).toMatchObject({
        latitude: mockLocation.coords.latitude,
        longitude: mockLocation.coords.longitude,
        accuracy: mockLocation.coords.accuracy,
        shift_id: mockShiftId,
        battery_level: 75, // 0.75 * 100 = 75%
      });
      expect(location.timestamp).toBeDefined();
    });

    it('should reject if no active shift', async () => {
      await locationTracker.stop();

      await expect(locationTracker.getCurrentLocation()).rejects.toThrow('No active shift');
    });

    it('should reject on location error', async () => {
      // Add error listener to prevent unhandled error
      const errorListener = jest.fn();
      locationTracker.on('error', errorListener);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 3, message: 'Timeout' });
      });

      await expect(locationTracker.getCurrentLocation()).rejects.toThrow();

      locationTracker.off('error', errorListener);
    });
  });

  describe('location capture', () => {
    beforeEach(async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 1 } });

      // Prevent unhandled error events
      locationTracker.on('error', jest.fn());

      await locationTracker.initialize(mockShiftId);
    });

    it('should capture location immediately on start', () => {
      expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should capture location at random interval between 5-10 minutes', async () => {
      const initialCalls = (Geolocation.getCurrentPosition as jest.Mock).mock.calls.length;

      // Advance by 10 minutes to ensure at least one interval has passed
      // Use advanceTimersByTimeAsync to properly handle async timer callbacks
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

      expect((Geolocation.getCurrentPosition as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
    });

    it('should add location to buffer on capture', () => {
      expect(locationTracker.getBufferCount()).toBeGreaterThan(0);
    });

    it('should emit locationUpdate event', async () => {
      const listener = jest.fn();
      locationTracker.on('locationUpdate', listener);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      // Use advanceTimersByTimeAsync to properly handle async timer callbacks
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('batch upload', () => {
    beforeEach(async () => {
      // Switch to real timers for async tests
      jest.clearAllTimers();
      jest.useRealTimers();

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 20 } });

      // Prevent unhandled error events
      locationTracker.on('error', jest.fn());

      await locationTracker.initialize(mockShiftId);
    });

    afterEach(() => {
      // Full cleanup before restoring fake timers
      locationTracker.cleanup();
      locationTracker.removeAllListeners();
      jest.useFakeTimers();
    });

    it('should upload when buffer reaches 20 locations', async () => {
      // Manually trigger 20 location captures by calling captureLocation directly
      const capturePromises = [];
      for (let i = 0; i < 20; i++) {
        // Simulate location capture
        const location = {
          latitude: mockLocation.coords.latitude,
          longitude: mockLocation.coords.longitude,
          accuracy: mockLocation.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: mockShiftId,
        };
        (locationTracker as any).addLocationToBuffer(location);
      }

      // Trigger upload when buffer is full
      if ((locationTracker as any).shouldUploadBatch()) {
        await (locationTracker as any).uploadLocations();
      }

      expect(locationApi.uploadLocationBatch).toHaveBeenCalled();
    });

    it('should emit batchUploaded event on successful upload', async () => {
      const listener = jest.fn();
      locationTracker.on('batchUploaded', listener);

      // Manually fill buffer and upload
      const capturePromises = [];
      for (let i = 0; i < 20; i++) {
        const location = {
          latitude: mockLocation.coords.latitude,
          longitude: mockLocation.coords.longitude,
          accuracy: mockLocation.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: mockShiftId,
        };
        (locationTracker as any).addLocationToBuffer(location);
      }

      // Trigger upload
      await (locationTracker as any).uploadLocations();

      expect(listener).toHaveBeenCalled();
    });

    it('should queue locations on upload failure', async () => {
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ error: 'Network error' });
      (offlineQueue.addToQueue as jest.Mock).mockResolvedValue('queue-id-123');

      const listener = jest.fn();
      locationTracker.on('batchQueued', listener);

      // Manually fill buffer
      for (let i = 0; i < 20; i++) {
        const location = {
          latitude: mockLocation.coords.latitude,
          longitude: mockLocation.coords.longitude,
          accuracy: mockLocation.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: mockShiftId,
        };
        (locationTracker as any).addLocationToBuffer(location);
      }

      // Trigger upload
      await (locationTracker as any).uploadLocations();

      expect(offlineQueue.addToQueue).toHaveBeenCalledWith('location', expect.any(Object));
      expect(listener).toHaveBeenCalled();
    });

    it('should clear buffer after successful upload', async () => {
      // Manually fill buffer
      for (let i = 0; i < 20; i++) {
        const location = {
          latitude: mockLocation.coords.latitude,
          longitude: mockLocation.coords.longitude,
          accuracy: mockLocation.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: mockShiftId,
        };
        (locationTracker as any).addLocationToBuffer(location);
      }

      // Trigger upload
      await (locationTracker as any).uploadLocations();

      expect(locationTracker.getBufferCount()).toBeLessThan(20);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      // Prevent unhandled error events
      locationTracker.on('error', jest.fn());

      await locationTracker.initialize(mockShiftId);
    });

    it('should emit error event on location error', async () => {
      const listener = jest.fn();
      locationTracker.on('error', listener);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 1, message: 'Permission denied' });
      });

      // Use advanceTimersByTimeAsync - use max interval (60s) to ensure at least one trigger
      await jest.advanceTimersByTimeAsync(60 * 1000);

      expect(listener).toHaveBeenCalled();
    });

    it('should retry with lower accuracy on timeout', async () => {
      // Clear mock to get accurate count
      (Geolocation.getCurrentPosition as jest.Mock).mockClear();

      let callCount = 0;
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error) => {
        callCount++;
        if (callCount === 1) {
          // First call: simulate timeout
          error({ code: 3, message: 'Timeout' });
        } else {
          // Retry with lower accuracy: success
          success(mockLocation);
        }
      });

      // Advance by max interval to trigger a capture
      await jest.advanceTimersByTimeAsync(60 * 1000);

      // Should have made at least 2 calls (timeout + retry)
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle permission denied error', async () => {
      const listener = jest.fn();
      locationTracker.on('error', listener);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 1, message: 'Permission denied' });
      });

      // Use advanceTimersByTimeAsync - use max interval (60s) to ensure trigger
      await jest.advanceTimersByTimeAsync(60 * 1000);

      expect(listener).toHaveBeenCalledWith(expect.stringContaining('Izin lokasi ditolak'));
    });

    it('should handle GPS unavailable error', async () => {
      const listener = jest.fn();
      locationTracker.on('error', listener);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 2, message: 'Position unavailable' });
      });

      // Use advanceTimersByTimeAsync to properly handle async timer callbacks
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

      expect(listener).toHaveBeenCalledWith(expect.stringContaining('Sinyal GPS tidak tersedia'));
    });
  });

  describe('utility methods', () => {
    it('should return tracking status', async () => {
      expect(locationTracker.isTracking()).toBe(false);

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
      expect(locationTracker.isTracking()).toBe(true);

      await locationTracker.stop();
      expect(locationTracker.isTracking()).toBe(false);
    });

    it('should return current shift ID', async () => {
      expect(locationTracker.getCurrentShiftId()).toBeNull();

      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
      expect(locationTracker.getCurrentShiftId()).toBe(mockShiftId);
    });

    it('should return buffer count', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
      // Run only the first batch of pending timers/promises (not recurring)
      await jest.runOnlyPendingTimersAsync();
      expect(locationTracker.getBufferCount()).toBeGreaterThan(0);
    });

    it('should force upload buffered locations', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 1 } });

      await locationTracker.initialize(mockShiftId);
      // Run only the first batch of pending timers/promises (not recurring)
      await jest.runOnlyPendingTimersAsync();
      await locationTracker.forceUpload();

      expect(locationApi.uploadLocationBatch).toHaveBeenCalled();
    });

    it('should clear buffer', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
      // Run only the first batch of pending timers/promises (not recurring)
      await jest.runOnlyPendingTimersAsync();
      expect(locationTracker.getBufferCount()).toBeGreaterThan(0);

      locationTracker.clearBuffer();
      expect(locationTracker.getBufferCount()).toBe(0);
    });

    it('should cleanup completely', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      await locationTracker.initialize(mockShiftId);
      locationTracker.cleanup();

      expect(locationTracker.isTracking()).toBe(false);
      expect(locationTracker.getCurrentShiftId()).toBeNull();
      expect(locationTracker.getBufferCount()).toBe(0);
    });
  });

  describe('battery level tracking', () => {
    beforeEach(async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success(mockLocation);
      });

      // Prevent unhandled error events
      locationTracker.on('error', jest.fn());
    });

    it('should include battery level in captured location', async () => {
      (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(0.85);

      await locationTracker.initialize(mockShiftId);
      const location = await locationTracker.getCurrentLocation();

      expect(location.battery_level).toBe(85);
    });

    it('should return undefined battery_level when emulator returns -1', async () => {
      (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(-1);

      await locationTracker.initialize(mockShiftId);
      const location = await locationTracker.getCurrentLocation();

      expect(location.battery_level).toBeUndefined();
    });

    it('should return undefined battery_level on error', async () => {
      (DeviceInfo.getBatteryLevel as jest.Mock).mockRejectedValue(new Error('Battery API not available'));

      await locationTracker.initialize(mockShiftId);
      const location = await locationTracker.getCurrentLocation();

      expect(location.battery_level).toBeUndefined();
    });

    it('should round battery percentage correctly', async () => {
      (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(0.756);

      await locationTracker.initialize(mockShiftId);
      const location = await locationTracker.getCurrentLocation();

      expect(location.battery_level).toBe(76); // Math.round(0.756 * 100) = 76
    });

    it('should handle 0% battery', async () => {
      (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(0);

      await locationTracker.initialize(mockShiftId);
      const location = await locationTracker.getCurrentLocation();

      expect(location.battery_level).toBe(0);
    });

    it('should handle 100% battery', async () => {
      (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(1);

      await locationTracker.initialize(mockShiftId);
      const location = await locationTracker.getCurrentLocation();

      expect(location.battery_level).toBe(100);
    });
  });
});
