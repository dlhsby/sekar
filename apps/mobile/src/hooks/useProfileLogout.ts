/**
 * useProfileLogout Hook
 * Shared logout logic with pending sync checks and cleanup
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import i18n from '../i18n/config';
import EncryptedStorage from 'react-native-encrypted-storage';
import { logout, resetState as resetAuthState } from '../store/slices/authSlice';
import { resetState as resetShiftState } from '../store/slices/shiftSlice';
import { resetState as resetActivitiesState } from '../store/slices/activitiesSlice';
import { resetState as resetOfflineState } from '../store/slices/offlineSlice';
import { resetState as resetNotificationsState } from '../store/slices/notificationsSlice';
import fcmService from '../services/notifications/fcmService';
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
    activity: number;
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
      parts.push(`${pendingByType['clock-in']} ${i18n.t('profile:logout.clockInLabel')}`);
    }
    if (pendingByType['clock-out'] > 0) {
      parts.push(`${pendingByType['clock-out']} ${i18n.t('profile:logout.clockOutLabel')}`);
    }
    if (pendingByType.activity > 0) {
      parts.push(`${pendingByType.activity} ${i18n.t('profile:logout.activityLabel')}`);
    }
    if (pendingByType.location > 0) {
      parts.push(`${pendingByType.location} ${i18n.t('profile:logout.locationLabel')}`);
    }

    return parts.length > 0 ? parts.join(', ') : i18n.t('profile:logout.noActivityTypes');
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

      // May 13 — unregister the FCM token from the backend BEFORE
      // clearing the auth token (the unregister call needs the JWT).
      // Without this, the device_tokens row stays is_active=true and
      // a future user logging in on this same device would have stale
      // notifications routed to the previous account briefly. Wrapped
      // in try/catch so a network failure doesn't block logout.
      try {
        await fcmService.unregisterToken();
      } catch (err) {
        console.warn('[useProfileLogout] FCM unregister failed:', err);
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
      dispatch(resetActivitiesState());
      dispatch(resetNotificationsState());
      dispatch(resetOfflineState());

      // Dispatch logout last to trigger navigation
      dispatch(logout());
    } catch (error) {
      console.error('[useProfileLogout] Logout error:', error);
      Alert.alert(i18n.t('profile:logout.error'), i18n.t('profile:logout.failureMessage'));
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
        const message = i18n.t('profile:logout.pendingDataMessage', {
          pendingCount: freshPending,
          failedCount: freshFailed,
          description,
        });

        if (setIsLoading) {
          setIsLoading(false);
        }

        Alert.alert(i18n.t('profile:logout.pendingDataTitle'), message, [
          {
            text: i18n.t('profile:logout.cancelButton'),
            style: 'cancel',
          },
          {
            text: i18n.t('profile:logout.syncButton'),
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
                    i18n.t('profile:logout.syncIncompleteTitle'),
                    i18n.t('profile:logout.syncIncompleteMessage', { count: newPending + newFailed }),
                    [{ text: i18n.t('profile:logout.okButton') }]
                  );
                }
              } catch (error: any) {
                if (setIsLoading) {
                  setIsLoading(false);
                }
                if (error.message === 'Sync timeout') {
                  Alert.alert(
                    i18n.t('profile:logout.syncTimeoutTitle'),
                    i18n.t('profile:logout.syncTimeoutMessage'),
                    [{ text: i18n.t('profile:logout.okButton') }]
                  );
                } else {
                  Alert.alert(i18n.t('profile:logout.error'), `${i18n.t('profile:logout.syncErrorMessage')} ${error.message}`);
                }
              }
            },
          },
          {
            text: i18n.t('profile:logout.logoutButton'),
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
        Alert.alert(i18n.t('profile:logout.confirmTitle'), i18n.t('profile:logout.confirmMessage'), [
          { text: i18n.t('profile:logout.cancelButton'), style: 'cancel' },
          {
            text: i18n.t('profile:logout.logoutButton'),
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
