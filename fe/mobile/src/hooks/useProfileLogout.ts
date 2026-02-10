/**
 * useProfileLogout Hook
 * Shared logout logic with pending sync checks and cleanup
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import EncryptedStorage from 'react-native-encrypted-storage';
import { logout } from '../store/slices/authSlice';
import { resetState as resetShiftState } from '../store/slices/shiftSlice';
import { resetState as resetReportState } from '../store/slices/reportSlice';
import { resetState as resetOfflineState } from '../store/slices/offlineSlice';
import {
  getPendingCount,
  getPendingCountsByType,
  getFailedCount,
  clearQueueForCurrentUser,
  clearOrphanedItems,
} from '../services/sync/offlineQueue';
import { syncManager } from '../services/sync/syncManager';

interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  pendingByType: {
    'clock-in': number;
    'clock-out': number;
    report: number;
    location: number;
  };
}

interface UseProfileLogoutOptions {
  /**
   * Optional cleanup callback for role-specific cleanup
   * (e.g., stop location tracking for workers)
   */
  onBeforeLogout?: () => Promise<void>;

  /**
   * Callback to update loading state
   */
  setIsLoading?: (loading: boolean) => void;

  /**
   * Callback to update sync status in parent component
   */
  onSyncStatusUpdate?: (status: SyncStatus) => void;
}

export const useProfileLogout = (options: UseProfileLogoutOptions = {}) => {
  const { onBeforeLogout, setIsLoading, onSyncStatusUpdate } = options;
  const dispatch = useDispatch();

  /**
   * Build pending items description
   */
  const buildPendingDescription = useCallback((pendingByType: SyncStatus['pendingByType']): string => {
    const parts: string[] = [];

    if (pendingByType['clock-in'] > 0) {
      parts.push(`${pendingByType['clock-in']} clock-in`);
    }
    if (pendingByType['clock-out'] > 0) {
      parts.push(`${pendingByType['clock-out']} clock-out`);
    }
    if (pendingByType.report > 0) {
      parts.push(`${pendingByType.report} laporan`);
    }
    if (pendingByType.location > 0) {
      parts.push(`${pendingByType.location} lokasi`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Tidak ada';
  }, []);

  /**
   * Perform the actual logout
   */
  const performLogout = useCallback(async () => {
    try {
      // Role-specific cleanup (e.g., stop location tracking)
      if (onBeforeLogout) {
        await onBeforeLogout();
      }

      // Clear tokens
      await EncryptedStorage.removeItem('auth_token');
      await EncryptedStorage.removeItem('refresh_token');

      // Clear queue items for current user
      await clearQueueForCurrentUser();

      // Clear orphaned items from previous sessions
      await clearOrphanedItems();

      // Clear all Redux states
      dispatch(resetAuthState());
      dispatch(resetShiftState());
      dispatch(resetReportState());
      dispatch(resetOfflineState());

      // Dispatch logout last to trigger navigation
      dispatch(logout());
    } catch (error) {
      console.error('[useProfileLogout] Logout error:', error);
      Alert.alert('Kesalahan', 'Gagal keluar dari aplikasi');
    } finally {
      if (setIsLoading) {
        setIsLoading(false);
      }
    }
  }, [dispatch, onBeforeLogout, setIsLoading]);

  /**
   * Handle logout with sync check
   */
  const handleLogout = useCallback(async () => {
    if (setIsLoading) {
      setIsLoading(true);
    }

    try {
      // Get fresh values directly from async calls to avoid stale closure
      const [freshPending, freshFailed, freshPendingByType] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
        getPendingCountsByType(),
      ]);
      const totalPending = freshPending + freshFailed;

      // Update sync status in parent component if callback provided
      if (onSyncStatusUpdate) {
        onSyncStatusUpdate({
          pendingCount: freshPending,
          failedCount: freshFailed,
          pendingByType: freshPendingByType,
        });
      }

      if (totalPending > 0) {
        // Show detailed pending breakdown with 3 options
        const description = buildPendingDescription(freshPendingByType);
        const message = `Ada ${freshPending} data tertunda dan ${freshFailed} data gagal yang belum tersinkronisasi:\n\n${description}\n\nData ini akan hilang jika Anda keluar.`;

        if (setIsLoading) {
          setIsLoading(false);
        }

        Alert.alert('Data Belum Tersinkronisasi', message, [
          {
            text: 'Batal',
            style: 'cancel',
          },
          {
            text: 'Sinkronkan Dulu',
            onPress: async () => {
              if (setIsLoading) {
                setIsLoading(true);
              }
              try {
                // Try to sync with timeout
                const syncTimeout = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Sync timeout')), 30000)
                );
                await Promise.race([syncManager.processQueue(), syncTimeout]);

                // Check if still has pending items
                const newPending = await getPendingCount();
                const newFailed = await getFailedCount();

                if (newPending + newFailed === 0) {
                  // All synced, proceed with logout
                  await performLogout();
                } else {
                  if (setIsLoading) {
                    setIsLoading(false);
                  }
                  Alert.alert(
                    'Sinkronisasi Belum Selesai',
                    `Masih ada ${newPending + newFailed} data yang gagal tersinkronisasi. Silakan coba lagi atau pilih "Keluar Saja".`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error: any) {
                if (setIsLoading) {
                  setIsLoading(false);
                }
                if (error.message === 'Sync timeout') {
                  Alert.alert(
                    'Timeout',
                    'Sinkronisasi terlalu lama. Silakan coba lagi atau pilih "Keluar Saja".',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('Kesalahan', `Sinkronisasi gagal: ${error.message}`);
                }
              }
            },
          },
          {
            text: 'Keluar Saja',
            style: 'destructive',
            onPress: async () => {
              if (setIsLoading) {
                setIsLoading(true);
              }
              await performLogout();
            },
          },
        ]);
      } else {
        // No pending items, simple logout confirmation
        if (setIsLoading) {
          setIsLoading(false);
        }
        Alert.alert('Keluar dari Akun?', 'Anda akan keluar dari aplikasi SEKAR', [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Keluar',
            style: 'destructive',
            onPress: async () => {
              if (setIsLoading) {
                setIsLoading(true);
              }
              await performLogout();
            },
          },
        ]);
      }
    } catch (error) {
      console.error('[useProfileLogout] Error during logout check:', error);
      if (setIsLoading) {
        setIsLoading(false);
      }
      // Just logout if check fails
      await performLogout();
    }
  }, [
    buildPendingDescription,
    performLogout,
    setIsLoading,
    onSyncStatusUpdate,
  ]);

  return {
    handleLogout,
    performLogout,
  };
};
