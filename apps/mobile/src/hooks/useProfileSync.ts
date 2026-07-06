/**
 * useProfileSync Hook
 * Manages sync status display and actions for profile screens
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import i18n from '../i18n/config';
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
      Alert.alert(i18n.t('common:sync.alerts.syncTitle'), i18n.t('common:sync.alerts.syncSuccess'));
    } catch (error: any) {
      Alert.alert(i18n.t('common:sync.alerts.error'), `${i18n.t('common:sync.alerts.syncError')} ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [loadSyncStatus]);

  const handleRetryFailed = useCallback(async () => {
    try {
      const count = await retryFailedItems();
      if (count > 0) {
        Alert.alert(i18n.t('common:sync.alerts.retryTitle'), i18n.t('common:sync.alerts.retryMessage', { count }));
        await syncManager.processQueue();
        await loadSyncStatus();
      } else {
        Alert.alert(i18n.t('common:sync.alerts.error'), i18n.t('common:sync.alerts.noRetryItems'));
      }
    } catch (error: any) {
      Alert.alert(i18n.t('common:sync.alerts.error'), `${i18n.t('common:sync.alerts.syncError')} ${error.message}`);
    }
  }, [loadSyncStatus]);

  const handleClearFailed = useCallback(async () => {
    Alert.alert(
      i18n.t('common:sync.alerts.clearTitle'),
      i18n.t('common:sync.alerts.clearMessage'),
      [
        { text: i18n.t('common:actions.cancel'), style: 'cancel' },
        {
          text: i18n.t('common:actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearFailedItems();
              await loadSyncStatus();
              Alert.alert(i18n.t('common:sync.alerts.retryTitle'), i18n.t('common:sync.alerts.clearSuccess'));
            } catch (error: any) {
              Alert.alert(i18n.t('common:sync.alerts.error'), `${i18n.t('common:sync.alerts.clearError')} ${error.message}`);
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
