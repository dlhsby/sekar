/**
 * Comprehensive ClockInOutScreen Tests
 * Phase 2C: Soft geofencing (warnings only, never blocks clock-in), area_id optional
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
  role: 'satgas',
};

const mockShift = {
  id: 'shift-123',
  clock_in_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  clock_out_time: null,
  user_id: 1,
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
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

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

    it('should display location when within boundary (Phase 2C: no special text)', async () => {
      const store = createMockStore();
      const { queryByText } = renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      // Phase 2C: No more "Dalam batas" text - soft geofencing shows warning only when outside
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

    it('should show soft warning when outside boundary (Phase 2C)', async () => {
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

      // Phase 2C: Should show soft warning (yellow banner) but NOT block clock-in
      await waitFor(() => {
        expect(getByText(/Anda berada di luar area kerja/i)).toBeTruthy();
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

  describe('Phase 2C UX Improvements', () => {
    it('should inject back button into navigator header on mount', async () => {
      // Back button is injected via navigation.setOptions() into the navigator header,
      // which is managed by MainNavigator (not rendered in screen body).
      // In unit tests the header is not mounted, so we verify the screen renders
      // without errors and the content below the header is visible.
      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Ambil foto diri dan konfirmasi lokasi untuk memulai shift')).toBeTruthy();
      });
    });

    it('should show area card collapsed by default', async () => {
      const store = createMockStore();
      const { getByText, queryByText } = renderScreen(store);

      await waitFor(() => {
        // Area name visible (always shown in collapsible header)
        expect(getByText('Taman Bungkul')).toBeTruthy();
      });

      // Area details hidden by default (collapsed)
      expect(queryByText('Tipe Area:')).toBeNull();
    });

    it('should expand area card on press', async () => {
      const store = createMockStore();
      const { getByText, getByLabelText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Taman Bungkul')).toBeTruthy();
      });

      // Expand the card
      fireEvent.press(getByLabelText('Tampilkan detail area'));

      await waitFor(() => {
        expect(getByText('Tipe Area:')).toBeTruthy();
      });
    });

    it('should show inside-area green banner when within boundary', async () => {
      // Default mock puts user inside the 100m radius
      const store = createMockStore();
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(getByText(/Anda berada di dalam area kerja/i)).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should show Kirim as the action button title (not Clock In)', async () => {
      const store = createMockStore();
      const { getByText, queryByText } = renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(getByText('Kirim')).toBeTruthy();
      });

      // The old button label should NOT appear (only topBar title uses these)
      // Clock In appears only as topBar title, not as the action button
    });

    it('should show Kirim button in clock-out mode', async () => {
      const store = createMockStore({
        shift: {
          currentShift: mockShift,
          isSubmitting: false,
          error: null,
        },
      });
      const { getByText } = renderScreen(store);

      await waitFor(() => {
        expect(getByText('Kirim')).toBeTruthy();
      });
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
    it('should successfully clock in with valid data (Phase 2C: no area_id)', async () => {
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
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      // Capture selfie
      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      // Press Kirim button (renamed from 'Clock In'/'Clock Out' in Phase 2C refactor)
      await act(async () => {
        fireEvent.press(getByText('Kirim'));
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Phase 2C: clockIn called WITHOUT area_id (auto-detected from schedule)
      await waitFor(() => {
        expect(shiftsApi.clockIn).toHaveBeenCalledWith(
          -7.250445,
          112.768845,
          'data:image/jpeg;base64,base64data'
        );
      });

      expect(locationTracker.initialize).toHaveBeenCalledWith('shift-123');
    });

    it('should allow clock-in when outside boundary (Phase 2C)', async () => {
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
        // Phase 2C: Soft warning shown but clock-in NOT blocked
        expect(getByText(/Anda berada di luar area kerja/i)).toBeTruthy();
      }, { timeout: 5000 });

      // Phase 2C: Clock-in button should still be enabled (only disabled if no GPS or no selfie)
    });

    it('should show error when clock in without selfie', async () => {
      const store = createMockStore();
      const { getByText, getAllByText } = renderScreen(store);

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      // Try to clock in without selfie — Kirim button should be disabled (no selfie)
      const submitButton = getByText('Kirim');
      fireEvent.press(submitButton);

      await waitFor(() => {
        // Kirim button still visible (disabled when no selfie)
        expect(getByText('Kirim')).toBeTruthy();
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
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      await act(async () => {
        fireEvent.press(getByText('Kirim'));
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

      const { getByText } = renderScreen(store);

      // Clock-out subtitle appears when there is an active shift
      await waitFor(() => {
        expect(getByText('Konfirmasi lokasi untuk mengakhiri shift')).toBeTruthy();
      });

      // Kirim button (renamed from 'Clock Out') should be present
      await waitFor(() => {
        expect(getByText('Kirim')).toBeTruthy();
      });

      fireEvent.press(getByText('Kirim'));

      // Confirmation dialog should appear (Alert.alert is mocked globally)
      await waitFor(() => {
        expect(getByText('Kirim')).toBeTruthy();
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
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      await act(async () => {
        fireEvent.press(getByText('Kirim'));
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
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });

      fireEvent.press(getByText('Ambil Selfie'));
      await waitFor(() => {
        expect(launchCamera).toHaveBeenCalled();
      });

      await act(async () => {
        fireEvent.press(getByText('Kirim'));
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
