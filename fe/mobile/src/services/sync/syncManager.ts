/**
 * Sync Manager Service
 * Orchestrates offline queue processing with priority-based sync, retry logic,
 * and automatic triggering on network reconnection and app foreground
 */

import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';
import {
  getQueuedItems,
  updateQueueItem,
  removeFromQueue,
  clearSyncedItems,
  type QueueItem,
} from './offlineQueue';
import { clockIn, clockOut } from '../api/shiftsApi';
import { createActivity } from '../api/activitiesApi';
import { uploadLocationBatch } from '../api/locationApi';
import { locationTracker } from '../location/locationTracker';
import config from '../../constants/config';
import type { LocationPoint } from '../../types/api.types';
import type { LocationPing } from '../../types/models.types';

/**
 * Type-safe data interfaces for sync operations
 */
interface ClockInData {
  area_id: number;
  gps_lat: number;
  gps_lng: number;
  selfie_photo?: string;
}

interface ClockOutData {
  gps_lat: number;
  gps_lng: number;
}

interface ActivityData {
  activity_type_id: string;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
}

// New format for location batch (matches backend)
interface NewLocationBatchData {
  shift_id: string;
  locations: LocationPoint[];
}

// Legacy format for backward compatibility
interface LegacyLocationBatchData {
  pings?: LocationPing[];
}

type LocationBatchData = NewLocationBatchData | LegacyLocationBatchData;

/**
 * Sync priority order: clock-in → activities → clock-out → location pings
 */
const SYNC_PRIORITY: Record<string, number> = {
  'clock-in': 1,
  activity: 2,
  'clock-out': 3,
  location: 4,
};

/**
 * Retry configuration - imported from centralized config
 */
const MAX_RETRIES = config.MAX_RETRY_COUNT;
const RETRY_DELAYS = config.RETRY_DELAYS_MS;
const PERIODIC_SYNC_INTERVAL = config.SYNC_INTERVAL;

/**
 * Sync events
 */
export interface SyncEvents {
  syncStart: () => void;
  syncProgress: (completed: number, total: number) => void;
  syncComplete: (successCount: number, failureCount: number) => void;
  syncError: (error: string) => void;
  itemSynced: (itemId: string, type: string) => void;
  itemFailed: (itemId: string, type: string, error: string) => void;
}

/**
 * Sync Manager class
 */
class SyncManager extends EventEmitter {
  private isSyncing = false;
  private periodicSyncTimer: NodeJS.Timeout | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private appStateSubscription: any = null;
  private isInitialized = false;
  private wasOffline = false;

  /**
   * Initialize sync manager with listeners
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.debug('[SyncManager] Already initialized');
      return;
    }

    console.debug('[SyncManager] Initializing...');

    // Listen to network state changes
    this.netInfoUnsubscribe = NetInfo.addEventListener(
      this.handleNetworkChange,
    );

    // Listen to app state changes (foreground/background)
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    // Start periodic sync timer
    this.startPeriodicSync();

    this.isInitialized = true;
    console.debug('[SyncManager] Initialized successfully');
  }

  /**
   * Cleanup listeners and timers
   */
  public cleanup(): void {
    console.debug('[SyncManager] Cleaning up...');

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.stopPeriodicSync();
    this.removeAllListeners();

    // Reset all internal state
    this.isInitialized = false;
    this.isSyncing = false;
    this.wasOffline = false;

    console.debug('[SyncManager] Cleanup complete');
  }

  /**
   * Handle network connectivity changes
   * Triggers location capture when coming back online with active shift
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    console.debug('[SyncManager] Network state changed:', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
    });

    const isOnline = state.isConnected && state.isInternetReachable;

    if (isOnline) {
      // Coming back online
      if (this.wasOffline) {
        console.debug('[SyncManager] Back online - triggering location capture and sync');

        // Trigger immediate location capture if tracking is active
        if (locationTracker.isTracking()) {
          console.debug('[SyncManager] Triggering immediate location capture');
          locationTracker.captureNow();
        }
      }

      console.debug('[SyncManager] Network available - triggering sync');
      this.processQueue();
    } else {
      // Going offline
      console.debug('[SyncManager] Network offline');
    }

    this.wasOffline = !isOnline;
  };

  /**
   * Handle app state changes (foreground/background)
   * Triggers location capture when app comes to foreground with active shift
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.debug('[SyncManager] App state changed:', nextAppState);

    if (nextAppState === 'active') {
      console.debug('[SyncManager] App foregrounded - triggering sync');

      // Trigger immediate location capture if tracking is active
      if (locationTracker.isTracking()) {
        console.debug('[SyncManager] Triggering immediate location capture on foreground');
        locationTracker.captureNow();
      }

      this.processQueue();
    }
  };

  /**
   * Start periodic sync timer
   */
  private startPeriodicSync(): void {
    this.stopPeriodicSync();
    this.periodicSyncTimer = setInterval(() => {
      console.debug('[SyncManager] Periodic sync triggered');
      this.processQueue();
    }, PERIODIC_SYNC_INTERVAL);
  }

  /**
   * Stop periodic sync timer
   */
  private stopPeriodicSync(): void {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
    }
  }

  /**
   * Main sync orchestrator - processes queue with priority
   */
  public async processQueue(): Promise<void> {
    if (this.isSyncing) {
      console.debug('[SyncManager] Sync already in progress, skipping');
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      console.debug('[SyncManager] No network connection, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.emit('syncStart');

    try {
      const items = await getQueuedItems();
      const pendingItems = items.filter(
        item => item.status === 'pending' || item.status === 'failed',
      );

      if (pendingItems.length === 0) {
        console.debug('[SyncManager] No items to sync');
        this.emit('syncComplete', 0, 0);
        return;
      }

      console.debug(`[SyncManager] Starting sync for ${pendingItems.length} items`);

      // Sort by priority and timestamp
      const sortedItems = this.sortByPriority(pendingItems);

      let successCount = 0;
      let failureCount = 0;

      // Process items sequentially
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        this.emit('syncProgress', i + 1, sortedItems.length);

        try {
          await this.processSingleItem(item);
          successCount++;
          this.emit('itemSynced', item.id, item.type);
        } catch (error: any) {
          failureCount++;
          const errorMessage = error?.message || 'Unknown error';
          this.emit('itemFailed', item.id, item.type, errorMessage);
          console.error(`[SyncManager] Failed to sync item ${item.id}:`, error);
        }
      }

      // Clean up successfully synced items
      await clearSyncedItems();

      console.debug(
        `[SyncManager] Sync complete - Success: ${successCount}, Failed: ${failureCount}`,
      );
      this.emit('syncComplete', successCount, failureCount);
    } catch (error: any) {
      const errorMessage = error?.message || 'Sync failed';
      console.error('[SyncManager] Error processing queue:', error);
      this.emit('syncError', errorMessage);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sort items by sync priority
   */
  private sortByPriority(items: QueueItem[]): QueueItem[] {
    return items.sort((a, b) => {
      const priorityDiff = SYNC_PRIORITY[a.type] - SYNC_PRIORITY[b.type];
      if (priorityDiff !== 0) {return priorityDiff;}
      return a.timestamp - b.timestamp; // Then by timestamp
    });
  }

  /**
   * Process a single queue item with retry logic
   */
  private async processSingleItem(item: QueueItem): Promise<void> {
    console.debug(`[SyncManager] Processing ${item.type} item:`, item.id);

    // Check retry limit
    if (item.retryCount >= MAX_RETRIES) {
      console.warn(
        `[SyncManager] Max retries reached for item ${item.id}, marking as failed`,
      );
      await updateQueueItem(item.id, {
        status: 'failed',
        error: 'Max retries exceeded',
      });
      throw new Error('Max retries exceeded');
    }

    // Apply exponential backoff delay
    if (item.retryCount > 0) {
      const delay = RETRY_DELAYS[Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1)];
      console.debug(`[SyncManager] Retry ${item.retryCount}, waiting ${delay}ms`);
      await this.delay(delay);
    }

    // Mark as syncing
    await updateQueueItem(item.id, {
      status: 'syncing',
      lastAttemptAt: Date.now(),
    });

    try {
      // Process based on type
      await this.syncItemByType(item);

      // Mark as success and remove from queue
      await updateQueueItem(item.id, {
        status: 'success',
      });
      await removeFromQueue(item.id);

      console.debug(`[SyncManager] Successfully synced ${item.type}:`, item.id);
    } catch (error: any) {
      console.error(`[SyncManager] Error syncing ${item.type}:`, error);

      // Check for conflict errors (server timestamp wins)
      if (this.isConflictError(error)) {
        console.warn('[SyncManager] Conflict detected, removing stale item');
        await removeFromQueue(item.id);
        return;
      }

      // Increment retry count
      const newRetryCount = item.retryCount + 1;
      await updateQueueItem(item.id, {
        status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
        retryCount: newRetryCount,
        error: error?.message || 'Sync failed',
      });

      throw error;
    }
  }

  /**
   * Sync item based on type
   */
  private async syncItemByType(item: QueueItem): Promise<void> {
    switch (item.type) {
      case 'clock-in':
        await this.syncClockIn(item.data);
        break;

      case 'clock-out':
        await this.syncClockOut(item.data);
        break;

      case 'activity':
        await this.syncActivity(item.data);
        break;

      case 'location':
        await this.syncLocationBatch(item.data);
        break;

      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  }

  /**
   * Sync clock-in
   */
  private async syncClockIn(data: ClockInData): Promise<void> {
    const { area_id, gps_lat, gps_lng, selfie_photo } = data;
    const result = await clockIn(area_id, gps_lat, gps_lng, selfie_photo);

    if (!result || result.error) {
      throw new Error(result?.error || 'Clock-in sync failed');
    }

    console.debug('[SyncManager] Clock-in synced:', result.data);
  }

  /**
   * Sync clock-out
   * Backend uses the authenticated user's current active shift
   */
  private async syncClockOut(data: ClockOutData): Promise<void> {
    const { gps_lat, gps_lng } = data;
    const result = await clockOut(gps_lat, gps_lng);

    if (!result || result.error) {
      throw new Error(result?.error || 'Clock-out sync failed');
    }

    console.debug('[SyncManager] Clock-out synced:', result.data);
  }

  /**
   * Sync activity
   */
  private async syncActivity(data: ActivityData): Promise<void> {
    const result = await createActivity(data);

    if (!result || result.error) {
      throw new Error(result?.error || 'Activity sync failed');
    }

    console.debug('[SyncManager] Activity synced:', result.data);
  }

  /**
   * Sync location batch
   * Handles both new format (shift_id + locations) and legacy format (pings)
   */
  private async syncLocationBatch(data: LocationBatchData): Promise<void> {
    // Check if this is the new format
    if (this.isNewLocationFormat(data)) {
      const { shift_id, locations } = data;

      if (!locations || locations.length === 0) {
        console.warn('[SyncManager] No locations to sync');
        return;
      }

      const result = await uploadLocationBatch(shift_id, locations);

      if (!result || result.error) {
        throw new Error(result?.error || 'Location batch sync failed');
      }

      console.debug('[SyncManager] Location batch synced (new format):', result.data);
    } else {
      // Legacy format - convert and sync
      const pings = (data as LegacyLocationBatchData).pings || [];

      if (pings.length === 0) {
        console.warn('[SyncManager] No location pings to sync (legacy)');
        return;
      }

      // Legacy format requires shift_id from first ping
      const shiftId = pings[0].shift_id;
      if (!shiftId) {
        throw new Error('Legacy location batch missing shift_id');
      }

      // Convert legacy pings to new location format
      const locations: LocationPoint[] = pings.map(ping => ({
        gps_lat: ping.gps_lat,
        gps_lng: ping.gps_lng,
        accuracy_meters: ping.accuracy_meters,
        logged_at: ping.timestamp,
      }));

      const result = await uploadLocationBatch(String(shiftId), locations);

      if (!result || result.error) {
        throw new Error(result?.error || 'Location batch sync failed (legacy)');
      }

      console.debug('[SyncManager] Location batch synced (legacy format):', result.data);
    }
  }

  /**
   * Type guard to check if data is in new location format
   */
  private isNewLocationFormat(data: LocationBatchData): data is NewLocationBatchData {
    return (
      typeof (data as NewLocationBatchData).shift_id === 'string' &&
      Array.isArray((data as NewLocationBatchData).locations)
    );
  }

  /**
   * Check if error is a conflict error (409)
   */
  private isConflictError(error: any): boolean {
    return (
      error?.status === 409 ||
      error?.code === 'CONFLICT' ||
      error?.message?.toLowerCase().includes('conflict')
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync status
   */
  public isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Force sync immediately
   */
  public forceSyncNow(): void {
    console.debug('[SyncManager] Force sync triggered');
    this.processQueue();
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
export default syncManager;
