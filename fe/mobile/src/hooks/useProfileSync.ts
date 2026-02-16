/**
 * useProfileSync Hook
 * Manages sync status display and actions for profile screens
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  getPendingCount,
  getPendingCountsByType,
  getFailedCount,
  retryFailedItems,
  clearFailedItems,
} from '../services/sync/offlineQueue';
import { syncManager } from '../services/sync/syncManager';

export interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  pendingByType: {
    'clock-in': number;
    'clock-out': number;
    activity: number;
    location: number;
  };
}

const INITIAL_SYNC_STATUS: SyncStatus = {
  pendingCount: 0,
  failedCount: 0,
  pendingByType: {
    'clock-in': 0,
    'clock-out': 0,
    activity: 0,
    location: 0,
  },
};

export function useProfileSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(INITIAL_SYNC_STATUS);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadSyncStatus = useCallback(async () => {
    try {
      const [pendingCount, failedCount, pendingByType] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
        getPendingCountsByType(),
      ]);
      setSyncStatus({ pendingCount, failedCount, pendingByType });
    } catch (error) {
      console.error('[useProfileSync] Error loading sync status:', error);
    }
  }, []);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncManager.processQueue();
      await loadSyncStatus();
      Alert.alert('Sinkronisasi', 'Data berhasil disinkronkan');
    } catch (error: any) {
      Alert.alert('Kesalahan', `Gagal sinkronisasi: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [loadSyncStatus]);

  const handleRetryFailed = useCallback(async () => {
    try {
      const count = await retryFailedItems();
      if (count > 0) {
        Alert.alert('Berhasil', `${count} item akan dicoba ulang`);
        await syncManager.processQueue();
        await loadSyncStatus();
      } else {
        Alert.alert('Info', 'Tidak ada item gagal untuk dicoba ulang');
      }
    } catch (error: any) {
      Alert.alert('Kesalahan', `Gagal mencoba ulang: ${error.message}`);
    }
  }, [loadSyncStatus]);

  const handleClearFailed = useCallback(async () => {
    Alert.alert(
      'Hapus Item Gagal?',
      'Data yang gagal akan dihapus permanen dan tidak dapat dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearFailedItems();
              await loadSyncStatus();
              Alert.alert('Berhasil', 'Item gagal telah dihapus');
            } catch (error: any) {
              Alert.alert('Kesalahan', `Gagal menghapus: ${error.message}`);
            }
          },
        },
      ]
    );
  }, [loadSyncStatus]);

  return {
    syncStatus,
    isSyncing,
    loadSyncStatus,
    handleSyncNow,
    handleRetryFailed,
    handleClearFailed,
  };
}
