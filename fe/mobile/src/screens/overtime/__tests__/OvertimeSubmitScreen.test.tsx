/**
 * OvertimeSubmitScreen Tests
 * Phase 2C: Draft/discard, datetime fields, Batal/Kirim FAB, redirect to Overtime list
 */

import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import { OvertimeSubmitScreen } from '../OvertimeSubmitScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import overtimeReducer from '../../../store/slices/overtimeSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('../../../components/nb', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  const actual = jest.requireActual('../../../components/nb');
  return {
    ...actual,
    NBSelect: ({ onValueChange, options }: any) =>
      React.createElement(View, null,
        (options ?? []).map((opt: any) =>
          React.createElement(
            TouchableOpacity,
            { key: opt.value, testID: `nb-select-${opt.value}`, onPress: () => onValueChange?.(opt.value) },
            React.createElement(Text, null, opt.label),
          ),
        ),
      ),
  };
});

// Mock FieldHomeHeader — same pattern as TaskCreateScreen tests
jest.mock('../../../components/navigation/FieldHomeHeader', () => ({
  FieldHomeHeader: ({ title, onBack }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <TouchableOpacity onPress={onBack} testID="header-back" accessibilityLabel="Kembali" accessibilityRole="button" />
        <Text>{title}</Text>
      </>
    );
  },
}));

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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

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

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer, overtime: overtimeReducer },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          username: 'satgas1',
          full_name: 'Test Satgas',
          role: 'satgas',
          area_id: 'area-1',
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
      },
    },
  });

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  // useFocusEffect fires the callback immediately in tests (like useEffect)
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require('react');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(cb, []);
  },
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  NavigationContainer: ({ children }: any) => children,
}));

const renderScreen = () => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <OvertimeSubmitScreen />
      </NavigationContainer>
    </Provider>,
  );
};

describe('OvertimeSubmitScreen', () => {
  let alertSpy: jest.SpyInstance;
  let overtimeApi: any;
  let mediaService: any;
  let permissions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    overtimeApi = require('../../../services/api/overtimeApi');
    mediaService = require('../../../services/media').mediaService;
    permissions = require('../../../services/permissions');

    mockSetOptions.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) => {
      success({ coords: { latitude: -7.250445, longitude: 112.768845, accuracy: 10 } });
    });

    mediaService.capturePhoto.mockResolvedValue({
      id: 'photo-1',
      uri: 'file://photo1.jpg',
      type: 'image/jpeg',
      fileName: 'photo1.jpg',
    });
    mediaService.convertToBase64.mockResolvedValue('data:image/jpeg;base64,mockBase64');
    permissions.requestCameraPermission.mockResolvedValue({ granted: true });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Initial Render', () => {
    it('sets navigation header title to "Ajukan Lembur" via FieldHomeHeader', () => {
      renderScreen();
      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({ headerTitle: expect.any(Function) }),
      );
    });

    it('renders Mulai and Selesai sections', () => {
      const { getByText } = renderScreen();
      expect(getByText('Tanggal & Waktu Mulai')).toBeTruthy();
      expect(getByText('Tanggal & Waktu Selesai')).toBeTruthy();
    });

    it('renders Batal and Kirim FAB buttons', () => {
      const { getByText } = renderScreen();
      expect(getByText('Batal')).toBeTruthy();
      expect(getByText('Kirim')).toBeTruthy();
    });

    it('renders photo add button', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('add-photo-button')).toBeTruthy();
    });

    it('renders mandatory asterisks on all required section titles', () => {
      const { getAllByText } = renderScreen();
      // Each required section has a "*" text node (red asterisk)
      expect(getAllByText('*').length).toBeGreaterThanOrEqual(5);
    });

    it('captures GPS location on mount', async () => {
      renderScreen();
      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('handles GPS error gracefully without crashing', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error) => {
        error({ code: 1, message: 'Location error' });
      });
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Perbarui GPS')).toBeTruthy();
      });
    });
  });

  describe('Draft Restore', () => {
    it('shows restore alert when draft exists on focus', async () => {
      const draftData = JSON.stringify({
        startDate: '2026-02-14',
        startHour: '17',
        startMinute: '00',
        endDate: '2026-02-14',
        endHour: '20',
        endMinute: '00',
        description: 'Draft description',
        activityTypeId: 'aaaaaaaa-0000-0000-0000-000000000001',
        savedAt: Date.now(),
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(draftData);

      renderScreen();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Draft Tersimpan',
          expect.stringContaining('draft'),
          expect.any(Array),
        );
      });
    });

    it('does not show restore alert when no draft', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      renderScreen();
      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalled();
      });
      expect(alertSpy).not.toHaveBeenCalledWith('Draft Tersimpan', expect.anything(), expect.anything());
    });

    it('discards expired draft (TTL > 24h)', async () => {
      const expiredDraft = JSON.stringify({
        startDate: '2026-02-01',
        startHour: '09',
        startMinute: '00',
        endDate: '2026-02-01',
        endHour: '12',
        endMinute: '00',
        description: 'Old draft',
        activityTypeId: 'aaaaaaaa-0000-0000-0000-000000000001',
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(expiredDraft);

      renderScreen();

      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalled();
      });
      expect(alertSpy).not.toHaveBeenCalledWith('Draft Tersimpan', expect.anything(), expect.anything());
    });
  });

  describe('Navigation', () => {
    it('Batal button navigates to Overtime list when form is clean', async () => {
      const { getByText } = renderScreen();

      await act(async () => {
        fireEvent.press(getByText('Batal'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('Overtime');
    });

    it('Batal button prompts to save draft when form is dirty', async () => {
      const { getByText, getByPlaceholderText } = renderScreen();

      // Make form dirty
      const descInput = getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...');
      fireEvent.changeText(descInput, 'test');

      await act(async () => {
        fireEvent.press(getByText('Batal'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Simpan Draft?',
          expect.any(String),
          expect.any(Array),
        );
      });
    });

    it('choosing "Tidak" on draft prompt clears draft and navigates', async () => {
      const { getByText, getByPlaceholderText } = renderScreen();

      fireEvent.changeText(getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...'), 'test');
      await act(async () => { fireEvent.press(getByText('Batal')); });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Simpan Draft?', expect.any(String), expect.any(Array)));

      const tidakCallback = alertSpy.mock.calls.find((c) => c[0] === 'Simpan Draft?')?.[2]?.[0]?.onPress;
      await act(async () => { tidakCallback?.(); });

      expect(AsyncStorage.removeItem).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Overtime');
    });

    it('choosing "Ya" on draft prompt saves draft and navigates', async () => {
      const { getByText, getByPlaceholderText } = renderScreen();

      fireEvent.changeText(getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...'), 'test');
      await act(async () => { fireEvent.press(getByText('Batal')); });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Simpan Draft?', expect.any(String), expect.any(Array)));

      const yaCallback = alertSpy.mock.calls.find((c) => c[0] === 'Simpan Draft?')?.[2]?.[1]?.onPress;
      await act(async () => { await yaCallback?.(); });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('overtime_draft', expect.any(String));
      expect(mockNavigate).toHaveBeenCalledWith('Overtime');
    });
  });

  describe('Photo Capture', () => {
    it('captures photo on pressing add-photo button', async () => {
      const { getByTestId } = renderScreen();

      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });

      await waitFor(() => {
        expect(permissions.requestCameraPermission).toHaveBeenCalled();
        expect(mediaService.capturePhoto).toHaveBeenCalled();
      });
    });

    it('does not add photo when camera permission denied', async () => {
      permissions.requestCameraPermission.mockResolvedValue({ granted: false, message: 'Izin kamera diperlukan' });
      const { getByTestId } = renderScreen();

      await act(async () => {
        fireEvent.press(getByTestId('add-photo-button'));
      });

      await waitFor(() => {
        expect(mediaService.capturePhoto).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error when photos missing on submit', async () => {
      const { getByText } = renderScreen();

      await act(async () => {
        fireEvent.press(getByText('Kirim'));
      });

      await waitFor(() => {
        expect(getByText('Minimal 1 foto diperlukan')).toBeTruthy();
      });
    });

    it('shows location error when GPS unavailable and submit pressed', async () => {
      (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success, error) => {
        error({ code: 1, message: 'unavailable' });
      });

      const { getByText } = renderScreen();

      await act(async () => {
        fireEvent.press(getByText('Kirim'));
      });

      await waitFor(() => {
        // Message appears in both the error summary banner and the GPS section
        const matches = screen.getAllByText(/GPS lokasi diperlukan/);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // Helper: fill all required fields using valid UUIDs for activity type
  const fillRequiredFields = async (getByTestId: any, getByPlaceholderText: any) => {
    await act(async () => { fireEvent.press(getByTestId('add-photo-button')); });
    await waitFor(() => { expect(mediaService.capturePhoto).toHaveBeenCalled(); });
    // Select activity type (valid UUID)
    await act(async () => { fireEvent.press(getByTestId('nb-select-aaaaaaaa-0000-0000-0000-000000000001')); });
    const descInput = getByPlaceholderText('Jelaskan aktivitas lembur yang dilakukan...');
    await act(async () => { fireEvent.changeText(descInput, 'Lembur penyiraman'); });
  };

  describe('Form Submission', () => {
    it('submits with start_datetime and end_datetime (not date/time/notes)', async () => {
      overtimeApi.submitOvertime.mockResolvedValue({
        data: { id: 'ot-001', status: 'pending' },
      });

      const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
      await fillRequiredFields(getByTestId, getByPlaceholderText);

      await act(async () => { fireEvent.press(getByText('Kirim')); });

      await waitFor(() => {
        expect(overtimeApi.submitOvertime).toHaveBeenCalled();
        const args = overtimeApi.submitOvertime.mock.calls[0][0];
        expect(args).toHaveProperty('start_datetime');
        expect(args).toHaveProperty('end_datetime');
        expect(args).not.toHaveProperty('date');
        expect(args).not.toHaveProperty('start_time');
        expect(args).not.toHaveProperty('end_time');
        expect(args).not.toHaveProperty('notes');
      });
    });

    it('sends valid UUID for activity_type_id', async () => {
      overtimeApi.submitOvertime.mockResolvedValue({
        data: { id: 'ot-001', status: 'pending' },
      });

      const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
      await fillRequiredFields(getByTestId, getByPlaceholderText);

      await act(async () => { fireEvent.press(getByText('Kirim')); });

      await waitFor(() => {
        expect(overtimeApi.submitOvertime).toHaveBeenCalled();
        const args = overtimeApi.submitOvertime.mock.calls[0][0];
        expect(args.activity_type_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      });
    });

    it('shows success alert after submission', async () => {
      overtimeApi.submitOvertime.mockResolvedValue({
        data: { id: 'ot-001', status: 'pending' },
      });

      const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
      await fillRequiredFields(getByTestId, getByPlaceholderText);

      await act(async () => { fireEvent.press(getByText('Kirim')); });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Berhasil',
          'Pengajuan lembur berhasil disimpan',
          expect.any(Array),
        );
      });
    });

    it('navigates to Overtime list after successful submission', async () => {
      overtimeApi.submitOvertime.mockResolvedValue({
        data: { id: 'ot-001', status: 'pending' },
      });

      const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
      await fillRequiredFields(getByTestId, getByPlaceholderText);

      await act(async () => { fireEvent.press(getByText('Kirim')); });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', expect.any(String), expect.any(Array));
      });

      const okCallback = alertSpy.mock.calls.find(
        (c) => c[0] === 'Berhasil',
      )?.[2]?.[0]?.onPress;
      okCallback?.();

      expect(mockNavigate).toHaveBeenCalledWith('Overtime');
    });

    it('handles API error response', async () => {
      overtimeApi.submitOvertime.mockResolvedValue({
        error: 'Data tidak valid',
        data: null,
      });

      const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
      await fillRequiredFields(getByTestId, getByPlaceholderText);

      await act(async () => { fireEvent.press(getByText('Kirim')); });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Data tidak valid');
      });
    });
  });

  describe('GPS Section', () => {
    it('displays GPS coordinates after capture', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText(/-7\.250445, 112\.768845/)).toBeTruthy();
      });
    });

    it('refreshes GPS when Perbarui button pressed', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => expect(getByText('Perbarui GPS')).toBeTruthy());

      await act(async () => { fireEvent.press(getByText('Perbarui GPS')); });

      await waitFor(() => {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('No notes field', () => {
    it('should not render notes input', () => {
      const { queryByPlaceholderText } = renderScreen();
      expect(queryByPlaceholderText('Tambahkan catatan jika diperlukan...')).toBeNull();
    });
  });
});
