/**
 * OvertimeSubmitScreen Tests
 * Comprehensive tests to improve coverage from 43.43% to >80%
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { OvertimeSubmitScreen } from '../OvertimeSubmitScreen';
import { configureStore } from '@reduxjs/toolkit';
import overtimeReducer from '../../../store/slices/overtimeSlice';

// Mock all external dependencies
jest.mock('../../../services/api/overtimeApi', () => ({
  submitOvertime: jest.fn(),
}));

jest.mock('../../../services/media', () => ({
  mediaService: {
    capturePhoto: jest.fn(),
    convertToBase64: jest.fn(),
  },
}));

jest.mock('../../../services/permissions', () => ({
  requestCameraPermission: jest.fn(),
}));

// Mock useActivityTypes hook
const mockActivityTypes = [
  { id: 'type-1', name: 'Penyiraman', applicable_roles: ['satgas'] },
  { id: 'type-2', name: 'Pemangkasan', applicable_roles: ['satgas'] },
  { id: 'type-3', name: 'Pembersihan', applicable_roles: ['satgas'] },
];

jest.mock('../../../hooks/useActivityTypes', () => ({
  useActivityTypes: jest.fn(() => ({
    activityTypes: mockActivityTypes,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Mock react-native-date-picker
jest.mock('react-native-date-picker', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ modal, open, date, mode, onConfirm, onCancel }: any) => {
    if (!open) return null;
    return React.createElement(View, { testID: `date-picker-${mode}` },
      React.createElement(TouchableOpacity, {
        testID: `confirm-${mode}`,
        onPress: () => onConfirm(date),
      }, React.createElement(Text, null, 'Confirm')),
      React.createElement(TouchableOpacity, {
        testID: `cancel-${mode}`,
        onPress: () => onCancel(),
      }, React.createElement(Text, null, 'Cancel'))
    );
  };
});

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      overtime: overtimeReducer,
    },
    preloadedState: {
      overtime: {
        myOvertimes: [],
        pendingApprovals: [],
        selectedOvertime: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    },
  });
};

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('OvertimeSubmitScreen', () => {
  let store: any;
  let alertSpy: jest.SpyInstance;
  let overtimeApi: any;
  let mediaService: any;
  let permissions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();

    // Get mocked modules
    overtimeApi = require('../../../services/api/overtimeApi');
    mediaService = require('../../../services/media').mediaService;
    permissions = require('../../../services/permissions');

    // Spy on Alert
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Mock Geolocation
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
      success({
        coords: {
          latitude: -7.250445,
          longitude: 112.768845,
          accuracy: 10,
        },
      });
    });

    // Mock media service
    mediaService.capturePhoto.mockResolvedValue({
      id: 'photo-1',
      uri: 'file://photo1.jpg',
      type: 'image/jpeg',
      fileName: 'photo1.jpg',
    });
    mediaService.convertToBase64.mockResolvedValue('data:image/jpeg;base64,mockBase64');

    // Mock permissions
    permissions.requestCameraPermission.mockResolvedValue({ granted: true });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Initial Render and GPS Capture', () => {
    it('should render correctly', () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      expect(getByText('Ajukan Lembur')).toBeTruthy();
      expect(getByText('Tanggal')).toBeTruthy();
      expect(getByText('Waktu Mulai')).toBeTruthy();
      expect(getByText('Waktu Selesai')).toBeTruthy();
    });

    it('should capture GPS location on mount', async () => {
      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should handle GPS error gracefully (lines 126-128)', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error) => {
        error({ code: 1, message: 'Location error' });
      });

      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Peringatan', 'Gagal mendapatkan lokasi GPS');
      });
    });
  });

  describe('Photo Capture (lines 136-149)', () => {
    it('should capture photo successfully', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      const addPhotoButton = getByText('+');
      await act(async () => {
        fireEvent.press(addPhotoButton);
      });

      await waitFor(() => {
        expect(permissions.requestCameraPermission).toHaveBeenCalled();
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });
    });

    it('should show alert when camera permission denied (lines 142-144)', async () => {
      permissions.requestCameraPermission.mockResolvedValue({ granted: false });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      const addPhotoButton = getByText('+');
      await act(async () => {
        fireEvent.press(addPhotoButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Izin Diperlukan', 'Aplikasi memerlukan izin kamera');
      });
    });

    it('should remove photo when X button pressed (lines 158-160)', async () => {
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      // Add a photo first
      const addPhotoButton = getByText('+');
      await act(async () => {
        fireEvent.press(addPhotoButton);
      });

      await waitFor(() => {
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });

      // Find and press remove button
      const removeButton = getByText('×');
      await act(async () => {
        fireEvent.press(removeButton);
      });

      // Photo should be removed (remove button should not exist)
      await waitFor(() => {
        expect(queryByText('×')).toBeNull();
      });
    });
  });

  describe('Form Validation (lines 170, 176-177)', () => {
    it('should show error when photos missing', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      // Submit without any data
      const submitButton = getByText('Kirim Pengajuan');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText('Minimal 1 foto diperlukan')).toBeTruthy();
      });
    });
  });

  describe('Form Submission (lines 201-241)', () => {
    it('should submit form successfully', async () => {
      const mockResponse = {
        data: {
          id: 'ot-001',
          status: 'pending',
          date: '2026-02-14',
          start_time: '17:00',
          end_time: '20:00',
        },
      };
      overtimeApi.submitOvertime.mockResolvedValue(mockResponse);

      const { getByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      // Add photo
      const addPhotoButton = getByText('+');
      await act(async () => {
        fireEvent.press(addPhotoButton);
      });

      // Select activity type
      const activityTypeButton = getByText('Penyiraman');
      await act(async () => {
        fireEvent.press(activityTypeButton);
      });

      // Fill description
      const descriptionInput = getByPlaceholderText('Jelaskan aktivitas lembur...');
      await act(async () => {
        fireEvent.changeText(descriptionInput, 'Lembur untuk penyiraman taman');
      });

      // Wait for photo to be added
      await waitFor(() => {
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });

      // Submit
      const submitButton = getByText('Kirim Pengajuan');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(overtimeApi.submitOvertime).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', 'Pengajuan lembur berhasil disimpan', expect.any(Array));
      });
    });

    it('should handle API error response (lines 232-234)', async () => {
      const mockResponse = {
        error: 'Data tidak valid',
        data: null,
      };
      overtimeApi.submitOvertime.mockResolvedValue(mockResponse);

      const { getByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      // Add photo
      const addPhotoButton = getByText('+');
      await act(async () => {
        fireEvent.press(addPhotoButton);
      });

      // Select activity type
      const activityTypeButton = getByText('Penyiraman');
      await act(async () => {
        fireEvent.press(activityTypeButton);
      });

      // Fill description
      const descriptionInput = getByPlaceholderText('Jelaskan aktivitas lembur...');
      await act(async () => {
        fireEvent.changeText(descriptionInput, 'Test description');
      });

      await waitFor(() => {
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });

      // Submit
      const submitButton = getByText('Kirim Pengajuan');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Data tidak valid');
      });
    });

    it('should navigate back after successful submission (lines 229-230)', async () => {
      const mockResponse = {
        data: { id: 'ot-001', status: 'pending' },
      };
      overtimeApi.submitOvertime.mockResolvedValue(mockResponse);

      const { getByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      // Add photo
      const addPhotoButton = getByText('+');
      await act(async () => {
        fireEvent.press(addPhotoButton);
      });

      // Select activity type
      const activityTypeButton = getByText('Penyiraman');
      await act(async () => {
        fireEvent.press(activityTypeButton);
      });

      // Fill description
      const descriptionInput = getByPlaceholderText('Jelaskan aktivitas lembur...');
      await act(async () => {
        fireEvent.changeText(descriptionInput, 'Test');
      });

      await waitFor(() => {
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });

      // Submit
      const submitButton = getByText('Kirim Pengajuan');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Wait for success alert and click OK
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', 'Pengajuan lembur berhasil disimpan', expect.any(Array));
      });

      // Trigger the OK button callback
      const okCallback = alertSpy.mock.calls[0][2][0].onPress;
      okCallback();

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('GPS Update (lines 326-330)', () => {
    it('should update GPS when button pressed', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      const updateGpsButton = getByText('Perbarui GPS');
      await act(async () => {
        fireEvent.press(updateGpsButton);
      });

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2); // Once on mount, once on button
      });
    });

    it('should display GPS coordinates', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText(/-7\.250445, 112\.768845/)).toBeTruthy();
      });
    });
  });

  describe('Notes Field (lines 384-438)', () => {
    it('should allow entering notes', async () => {
      const { getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>
      );

      const notesInput = getByPlaceholderText('Tambahkan catatan jika diperlukan...');
      await act(async () => {
        fireEvent.changeText(notesInput, 'Catatan tambahan untuk lembur ini');
      });

      expect(notesInput.props.value).toBe('Catatan tambahan untuk lembur ini');
    });
  });
});
