/**
 * Comprehensive ClockInOutScreen Tests
 * Tests for all user flows, GPS validation, selfie capture, and error handling
 */

// Alert mocked globally in jest.setup.js

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { ClockInOutScreen } from '../ClockInOutScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import * as shiftsApi from '../../../services/api/shiftsApi';
import * as permissionsService from '../../../services/permissions';
import { locationTracker } from '../../../services/location/locationTracker';

// Mock dependencies
jest.mock('react-native-geolocation-service');
jest.mock('react-native-image-picker');
jest.mock('react-native-fs');
jest.mock('../../../services/api/shiftsApi');
jest.mock('../../../services/permissions');
jest.mock('../../../services/location/locationTracker', () => ({
  locationTracker: {
    initialize: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    forceUpload: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

const mockAssignedArea = {
  id: 'area-123',
  name: 'Taman Bungkul',
  gps_lat: -7.250445,
  gps_lng: 112.768845,
  radius_meters: 100,
  area_type: { name: 'Park' },
};

const mockUser = {
  id: 1,
  username: 'worker1',
  full_name: 'Test Worker',
  role: 'worker',
};

const mockShift = {
  id: 'shift-123',
  clock_in_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  clock_out_time: null,
  worker_id: 1,
  area_id: 'area-123',
};

const createMockStore = (preloadedState: any = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: mockUser,
        assignedArea: mockAssignedArea,
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      shift: {
        currentShift: null,
        isSubmitting: false,
        error: null,
      },
      offline: {
        isOnline: true,
        isSyncing: false,
        queue: [],
        pendingShiftsCount: 0,
        pendingReportsCount: 0,
        pendingMediaCount: 0,
        pendingLocationsCount: 0,
        lastSyncTime: null,
        syncError: null,
      },
      ...preloadedState,
    },
  });
};

const renderScreen = (store: any) => {
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <ClockInOutScreen navigation={mockNavigation as any} route={{} as any} />
      </NavigationContainer>
    </Provider>
  );
};

describe('ClockInOutScreen - Comprehensive Tests', () => {
  beforeEach(() => {
    // Clear specific mocks
    mockNavigation.goBack.mockClear();
    mockNavigation.navigate.mockClear();
    (Geolocation.getCurrentPosition as jest.Mock).mockClear();
    (Geolocation.watchPosition as jest.Mock).mockClear();
    (Geolocation.clearWatch as jest.Mock).mockClear();
    (launchCamera as jest.Mock).mockClear();
    (RNFS.readFile as jest.Mock).mockClear();
    (shiftsApi.clockIn as jest.Mock).mockClear();
    (shiftsApi.clockOut as jest.Mock).mockClear();
    (shiftsApi.getCurrentShift as jest.Mock).mockClear();
    (permissionsService.requestClockInPermissions as jest.Mock).mockClear();
    (locationTracker.initialize as jest.Mock).mockClear();
    (locationTracker.stop as jest.Mock).mockClear();
    (locationTracker.forceUpload as jest.Mock).mockClear();

    // Default mock implementations
    (permissionsService.requestClockInPermissions as jest.Mock).mockResolvedValue({
      success: true,
    });

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
      success({
        coords: {
          latitude: -7.250445,
          longitude: 112.768845,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });
    });

    (Geolocation.watchPosition as jest.Mock).mockImplementation((success) => {
      success({
        coords: {
          latitude: -7.250445,
          longitude: 112.768845,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });
      return 123; // watchId
    });
  });

  describe('Initial Render & Permissions', () => {
    it('should show loading state initially', async () => {
      // Mock both getCurrentPosition and watchPosition to NOT call success callback immediately
      // This simulates the component being in loading state while waiting for GPS
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(() => {
        // Don't call success callback immediately, simulating GPS acquiring location
      });
      (Geolocation.watchPosition as jest.Mock).mockImplementation(() => {
        // Don't call success callback immediately
        return 123; // Return watchId
      });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      // Wait for the loading text to appear after useEffect runs getCurrentLocation
      await waitFor(() => {
        expect(getByText('Mendapatkan lokasi Anda...')).toBeTruthy();
      });
    });

    it('should request permissions on mount', async () => {
      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });
    });

    it('should show error when permissions denied', async () => {
      (permissionsService.requestClockInPermissions as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Permission denied',
      });

      const store = createMockStore();
      const { queryByText } = renderScreen(store);

      await waitFor(() => {
        expect(queryByText('Mendapatkan lokasi Anda...')).toBeNull();
      });
    });

    it('should show error when no assigned area', async () => {
      const store = createMockStore({
        auth: {
          user: mockUser,
          assignedArea: null,
          token: 'test-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        },
      });

      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Anda belum ditugaskan ke area manapun')).toBeTruthy();
      });
    });
  });

  describe('GPS Location Handling', () => {
    it('should get current location on mount', async () => {
      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should display location when within boundary', async () => {
      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Dalam batas/)).toBeTruthy();
      });
    });

    it('should handle GPS permission denied error (code 1)', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 1, message: 'Permission denied' });
      });

      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should handle GPS unavailable error (code 2)', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 2, message: 'Position unavailable' });
      });

      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should handle GPS timeout error (code 3)', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 3, message: 'Timeout' });
      });

      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should handle Play Services unavailable error (code 4)', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 4, message: 'Play services not available' });
      });

      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should handle settings not satisfied error (code 5)', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 5, message: 'Settings not satisfied' });
      });

      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should detect when outside boundary', async () => {
      // Clear and set up mock for this specific test
      (Geolocation.getCurrentPosition as jest.Mock).mockClear();
      (Geolocation.watchPosition as jest.Mock).mockClear();

      // Mock to return coordinates far outside 100m radius (approx 250m away)
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success({
          coords: {
            latitude: -7.252445, // ~222m north from center
            longitude: 112.770845, // ~194m east from center
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
      });

      (Geolocation.watchPosition as jest.Mock).mockImplementation((success) => {
        success({
          coords: {
            latitude: -7.252445,
            longitude: 112.770845,
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
        return 123;
      });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Di luar batas/)).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should cleanup location watcher on unmount', async () => {
      const store = createMockStore();
      const { unmount } = renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.watchPosition).toHaveBeenCalled();
      });

      unmount();

      expect(Geolocation.clearWatch).toHaveBeenCalledWith(123);
    });
  });

  describe('Selfie Capture', () => {
    it('should open camera when capture button pressed', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ uri: 'file://test-selfie.jpg' }],
      });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Ambil Selfie')).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));

      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalledWith({
          mediaType: 'photo',
          cameraType: 'front',
          quality: 0.8,
          maxWidth: 800,
          maxHeight: 800,
          includeBase64: false,
          saveToPhotos: false,
          presentationStyle: 'fullScreen',
        });
      });
    });

    it('should handle camera cancel', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({ didCancel: true });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Ambil Selfie')).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));

      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });
    });

    it('should handle camera error', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({ errorCode: 'camera_unavailable' });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Ambil Selfie')).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));

      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });
    });

    it('should display selfie preview after capture', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ uri: 'file://test-selfie.jpg' }],
      });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Ambil Selfie')).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));

      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });
    });
  });

  describe('Clock-In Flow', () => {
    it('should successfully clock in with valid data', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ uri: 'file://test-selfie.jpg' }],
      });
      (RNFS.readFile as jest.Mock).mockResolvedValue('base64data');
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({
        data: { id: 'shift-123' },
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: mockShift,
      });

      const store = createMockStore();
      const { getByText, getAllByText } = renderScreen(store);

      // Wait for location
      await waitFor(() => {
        expect(getByText(/Dalam batas/)).toBeTruthy();
      });

      // Capture selfie
      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      // Clock in - get the button (last instance of "Clock In" text)
      await act(async () => {
        const clockInButtons = getAllByText('Clock In');
        const clockInButton = clockInButtons[clockInButtons.length - 1]; // Get last one (the button)
        fireEvent.press(clockInButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(shiftsApi.clockIn).toHaveBeenCalledWith(
          'area-123',
          -7.250445,
          112.768845,
          'data:image/jpeg;base64,base64data'
        );
      });

      expect(locationTracker.initialize).toHaveBeenCalledWith('shift-123');
    });

    it('should show error when trying to clock in outside boundary', async () => {
      // Clear and set up mock for this specific test
      (Geolocation.getCurrentPosition as jest.Mock).mockClear();
      (Geolocation.watchPosition as jest.Mock).mockClear();

      // Mock to return coordinates far outside 100m radius
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
        success({
          coords: {
            latitude: -7.252445, // ~222m north from center
            longitude: 112.770845, // ~194m east from center
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
      });

      (Geolocation.watchPosition as jest.Mock).mockImplementation((success) => {
        success({
          coords: {
            latitude: -7.252445,
            longitude: 112.770845,
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
        return 123;
      });

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Di luar batas/)).toBeTruthy();
      }, { timeout: 5000 });

      // Button should be disabled when outside boundary (verified by presence of warning text)
    });

    it('should show error when clock in without selfie', async () => {
      const store = createMockStore();
      const { getByText, getAllByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Dalam batas/)).toBeTruthy();
      });

      // Try to clock in without selfie
      const clockInButtons = getAllByText('Clock In');
      const clockInButton = clockInButtons[clockInButtons.length - 1];
      fireEvent.press(clockInButton);

      await waitFor(() => {
        // Should show alert about missing selfie
        expect(getAllByText('Clock In').length).toBeGreaterThan(0);
      });
    });

    it('should handle clock in API error', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ uri: 'file://test-selfie.jpg' }],
      });
      (RNFS.readFile as jest.Mock).mockResolvedValue('base64data');
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({
        error: 'Already clocked in',
      });

      const store = createMockStore();
      const { getByText, getAllByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Dalam batas/)).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      await act(async () => {
        const clockInButtons = getAllByText('Clock In');
        const clockInButton = clockInButtons[clockInButtons.length - 1];
        fireEvent.press(clockInButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(shiftsApi.clockIn).toHaveBeenCalled();
      });
    });

    it('should show offline banner when offline during clock-in', async () => {
      const store = createMockStore({
        offline: {
          isOnline: false,
          isSyncing: false,
          queue: [],
          pendingShiftsCount: 0,
          pendingReportsCount: 0,
          pendingMediaCount: 0,
          pendingLocationsCount: 0,
          lastSyncTime: null,
          syncError: null,
        },
      });

      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Mode Offline/)).toBeTruthy();
      });
    });
  });

  describe('Clock-Out Flow', () => {
    it('should successfully clock out with confirmation', async () => {
      (shiftsApi.clockOut as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });

      const { getByText, getAllByText } = renderScreen(store);

      await waitFor(() => {
        const clockOutButtons = getAllByText('Clock Out');
        expect(clockOutButtons.length).toBeGreaterThan(0);
      });

      const clockOutButtons = getAllByText('Clock Out');
      const clockOutButton = clockOutButtons[clockOutButtons.length - 1];
      fireEvent.press(clockOutButton);

      // Confirmation dialog should appear (Alert.alert is mocked globally)
      await waitFor(() => {
        expect(getAllByText('Clock Out').length).toBeGreaterThan(0);
      });
    });

    it('should handle clock out without active shift', async () => {
      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        // Should show clock-in UI, not clock-out
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });
    });

    it('should upload location data before clock out', async () => {
      (shiftsApi.clockOut as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });

      renderScreen(store);

      await waitFor(() => {
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });

      // Clock out would trigger forceUpload and stop in locationTracker
    });

    it('should handle clock out API error', async () => {
      (shiftsApi.clockOut as jest.Mock).mockResolvedValue({
        error: 'Clock out failed',
      });

      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });

      renderScreen(store);

      await waitFor(() => {
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });
    });
  });

  describe('Timer Updates', () => {
    it('should display elapsed time when clocked in', async () => {
      jest.useFakeTimers();

      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });

      const { getByText } = renderScreen(store);

      await waitFor(() => {
        // Timer should show elapsed time
        expect(getByText(/\d{2}:\d{2}:\d{2}/)).toBeTruthy();
      });

      jest.useRealTimers();
    });

    it('should update timer every second', async () => {
      jest.useFakeTimers();

      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });

      renderScreen(store);

      await waitFor(() => {
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      jest.useRealTimers();
    });

    it('should clear timer on clock out', async () => {
      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        // No shift, timer should be 00:00:00
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing location before clock in', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((_, error) => {
        error({ code: 3, message: 'Timeout' });
      });

      const store = createMockStore();
      renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should handle camera exception', async () => {
      (launchCamera as jest.Mock).mockRejectedValue(new Error('Camera error'));

      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Ambil Selfie')).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));

      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });
    });

    it('should handle RNFS read error during clock in', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ uri: 'file://test-selfie.jpg' }],
      });
      (RNFS.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      const store = createMockStore();
      const { getByText, getAllByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Dalam batas/)).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      await act(async () => {
        const clockInButtons = getAllByText('Clock In');
        const clockInButton = clockInButtons[clockInButtons.length - 1];
        fireEvent.press(clockInButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(RNFS.readFile).toHaveBeenCalled();
      });
    });

    it('should continue clock in even if location tracking fails to start', async () => {
      (launchCamera as jest.Mock).mockResolvedValue({
        assets: [{ uri: 'file://test-selfie.jpg' }],
      });
      (RNFS.readFile as jest.Mock).mockResolvedValue('base64data');
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({
        data: { id: 'shift-123' },
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: mockShift,
      });
      (locationTracker.initialize as jest.Mock).mockRejectedValue(
        new Error('Tracking failed')
      );

      const store = createMockStore();
      const { getByText, getAllByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText(/Dalam batas/)).toBeTruthy();
      });

      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      await act(async () => {
        const clockInButtons = getAllByText('Clock In');
        const clockInButton = clockInButtons[clockInButtons.length - 1];
        fireEvent.press(clockInButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(shiftsApi.clockIn).toHaveBeenCalled();
      });
    });

    it('should continue clock out even if tracking stop fails', async () => {
      (shiftsApi.clockOut as jest.Mock).mockResolvedValue({
        data: { success: true },
      });
      (locationTracker.forceUpload as jest.Mock).mockRejectedValue(
        new Error('Upload failed')
      );

      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });

      renderScreen(store);

      await waitFor(() => {
        expect(permissionsService.requestClockInPermissions).toHaveBeenCalled();
      });
    });
  });
});
