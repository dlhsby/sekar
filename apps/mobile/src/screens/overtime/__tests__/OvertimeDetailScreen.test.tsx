/**
 * OvertimeDetailScreen Tests
 * Phase 2C: Inline approval/rejection with canApprove hierarchy
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { OvertimeDetailScreen } from '../OvertimeDetailScreen';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import * as overtimeApi from '../../../services/api/overtimeApi';

// Mock OvertimeTrailModal to avoid react-native-maps transpilation
jest.mock('../../../components/modals/OvertimeTrailModal', () => ({
  OvertimeTrailModal: () => null,
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Text');

// Mock APIs
jest.mock('../../../services/api/overtimeApi');

// Mock navigation and route
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

const mockRoute = {
  params: { overtimeId: 'ot-001' },
  key: 'test-key',
  name: 'OvertimeDetail',
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

// Mock overtime data — submitted by satgas in area-1
const mockOvertimeData = {
  id: 'ot-001',
  user_id: 'user-1',
  location_id: 'area-1',
  start_datetime: '2026-02-14T17:00:00+07:00',
  end_datetime: '2026-02-14T20:00:00+07:00',
  activity_type_id: 'type-1',
  description: 'Lembur penyiraman taman',
  photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  gps_lat: -7.250445,
  gps_lng: 112.768845,
  status: 'pending' as const,
  rejection_reason: null,
  user: {
    id: 'user-1',
    full_name: 'Ahmad Satgas',
    username: 'ahmad',
    role: 'satgas',
    rayon_id: 'rayon-1',
  },
  area: {
    id: 'area-1',
    name: 'Taman Bungkul',
    rayon_id: 'rayon-1',
  },
  activityType: {
    id: 'type-1',
    name: 'Penyiraman',
    description: 'Penyiraman tanaman',
  },
  created_at: '2026-02-14T17:00:00Z',
  updated_at: '2026-02-14T17:00:00Z',
};

// Create auth store — user role determines canApprove
const createTestStore = (userOverrides = {}) => {
  return configureStore({
    reducer: { auth: authReducer },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: {
          id: 'approver-1',
          username: 'korlap1',
          full_name: 'Korlap Test',
          role: 'korlap',
          location_id: 'area-1', // Same area → canApprove=true for satgas
          rayon_id: 'rayon-1',
          ...userOverrides,
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
        assignedArea: null,
        onboardingCompleted: false,
      } as any,
    },
  });
};

describe('OvertimeDetailScreen', () => {
  let store: any;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
      data: mockOvertimeData,
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Initial Load', () => {
    it('should display loading state', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      expect(getByText('Memuat data...')).toBeTruthy();
    });

    it('should load overtime detail on mount', async () => {
      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(overtimeApi.getOvertimeById).toHaveBeenCalledWith('ot-001');
      });
    });

    it('should show error alert and navigate back on API error', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        error: 'Data tidak ditemukan',
        data: null,
      });

      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Terjadi Kesalahan', 'Data tidak ditemukan');
        expect(mockNavigate).toHaveBeenCalledWith('Lembur');
      });
    });

    it('should handle exception during fetch', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Terjadi Kesalahan', 'Gagal memuat detail lembur');
        expect(mockNavigate).toHaveBeenCalledWith('Lembur');
      });
    });
  });

  describe('Display Overtime Details', () => {
    it('should render overtime details with NB card sections', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('Lembur penyiraman taman')).toBeTruthy();
        expect(getByText('Penyiraman')).toBeTruthy();
        // Creator row: role - full_name
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });
    });

    it('should display section titles', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('INFORMASI UMUM')).toBeTruthy();
        expect(getByText('DESKRIPSI')).toBeTruthy();
        expect(getByText('FOTO BUKTI')).toBeTruthy();
      });
    });

    it('should display GPS coordinates', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText(/-7\.250445, 112\.768845/)).toBeTruthy();
      });
    });

    it('should display creator role and name', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });
    });

    it('should display photo count', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('2 foto dilampirkan')).toBeTruthy();
      });
    });
  });

  describe('Approve Overtime', () => {
    it('should show confirmation alert when approve button pressed', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      const approveButton = getByText('Setujui');
      await act(async () => {
        fireEvent.press(approveButton);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Konfirmasi',
        'Setujui pengajuan lembur ini?',
        expect.any(Array),
      );
    });

    it('should approve overtime successfully', async () => {
      const approvedData = { ...mockOvertimeData, status: 'approved' as const };
      (overtimeApi.approveOvertime as jest.Mock).mockResolvedValue({
        data: approvedData,
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Setujui'));
      });

      const confirmCallback = alertSpy.mock.calls[0][2][1].onPress;
      await act(async () => {
        await confirmCallback();
      });

      await waitFor(() => {
        expect(overtimeApi.approveOvertime).toHaveBeenCalledWith('ot-001');
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', 'Lembur disetujui');
      });
    });

    it('should handle approve error', async () => {
      (overtimeApi.approveOvertime as jest.Mock).mockResolvedValue({
        error: 'Gagal menyetujui',
        data: null,
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Setujui'));
      });

      const confirmCallback = alertSpy.mock.calls[0][2][1].onPress;
      await act(async () => {
        await confirmCallback();
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal menyetujui');
      });
    });

    it('should handle approve exception', async () => {
      (overtimeApi.approveOvertime as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Setujui'));
      });

      const confirmCallback = alertSpy.mock.calls[0][2][1].onPress;
      await act(async () => {
        await confirmCallback();
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal menyetujui lembur');
      });
    });
  });

  describe('Reject Overtime (inline)', () => {
    it('should show inline reject input when Tolak pressed', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Tolak'));
      });

      await waitFor(() => {
        // Inline reject mode: shows Batal + Kirim Penolakan buttons
        expect(getByText('Batal')).toBeTruthy();
        expect(getByText('Kirim Penolakan')).toBeTruthy();
      });
    });

    it('should reject overtime successfully', async () => {
      const rejectedData = { ...mockOvertimeData, status: 'rejected' as const, rejection_reason: 'Tidak sesuai jadwal' };
      (overtimeApi.rejectOvertime as jest.Mock).mockResolvedValue({
        data: rejectedData,
      });

      const { getByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      // Open inline reject
      await act(async () => {
        fireEvent.press(getByText('Tolak'));
      });

      // Enter reason
      const reasonInput = getByPlaceholderText('Jelaskan alasan penolakan lembur ini...');
      await act(async () => {
        fireEvent.changeText(reasonInput, 'Tidak sesuai jadwal');
      });

      // Submit rejection
      await act(async () => {
        fireEvent.press(getByText('Kirim Penolakan'));
      });

      await waitFor(() => {
        expect(overtimeApi.rejectOvertime).toHaveBeenCalledWith('ot-001', 'Tidak sesuai jadwal');
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', 'Lembur ditolak');
      });
    });

    it('should disable submit button when reject reason is empty', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      // Open inline reject
      await act(async () => {
        fireEvent.press(getByText('Tolak'));
      });

      // Kirim Penolakan button is disabled when reason is empty
      // Pressing it should NOT trigger the rejection API
      await act(async () => {
        fireEvent.press(getByText('Kirim Penolakan'));
      });

      expect(overtimeApi.rejectOvertime).not.toHaveBeenCalled();
    });

    it('should handle reject error', async () => {
      (overtimeApi.rejectOvertime as jest.Mock).mockResolvedValue({
        error: 'Gagal menolak',
        data: null,
      });

      const { getByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Tolak'));
      });

      const reasonInput = getByPlaceholderText('Jelaskan alasan penolakan lembur ini...');
      await act(async () => {
        fireEvent.changeText(reasonInput, 'Test reason');
      });

      await act(async () => {
        fireEvent.press(getByText('Kirim Penolakan'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal menolak');
      });
    });

    it('should handle reject exception', async () => {
      (overtimeApi.rejectOvertime as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Tolak'));
      });

      const reasonInput = getByPlaceholderText('Jelaskan alasan penolakan lembur ini...');
      await act(async () => {
        fireEvent.changeText(reasonInput, 'Test reason');
      });

      await act(async () => {
        fireEvent.press(getByText('Kirim Penolakan'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal menolak lembur');
      });
    });

    it('should cancel reject mode when Batal pressed', async () => {
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('satgas - Ahmad Satgas')).toBeTruthy();
      });

      // Open inline reject
      await act(async () => {
        fireEvent.press(getByText('Tolak'));
      });

      await waitFor(() => {
        expect(getByText('Batal')).toBeTruthy();
      });

      // Cancel
      await act(async () => {
        fireEvent.press(getByText('Batal'));
      });

      await waitFor(() => {
        // Back to default buttons
        expect(queryByText('Kirim Penolakan')).toBeNull();
        expect(getByText('Tolak')).toBeTruthy();
        expect(getByText('Setujui')).toBeTruthy();
      });
    });
  });

  describe('Status Display', () => {
    it('should display pending status badge', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('MENUNGGU')).toBeTruthy();
      });
    });

    it('should display approved status', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        data: { ...mockOvertimeData, status: 'approved' },
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('DISETUJUI')).toBeTruthy();
      });
    });

    it('should display rejected status and rejection reason', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        data: {
          ...mockOvertimeData,
          status: 'rejected',
          rejection_reason: 'Tidak sesuai jadwal',
        },
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('DITOLAK')).toBeTruthy();
        expect(getByText('Tidak sesuai jadwal')).toBeTruthy();
      });
    });
  });

  describe('Action Buttons Visibility (canApprove hierarchy)', () => {
    it('should hide buttons when status is not pending', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        data: { ...mockOvertimeData, status: 'approved' },
      });

      const { queryByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(queryByText('Setujui')).toBeNull();
        expect(queryByText('Tolak')).toBeNull();
      });
    });

    it('should hide buttons when user is satgas (cannot approve)', async () => {
      // Satgas user — cannot approve anyone
      const satgasStore = createTestStore({
        id: 'user-1',
        username: 'satgas1',
        full_name: 'Test Satgas',
        role: 'satgas',
        location_id: 'area-1',
      });

      const { queryByText } = render(
        <Provider store={satgasStore}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(queryByText('Setujui')).toBeNull();
        expect(queryByText('Tolak')).toBeNull();
      });
    });

    it('should show buttons when korlap approves satgas in same area', async () => {
      // Default store is korlap with area-1, overtime is from satgas in area-1
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('Setujui')).toBeTruthy();
        expect(getByText('Tolak')).toBeTruthy();
      });
    });

    it('should hide buttons when korlap is in different area', async () => {
      const differentAreaStore = createTestStore({
        role: 'korlap',
        location_id: 'area-other',
        rayon_id: 'rayon-1',
      });

      const { queryByText } = render(
        <Provider store={differentAreaStore}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(queryByText('Setujui')).toBeNull();
        expect(queryByText('Tolak')).toBeNull();
      });
    });

    it('should show buttons when kepala_rayon approves korlap in same rayon', async () => {
      // kepala_rayon approving korlap
      const korlapOvertime = {
        ...mockOvertimeData,
        user: { ...mockOvertimeData.user, role: 'korlap', rayon_id: 'rayon-1' },
      };
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        data: korlapOvertime,
      });

      const kepalaStore = createTestStore({
        role: 'kepala_rayon',
        rayon_id: 'rayon-1',
        location_id: null,
      });

      const { getByText } = render(
        <Provider store={kepalaStore}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>,
      );

      await waitFor(() => {
        expect(getByText('Setujui')).toBeTruthy();
        expect(getByText('Tolak')).toBeTruthy();
      });
    });
  });
});
