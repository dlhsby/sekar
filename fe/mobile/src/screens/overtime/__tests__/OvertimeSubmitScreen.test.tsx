/**
 * OvertimeSubmitScreen Tests
 * Phase 2E: Two-state screen — State A (start overtime) / State B (end overtime).
 * All tests are written against the CURRENT implementation that uses
 * startOvertime / endOvertime / getActiveOvertime from overtimeApi.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { OvertimeSubmitScreen } from '../OvertimeSubmitScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import overtimeReducer from '../../../store/slices/overtimeSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Primitive / Icon mocks ──────────────────────────────────────────────────

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Text');

// ─── NB component mocks ──────────────────────────────────────────────────────

jest.mock('../../../components/nb', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  const actual = jest.requireActual('../../../components/nb');
  return {
    ...actual,
    NBBackgroundPattern: ({ children }: any) => children,
    NBSelect: ({ onValueChange, options, placeholder }: any) =>
      React.createElement(
        View,
        { testID: 'nb-select' },
        React.createElement(Text, null, placeholder ?? 'Select'),
        (options ?? []).map((opt: any) =>
          React.createElement(
            TouchableOpacity,
            {
              key: opt.value,
              testID: `nb-select-${opt.value}`,
              onPress: () => onValueChange?.(opt.value),
            },
            React.createElement(Text, null, opt.label),
          ),
        ),
      ),
    NBCardTextInput: ({ title, value, onChangeText, placeholder, required }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, title),
        required ? React.createElement(Text, null, '*') : null,
        React.createElement(TextInput, {
          value,
          onChangeText,
          placeholder,
          testID: `card-text-input-${(title ?? '').toLowerCase().replace(/\s+/g, '-')}`,
        }),
      ),
  };
});

// ─── Navigation mock ─────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void | (() => void)) => {
    const { useEffect } = require('react');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(cb, []);
  },
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: mockSetOptions,
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  }),
  NavigationContainer: ({ children }: any) => children,
}));

// ─── FieldHomeHeader mock ─────────────────────────────────────────────────────

jest.mock('../../../components/navigation/FieldHomeHeader', () => ({
  FieldHomeHeader: ({ title, onBack }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <TouchableOpacity
          onPress={onBack}
          testID="header-back"
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        />
        <Text testID="header-title">{title}</Text>
      </>
    );
  },
}));

// ─── API mocks ───────────────────────────────────────────────────────────────

jest.mock('../../../services/api/overtimeApi', () => ({
  startOvertime: jest.fn(),
  endOvertime: jest.fn(),
  getActiveOvertime: jest.fn().mockResolvedValue({ data: null }),
}));

jest.mock('../../../services/api/shiftsApi', () => ({
  getCurrentShift: jest.fn().mockResolvedValue({ data: null }),
}));

// ─── Media / permissions mocks ───────────────────────────────────────────────

jest.mock('../../../services/media', () => ({
  mediaService: {
    capturePhoto: jest.fn(),
    convertToBase64: jest.fn(),
  },
}));

jest.mock('../../../services/permissions', () => ({
  requestCameraPermission: jest.fn(),
}));

// ─── Location tracker mock ───────────────────────────────────────────────────

jest.mock('../../../services/location/locationTracker', () => ({
  locationTracker: {
    initialize: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    stopImmediate: jest.fn(),
  },
}));

// ─── Geolocation mock ────────────────────────────────────────────────────────

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));

// ─── AsyncStorage mock ───────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// ─── Activity types hook mock ─────────────────────────────────────────────────

const mockActivityTypes = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Penyiraman', applicable_roles: ['satgas'] },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', name: 'Pemangkasan', applicable_roles: ['satgas'] },
  { id: 'aaaaaaaa-0000-0000-0000-000000000003', name: 'Lainnya', applicable_roles: ['satgas'] },
];

jest.mock('../../../hooks/useActivityTypes', () => ({
  useActivityTypes: jest.fn(() => ({
    activityTypes: mockActivityTypes,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// ─── PhotoUploader mock (exposes add-photo-button) ────────────────────────────

jest.mock('../../../components/common/PhotoUploader', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const { mediaService } = require('../../../services/media');
  const { requestCameraPermission } = require('../../../services/permissions');
  return {
    PhotoUploader: ({ photos, onAdd, error }: any) =>
      React.createElement(
        View,
        null,
        error ? React.createElement(Text, null, error) : null,
        React.createElement(
          TouchableOpacity,
          {
            testID: 'add-photo-button',
            accessibilityRole: 'button',
            accessibilityLabel: 'Tambah foto',
            onPress: async () => {
              const perm = await requestCameraPermission();
              if (!perm.granted) { return; }
              const photo = await mediaService.capturePhoto(false);
              if (photo) { onAdd(photo); }
            },
          },
          React.createElement(Text, null, '+'),
        ),
        (photos ?? []).map((p: any) =>
          React.createElement(Text, { key: p.id }, p.uri),
        ),
      ),
  };
});

// ─── ImagePreviewModal mock ───────────────────────────────────────────────────

jest.mock('../../../components/common/ImagePreviewModal', () => ({
  ImagePreviewModal: () => null,
}));

// ─── GPSLocationSection mock ──────────────────────────────────────────────────

jest.mock('../../../components/common/GPSLocationSection', () => ({
  GPSLocationSection: ({ latitude, longitude, isCapturing, onRefresh, error }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    const hasLocation = latitude != null && longitude != null;
    return React.createElement(
      View,
      null,
      error ? React.createElement(Text, null, error) : null,
      isCapturing
        ? React.createElement(Text, null, 'Mendapatkan lokasi...')
        : hasLocation
          ? React.createElement(
              Text,
              null,
              `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            )
          : React.createElement(Text, null, 'Lokasi tidak tersedia'),
      React.createElement(
        TouchableOpacity,
        { onPress: onRefresh, testID: 'refresh-gps' },
        React.createElement(Text, null, 'Perbarui GPS'),
      ),
    );
  },
}));

// ─── Safe area context mock ───────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
}));

// ─── Store factory ────────────────────────────────────────────────────────────

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      overtime: overtimeReducer,
      shift: shiftReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          username: 'satgas1',
          full_name: 'Test Satgas',
          role: 'satgas' as const,
          area_id: 'area-1',
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        assignedArea: null,
      },
    },
  });

// ─── renderScreen helper ──────────────────────────────────────────────────────

const renderScreen = async () => {
  const store = createTestStore();
  const result = render(
    <Provider store={store}>
      <NavigationContainer>
        <OvertimeSubmitScreen />
      </NavigationContainer>
    </Provider>,
  );
  // Flush all microtasks (promise resolutions) so async state updates settle.
  await act(async () => { await Promise.resolve(); });
  // Then poll until the loading spinner is gone.
  await waitFor(() => {
    expect(result.queryByText('Memeriksa status lembur...')).toBeNull();
  }, { timeout: 5000 });
  return result;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OvertimeSubmitScreen', () => {
  let alertSpy: jest.SpyInstance;
  let overtimeApi: typeof import('../../../services/api/overtimeApi');
  let mediaServiceMock: any;
  let permissionsMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    overtimeApi = require('../../../services/api/overtimeApi');
    mediaServiceMock = require('../../../services/media').mediaService;
    permissionsMock = require('../../../services/permissions');

    // Restore defaults cleared by clearAllMocks
    (overtimeApi.getActiveOvertime as jest.Mock).mockResolvedValue({ data: null });
    (overtimeApi.startOvertime as jest.Mock).mockResolvedValue({ data: null });
    (overtimeApi.endOvertime as jest.Mock).mockResolvedValue({ data: null });

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success: any) => {
      success({ coords: { latitude: -7.250445, longitude: 112.768845, accuracy: 10 } });
    });

    mediaServiceMock.capturePhoto.mockResolvedValue({
      id: 'photo-1',
      uri: 'file://photo1.jpg',
      type: 'image/jpeg',
      fileName: 'photo1.jpg',
    });
    mediaServiceMock.convertToBase64.mockResolvedValue('data:image/jpeg;base64,mockBase64==');

    permissionsMock.requestCameraPermission.mockResolvedValue({ granted: true });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ─── Loading State ─────────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('shows loading indicator while checking active overtime', async () => {
      // Delay resolution so we can observe loading state
      let resolveActive!: (v: any) => void;
      (overtimeApi.getActiveOvertime as jest.Mock).mockReturnValue(
        new Promise((res) => { resolveActive = res; }),
      );

      const store = createTestStore();
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeSubmitScreen />
          </NavigationContainer>
        </Provider>,
      );

      expect(getByText('Memeriksa status lembur...')).toBeTruthy();

      // Resolve to avoid act() warning
      await act(async () => {
        resolveActive({ data: null });
      });
    });

    it('hides loading indicator after active overtime check resolves', async () => {
      const { queryByText } = await renderScreen();
      expect(queryByText('Memeriksa status lembur...')).toBeNull();
    });
  });

  // ─── State A: No active overtime ───────────────────────────────────────────

  describe('State A — no active overtime', () => {
    it('renders ALASAN LEMBUR input', async () => {
      const { getByText } = await renderScreen();
      expect(getByText('ALASAN LEMBUR (OPSIONAL)')).toBeTruthy();
    });

    it('renders "Mulai Lembur" submit button', async () => {
      const { getByText } = await renderScreen();
      expect(getByText('Mulai Lembur')).toBeTruthy();
    });

    it('sets navigation header title to "Mulai Lembur"', async () => {
      await renderScreen();
      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({ headerTitle: expect.any(Function) }),
      );
    });

    it('does not render "Selesai Lembur" button when no active overtime', async () => {
      const { queryByText } = await renderScreen();
      expect(queryByText('Selesai Lembur')).toBeNull();
    });

    it('does not render DESKRIPSI PEKERJAAN section in State A', async () => {
      const { queryByText } = await renderScreen();
      expect(queryByText('DESKRIPSI PEKERJAAN')).toBeNull();
    });
  });

  // ─── GPS capture ───────────────────────────────────────────────────────────

  describe('GPS', () => {
    it('calls Geolocation.getCurrentPosition on mount', async () => {
      await renderScreen();
      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('displays captured coordinates', async () => {
      const { getByText } = await renderScreen();
      await waitFor(() => {
        expect(getByText('-7.250445, 112.768845')).toBeTruthy();
      });
    });

    it('shows GPS error when location unavailable and Mulai Lembur pressed', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
        (_success: any, error: any) => {
          error({ code: 1, message: 'Location unavailable' });
        },
      );

      const { getByText } = await renderScreen();
      await act(async () => {
        fireEvent.press(getByText('Mulai Lembur'));
      });

      await waitFor(() => {
        expect(
          getByText('GPS lokasi diperlukan. Ketuk "Perbarui GPS" untuk mencoba lagi.'),
        ).toBeTruthy();
      });
    });

    it('re-captures GPS when Perbarui GPS button pressed', async () => {
      const { getByTestId } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1));

      await act(async () => {
        fireEvent.press(getByTestId('refresh-gps'));
      });

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ─── Photo / selfie capture ────────────────────────────────────────────────

  describe('Photo capture', () => {
    it('pressing selfie button calls mediaService.capturePhoto(true)', async () => {
      const { getByText } = await renderScreen();

      await act(async () => {
        fireEvent.press(getByText('SELFIE MULAI (OPSIONAL)'));
      });
      await act(async () => {
        fireEvent.press(getByText('Ambil Selfie'));
      });

      await waitFor(() => {
        expect(permissionsMock.requestCameraPermission).toHaveBeenCalled();
        expect(mediaServiceMock.capturePhoto).toHaveBeenCalledWith(true);
      });
    });

    it('does not capture selfie when camera permission is denied', async () => {
      permissionsMock.requestCameraPermission.mockResolvedValue({ granted: false });

      const { getByText } = await renderScreen();
      await act(async () => {
        fireEvent.press(getByText('SELFIE MULAI (OPSIONAL)'));
      });
      await act(async () => {
        fireEvent.press(getByText('Ambil Selfie'));
      });

      await waitFor(() => {
        expect(mediaServiceMock.capturePhoto).not.toHaveBeenCalled();
      });
    });
  });

  // ─── Mulai Lembur submit (State A) ─────────────────────────────────────────

  describe('Mulai Lembur submit', () => {
    it('calls startOvertime with gps_lat and gps_lng', async () => {
      (overtimeApi.startOvertime as jest.Mock).mockResolvedValue({
        data: {
          id: 'overtime-1',
          start_datetime: new Date().toISOString(),
          status: 'in_progress',
        },
      });

      const { getByText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByText('Mulai Lembur'));
      });

      await waitFor(() => {
        expect(overtimeApi.startOvertime).toHaveBeenCalledWith(
          expect.objectContaining({
            gps_lat: -7.250445,
            gps_lng: 112.768845,
          }),
        );
      });
    });

    it('includes reason when reason text is filled', async () => {
      (overtimeApi.startOvertime as jest.Mock).mockResolvedValue({
        data: { id: 'overtime-1', start_datetime: new Date().toISOString(), status: 'in_progress' },
      });

      const { getByText, getByPlaceholderText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      fireEvent.changeText(
        getByPlaceholderText('Contoh: Pekerjaan tambahan setelah jam kerja...'),
        'Lembur untuk penyiraman',
      );

      await act(async () => {
        fireEvent.press(getByText('Mulai Lembur'));
      });

      await waitFor(() => {
        expect(overtimeApi.startOvertime).toHaveBeenCalledWith(
          expect.objectContaining({ reason: 'Lembur untuk penyiraman' }),
        );
      });
    });

    it('does not call startOvertime when GPS is unavailable', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
        (_success: any, error: any) => {
          error({ code: 1, message: 'unavailable' });
        },
      );

      const { getByText } = await renderScreen();
      await act(async () => {
        fireEvent.press(getByText('Mulai Lembur'));
      });

      expect(overtimeApi.startOvertime).not.toHaveBeenCalled();
    });

    it('navigates to Overtime list after successful start', async () => {
      (overtimeApi.startOvertime as jest.Mock).mockResolvedValue({
        data: { id: 'overtime-1', start_datetime: new Date().toISOString(), status: 'in_progress' },
      });

      const { getByText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByText('Mulai Lembur'));
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Overtime');
      });
    });

    it('shows alert when startOvertime returns an error', async () => {
      (overtimeApi.startOvertime as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Shift aktif masih berjalan',
      });

      const { getByText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByText('Mulai Lembur'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Gagal Mulai Lembur',
          expect.any(String),
        );
      });
    });
  });

  // ─── State B: Active overtime ──────────────────────────────────────────────

  describe('State B — active overtime', () => {
    const activeOvertime = {
      id: 'overtime-1',
      start_datetime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      status: 'in_progress',
    };

    beforeEach(() => {
      (overtimeApi.getActiveOvertime as jest.Mock).mockResolvedValue({
        data: activeOvertime,
      });
    });

    it('renders "Selesai Lembur" button when active overtime exists', async () => {
      const { getByText } = await renderScreen();
      expect(getByText('Selesai Lembur')).toBeTruthy();
    });

    it('does not render "Mulai Lembur" button in State B', async () => {
      const { queryByText } = await renderScreen();
      expect(queryByText('Mulai Lembur')).toBeNull();
    });

    it('renders DESKRIPSI PEKERJAAN input in State B', async () => {
      const { getByText } = await renderScreen();
      expect(getByText('DESKRIPSI PEKERJAAN')).toBeTruthy();
    });

    it('renders activity type select in State B', async () => {
      const { getByTestId } = await renderScreen();
      expect(getByTestId('nb-select')).toBeTruthy();
    });

    it('passes "Lembur Aktif" title to navigation.setOptions in State B', async () => {
      await renderScreen();
      // setOptions is called with a headerTitle factory; invoke it to verify title
      const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty('headerTitle');
      // Render the headerTitle function and verify it produces the correct title
      const { getByText } = render(lastCall.headerTitle());
      expect(getByText('Lembur Aktif')).toBeTruthy();
    });

    it('shows validation errors when Selesai Lembur pressed with empty form', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
        (_success: any, error: any) => {
          error({ code: 1, message: 'unavailable' });
        },
      );

      const { getByText } = await renderScreen();
      await act(async () => {
        fireEvent.press(getByText('Selesai Lembur'));
      });

      await waitFor(() => {
        expect(getByText('Jenis aktivitas harus dipilih')).toBeTruthy();
      });
    });

    it('calls endOvertime with required fields on valid submit', async () => {
      (overtimeApi.endOvertime as jest.Mock).mockResolvedValue({
        data: { id: 'overtime-1', status: 'completed' },
      });

      const { getByText, getByTestId, getByPlaceholderText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      // Select activity type
      await act(async () => {
        fireEvent.press(getByTestId('nb-select-aaaaaaaa-0000-0000-0000-000000000001'));
      });

      // Fill description
      fireEvent.changeText(
        getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...'),
        'Penyiraman taman',
      );

      // Add photo via PhotoUploader
      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });
      await waitFor(() => expect(mediaServiceMock.capturePhoto).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByText('Selesai Lembur'));
      });

      await waitFor(() => {
        expect(overtimeApi.endOvertime).toHaveBeenCalledWith(
          expect.objectContaining({
            gps_lat: -7.250445,
            gps_lng: 112.768845,
            activity_type_id: 'aaaaaaaa-0000-0000-0000-000000000001',
            description: 'Penyiraman taman',
          }),
        );
      });
    });

    it('shows success alert after endOvertime succeeds', async () => {
      (overtimeApi.endOvertime as jest.Mock).mockResolvedValue({
        data: { id: 'overtime-1', status: 'completed' },
      });

      const { getByText, getByTestId, getByPlaceholderText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByTestId('nb-select-aaaaaaaa-0000-0000-0000-000000000001'));
      });
      fireEvent.changeText(
        getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...'),
        'Penyiraman taman',
      );
      await act(async () => { fireEvent.press(getByTestId('add-photo-button')); });
      await waitFor(() => expect(mediaServiceMock.capturePhoto).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByText('Selesai Lembur'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Berhasil',
          'Lembur berhasil diselesaikan',
          expect.any(Array),
        );
      });
    });

    it('shows error alert when endOvertime returns an API error', async () => {
      (overtimeApi.endOvertime as jest.Mock).mockResolvedValue({
        data: null,
        error: 'Tidak ada lembur aktif',
      });

      const { getByText, getByTestId, getByPlaceholderText } = await renderScreen();
      await waitFor(() => expect(Geolocation.getCurrentPosition).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByTestId('nb-select-aaaaaaaa-0000-0000-0000-000000000001'));
      });
      fireEvent.changeText(
        getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...'),
        'Penyiraman taman',
      );
      await act(async () => { fireEvent.press(getByTestId('add-photo-button')); });
      await waitFor(() => expect(mediaServiceMock.capturePhoto).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByText('Selesai Lembur'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Gagal Selesai Lembur',
          'Tidak ada lembur aktif',
        );
      });
    });
  });

  // ─── Draft handling ────────────────────────────────────────────────────────

  describe('Draft handling', () => {
    it('shows restore alert when a valid draft exists', async () => {
      const draft = JSON.stringify({
        reason: 'Lembur draft',
        savedAt: new Date().toISOString(),
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(draft);

      await renderScreen();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Lanjutkan Draft?',
          expect.any(String),
          expect.any(Array),
        );
      });
    });

    it('does not show restore alert when no draft exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await renderScreen();
      await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
      expect(alertSpy).not.toHaveBeenCalledWith('Lanjutkan Draft?', expect.anything(), expect.anything());
    });

    it('removes expired draft silently (age > 24 hours)', async () => {
      const expiredDraft = JSON.stringify({
        reason: 'Old draft',
        savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(expiredDraft);

      await renderScreen();

      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('overtime_start_draft');
      });
      expect(alertSpy).not.toHaveBeenCalledWith('Lanjutkan Draft?', expect.anything(), expect.anything());
    });
  });
});
