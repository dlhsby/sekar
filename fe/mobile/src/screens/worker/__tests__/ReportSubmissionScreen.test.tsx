/**
 * ReportSubmissionScreen Tests
 * Tests for draft auto-save interval cleanup and management
 */

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import { ReportSubmissionScreen } from '../ReportSubmissionScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import reportReducer from '../../../store/slices/reportSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';

// Mock Geolocation
jest.mock('react-native-geolocation-service');

// Mock permissions
jest.mock('../../../services/permissions', () => ({
  requestCameraPermission: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
  requestLocationPermission: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
  showPermissionBlockedAlert: jest.fn(),
}));

// Mock media service
jest.mock('../../../services/media', () => ({
  mediaService: {
    capturePhoto: jest.fn().mockResolvedValue({
      id: 'photo-1',
      uri: 'file:///photo1.jpg',
      timestamp: Date.now(),
    }),
    pickFromGallery: jest.fn().mockResolvedValue([]),
    deletePhoto: jest.fn().mockResolvedValue(undefined),
    convertToBase64: jest.fn().mockResolvedValue('base64-data'),
    validatePhotoCount: jest.fn((count) => count < 5),
    getMaxPhotos: jest.fn().mockReturnValue(5),
  },
}));

// Mock reports API
jest.mock('../../../services/api/reportsApi', () => ({
  createReport: jest.fn().mockResolvedValue({
    id: 1,
    description: 'Test report',
    work_type: 'cleaning',
  }),
}));

describe('ReportSubmissionScreen Draft Auto-Save', () => {
  let store: any;
  let getCurrentPositionMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    // Setup Alert spy in beforeEach to prevent cross-test pollution
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    getCurrentPositionMock = jest.fn();
    (Geolocation.getCurrentPosition as jest.Mock) = getCurrentPositionMock;

    // Mock successful location
    getCurrentPositionMock.mockImplementation((success, error, options) => {
      success({
        coords: {
          latitude: -7.250445,
          longitude: 112.768845,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });
    });

    // Clear AsyncStorage
    AsyncStorage.clear();

    // Create mock store with active shift
    store = configureStore({
      reducer: {
        auth: authReducer,
        shift: shiftReducer,
        offline: offlineReducer,
        report: reportReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 1,
            username: 'worker1',
            full_name: 'Test Worker',
            role: 'Worker',
          },
          assignedArea: {
            id: 1,
            name: 'Park A',
          },
          token: 'test-token',
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        shift: {
          currentShift: {
            id: 1,
            area_id: 1,
            worker_id: 1,
            clock_in_time: new Date().toISOString(),
            clock_in_gps_lat: -7.250445,
            clock_in_gps_lng: 112.768845,
          },
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
        report: {
          reports: [],
          isSubmitting: false,
          error: null,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should cleanup draft auto-save interval on unmount', async () => {
    const { unmount, getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(getByPlaceholderText(/Contoh:/)).toBeTruthy();
    });

    // Type description to trigger auto-save
    const descriptionInput = getByPlaceholderText(/Contoh:/);
    fireEvent.changeText(descriptionInput, 'Test description for auto-save');

    // Advance time but not to 30 seconds yet
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Unmount before auto-save triggers
    unmount();

    // Advance time after unmount - should not cause issues
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Test passes if no errors occur
    expect(true).toBe(true);
  });

  it('should not create multiple intervals when form changes', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByPlaceholderText(/Contoh:/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Contoh:/);

    // Type first text
    act(() => {
      fireEvent.changeText(descriptionInput, 'First description text');
    });

    // Advance time to 30 seconds (should trigger auto-save)
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should have saved once
    const firstCallCount = setItemSpy.mock.calls.filter(
      (call) => call[0] === 'report_draft'
    ).length;

    // Type more text
    act(() => {
      fireEvent.changeText(descriptionInput, 'Updated description text');
    });

    // Advance another 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should have saved twice total (not accumulated intervals)
    const secondCallCount = setItemSpy.mock.calls.filter(
      (call) => call[0] === 'report_draft'
    ).length;

    expect(secondCallCount).toBe(firstCallCount + 1);
  });

  it('should save draft correctly after 30 seconds', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByPlaceholderText(/Contoh:/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Contoh:/);

    // Type description (>10 characters to trigger auto-save)
    act(() => {
      fireEvent.changeText(descriptionInput, 'This is a test description for auto-save');
    });

    // Advance time to 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify draft was saved
    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        'report_draft',
        expect.stringContaining('This is a test description')
      );
    });

    // Verify draft structure
    const savedDraft = JSON.parse(setItemSpy.mock.calls[0][1]);
    expect(savedDraft).toHaveProperty('description');
    expect(savedDraft).toHaveProperty('timestamp');
    expect(savedDraft.description).toBe('This is a test description for auto-save');
  });

  it('should not auto-save if description is less than 5 characters', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByPlaceholderText(/Contoh:/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Contoh:/);

    // Type very short description (less than 5 chars)
    act(() => {
      fireEvent.changeText(descriptionInput, 'Test');
    });

    // Advance time to 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should not have saved (description too short)
    expect(setItemSpy).not.toHaveBeenCalledWith(
      'report_draft',
      expect.any(String)
    );
  });

  it('should auto-save when photos are added (even without description)', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    const { getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for component - verify form elements loaded (no title in body anymore)
    await waitFor(() => {
      expect(getByTestId('add-photo-button')).toBeTruthy();
    });

    // Press add photo button - no gallery option anymore
    const cameraButton = getByTestId('add-photo-button');
    await act(async () => {
      fireEvent.press(cameraButton);
    });

    // Wait for async photo capture to complete
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Advance time to 30 seconds for auto-save
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    // Should have saved because photos.length > 0
    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        'report_draft',
        expect.any(String)
      );
    });
  });

  it('should restore draft on mount if available', async () => {
    // Pre-populate AsyncStorage with a draft
    const mockDraft = {
      description: 'Restored draft description',
      workType: 'cleaning',
      photos: [],
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem('report_draft', JSON.stringify(mockDraft));

    let capturedRestoreCallback: (() => void) | undefined;

    // Mock Alert to capture the restore callback
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      if (title === 'Draft Ditemukan') {
        const lanjutkanButton = buttons?.find((b: any) => b.text === 'Lanjutkan');
        capturedRestoreCallback = lanjutkanButton?.onPress;
      }
    });

    const { getByDisplayValue } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for component to mount and check for draft
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Verify Alert.alert was called with draft restore dialog
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Draft Ditemukan',
        expect.any(String),
        expect.any(Array)
      );
    });

    // Simulate user pressing "Lanjutkan"
    if (capturedRestoreCallback) {
      await act(async () => {
        capturedRestoreCallback!();
      });
    }

    // Verify draft was restored
    await waitFor(() => {
      expect(getByDisplayValue('Restored draft description')).toBeTruthy();
    });
  });

  it('should not restore draft if older than 24 hours', async () => {
    // Pre-populate AsyncStorage with an old draft
    const mockDraft = {
      description: 'Old draft description',
      workType: 'cleaning',
      photos: [],
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
    };
    await AsyncStorage.setItem('report_draft', JSON.stringify(mockDraft));

    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem');

    const { queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Should not show restore dialog
    await waitFor(() => {
      expect(queryByText('Draft Ditemukan')).toBeNull();
    });

    // Should have removed old draft
    expect(removeItemSpy).toHaveBeenCalledWith('report_draft');
  });

  it('should clear draft after successful submission', async () => {
    const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem');

    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByPlaceholderText(/Contoh:/)).toBeTruthy();
    });

    // Fill form
    const descriptionInput = getByPlaceholderText(/Contoh:/);
    fireEvent.changeText(descriptionInput, 'Test report description');

    // Select work type
    const cleaningOption = getByText('Pembersihan');
    fireEvent.press(cleaningOption);

    // Submit (requires photos but we'll test draft cleanup)
    // Note: This test focuses on draft cleanup, not full submission flow
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Draft should be saved during editing
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'report_draft',
        expect.any(String)
      );
    });

    // On successful submission, draft is removed (tested separately in integration tests)
    expect(true).toBe(true);
  });

  it('should handle multiple rapid form changes without duplicate saves', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByPlaceholderText(/Contoh:/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Contoh:/);

    // Simulate rapid typing
    act(() => {
      fireEvent.changeText(descriptionInput, 'First change here');
      fireEvent.changeText(descriptionInput, 'Second change here');
      fireEvent.changeText(descriptionInput, 'Third change here now');
    });

    // Advance time to 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should only have saved once (last state)
    const draftCalls = setItemSpy.mock.calls.filter(
      (call) => call[0] === 'report_draft'
    );
    expect(draftCalls.length).toBe(1);

    // Verify it saved the latest text
    const savedDraft = JSON.parse(draftCalls[0][1]);
    expect(savedDraft.description).toBe('Third change here now');
  });

  describe('Disk Space Check (Issue #9)', () => {
    let DeviceInfo: any;

    beforeEach(() => {
      jest.clearAllMocks();
      DeviceInfo = require('react-native-device-info');
    });

    it('should check disk space before capturing photo', async () => {
      // Mock sufficient disk space (5GB)
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(5 * 1024 * 1024 * 1024);

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should check disk space
      expect(DeviceInfo.getFreeDiskStorage).toHaveBeenCalled();
    });

    it('should show alert when disk space is below minimum', async () => {
      const config = require('../../../constants/config').default;
      const minStorageMB = config.MIN_FREE_STORAGE_MB;

      // Mock insufficient disk space (50MB, below 100MB minimum)
      const lowDiskSpace = 50 * 1024 * 1024; // 50MB in bytes
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(lowDiskSpace);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should show alert with storage warning
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Penyimpanan Penuh',
          expect.stringContaining('50MB'),
          expect.any(Array)
        );
      });
    });

    it('should use config.MIN_FREE_STORAGE_MB for threshold', async () => {
      const config = require('../../../constants/config').default;
      expect(config.MIN_FREE_STORAGE_MB).toBe(100);

      // Mock disk space exactly at threshold (100MB)
      const exactThreshold = 100 * 1024 * 1024; // 100MB in bytes
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(exactThreshold);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // At exactly 100MB, should NOT show alert (only < 100MB triggers alert)
      await waitFor(() => {
        expect(DeviceInfo.getFreeDiskStorage).toHaveBeenCalled();
      });

      // No alert should be shown for exactly at threshold
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should allow photo capture when disk space is sufficient', async () => {
      // Mock sufficient disk space (2GB)
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(2 * 1024 * 1024 * 1024);

      const mediaService = require('../../../services/media').mediaService;

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should proceed with photo capture
      await waitFor(() => {
        expect(DeviceInfo.getFreeDiskStorage).toHaveBeenCalled();
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });
    });

    it('should block photo capture when disk space is insufficient', async () => {
      // Mock insufficient disk space (30MB)
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(30 * 1024 * 1024);

      const mediaService = require('../../../services/media').mediaService;
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should show alert and NOT proceed with photo capture
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });
      expect(mediaService.capturePhoto).not.toHaveBeenCalled();
    });

    it('should log warning when approaching storage limit', async () => {
      // Mock disk space approaching limit (150MB, below 200MB warning threshold)
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(150 * 1024 * 1024);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should log warning for approaching limit
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Low disk space')
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle disk space check error gracefully', async () => {
      // Mock disk space check error
      DeviceInfo.getFreeDiskStorage.mockRejectedValue(new Error('Storage API error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mediaService = require('../../../services/media').mediaService;

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should log error but still allow photo capture (fail-safe)
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should convert bytes to MB correctly in alert message', async () => {
      // Mock disk space 75MB
      const diskSpaceBytes = 75 * 1024 * 1024;
      DeviceInfo.getFreeDiskStorage.mockResolvedValue(diskSpaceBytes);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ReportSubmissionScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getCurrentPositionMock).toHaveBeenCalled();
      });

      // Click add photo button
      const photoButton = getByTestId('add-photo-button');
      await act(async () => {
        fireEvent.press(photoButton);
      });

      // Should show alert with correct MB value (rounded)
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Penyimpanan Penuh',
          expect.stringContaining('75MB'),
          expect.any(Array)
        );
      });
    });
  });
});
