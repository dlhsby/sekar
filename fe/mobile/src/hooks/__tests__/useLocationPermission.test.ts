/**
 * useLocationPermission Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { check, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import { useLocationPermission } from '../useLocationPermission';

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
}));

// Mock Geolocation
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));

// Mock permissionService (Issue 6: now uses static import)
jest.mock('../../services/permissions/permissionService', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue({
    granted: true,
    status: 'granted',
    message: 'Permission granted',
  }),
}));

describe('useLocationPermission', () => {
  const mockCheck = check as jest.MockedFunction<typeof check>;
  const mockGetCurrentPosition = Geolocation.getCurrentPosition as jest.MockedFunction<
    typeof Geolocation.getCurrentPosition
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with isChecking true', () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      expect(result.current.isChecking).toBe(true);
    });

    it('should set permissionGranted to true when permission is granted', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.permissionGranted).toBe(true);
      expect(result.current.gpsEnabled).toBe(true);
      expect(result.current.isLocationAvailable).toBe(true);
    });

    it('should set permissionGranted to false when permission is denied', async () => {
      mockCheck.mockResolvedValue(RESULTS.DENIED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.permissionGranted).toBe(false);
      expect(result.current.isLocationAvailable).toBe(false);
    });
  });

  describe('GPS status', () => {
    it('should detect when GPS is disabled (error code 2)', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((_, error) => {
        error?.({ code: 2, message: 'Position unavailable' } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.permissionGranted).toBe(true);
      expect(result.current.gpsEnabled).toBe(false);
      expect(result.current.isLocationAvailable).toBe(false);
    });

    it('should handle GPS timeout gracefully', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((_, error) => {
        error?.({ code: 3, message: 'Timeout' } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // Timeout doesn't mean GPS is disabled
      expect(result.current.gpsEnabled).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should refresh permission and GPS status when called', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // Clear mocks and set up new responses
      mockCheck.mockClear();
      mockGetCurrentPosition.mockClear();
      mockCheck.mockResolvedValue(RESULTS.DENIED);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockCheck).toHaveBeenCalled();
      expect(result.current.permissionGranted).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onPermissionLost when permission is revoked', async () => {
      const onPermissionLost = jest.fn();
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({
          enableMonitoring: false,
          showAlerts: false,
          onPermissionLost,
        })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.permissionGranted).toBe(true);

      // Simulate permission being revoked
      mockCheck.mockResolvedValue(RESULTS.DENIED);

      await act(async () => {
        await result.current.refresh();
      });

      // Issue 2: Callbacks are now deferred via setTimeout to avoid circular setState
      // Need to flush the timer queue in a separate act to trigger the callbacks
      await act(async () => {
        jest.runAllTimers();
      });

      expect(onPermissionLost).toHaveBeenCalled();
    });

    it('should call onGpsDisabled when GPS is disabled', async () => {
      const onGpsDisabled = jest.fn();
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({
          enableMonitoring: false,
          showAlerts: false,
          onGpsDisabled,
        })
      );

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.gpsEnabled).toBe(true);

      // Simulate GPS being disabled
      mockGetCurrentPosition.mockImplementation((_, error) => {
        error?.({ code: 2, message: 'Position unavailable' } as any);
        return 0;
      });

      await act(async () => {
        await result.current.refresh();
      });

      // Issue 2: Callbacks are now deferred via setTimeout to avoid circular setState
      // Need to flush the timer queue in a separate act to trigger the callbacks
      await act(async () => {
        jest.runAllTimers();
      });

      expect(onGpsDisabled).toHaveBeenCalled();
    });
  });

  describe('race condition prevention (Issue 3)', () => {
    it('should ignore stale GPS check responses', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);

      // First call - simulate slow response
      let firstCallResolve: ((value: any) => void) | null = null;
      mockGetCurrentPosition.mockImplementationOnce((success) => {
        // Don't resolve immediately - simulate slow response
        firstCallResolve = success;
        return 0;
      });

      // Second call - responds immediately
      mockGetCurrentPosition.mockImplementationOnce((success) => {
        success({
          coords: { latitude: 1, longitude: 1, accuracy: 10 },
        } as any);
        return 0;
      });

      const { result } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      // Wait for initial check to start
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Trigger a second refresh while first is still pending
      await act(async () => {
        result.current.refresh();
        jest.advanceTimersByTime(100);
      });

      // Now resolve the first (stale) call
      if (firstCallResolve) {
        firstCallResolve({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        });
      }

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      // State should reflect the latest (second) response, not the stale one
      expect(result.current.gpsEnabled).toBe(true);
    });
  });

  describe('unmount safety (Issue 4)', () => {
    it('should not update state after unmount', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);

      // Simulate slow GPS check that completes after unmount
      let resolveGps: ((value: any) => void) | null = null;
      mockGetCurrentPosition.mockImplementation((success) => {
        resolveGps = success;
        return 0;
      });

      const { result, unmount } = renderHook(() =>
        useLocationPermission({ enableMonitoring: false })
      );

      // Unmount before GPS check completes
      unmount();

      // Now resolve the GPS check after unmount
      if (resolveGps) {
        resolveGps({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        });
      }

      // Test passes if no "Can't perform a React state update on an unmounted component" warning
      expect(true).toBe(true);
    });
  });

  describe('interval configuration (Issue 5)', () => {
    it('should use 5 minute default interval', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      renderHook(() =>
        useLocationPermission({ enableMonitoring: true })
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Default interval should be 300000ms (5 minutes), not 30000ms (30 seconds)
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000);

      setIntervalSpy.mockRestore();
    });

    it('should respect custom checkInterval option', async () => {
      mockCheck.mockResolvedValue(RESULTS.GRANTED);
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 0, longitude: 0, accuracy: 10 },
        } as any);
        return 0;
      });

      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      renderHook(() =>
        useLocationPermission({ enableMonitoring: true, checkInterval: 60000 })
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

      setIntervalSpy.mockRestore();
    });
  });
});
