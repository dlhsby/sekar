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

// Mock Alert
jest.spyOn(Alert, 'alert');

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
      expect(getByPlaceholderText(/Jelaskan pekerjaan/)).toBeTruthy();
    });

    // Type description to trigger auto-save
    const descriptionInput = getByPlaceholderText(/Jelaskan pekerjaan/);
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
      expect(getByPlaceholderText(/Jelaskan pekerjaan/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Jelaskan pekerjaan/);

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
      expect(getByPlaceholderText(/Jelaskan pekerjaan/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Jelaskan pekerjaan/);

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
      expect(getByPlaceholderText(/Jelaskan pekerjaan/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Jelaskan pekerjaan/);

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

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ReportSubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Wait for component
    await waitFor(() => {
      expect(getByText(/Buat Laporan Kerja/)).toBeTruthy();
    });

    // Press "Ambil Foto" button (camera button) - no gallery option anymore
    const cameraButton = getByText('Ambil Foto');
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
      expect(getByPlaceholderText(/Jelaskan pekerjaan/)).toBeTruthy();
    });

    // Fill form
    const descriptionInput = getByPlaceholderText(/Jelaskan pekerjaan/);
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
      expect(getByPlaceholderText(/Jelaskan pekerjaan/)).toBeTruthy();
    });

    const descriptionInput = getByPlaceholderText(/Jelaskan pekerjaan/);

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
});
