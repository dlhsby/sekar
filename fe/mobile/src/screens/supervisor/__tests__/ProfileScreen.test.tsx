/**
 * Supervisor ProfileScreen Tests
 * Tests for supervisor profile screen
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
import * as supervisorApi from '../../../services/api/supervisorApi';
import * as apiClient from '../../../services/api/apiClient';
import * as offlineQueue from '../../../services/sync/offlineQueue';
import EncryptedStorage from 'react-native-encrypted-storage';

// Mock modules
jest.mock('../../../services/api/authApi');
jest.mock('../../../services/api/supervisorApi');
jest.mock('../../../services/api/apiClient');
jest.mock('../../../services/sync/offlineQueue');
jest.mock('../../../services/sync/syncManager', () => ({
  syncManager: {
    processQueue: jest.fn().mockResolvedValue(undefined),
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

describe('Supervisor ProfileScreen', () => {
  let store: any;

  const mockUser = {
    id: 'supervisor-uuid',
    username: 'supervisor1',
    full_name: 'Supervisor Satu',
    role: 'supervisor' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockActiveWorkersResponse = {
    data: {
      data: [
        {
          id: 'worker1-uuid',
          username: 'worker1',
          full_name: 'Pekerja Satu',
          shift: {
            id: 'shift1-uuid',
            clock_in_time: '2026-01-18T08:00:00Z',
            area: {
              id: 'area1-uuid',
              name: 'Taman A',
            },
          },
          latest_location: {
            gps_lat: -7.250445,
            gps_lng: 112.768845,
            logged_at: '2026-01-18T10:00:00Z',
          },
        },
      ],
      meta: {
        total: 5,
        page: 1,
        limit: 100,  // Backend max limit is 100
        totalPages: 1,
      },
    },
  };

  const mockAreaStatusResponse = {
    data: {
      areas: [
        {
          id: 'area1-uuid',
          name: 'Taman A',
          assigned_workers_count: 2,
          active_workers_count: 1,
        },
        {
          id: 'area2-uuid',
          name: 'Taman B',
          assigned_workers_count: 3,
          active_workers_count: 2,
        },
      ],
    },
  };

  const mockReportsResponse = {
    data: {
      data: [],
      meta: {
        total: 25,
        page: 1,
        limit: 1,
        totalPages: 25,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Alert spy in beforeEach to prevent cross-test pollution
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Create fresh store for each test
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
          isAuthenticated: true,
          isLoading: false,
          isRestoring: false,
          error: null,
          assignedArea: null,
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

    // Setup default mocks
    (authApi.getMe as jest.Mock).mockResolvedValue({ data: mockUser });
    (supervisorApi.getActiveWorkers as jest.Mock).mockResolvedValue(mockActiveWorkersResponse);
    (apiClient.get as jest.Mock).mockImplementation((endpoint: string) => {
      if (endpoint === '/supervisor/area-status') {
        return Promise.resolve(mockAreaStatusResponse);
      }
      if (endpoint === '/reports') {
        return Promise.resolve(mockReportsResponse);
      }
      return Promise.resolve({ data: null });
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

  const renderScreen = () =>
    render(
      <Provider store={store}>
        <NavigationContainer>
          <ProfileScreen navigation={mockNavigation} />
        </NavigationContainer>
      </Provider>
    );

  it('renders profile header with user info', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Supervisor Satu')).toBeTruthy();
      expect(getByText('@supervisor1')).toBeTruthy();
      expect(getByText('Supervisor')).toBeTruthy();
    }, { timeout: 10000 });
  }, 15000);

  it('displays supervisor statistics', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('📊 Ringkasan')).toBeTruthy();
      expect(getByText('5')).toBeTruthy(); // Total workers
      expect(getByText('2')).toBeTruthy(); // Total areas (from mock areas array)
      expect(getByText('25')).toBeTruthy(); // Reports count
    });
  });

  it('loads statistics on mount', async () => {
    renderScreen();

    await waitFor(() => {
      expect(authApi.getMe).toHaveBeenCalled();
      // Backend max limit is 100, so ProfileScreen calls with 100
      expect(supervisorApi.getActiveWorkers).toHaveBeenCalledWith(1, 100);
      expect(apiClient.get).toHaveBeenCalledWith('/supervisor/area-status');
      expect(apiClient.get).toHaveBeenCalledWith(
        '/reports',
        expect.objectContaining({
          page: 1,
          limit: 1,
        })
      );
    });
  });

  it('handles pull-to-refresh', async () => {
    const { getByTestId, getByText } = renderScreen();

    // Wait for initial load to complete
    await waitFor(() => {
      expect(getByText('Supervisor Satu')).toBeTruthy();
    });

    // Reset call counts
    jest.clearAllMocks();

    const scrollView = getByTestId('ProfileScrollView');
    const refreshControl = scrollView.props?.refreshControl;

    if (refreshControl?.props?.onRefresh) {
      await refreshControl.props.onRefresh();
    }

    await waitFor(() => {
      expect(authApi.getMe).toHaveBeenCalled();
      expect(supervisorApi.getActiveWorkers).toHaveBeenCalled();
    });
  });

  it('shows change password modal when button is pressed', async () => {
    const { getByText, queryByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('Ubah password')).toBeTruthy();
    });

    // Modal should not be visible initially
    expect(queryByText('Password Saat Ini')).toBeNull();

    // Press change password button
    const changePasswordButton = getByText('Ubah password');
    fireEvent.press(changePasswordButton);

    // Modal should now be visible
    await waitFor(() => {
      expect(getByText('Password Saat Ini')).toBeTruthy();
    });
  });

  it('shows about app dialog', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      const aboutButton = getByText('Tentang aplikasi');
      fireEvent.press(aboutButton);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Tentang SEKAR',
      'Sistem Evaluasi Kerja Satgas RTH\n\nVersi: 1.0.0\nDLH Surabaya © 2026',
      [{ text: 'OK' }]
    );
  });

  it('handles logout with confirmation when no pending items', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      const logoutButton = getByText('Keluar');
      fireEvent.press(logoutButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Keluar dari Akun?',
        'Anda akan keluar dari aplikasi SEKAR',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Batal' }),
          expect.objectContaining({ text: 'Keluar' }),
        ])
      );
    });
  });

  it('performs logout when confirmed', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      const logoutButton = getByText('Keluar');
      fireEvent.press(logoutButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Get the alert call and execute the onPress of "Keluar" button
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const logoutAction = alertCall[2].find((btn: any) => btn.text === 'Keluar').onPress;
    await logoutAction();

    expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
  });

  it('shows 3 options when pending sync items on logout', async () => {
    (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(2);
    (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(1);
    (offlineQueue.getPendingCountsByType as jest.Mock).mockResolvedValue({
      'clock-in': 1,
      'clock-out': 0,
      report: 1,
      location: 0,
    });

    const { getByText } = renderScreen();

    await waitFor(() => {
      const logoutButton = getByText('Keluar');
      fireEvent.press(logoutButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Data Belum Tersinkronisasi',
        expect.stringContaining('Ada 2 data tertunda'),
        expect.any(Array)
      );
    });

    // Verify 3 buttons
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call: any) => call[0] === 'Data Belum Tersinkronisasi'
    );
    expect(alertCall[2]).toHaveLength(3);
    expect(alertCall[2].map((btn: any) => btn.text)).toEqual([
      'Batal',
      'Sinkronkan Dulu',
      'Keluar Saja',
    ]);
  });

  it('clears queue and logs out when Keluar Saja is pressed', async () => {
    (offlineQueue.getPendingCount as jest.Mock).mockResolvedValue(2);
    (offlineQueue.getFailedCount as jest.Mock).mockResolvedValue(0);
    (offlineQueue.clearQueueForCurrentUser as jest.Mock).mockResolvedValue(undefined);

    const { getByText } = renderScreen();

    await waitFor(() => {
      const logoutButton = getByText('Keluar');
      fireEvent.press(logoutButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Find the alert with pending items
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      (call: any) => call[0] === 'Data Belum Tersinkronisasi'
    );
    const logoutAnywayButton = alertCall[2].find((btn: any) => btn.text === 'Keluar Saja');
    await logoutAnywayButton.onPress();

    expect(offlineQueue.clearQueueForCurrentUser).toHaveBeenCalled();
    expect(EncryptedStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('handles API errors gracefully', async () => {
    (authApi.getMe as jest.Mock).mockRejectedValue(new Error('Network error'));
    (supervisorApi.getActiveWorkers as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByText, getAllByText } = renderScreen();

    // Should still render with default/zero values
    await waitFor(() => {
      expect(getByText('Supervisor Satu')).toBeTruthy();
      const zeroElements = getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0); // Should show 0 for failed stats
    });
  });

  it('displays user initials correctly', async () => {
    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('SS')).toBeTruthy(); // "Supervisor Satu" -> "SS"
    });
  });

  it('handles single-word names', async () => {
    const singleWordUser = { ...mockUser, full_name: 'Admin' };
    store = configureStore({
      reducer: {
        auth: authReducer,
        shift: shiftReducer,
        report: reportReducer,
        offline: offlineReducer,
      },
      preloadedState: {
        auth: {
          user: singleWordUser,
          isAuthenticated: true,
          isLoading: false,
          isRestoring: false,
          error: null,
          assignedArea: null,
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

    const { getByText } = renderScreen();

    await waitFor(() => {
      expect(getByText('AD')).toBeTruthy(); // First 2 letters
    });
  });
});
