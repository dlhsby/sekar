/**
 * useProfileLogout Hook Tests
 * Tests for logout functionality with cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EncryptedStorage from 'react-native-encrypted-storage';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import activitiesReducer from '../../store/slices/activitiesSlice';
import offlineReducer from '../../store/slices/offlineSlice';
import { useProfileLogout } from '../useProfileLogout';
import {
  getPendingCount,
  getFailedCount,
  getPendingCountsByType,
  clearQueueForCurrentUser,
  clearOrphanedItems,
} from '../../services/sync/offlineQueue';
import { syncManager } from '../../services/sync/syncManager';

// Mock dependencies
jest.mock('react-native-encrypted-storage');
jest.mock('../../services/sync/offlineQueue');
jest.mock('../../services/sync/syncManager', () => ({
  syncManager: {
    processQueue: jest.fn(),
  },
}));

const mockGetPendingCount = getPendingCount as jest.MockedFunction<typeof getPendingCount>;
const mockGetFailedCount = getFailedCount as jest.MockedFunction<typeof getFailedCount>;
const mockGetPendingCountsByType = getPendingCountsByType as jest.MockedFunction<typeof getPendingCountsByType>;
const mockClearQueueForCurrentUser = clearQueueForCurrentUser as jest.MockedFunction<typeof clearQueueForCurrentUser>;
const mockClearOrphanedItems = clearOrphanedItems as jest.MockedFunction<typeof clearOrphanedItems>;
const mockProcessQueue = syncManager.processQueue as jest.MockedFunction<typeof syncManager.processQueue>;
const mockRemoveItem = EncryptedStorage.removeItem as jest.MockedFunction<typeof EncryptedStorage.removeItem>;

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
      activities: activitiesReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: { id: '1', username: 'test', full_name: 'Test User', role: 'satgas' },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        assignedArea: null,
      },
      shift: {
        currentShift: null,
        shifts: [],
        loading: false,
        error: null,
      },
      activities: {
        activities: [],
        activityTypes: [],
        loading: false,
        error: null,
      },
      offline: {
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingCount: 0,
      },
    },
  });

const wrapper = ({ children }: any) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};

describe('useProfileLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
    mockGetPendingCount.mockResolvedValue(0);
    mockGetFailedCount.mockResolvedValue(0);
    mockGetPendingCountsByType.mockResolvedValue({
      'clock-in': 0,
      'clock-out': 0,
      activity: 0,
      location: 0,
    });
    mockClearQueueForCurrentUser.mockResolvedValue(undefined);
    mockClearOrphanedItems.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue();
  });

  describe('return values', () => {
    it('should return handleLogout and performLogout functions', () => {
      const { result } = renderHook(() => useProfileLogout(), { wrapper });
      expect(typeof result.current.handleLogout).toBe('function');
      expect(typeof result.current.performLogout).toBe('function');
    });
  });

  describe('buildPendingDescription', () => {
    it('should build description with all pending types', async () => {
      mockGetPendingCount.mockResolvedValue(11);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 3,
        location: 5,
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Data Belum Tersinkronisasi',
        expect.stringContaining('2 clock-in, 1 clock-out, 3 aktivitas, 5 lokasi'),
        expect.any(Array)
      );
    });

    it('should build description with partial pending types', async () => {
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 0,
        'clock-out': 0,
        activity: 5,
        location: 0,
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Data Belum Tersinkronisasi',
        expect.stringContaining('5 aktivitas'),
        expect.any(Array)
      );
    });
  });

  describe('performLogout', () => {
    it('should clear encrypted storage', async () => {
      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.performLogout();
      });

      expect(mockRemoveItem).toHaveBeenCalledWith('auth_token');
      expect(mockRemoveItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should clear queue items', async () => {
      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.performLogout();
      });

      expect(mockClearQueueForCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockClearOrphanedItems).toHaveBeenCalledTimes(1);
    });

    it('should call onBeforeLogout callback', async () => {
      const onBeforeLogout = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfileLogout({ onBeforeLogout }), { wrapper });

      await act(async () => {
        await result.current.performLogout();
      });

      expect(onBeforeLogout).toHaveBeenCalledTimes(1);
    });

    it('should handle performLogout error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClearQueueForCurrentUser.mockRejectedValue(new Error('Clear error'));

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.performLogout();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useProfileLogout] Logout error:',
        expect.any(Error)
      );
      expect(Alert.alert).toHaveBeenCalledWith('Kesalahan', 'Gagal keluar dari aplikasi');

      consoleErrorSpy.mockRestore();
    });

    it('should call setIsLoading(false) on error', async () => {
      const setIsLoading = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClearQueueForCurrentUser.mockRejectedValue(new Error('Clear error'));

      const { result } = renderHook(() => useProfileLogout({ setIsLoading }), { wrapper });

      await act(async () => {
        await result.current.performLogout();
      });

      expect(setIsLoading).toHaveBeenCalledWith(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleLogout - no pending items', () => {
    it('should show simple confirmation when no pending items', async () => {
      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Keluar dari Akun?',
        'Anda akan keluar dari aplikasi SEKAR',
        expect.any(Array)
      );
    });

    it('should call setIsLoading correctly', async () => {
      const setIsLoading = jest.fn();

      const { result } = renderHook(() => useProfileLogout({ setIsLoading }), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleLogout - with pending items', () => {
    it('should show pending items alert with 3 options', async () => {
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(2);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 2,
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Data Belum Tersinkronisasi',
        expect.stringContaining('Ada 5 data tertunda dan 2 data gagal'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Batal', style: 'cancel' }),
          expect.objectContaining({ text: 'Sinkronkan Dulu' }),
          expect.objectContaining({ text: 'Keluar Saja', style: 'destructive' }),
        ])
      );
    });

    it('should sync and logout when "Sinkronkan Dulu" chosen and sync succeeds', async () => {
      mockGetPendingCount
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);
      mockGetFailedCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });
      mockProcessQueue.mockResolvedValue(undefined);

      let syncCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const syncButton = buttons?.find((b: any) => b.text === 'Sinkronkan Dulu');
        if (syncButton) {
          syncCallback = syncButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(syncCallback).toBeDefined();

      await act(async () => {
        await syncCallback!();
      });

      expect(mockProcessQueue).toHaveBeenCalledTimes(1);
      expect(mockClearQueueForCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should show alert when sync incomplete', async () => {
      mockGetPendingCount
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 0,
        location: 0,
      });
      mockProcessQueue.mockResolvedValue(undefined);

      let syncCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const syncButton = buttons?.find((b: any) => b.text === 'Sinkronkan Dulu');
        if (syncButton) {
          syncCallback = syncButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      await act(async () => {
        await syncCallback!();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith(
        'Sinkronisasi Belum Selesai',
        expect.stringContaining('Masih ada 3 data yang gagal tersinkronisasi'),
        [{ text: 'OK' }]
      );
    });

    it('should handle sync timeout', async () => {
      jest.useFakeTimers();

      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });

      const neverResolvePromise = new Promise(() => {});
      mockProcessQueue.mockReturnValue(neverResolvePromise as any);

      let syncCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const syncButton = buttons?.find((b: any) => b.text === 'Sinkronkan Dulu');
        if (syncButton) {
          syncCallback = syncButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      act(() => {
        syncCallback!();
      });

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Timeout',
          expect.stringContaining('Sinkronisasi terlalu lama'),
          [{ text: 'OK' }]
        );
      });

      jest.useRealTimers();
    });

    it('should call onSyncStatusUpdate when provided', async () => {
      const onSyncStatusUpdate = jest.fn();
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(2);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });

      const { result } = renderHook(
        () => useProfileLogout({ onSyncStatusUpdate }),
        { wrapper }
      );

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(onSyncStatusUpdate).toHaveBeenCalledWith({
        pendingCount: 5,
        failedCount: 2,
        pendingByType: {
          'clock-in': 2,
          'clock-out': 1,
          activity: 2,
          location: 0,
        },
      });
    });
  });

  describe('handleLogout - error handling', () => {
    it('should perform logout if sync status check fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetPendingCount.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useProfileLogout] Error during logout check:',
        expect.any(Error)
      );
      expect(mockClearQueueForCurrentUser).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should handle sync error other than timeout', async () => {
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });
      mockProcessQueue.mockRejectedValue(new Error('Network error'));

      let syncCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const syncButton = buttons?.find((b: any) => b.text === 'Sinkronkan Dulu');
        if (syncButton) {
          syncCallback = syncButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      await act(async () => {
        await syncCallback!();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('Kesalahan', 'Sinkronisasi gagal: Network error');
    });

    it('should call "Keluar Saja" button and logout', async () => {
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });

      let logoutCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const logoutButton = buttons?.find((b: any) => b.text === 'Keluar Saja');
        if (logoutButton) {
          logoutCallback = logoutButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout(), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(logoutCallback).toBeDefined();

      await act(async () => {
        await logoutCallback!();
      });

      expect(mockClearQueueForCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should call setIsLoading in "Keluar Saja" button when provided', async () => {
      const setIsLoading = jest.fn();
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });

      let logoutCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const logoutButton = buttons?.find((b: any) => b.text === 'Keluar Saja');
        if (logoutButton) {
          logoutCallback = logoutButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout({ setIsLoading }), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      await act(async () => {
        await logoutCallback!();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
    });

    it('should call setIsLoading in simple logout when provided', async () => {
      const setIsLoading = jest.fn();

      let confirmCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find((b: any) => b.text === 'Keluar');
        if (confirmButton) {
          confirmCallback = confirmButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout({ setIsLoading }), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      expect(confirmCallback).toBeDefined();

      await act(async () => {
        await confirmCallback!();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
    });

    it('should call setIsLoading callbacks during sync incomplete scenario', async () => {
      const setIsLoading = jest.fn();
      mockGetPendingCount
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 0,
        location: 0,
      });
      mockProcessQueue.mockResolvedValue(undefined);

      let syncCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const syncButton = buttons?.find((b: any) => b.text === 'Sinkronkan Dulu');
        if (syncButton) {
          syncCallback = syncButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout({ setIsLoading }), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      await act(async () => {
        await syncCallback!();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });

    it('should call setIsLoading callbacks during sync error scenario', async () => {
      const setIsLoading = jest.fn();
      mockGetPendingCount.mockResolvedValue(5);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 2,
        'clock-out': 1,
        activity: 2,
        location: 0,
      });
      mockProcessQueue.mockRejectedValue(new Error('Network error'));

      let syncCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const syncButton = buttons?.find((b: any) => b.text === 'Sinkronkan Dulu');
        if (syncButton) {
          syncCallback = syncButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileLogout({ setIsLoading }), { wrapper });

      await act(async () => {
        await result.current.handleLogout();
      });

      await act(async () => {
        await syncCallback!();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });
  });
});
