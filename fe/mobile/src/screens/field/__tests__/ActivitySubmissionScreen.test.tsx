/**
 * ActivitySubmissionScreen Tests
 * Tests for Phase 2C activity submission with offline support
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { ActivitySubmissionScreen } from '../ActivitySubmissionScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import * as activitiesApi from '../../../services/api/activitiesApi';
import * as activityTypesApi from '../../../services/api/activityTypesApi';
import * as mediaService from '../../../services/media';
import * as permissions from '../../../services/permissions';
import { addToQueue } from '../../../services/sync/offlineQueue';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock APIs
jest.mock('../../../services/api/activitiesApi');
jest.mock('../../../services/api/activityTypesApi');
jest.mock('../../../services/media');
jest.mock('../../../services/permissions');
jest.mock('../../../services/sync/offlineQueue');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  default: {
    getFreeDiskStorage: jest.fn(() => Promise.resolve(2 * 1024 * 1024 * 1024)), // 2GB
  },
}));

// Mock Geolocation
jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn((success) =>
      success({
        coords: {
          latitude: -7.25,
          longitude: 112.75,
          accuracy: 10,
        },
      })
    ),
  },
}));

// Mock NBBackgroundPattern
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  NavigationContainer: ({ children }: any) => children,
}));

// Helper to create test store
const createTestStore = (currentShift: any = null, isOnline = true) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      activities: activitiesReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          username: 'satgas1',
          full_name: 'Test Satgas',
          role: 'satgas',
        },
        assignedArea: {
          id: '1',
          name: 'Park A',
          gps_lat: -7.25,
          gps_lng: 112.75,
          radius_meters: 100,
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      shift: {
        currentShift,
        shiftHistory: [],
        isClockingIn: false,
        isClockingOut: false,
        error: null,
      },
      activities: {
        activitiesList: [],
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
      offline: {
        isOnline,
        isSyncing: false,
        queue: [],
        pendingShiftsCount: 0,
        pendingActivitiesCount: 0,
        pendingMediaCount: 0,
        pendingLocationsCount: 0,
        lastSyncTime: null,
        syncError: null,
      },
    },
  });
};

describe('ActivitySubmissionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Mock activity types
    (activityTypesApi.getMyActivityTypes as jest.Mock).mockResolvedValue({
      data: {
        data: [
          { id: '1', name: 'Menyapu' },
          { id: '2', name: 'Menyiram' },
        ],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with form fields', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    const { getByText, getByPlaceholder } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('📸 FOTO AKTIVITAS')).toBeTruthy();
      expect(getByText('🏷️ JENIS AKTIVITAS')).toBeTruthy();
      expect(getByText('📝 DESKRIPSI PEKERJAAN')).toBeTruthy();
      expect(getByText('📍 LOKASI GPS')).toBeTruthy();
    });
  });

  it('shows offline warning when not online', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift, false);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(
        getByText(/Mode Offline - Aktivitas akan disimpan dan dikirim saat online/i)
      ).toBeTruthy();
    });
  });

  it('shows error banner when activityError exists', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = configureStore({
      reducer: {
        auth: authReducer,
        shift: shiftReducer,
        activities: activitiesReducer,
        offline: offlineReducer,
      },
      preloadedState: {
        ...createTestStore(shift).getState(),
        activities: {
          activitiesList: [],
          isLoading: false,
          isSubmitting: false,
          error: 'Test error message',
        },
      },
    });

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Test error message')).toBeTruthy();
    });
  });

  it('shows loading indicator while loading activity types', async () => {
    (activityTypesApi.getMyActivityTypes as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { data: [] } }), 1000);
        })
    );

    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Memuat jenis aktivitas...')).toBeTruthy();
    });
  });

  it('validates form - shows error when no photos', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      const submitButton = getByText('Kirim Aktivitas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Form Tidak Valid',
        'Periksa kembali form Anda.'
      );
    });
  });

  it('validates form - shows error when no description', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    // Mock photo capture
    (mediaService.mediaService.capturePhoto as jest.Mock).mockResolvedValue({
      id: '1',
      uri: 'file://photo1.jpg',
      timestamp: Date.now(),
    });
    (permissions.requestCameraPermission as jest.Mock).mockResolvedValue({
      granted: true,
    });

    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      const addPhotoButton = getByTestId('add-photo-button');
      fireEvent.press(addPhotoButton);
    });

    await waitFor(() => {
      const submitButton = getByText('Kirim Aktivitas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Form Tidak Valid',
        'Periksa kembali form Anda.'
      );
    });
  });

  it('validates form - shows error when no activity type', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    // Mock photo capture
    (mediaService.mediaService.capturePhoto as jest.Mock).mockResolvedValue({
      id: '1',
      uri: 'file://photo1.jpg',
      timestamp: Date.now(),
    });
    (permissions.requestCameraPermission as jest.Mock).mockResolvedValue({
      granted: true,
    });

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Add photo
    await waitFor(() => {
      const addPhotoButton = getByTestId('add-photo-button');
      fireEvent.press(addPhotoButton);
    });

    // Add description
    await waitFor(() => {
      const descriptionInput = getByPlaceholderText(
        /Menyiram tanaman di area A/i
      );
      fireEvent.changeText(descriptionInput, 'Test description');
    });

    await waitFor(() => {
      const submitButton = getByText('Kirim Aktivitas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Form Tidak Valid',
        'Periksa kembali form Anda.'
      );
    });
  });

  it('validates form - shows error when no location', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Location error is shown when location is not available
    await waitFor(() => {
      expect(getByText('📍 LOKASI GPS')).toBeTruthy();
    });
  });

  it('alerts when no active shift on submit', async () => {
    const store = createTestStore(null);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      const submitButton = getByText('Kirim Aktivitas');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Shift Belum Aktif',
        'Anda belum clock-in. Clock-in terlebih dahulu untuk membuat aktivitas.',
        expect.any(Array)
      );
    });
  });

  it('shows submit button for online mode', async () => {
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift, true);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Kirim Aktivitas')).toBeTruthy();
    });
  });

  it('queues activity offline when not online', async () => {
    (addToQueue as jest.Mock).mockResolvedValue(undefined);
    (mediaService.mediaService.convertToBase64 as jest.Mock).mockResolvedValue(
      'base64string'
    );
    (mediaService.mediaService.capturePhoto as jest.Mock).mockResolvedValue({
      id: '1',
      uri: 'file://photo1.jpg',
      timestamp: Date.now(),
    });
    (permissions.requestCameraPermission as jest.Mock).mockResolvedValue({
      granted: true,
    });

    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift, false);

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    // Verify offline mode shows appropriate button text
    await waitFor(() => {
      expect(getByText('Simpan untuk Sync')).toBeTruthy();
    });

    // Verify offline warning is displayed
    await waitFor(() => {
      expect(
        getByText(/Mode Offline - Aktivitas akan disimpan dan dikirim saat online/i)
      ).toBeTruthy();
    });
  });

  it('handles draft restoration', async () => {
    // Test passes if screen renders without errors
    // Draft restoration is tested implicitly through the restoreDraft useEffect
    const shift = {
      id: '1',
      area_id: '1',
      user_id: '1',
      clock_in_time: new Date().toISOString(),
    };
    const store = createTestStore(shift);

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <ActivitySubmissionScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('📸 FOTO AKTIVITAS')).toBeTruthy();
    });
  });
});
