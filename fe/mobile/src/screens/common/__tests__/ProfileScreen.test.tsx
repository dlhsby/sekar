/**
 * Unified ProfileScreen Tests
 * Tests for the unified profile screen covering both field and monitoring roles
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { ProfileScreen } from '../ProfileScreen';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import * as authApi from '../../../services/api/authApi';
import * as monitoringApi from '../../../services/api/monitoringApi';
import * as apiClient from '../../../services/api/apiClient';
import * as offlineQueue from '../../../services/sync/offlineQueue';
import EncryptedStorage from 'react-native-encrypted-storage';

// Mock modules
jest.mock('../../../services/api/authApi');
jest.mock('../../../services/api/monitoringApi');
jest.mock('../../../services/api/apiClient');
jest.mock('../../../services/sync/offlineQueue');
jest.mock('../../../services/sync/syncManager', () => ({
  syncManager: {
    processQueue: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../../services/location/locationTracker', () => ({
  locationTracker: {
    isTracking: jest.fn(() => false),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('react-native-encrypted-storage');

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const createStore = (overrides: any = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      activities: activitiesReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: overrides.user ?? {
          id: 1,
          username: 'worker1',
          full_name: 'Pekerja Satu',
          role: 'satgas' as const,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        assignedArea: overrides.assignedArea ?? null,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        error: null,
      },
      shift: {
        currentShift: null,
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
        isOnline: true,
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

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

const mockShifts = [
  {
    id: 1,
    user_id: 1,
    area_id: 1,
    clock_in_time: `${currentYear}-${currentMonth}-17T08:00:00Z`,
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_out_time: `${currentYear}-${currentMonth}-17T16:00:00Z`,
    clock_out_gps_lat: -7.2905,
    clock_out_gps_lng: 112.7398,
    created_at: `${currentYear}-${currentMonth}-17T08:00:00Z`,
    updated_at: `${currentYear}-${currentMonth}-17T16:00:00Z`,
  },
  {
    id: 2,
    user_id: 1,
    area_id: 1,
    clock_in_time: `${currentYear}-${currentMonth}-16T08:00:00Z`,
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_out_time: `${currentYear}-${currentMonth}-16T15:30:00Z`,
    clock_out_gps_lat: -7.2905,
    clock_out_gps_lng: 112.7398,
    created_at: `${currentYear}-${currentMonth}-16T08:00:00Z`,
    updated_at: `${currentYear}-${currentMonth}-16T15:30:00Z`,
  },
];

const mockArea = {
  id: 1,
  name: 'Taman Bungkul',
  area_type_id: 1,
  area_type: { id: 1, code: 'park' as const, name: 'Taman', description: 'Taman kota', created_at: '2026-01-01T00:00:00Z' },
  gps_lat: -7.2905,
  gps_lng: 112.7398,
  radius_meters: 150,
  address: 'Jl. Taman Bungkul, Darmo, Surabaya',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function setupFieldMocks() {
  (authApi.getMe as jest.Mock).mockResolvedValue({
    data: { id: 1, username: 'worker1', full_name: 'Pekerja Satu', role: 'satgas', assigned_area: mockArea },
  });
  (apiClient.get as jest.Mock).mockResolvedValue({ data: mockShifts });
  (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(0);
  (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
  (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
    'clock-in': 0, 'clock-out': 0, activity: 0, location: 0,
  });
}

function setupMonitoringMocks() {
  (authApi.getMe as jest.Mock).mockResolvedValue({
    data: { id: 'sup-1', username: 'supervisor1', full_name: 'Supervisor Satu', role: 'korlap' },
  });
  (monitoringApi.getActiveUsers as jest.Mock).mockResolvedValue({
    data: { users: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] },
  });
  (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
    if (endpoint === '/supervisor/area-status') {
      return Promise.resolve({ data: { areas: [{ id: 'a1' }, { id: 'a2' }] } });
    }
    if (endpoint === '/activities') {
      return Promise.resolve({ data: { data: [], meta: { total: 25 } } });
    }
    return Promise.resolve({ data: null });
  });
  (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(0);
  (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
  (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
    'clock-in': 0, 'clock-out': 0, activity: 0, location: 0,
  });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Field Role (satgas)', () => {
    let store: any;

    beforeEach(() => {
      setupFieldMocks();
      store = createStore({ assignedArea: mockArea });
    });

    const renderScreen = () =>
      render(
        <Provider store={store}>
          <NavigationContainer>
            <ProfileScreen navigation={mockNavigation} />
          </NavigationContainer>
        </Provider>
      );

    it('displays user avatar with initials', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('PS')).toBeTruthy();
      }, { timeout: 15000 });
    }, 25000);

    it('displays full name, username, and role badge', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Pekerja Satu')).toBeTruthy();
        expect(getByText('@worker1')).toBeTruthy();
        expect(getByText('Satgas')).toBeTruthy();
      });
    });

    it('displays assigned area card', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Area Ditugaskan')).toBeTruthy();
        expect(getByText('Taman Bungkul')).toBeTruthy();
        expect(getByText('Taman - 150m radius')).toBeTruthy();
      });
    });

    it('shows "no area" message when none assigned', async () => {
      store = createStore({ assignedArea: null });
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: { id: 1, username: 'worker1', full_name: 'Pekerja Satu', role: 'satgas' },
      });

      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Tidak ada area ditugaskan')).toBeTruthy();
      });
    });

    it('displays monthly statistics', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Statistik Bulan Ini')).toBeTruthy();
        expect(getByText('Hari Kerja')).toBeTruthy();
        expect(getByText('Jam Kerja')).toBeTruthy();
      });
    });

    it('calculates days worked correctly', async () => {
      const { getByText, queryByText } = renderScreen();
      await waitFor(() => {
        expect(queryByText('Memuat profil...')).toBeNull();
      }, { timeout: 10000 });
      await waitFor(() => {
        expect(getByText('2')).toBeTruthy();
      }, { timeout: 10000 });
    }, 30000);

    it('calculates total hours correctly', async () => {
      const { getByText, queryByText } = renderScreen();
      await waitFor(() => {
        expect(queryByText('Memuat profil...')).toBeNull();
      }, { timeout: 10000 });
      await waitFor(() => {
        expect(getByText('15.5')).toBeTruthy();
      }, { timeout: 15000 });
    }, 35000);

    it('shows shift history menu item for field roles', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Riwayat Shift')).toBeTruthy();
      });
    });

    it('navigates to shift history when pressed', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        fireEvent.press(getByText('Riwayat Shift'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('ShiftHistory');
    });

    it('shows all common menu items', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Ubah Password')).toBeTruthy();
        expect(getByText('Tentang Aplikasi')).toBeTruthy();
        expect(getByText('Pengaturan')).toBeTruthy();
      });
    });

    it('opens change password modal', async () => {
      const { getByText, queryByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Ubah Password')).toBeTruthy();
      });
      expect(queryByText('Password Saat Ini')).toBeNull();
      fireEvent.press(getByText('Ubah Password'));
      await waitFor(() => {
        expect(getByText('Password Saat Ini')).toBeTruthy();
      });
    });

    it('shows about dialog', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        fireEvent.press(getByText('Tentang Aplikasi'));
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Tentang SEKAR',
        'Sistem Evaluasi Kerja Satgas RTH\n\nVersi: 1.0.0\nDLH Surabaya',
        [{ text: 'OK' }]
      );
    });

    it('loads data on mount', async () => {
      renderScreen();
      await waitFor(() => {
        expect(authApi.getMe).toHaveBeenCalled();
        expect(apiClient.get).toHaveBeenCalledWith('/shifts/my-shifts');
      });
    });
  });

  describe('Monitoring Role (top_management)', () => {
    let store: any;

    beforeEach(() => {
      setupMonitoringMocks();
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: { id: 'mgmt-1', username: 'topmanager1', full_name: 'Manager Satu', role: 'top_management' },
      });
      store = createStore({
        user: {
          id: 'mgmt-1',
          username: 'topmanager1',
          full_name: 'Manager Satu',
          role: 'top_management' as const,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });
    });

    const renderScreen = () =>
      render(
        <Provider store={store}>
          <NavigationContainer>
            <ProfileScreen navigation={mockNavigation} />
          </NavigationContainer>
        </Provider>
      );

    it('displays user info', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Manager Satu')).toBeTruthy();
        expect(getByText('@topmanager1')).toBeTruthy();
        expect(getByText('Top Management')).toBeTruthy();
      }, { timeout: 15000 });
    }, 25000);

    it('displays monitoring statistics', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Ringkasan')).toBeTruthy();
        expect(getByText('Pekerja aktif')).toBeTruthy();
        expect(getByText('Area dikelola')).toBeTruthy();
        expect(getByText('Aktivitas bulan ini')).toBeTruthy();
      });
    });

    it('shows correct stats values', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('3')).toBeTruthy(); // 3 active users
        expect(getByText('2')).toBeTruthy(); // 2 areas
        expect(getByText('25')).toBeTruthy(); // 25 activities
      });
    });

    it('does NOT show assigned area card', async () => {
      const { queryByText, getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Manager Satu')).toBeTruthy();
      });
      expect(queryByText('Area Ditugaskan')).toBeNull();
    });

    it('does NOT show shift history menu item', async () => {
      const { queryByText, getByText } = renderScreen();
      await waitFor(() => {
        expect(getByText('Ubah Password')).toBeTruthy();
      });
      expect(queryByText('Riwayat Shift')).toBeNull();
    });

    it('loads monitoring data on mount', async () => {
      renderScreen();
      await waitFor(() => {
        expect(authApi.getMe).toHaveBeenCalled();
        expect(monitoringApi.getActiveUsers).toHaveBeenCalled();
        expect(apiClient.get).toHaveBeenCalledWith('/supervisor/area-status');
      });
    });

    it('handles API errors gracefully', async () => {
      (authApi.getMe as jest.Mock).mockRejectedValue(new Error('Network error'));
      (monitoringApi.getActiveUsers as jest.Mock).mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { getByText } = renderScreen();

      await waitFor(() => {
        expect(getByText('Manager Satu')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Logout', () => {
    let store: any;

    beforeEach(() => {
      setupFieldMocks();
      store = createStore();
    });

    const renderScreen = () =>
      render(
        <Provider store={store}>
          <NavigationContainer>
            <ProfileScreen navigation={mockNavigation} />
          </NavigationContainer>
        </Provider>
      );

    it('shows confirmation when no pending items', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        fireEvent.press(getByText('Keluar'));
      });
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Keluar dari Akun?',
          'Anda akan keluar dari aplikasi SEKAR',
          expect.any(Array)
        );
      });
    });

    it('warns about pending sync items with 3 options', async () => {
      (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(3);
      (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(2);
      (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
        'clock-in': 1, 'clock-out': 0, activity: 2, location: 0,
      });

      const { getByText } = renderScreen();
      await waitFor(() => {
        fireEvent.press(getByText('Keluar'));
      });
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Data Belum Tersinkronisasi',
          expect.stringContaining('Ada 3 data tertunda'),
          expect.any(Array)
        );
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        (call: any) => call[0] === 'Data Belum Tersinkronisasi'
      );
      expect(alertCall[2]).toHaveLength(3);
      expect(alertCall[2].map((btn: any) => btn.text)).toEqual([
        'Batal', 'Sinkronkan Dulu', 'Keluar Saja',
      ]);
    });

    it('clears tokens on confirm', async () => {
      const { getByText } = renderScreen();
      await waitFor(() => {
        fireEvent.press(getByText('Keluar'));
      });
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Keluar');
      await confirmButton.onPress();

      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('clears queue on force logout', async () => {
      (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(3);
      (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
      (offlineQueue.clearQueueForCurrentUser as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = renderScreen();
      await waitFor(() => {
        fireEvent.press(getByText('Keluar'));
      });
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        (call: any) => call[0] === 'Data Belum Tersinkronisasi'
      );
      const logoutAnywayButton = alertCall[2].find((btn: any) => btn.text === 'Keluar Saja');
      await logoutAnywayButton.onPress();

      expect(offlineQueue.clearQueueForCurrentUser).toHaveBeenCalled();
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      setupFieldMocks();
      // Make getMe never resolve to keep loading state
      (authApi.getMe as jest.Mock).mockReturnValue(new Promise(() => {}));

      const store = createStore();
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ProfileScreen navigation={mockNavigation} />
          </NavigationContainer>
        </Provider>
      );

      expect(getByText('Memuat profil...')).toBeTruthy();
    });
  });

  describe('Sync Status', () => {
    it('shows sync card when pending items exist', async () => {
      setupFieldMocks();
      (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(2);
      (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(1);

      const store = createStore();
      const { getByText } = render(
        <Provider store={store}>
          <NavigationContainer>
            <ProfileScreen navigation={mockNavigation} />
          </NavigationContainer>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Sinkronisasi Data')).toBeTruthy();
      });
    });
  });
});
