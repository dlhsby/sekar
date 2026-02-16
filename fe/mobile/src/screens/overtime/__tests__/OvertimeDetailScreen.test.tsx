/**
 * OvertimeDetailScreen Tests
 * Comprehensive tests to improve coverage from 54.43% to >80%
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { OvertimeDetailScreen } from '../OvertimeDetailScreen';
import { configureStore } from '@reduxjs/toolkit';
import overtimeReducer from '../../../store/slices/overtimeSlice';
import * as overtimeApi from '../../../services/api/overtimeApi';

// Mock APIs
jest.mock('../../../services/api/overtimeApi');

// Mock useRoleAccess hook
jest.mock('../../../hooks/useRoleAccess', () => ({
  useRoleAccess: jest.fn(() => ({
    canApproveOvertime: true,
  })),
}));

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
  params: {
    overtimeId: 'ot-001',
  },
  key: 'test-key',
  name: 'OvertimeDetail',
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

// Mock overtime data
const mockOvertimeData = {
  id: 'ot-001',
  user_id: 'user-1',
  date: '2026-02-14',
  start_time: '17:00',
  end_time: '20:00',
  activity_type_id: 'type-1',
  description: 'Lembur penyiraman taman',
  photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  gps_lat: -7.250445,
  gps_lng: 112.768845,
  notes: 'Catatan tambahan',
  status: 'pending' as const,
  rejection_reason: null,
  user: {
    id: 'user-1',
    full_name: 'Ahmad Satgas',
    username: 'ahmad',
    role: 'satgas',
  },
  activityType: {
    id: 'type-1',
    name: 'Penyiraman',
  },
  created_at: '2026-02-14T17:00:00Z',
  updated_at: '2026-02-14T17:00:00Z',
};

// Create test store
const createTestStore = (selectedOvertime: any = null) => {
  return configureStore({
    reducer: {
      overtime: overtimeReducer,
    },
    preloadedState: {
      overtime: {
        myOvertimes: [],
        pendingApprovals: [],
        selectedOvertime,
        isLoading: false,
        isSubmitting: false,
        error: null,
      },
    },
  });
};

describe('OvertimeDetailScreen', () => {
  let store: any;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();

    // Spy on Alert
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Mock getOvertimeById to return data
    (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
      data: mockOvertimeData,
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Initial Load (lines 113-114)', () => {
    it('should display loading state', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      expect(getByText('Memuat data...')).toBeTruthy();
    });

    it('should load overtime detail on mount', async () => {
      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(overtimeApi.getOvertimeById).toHaveBeenCalledWith('ot-001');
      });
    });

    it('should show error alert and navigate back on API error (lines 113-114)', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        error: 'Data tidak ditemukan',
        data: null,
      });

      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Data tidak ditemukan');
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should handle exception during fetch (lines 113-114)', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal memuat detail lembur');
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('Display Overtime Details', () => {
    it('should render overtime details after loading', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Detail Lembur')).toBeTruthy();
        expect(getByText('Ahmad Satgas')).toBeTruthy();
        expect(getByText('Lembur penyiraman taman')).toBeTruthy();
        expect(getByText('Penyiraman')).toBeTruthy();
        expect(getByText('17:00 - 20:00')).toBeTruthy();
      });
    });

    it('should display GPS coordinates if available', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText(/-7\.250445, 112\.768845/)).toBeTruthy();
      });
    });

    it('should display notes if available', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Catatan tambahan')).toBeTruthy();
      });
    });

    it('should display photos section', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Foto')).toBeTruthy();
      });
    });
  });

  describe('Approve Overtime (lines 125-144)', () => {
    it('should show confirmation alert when approve button pressed', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      const approveButton = getByText(/setuju/i);
      await act(async () => {
        fireEvent.press(approveButton);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Konfirmasi',
        'Setujui pengajuan lembur ini?',
        expect.any(Array)
      );
    });

    it('should approve overtime successfully (lines 129-137)', async () => {
      const approvedData = { ...mockOvertimeData, status: 'approved' as const };
      (overtimeApi.approveOvertime as jest.Mock).mockResolvedValue({
        data: approvedData,
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      const approveButton = getByText(/setuju/i);
      await act(async () => {
        fireEvent.press(approveButton);
      });

      // Trigger the confirm callback from Alert
      const confirmCallback = alertSpy.mock.calls[0][2][1].onPress;
      await act(async () => {
        await confirmCallback();
      });

      await waitFor(() => {
        expect(overtimeApi.approveOvertime).toHaveBeenCalledWith('ot-001');
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', 'Lembur disetujui', expect.any(Array));
      });
    });

    it('should handle approve error (lines 138-140)', async () => {
      (overtimeApi.approveOvertime as jest.Mock).mockResolvedValue({
        error: 'Gagal menyetujui',
        data: null,
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      const approveButton = getByText(/setuju/i);
      await act(async () => {
        fireEvent.press(approveButton);
      });

      const confirmCallback = alertSpy.mock.calls[0][2][1].onPress;
      await act(async () => {
        await confirmCallback();
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Gagal menyetujui');
      });
    });

    it('should handle approve exception (lines 141-143)', async () => {
      (overtimeApi.approveOvertime as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      const approveButton = getByText(/setuju/i);
      await act(async () => {
        fireEvent.press(approveButton);
      });

      const confirmCallback = alertSpy.mock.calls[0][2][1].onPress;
      await act(async () => {
        await confirmCallback();
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Terjadi kesalahan');
      });
    });
  });

  describe('Reject Overtime (lines 153-175)', () => {
    it('should open reject modal when reject button pressed', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      const rejectButton = getByText('Tolak');
      await act(async () => {
        fireEvent.press(rejectButton);
      });

      await waitFor(() => {
        expect(getByText('Alasan Penolakan')).toBeTruthy();
      });
    });

    it('should disable reject button when rejection reason is empty (lines 153-155)', async () => {
      const { getByText, getAllByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      // Open modal
      const rejectButton = getAllByText('Tolak')[0];
      await act(async () => {
        fireEvent.press(rejectButton);
      });

      // Verify modal is open
      await waitFor(() => {
        expect(getByText('Alasan Penolakan')).toBeTruthy();
      });

      // The modal Tolak button should be disabled when reason is empty
      // Pressing it should NOT trigger the rejection API
      const submitRejectButton = getAllByText('Tolak')[1];
      await act(async () => {
        fireEvent.press(submitRejectButton);
      });

      // Alert should NOT be called since button is disabled
      expect(alertSpy).not.toHaveBeenCalledWith('Peringatan', 'Alasan penolakan harus diisi');
      expect(overtimeApi.rejectOvertime).not.toHaveBeenCalled();
    });

    it('should reject overtime successfully (lines 158-167)', async () => {
      const rejectedData = { ...mockOvertimeData, status: 'rejected' as const, rejection_reason: 'Tidak sesuai jadwal' };
      (overtimeApi.rejectOvertime as jest.Mock).mockResolvedValue({
        data: rejectedData,
      });

      const { getByText, getAllByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      // Open modal
      const rejectButton = getAllByText('Tolak')[0];
      await act(async () => {
        fireEvent.press(rejectButton);
      });

      // Enter rejection reason
      const reasonInput = getByPlaceholderText('Masukkan alasan penolakan...');
      await act(async () => {
        fireEvent.changeText(reasonInput, 'Tidak sesuai jadwal');
      });

      // Submit
      const submitRejectButton = getAllByText('Tolak')[1];
      await act(async () => {
        fireEvent.press(submitRejectButton);
      });

      await waitFor(() => {
        expect(overtimeApi.rejectOvertime).toHaveBeenCalledWith('ot-001', 'Tidak sesuai jadwal');
        expect(alertSpy).toHaveBeenCalledWith('Berhasil', 'Lembur ditolak', expect.any(Array));
      });
    });

    it('should handle reject error (lines 168-170)', async () => {
      (overtimeApi.rejectOvertime as jest.Mock).mockResolvedValue({
        error: 'Gagal menolak',
        data: null,
      });

      const { getByText, getAllByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      // Open modal
      const rejectButton = getAllByText('Tolak')[0];
      await act(async () => {
        fireEvent.press(rejectButton);
      });

      // Enter reason
      const reasonInput = getByPlaceholderText('Masukkan alasan penolakan...');
      await act(async () => {
        fireEvent.changeText(reasonInput, 'Test reason');
      });

      // Submit
      const submitRejectButton = getAllByText('Tolak')[1];
      await act(async () => {
        fireEvent.press(submitRejectButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Gagal menolak');
      });
    });

    it('should handle reject exception (lines 171-173)', async () => {
      (overtimeApi.rejectOvertime as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText, getAllByText, getByPlaceholderText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      // Open modal
      const rejectButton = getAllByText('Tolak')[0];
      await act(async () => {
        fireEvent.press(rejectButton);
      });

      // Enter reason
      const reasonInput = getByPlaceholderText('Masukkan alasan penolakan...');
      await act(async () => {
        fireEvent.changeText(reasonInput, 'Test reason');
      });

      // Submit
      const submitRejectButton = getAllByText('Tolak')[1];
      await act(async () => {
        fireEvent.press(submitRejectButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Gagal', 'Terjadi kesalahan');
      });
    });

    it('should close modal when cancel button pressed (lines 305-342)', async () => {
      const { getByText, getAllByText, queryByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Ahmad Satgas')).toBeTruthy();
      });

      // Open modal
      const rejectButton = getAllByText('Tolak')[0];
      await act(async () => {
        fireEvent.press(rejectButton);
      });

      await waitFor(() => {
        expect(getByText('Alasan Penolakan')).toBeTruthy();
      });

      // Cancel
      const cancelButton = getByText('Batal');
      await act(async () => {
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(queryByText('Alasan Penolakan')).toBeNull();
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
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('MENUNGGU')).toBeTruthy(); // NBBadge renders uppercase
      });
    });

    it('should display approved status with proper color', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        data: { ...mockOvertimeData, status: 'approved' },
      });

      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
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
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('DITOLAK')).toBeTruthy();
        expect(getByText('Tidak sesuai jadwal')).toBeTruthy();
      });
    });
  });

  describe('Action Buttons Visibility', () => {
    it('should hide action buttons when status is not pending', async () => {
      (overtimeApi.getOvertimeById as jest.Mock).mockResolvedValue({
        data: { ...mockOvertimeData, status: 'approved' },
      });

      const { queryByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(queryByText('Setuju')).toBeNull();
        expect(queryByText('Tolak')).toBeNull();
      });
    });

    it('should hide action buttons when user cannot approve', async () => {
      const useRoleAccess = require('../../../hooks/useRoleAccess').useRoleAccess;
      useRoleAccess.mockReturnValueOnce({
        canApproveOvertime: false,
      });

      const { queryByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <OvertimeDetailScreen />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(queryByText('Setuju')).toBeNull();
        expect(queryByText('Tolak')).toBeNull();
      });
    });
  });
});
