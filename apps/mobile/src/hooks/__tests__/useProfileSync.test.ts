/**
 * useProfileSync Hook Tests
 * Tests for sync status management and sync actions
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useProfileSync } from '../useProfileSync';
import {
  getPendingCount,
  getPendingCountsByType,
  getFailedCount,
  retryFailedItems,
  clearFailedItems,
} from '../../services/sync/offlineQueue';
import { syncManager } from '../../services/sync/syncManager';

// Mock dependencies
jest.mock('../../services/sync/offlineQueue');
jest.mock('../../services/sync/syncManager', () => ({
  syncManager: {
    processQueue: jest.fn(),
  },
}));

const mockGetPendingCount = getPendingCount as jest.MockedFunction<typeof getPendingCount>;
const mockGetPendingCountsByType = getPendingCountsByType as jest.MockedFunction<typeof getPendingCountsByType>;
const mockGetFailedCount = getFailedCount as jest.MockedFunction<typeof getFailedCount>;
const mockRetryFailedItems = retryFailedItems as jest.MockedFunction<typeof retryFailedItems>;
const mockClearFailedItems = clearFailedItems as jest.MockedFunction<typeof clearFailedItems>;
const mockProcessQueue = syncManager.processQueue as jest.MockedFunction<typeof syncManager.processQueue>;

describe('useProfileSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('initial state', () => {
    it('should initialize with zero counts', () => {
      const { result } = renderHook(() => useProfileSync());

      expect(result.current.syncStatus).toEqual({
        pendingCount: 0,
        failedCount: 0,
        pendingByType: {
          'clock-in': 0,
          'clock-out': 0,
          activity: 0,
          location: 0,
        },
      });
      expect(result.current.isSyncing).toBe(false);
    });

    it('should provide all expected functions', () => {
      const { result } = renderHook(() => useProfileSync());

      expect(typeof result.current.loadSyncStatus).toBe('function');
      expect(typeof result.current.handleSyncNow).toBe('function');
      expect(typeof result.current.handleRetryFailed).toBe('function');
      expect(typeof result.current.handleClearFailed).toBe('function');
    });
  });

  describe('loadSyncStatus', () => {
    it('should load sync status successfully', async () => {
      const mockPendingByType = {
        'clock-in': 2,
        'clock-out': 1,
        activity: 3,
        location: 5,
      };

      mockGetPendingCount.mockResolvedValue(11);
      mockGetFailedCount.mockResolvedValue(2);
      mockGetPendingCountsByType.mockResolvedValue(mockPendingByType);

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.loadSyncStatus();
      });

      expect(result.current.syncStatus).toEqual({
        pendingCount: 11,
        failedCount: 2,
        pendingByType: mockPendingByType,
      });
    });

    it('should handle error when loading sync status', async () => {
      mockGetPendingCount.mockRejectedValue(new Error('Database error'));
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 0,
        'clock-out': 0,
        activity: 0,
        location: 0,
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.loadSyncStatus();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useProfileSync] Error loading sync status:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleSyncNow', () => {
    it('should sync successfully and show success alert', async () => {
      mockProcessQueue.mockResolvedValue(undefined);
      mockGetPendingCount.mockResolvedValue(0);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 0,
        'clock-out': 0,
        activity: 0,
        location: 0,
      });

      const { result } = renderHook(() => useProfileSync());

      expect(result.current.isSyncing).toBe(false);

      await act(async () => {
        await result.current.handleSyncNow();
      });

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });

      expect(mockProcessQueue).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith('Sinkronisasi', 'Data berhasil disinkronkan');
    });

    it('should set isSyncing during sync operation', async () => {
      let resolveSyncPromise: () => void;
      const syncPromise = new Promise<void>((resolve) => {
        resolveSyncPromise = resolve;
      });

      mockProcessQueue.mockReturnValue(syncPromise);
      mockGetPendingCount.mockResolvedValue(0);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 0,
        'clock-out': 0,
        activity: 0,
        location: 0,
      });

      const { result } = renderHook(() => useProfileSync());

      act(() => {
        result.current.handleSyncNow();
      });

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      });

      await act(async () => {
        resolveSyncPromise!();
        await syncPromise;
      });

      expect(result.current.isSyncing).toBe(false);
    });

    it('should handle sync error and show error alert', async () => {
      const error = new Error('Network error');
      mockProcessQueue.mockRejectedValue(error);

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleSyncNow();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Kesalahan', 'Gagal sinkronisasi: Network error');
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('handleRetryFailed', () => {
    it('should retry failed items successfully', async () => {
      mockRetryFailedItems.mockResolvedValue(3);
      mockProcessQueue.mockResolvedValue(undefined);
      mockGetPendingCount.mockResolvedValue(3);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 1,
        'clock-out': 1,
        activity: 1,
        location: 0,
      });

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleRetryFailed();
      });

      expect(mockRetryFailedItems).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith('Berhasil', '3 item akan dicoba ulang');
      expect(mockProcessQueue).toHaveBeenCalledTimes(1);
    });

    it('should show info when no failed items to retry', async () => {
      mockRetryFailedItems.mockResolvedValue(0);

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleRetryFailed();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Kesalahan', 'Tidak ada item gagal untuk dicoba ulang');
      expect(mockProcessQueue).not.toHaveBeenCalled();
    });

    it('should handle retry error', async () => {
      const error = new Error('Database error');
      mockRetryFailedItems.mockRejectedValue(error);

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleRetryFailed();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Kesalahan', 'Gagal sinkronisasi: Database error');
    });
  });

  describe('handleClearFailed', () => {
    it('should show confirmation dialog', async () => {
      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleClearFailed();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Hapus Item Gagal?',
        'Data yang gagal akan dihapus permanen dan tidak dapat dikembalikan.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Batal', style: 'cancel' }),
          expect.objectContaining({ text: 'Hapus', style: 'destructive' }),
        ])
      );
    });

    it('should clear failed items when confirmed', async () => {
      mockClearFailedItems.mockResolvedValue(undefined);
      mockGetPendingCount.mockResolvedValue(0);
      mockGetFailedCount.mockResolvedValue(0);
      mockGetPendingCountsByType.mockResolvedValue({
        'clock-in': 0,
        'clock-out': 0,
        activity: 0,
        location: 0,
      });

      let confirmCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find((b: any) => b.text === 'Hapus');
        if (confirmButton) {
          confirmCallback = confirmButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleClearFailed();
      });

      expect(confirmCallback).toBeDefined();

      await act(async () => {
        await confirmCallback!();
      });

      expect(mockClearFailedItems).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith('Berhasil', 'Item gagal telah dihapus');
    });

    it('should handle clear failed items error', async () => {
      const error = new Error('Database error');
      mockClearFailedItems.mockRejectedValue(error);

      let confirmCallback: (() => void) | undefined;
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find((b: any) => b.text === 'Hapus');
        if (confirmButton) {
          confirmCallback = confirmButton.onPress;
        }
      });

      const { result } = renderHook(() => useProfileSync());

      await act(async () => {
        await result.current.handleClearFailed();
      });

      await act(async () => {
        await confirmCallback!();
      });

      expect(Alert.alert).toHaveBeenLastCalledWith('Kesalahan', 'Gagal menghapus: Database error');
    });
  });
});
