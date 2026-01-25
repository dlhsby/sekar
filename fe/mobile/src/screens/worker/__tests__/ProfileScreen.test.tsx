/**
 * ProfileScreen Tests
 * Tests for worker profile screen
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
import reportReducer from '../../../store/slices/reportSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import * as authApi from '../../../services/api/authApi';
import * as apiClient from '../../../services/api/apiClient';
import * as offlineQueue from '../../../services/sync/offlineQueue';
import * as syncManager from '../../../services/sync/syncManager';
import * as locationTracker from '../../../services/location/locationTracker';
import EncryptedStorage from 'react-native-encrypted-storage';

// Mock modules
jest.mock('../../../services/api/authApi');
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

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('ProfileScreen', () => {
  let store: any;

  const mockUser = {
    id: 1,
    username: 'worker1',
    full_name: 'Pekerja Satu',
    role: 'worker' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockArea = {
    id: 1,
    name: 'Taman Bungkul',
    area_type_id: 1,
    area_type: {
      id: 1,
      code: 'park' as const,
      name: 'Taman',
      description: 'Taman kota',
      created_at: '2026-01-01T00:00:00Z',
    },
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 150,
    address: 'Jl. Taman Bungkul, Darmo, Surabaya',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockShifts = [
    {
      id: 1,
      worker_id: 1,
      area_id: 1,
      clock_in_time: '2026-01-17T08:00:00Z',
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_out_time: '2026-01-17T16:00:00Z',
      clock_out_gps_lat: -7.2905,
      clock_out_gps_lng: 112.7398,
      created_at: '2026-01-17T08:00:00Z',
      updated_at: '2026-01-17T16:00:00Z',
    },
    {
      id: 2,
      worker_id: 1,
      area_id: 1,
      clock_in_time: '2026-01-16T08:00:00Z',
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_out_time: '2026-01-16T15:30:00Z',
      clock_out_gps_lat: -7.2905,
      clock_out_gps_lng: 112.7398,
      created_at: '2026-01-16T08:00:00Z',
      updated_at: '2026-01-16T15:30:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Alert spy in beforeEach to prevent cross-test pollution
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    store = configureStore({
      reducer: {
        auth: authReducer,
        shift: shiftReducer,
        report: reportReducer,
        offline: offlineReducer,
      },
      preloadedState: {
        auth: {
          user: mockUser,
          assignedArea: mockArea,
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
        report: {
          reports: [],
          isLoading: false,
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
      },
    });

    // Mock API responses
    (authApi.getMe as jest.Mock).mockResolvedValue({
      data: {
        ...mockUser,
        assigned_area: mockArea,
      },
    });

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: mockShifts,
    });

    (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(0);
    (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
    (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
      'clock-in': 0,
      'clock-out': 0,
      report: 0,
      location: 0,
    });
  });

  const renderProfileScreen = () => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <ProfileScreen navigation={mockNavigation} />
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Profile Header', () => {
    it('should display user avatar with initials', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('PS')).toBeTruthy(); // Pekerja Satu -> PS
      }, { timeout: 10000 });
    }, 15000);

    it('should display full name and username', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Pekerja Satu')).toBeTruthy();
        expect(getByText('@worker1')).toBeTruthy();
      });
    });

    it('should display role badge', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Pekerja')).toBeTruthy();
      });
    });

    it('should handle missing user data gracefully', async () => {
      store = configureStore({
        reducer: {
          auth: authReducer,
          shift: shiftReducer,
          report: reportReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          auth: {
            user: null,
            assignedArea: null,
            isAuthenticated: false,
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
          report: {
            reports: [],
            isLoading: false,
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
        },
      });

      const { getAllByText, getByText } = renderProfileScreen();

      await waitFor(() => {
        // Use getAllByText since "Pengguna" appears in both role badge and fallback name
        const pengunaElements = getAllByText('Pengguna');
        expect(pengunaElements.length).toBeGreaterThan(0);
        expect(getByText('@unknown')).toBeTruthy();
      });
    });
  });

  describe('Assigned Area Card', () => {
    it('should display assigned area information', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Area Ditugaskan')).toBeTruthy();
        expect(getByText('Taman Bungkul')).toBeTruthy();
        expect(getByText('Taman - 150m radius')).toBeTruthy();
        expect(getByText('Jl. Taman Bungkul, Darmo, Surabaya')).toBeTruthy();
      });
    });

    it('should show message when no area is assigned', async () => {
      store = configureStore({
        reducer: {
          auth: authReducer,
          shift: shiftReducer,
          report: reportReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          auth: {
            user: mockUser,
            assignedArea: null,
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
          report: {
            reports: [],
            isLoading: false,
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
        },
      });

      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockUser,
      });

      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Tidak ada area ditugaskan')).toBeTruthy();
      });
    });
  });

  describe('Monthly Statistics', () => {
    it('should calculate and display monthly statistics', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Statistik Bulan Ini')).toBeTruthy();
        expect(getByText('Hari Kerja')).toBeTruthy();
        expect(getByText('Jam Kerja')).toBeTruthy();
      });
    });

    it('should calculate days worked correctly', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        // 2 shifts in January = 2 days worked
        expect(getByText('2')).toBeTruthy();
      });
    });

    it('should calculate total hours worked correctly', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        // Shift 1: 8 hours, Shift 2: 7.5 hours = 15.5 total
        expect(getByText('15.5')).toBeTruthy();
      });
    });

    it('should display reports count', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Laporan:')).toBeTruthy();
      });
    });

    it('should handle shifts from different months', async () => {
      const shiftsFromDifferentMonths = [
        ...mockShifts,
        {
          id: 3,
          worker_id: 1,
          area_id: 1,
          clock_in_time: '2025-12-15T08:00:00Z', // December
          clock_in_gps_lat: -7.2905,
          clock_in_gps_lng: 112.7398,
          clock_out_time: '2025-12-15T16:00:00Z',
          clock_out_gps_lat: -7.2905,
          clock_out_gps_lng: 112.7398,
          created_at: '2025-12-15T08:00:00Z',
          updated_at: '2025-12-15T16:00:00Z',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({
        data: shiftsFromDifferentMonths,
      });

      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        // Should only count January shifts
        expect(getByText('2')).toBeTruthy();
      });
    });

    it('should handle active shifts without clock-out', async () => {
      const shiftsWithActive = [
        ...mockShifts,
        {
          id: 3,
          worker_id: 1,
          area_id: 1,
          clock_in_time: '2026-01-18T08:00:00Z',
          clock_in_gps_lat: -7.2905,
          clock_in_gps_lng: 112.7398,
          clock_out_time: null,
          created_at: '2026-01-18T08:00:00Z',
          updated_at: '2026-01-18T08:00:00Z',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValue({
        data: shiftsWithActive,
      });

      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        // Should still calculate correctly, ignoring active shift hours
        expect(getByText('3')).toBeTruthy(); // 3 days
      });
    });
  });

  describe('Menu Items', () => {
    it('should display all menu items', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Ubah Password')).toBeTruthy();
        expect(getByText('Riwayat Shift')).toBeTruthy();
        expect(getByText('Tentang Aplikasi')).toBeTruthy();
      });
    });

    it('should open change password modal when button is pressed', async () => {
      const { getByText, queryByText } = renderProfileScreen();

      await waitFor(() => {
        expect(getByText('Ubah Password')).toBeTruthy();
      });

      // Modal should not be visible initially
      expect(queryByText('Password Saat Ini')).toBeNull();

      // Press change password button
      const changePasswordButton = getByText('Ubah Password');
      fireEvent.press(changePasswordButton);

      // Modal should now be visible
      await waitFor(() => {
        expect(getByText('Password Saat Ini')).toBeTruthy();
      });
    });

    it('should navigate to shift history when pressed', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const shiftHistoryButton = getByText('Riwayat Shift');
        fireEvent.press(shiftHistoryButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ShiftHistory');
    });

    it('should show app info when about is pressed', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const aboutButton = getByText('Tentang Aplikasi');
        fireEvent.press(aboutButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Tentang SEKAR',
        'Sistem Evaluasi Kerja Satgas RTH\n\nVersi: 1.0.0\nDLH Surabaya',
        [{ text: 'OK' }]
      );
    });
  });

  describe('Logout', () => {
    it('should show confirmation alert when logout is pressed with no pending items', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const logoutButton = getByText('Keluar');
        fireEvent.press(logoutButton);
      });

      // Wait for loadSyncStatus to complete
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Keluar dari Akun?',
          'Anda akan keluar dari aplikasi SEKAR',
          expect.any(Array)
        );
      });
    });

    it('should warn about pending sync items on logout with 3 options', async () => {
      (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(3);
      (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(2);
      (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
        'clock-in': 1,
        'clock-out': 0,
        report: 2,
        location: 0,
      });

      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const logoutButton = getByText('Keluar');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Data Belum Tersinkronisasi',
          expect.stringContaining('Ada 3 data tertunda'),
          expect.any(Array)
        );
      });

      // Verify 3 buttons are present
      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Data Belum Tersinkronisasi'
      );
      expect(alertCall[2]).toHaveLength(3);
      expect(alertCall[2].map((btn: any) => btn.text)).toEqual([
        'Batal',
        'Sinkronkan Dulu',
        'Keluar Saja',
      ]);
    });

    it('should clear tokens and dispatch logout on confirm', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const logoutButton = getByText('Keluar');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the confirm button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find(
        (btn: any) => btn.text === 'Keluar'
      );

      // Execute logout
      await confirmButton.onPress();

      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should not logout when cancel is pressed', async () => {
      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const logoutButton = getByText('Keluar');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the cancel button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cancelButton = alertCall[2].find(
        (btn: any) => btn.text === 'Batal'
      );

      // Cancel should not do anything
      if (cancelButton.onPress) {
        await cancelButton.onPress();
      }

      expect(EncryptedStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should clear queue and logout when Keluar Saja is pressed', async () => {
      (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(3);
      (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
      (offlineQueue.clearQueueForCurrentUser as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const logoutButton = getByText('Keluar');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Find the alert with pending items
      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        call => call[0] === 'Data Belum Tersinkronisasi'
      );
      const logoutAnywayButton = alertCall[2].find(
        (btn: any) => btn.text === 'Keluar Saja'
      );

      await logoutAnywayButton.onPress();

      expect(offlineQueue.clearQueueForCurrentUser).toHaveBeenCalled();
      expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle logout errors gracefully', async () => {
      (EncryptedStorage.removeItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { getByText } = renderProfileScreen();

      await waitFor(() => {
        const logoutButton = getByText('Keluar');
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Confirm logout
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find(
        (btn: any) => btn.text === 'Keluar'
      );

      await confirmButton.onPress();

      // Should show error alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Kesalahan',
          'Gagal keluar dari aplikasi'
        );
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should reload data on mount', async () => {
      renderProfileScreen();

      // Verify the APIs are called on mount
      await waitFor(() => {
        expect(authApi.getMe).toHaveBeenCalled();
        expect(apiClient.get).toHaveBeenCalledWith('/shifts/my-shifts');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator initially', () => {
      // Create fresh store with no data
      store = configureStore({
        reducer: {
          auth: authReducer,
          shift: shiftReducer,
          report: reportReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          auth: {
            user: mockUser,
            assignedArea: null,
            isAuthenticated: true,
            isLoading: true,
            isRestoring: false,
            error: null,
          },
          shift: {
            currentShift: null,
            isClockingIn: false,
            isClockingOut: false,
            error: null,
          },
          report: {
            reports: [],
            isLoading: false,
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
        },
      });

      const { getByText } = renderProfileScreen();

      // Loading text should be visible
      expect(getByText('Memuat profil...')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (authApi.getMe as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderProfileScreen();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[ProfileScreen] Error loading profile:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle shift data fetch errors', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch shifts')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderProfileScreen();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[ProfileScreen] Error loading profile:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
