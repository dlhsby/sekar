/**
 * Offline Queue Service
 * AsyncStorage-based queue management for offline operations
 * User-scoped queue prevents cross-user sync issues
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { getUser } from '../storage/secureStorage';

const QUEUE_KEY = 'OFFLINE_QUEUE';

/**
 * Queue item types
 */
export type QueueItemType = 'clock-in' | 'clock-out' | 'activity' | 'location';

/**
 * Queue item status
 */
export type QueueItemStatus = 'pending' | 'syncing' | 'success' | 'failed' | 'orphaned';

/**
 * Queue item interface
 */
export interface QueueItem {
  id: string;
  type: QueueItemType;
  data: any;
  timestamp: number;
  retryCount: number;
  status: QueueItemStatus;
  error?: string;
  lastAttemptAt?: number;
  user_id?: number; // Added for user-scoped queue
}

/**
 * Get current user ID from secure storage
 */
async function getCurrentUserId(): Promise<number | null> {
  try {
    const user = await getUser();
    return user?.id || null;
  } catch (error) {
    console.error('[OfflineQueue] Error getting current user:', error);
    return null;
  }
}

/**
 * Get all queued items from AsyncStorage
 * @returns Array of queue items
 */
export async function getQueuedItems(): Promise<QueueItem[]> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) {
      return [];
    }
    return JSON.parse(queueJson) as QueueItem[];
  } catch (error) {
    console.error('[OfflineQueue] Error getting queued items:', error);
    return [];
  }
}

/**
 * Get queued items for a specific user
 * @param userId - User ID to filter by
 * @returns Array of queue items for the user
 */
export async function getQueueForUser(userId: number): Promise<QueueItem[]> {
  try {
    const items = await getQueuedItems();
    return items.filter(item => item.user_id === userId);
  } catch (error) {
    console.error('[OfflineQueue] Error getting queue for user:', error);
    return [];
  }
}

/**
 * Get queued items for current logged-in user
 * @returns Array of queue items for current user
 */
export async function getQueueForCurrentUser(): Promise<QueueItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[OfflineQueue] No current user, returning empty queue');
    return [];
  }
  return getQueueForUser(userId);
}

/**
 * Add item to queue with current user ID
 * @param type - Queue item type
 * @param data - Item data to sync
 * @returns Queue item ID
 */
export async function addToQueue(
  type: QueueItemType,
  data: any,
): Promise<string> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    const newItem: QueueItem = {
      id: uuid.v4() as string,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      user_id: userId || undefined,
    };

    items.push(newItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));

    console.debug(`[OfflineQueue] Added ${type} to queue:`, newItem.id, userId ? `(user: ${userId})` : '(no user)');
    return newItem.id;
  } catch (error) {
    console.error('[OfflineQueue] Error adding to queue:', error);
    throw error;
  }
}

/**
 * Update queue item
 * @param id - Queue item ID
 * @param updates - Partial updates to apply
 */
export async function updateQueueItem(
  id: string,
  updates: Partial<QueueItem>,
): Promise<void> {
  try {
    const items = await getQueuedItems();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      console.warn('[OfflineQueue] Item not found:', id);
      return;
    }

    items[index] = { ...items[index], ...updates };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));

    console.debug(`[OfflineQueue] Updated item ${id}:`, updates);
  } catch (error) {
    console.error('[OfflineQueue] Error updating queue item:', error);
    throw error;
  }
}

/**
 * Remove item from queue
 * @param id - Queue item ID
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const items = await getQueuedItems();
    const filteredItems = items.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filteredItems));

    console.debug('[OfflineQueue] Removed item from queue:', id);
  } catch (error) {
    console.error('[OfflineQueue] Error removing from queue:', error);
    throw error;
  }
}

/**
 * Get queue items by type
 * @param type - Queue item type to filter
 * @returns Filtered queue items
 */
export async function getQueueByType(
  type: QueueItemType,
): Promise<QueueItem[]> {
  try {
    const items = await getQueuedItems();
    return items.filter(item => item.type === type);
  } catch (error) {
    console.error('[OfflineQueue] Error getting queue by type:', error);
    return [];
  }
}

/**
 * Get pending items count for current user
 * @returns Count of pending items
 */
export async function getPendingCount(): Promise<number> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    return items.filter(
      item => item.status === 'pending' && (userId ? item.user_id === userId : true)
    ).length;
  } catch (error) {
    console.error('[OfflineQueue] Error getting pending count:', error);
    return 0;
  }
}

/**
 * Get failed items count for current user
 * @returns Count of failed items
 */
export async function getFailedCount(): Promise<number> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    return items.filter(
      item => item.status === 'failed' && (userId ? item.user_id === userId : true)
    ).length;
  } catch (error) {
    console.error('[OfflineQueue] Error getting failed count:', error);
    return 0;
  }
}

/**
 * Get pending items count by type for current user
 * @returns Object with counts per type
 */
export async function getPendingCountsByType(): Promise<{
  'clock-in': number;
  'clock-out': number;
  activity: number;
  location: number;
}> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    const pendingItems = items.filter(
      item => item.status === 'pending' && (userId ? item.user_id === userId : true)
    );

    return {
      'clock-in': pendingItems.filter(item => item.type === 'clock-in').length,
      'clock-out': pendingItems.filter(item => item.type === 'clock-out')
        .length,
      activity: pendingItems.filter(item => item.type === 'activity').length,
      location: pendingItems.filter(item => item.type === 'location').length,
    };
  } catch (error) {
    console.error('[OfflineQueue] Error getting pending counts by type:', error);
    return {
      'clock-in': 0,
      'clock-out': 0,
      activity: 0,
      location: 0,
    };
  }
}

/**
 * Get failed items for current user
 * @returns Array of failed queue items
 */
export async function getFailedItems(): Promise<QueueItem[]> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    return items.filter(
      item => item.status === 'failed' && (userId ? item.user_id === userId : true)
    );
  } catch (error) {
    console.error('[OfflineQueue] Error getting failed items:', error);
    return [];
  }
}

/**
 * Get orphaned items (items without user_id or from other users)
 * @returns Array of orphaned queue items
 */
export async function getOrphanedItems(): Promise<QueueItem[]> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();

    // Items without user_id are considered orphaned
    // Items from other users are also orphaned for current session
    return items.filter(
      item => !item.user_id || (userId && item.user_id !== userId)
    );
  } catch (error) {
    console.error('[OfflineQueue] Error getting orphaned items:', error);
    return [];
  }
}

/**
 * Clear queue for a specific user
 * @param userId - User ID to clear queue for
 */
export async function clearQueueForUser(userId: number): Promise<void> {
  try {
    const items = await getQueuedItems();
    const remainingItems = items.filter(item => item.user_id !== userId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingItems));

    const clearedCount = items.length - remainingItems.length;
    console.debug(`[OfflineQueue] Cleared ${clearedCount} items for user ${userId}`);
  } catch (error) {
    console.error('[OfflineQueue] Error clearing queue for user:', error);
    throw error;
  }
}

/**
 * Clear queue for current user
 */
export async function clearQueueForCurrentUser(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[OfflineQueue] No current user, cannot clear queue');
    return;
  }
  await clearQueueForUser(userId);
}

/**
 * Mark orphaned items as orphaned status (for migration)
 * Items without user_id will be marked as orphaned
 */
export async function migrateOrphanedItems(): Promise<number> {
  try {
    const items = await getQueuedItems();
    let migratedCount = 0;

    const updatedItems = items.map(item => {
      if (!item.user_id && item.status !== 'orphaned' && item.status !== 'success') {
        migratedCount++;
        return { ...item, status: 'orphaned' as QueueItemStatus };
      }
      return item;
    });

    if (migratedCount > 0) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedItems));
      console.debug(`[OfflineQueue] Migrated ${migratedCount} orphaned items`);
    }

    return migratedCount;
  } catch (error) {
    console.error('[OfflineQueue] Error migrating orphaned items:', error);
    return 0;
  }
}

/**
 * Clear failed items for current user
 */
export async function clearFailedItems(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    const remainingItems = items.filter(
      item => !(item.status === 'failed' && (userId ? item.user_id === userId : true))
    );
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingItems));

    const clearedCount = items.length - remainingItems.length;
    console.debug(`[OfflineQueue] Cleared ${clearedCount} failed items`);
  } catch (error) {
    console.error('[OfflineQueue] Error clearing failed items:', error);
    throw error;
  }
}

/**
 * Clear orphaned items
 */
export async function clearOrphanedItems(): Promise<void> {
  try {
    const items = await getQueuedItems();
    const remainingItems = items.filter(item => item.user_id && item.status !== 'orphaned');
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingItems));

    const clearedCount = items.length - remainingItems.length;
    console.debug(`[OfflineQueue] Cleared ${clearedCount} orphaned items`);
  } catch (error) {
    console.error('[OfflineQueue] Error clearing orphaned items:', error);
    throw error;
  }
}

/**
 * Clear all items from queue
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.debug('[OfflineQueue] Queue cleared');
  } catch (error) {
    console.error('[OfflineQueue] Error clearing queue:', error);
    throw error;
  }
}

/**
 * Remove all successfully synced items
 */
export async function clearSyncedItems(): Promise<void> {
  try {
    const items = await getQueuedItems();
    const unsynced = items.filter(item => item.status !== 'success');
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(unsynced));

    console.debug('[OfflineQueue] Cleared synced items');
  } catch (error) {
    console.error('[OfflineQueue] Error clearing synced items:', error);
    throw error;
  }
}

/**
 * Retry failed items for current user
 * Resets status to pending and clears error
 */
export async function retryFailedItems(): Promise<number> {
  try {
    const userId = await getCurrentUserId();
    const items = await getQueuedItems();
    let retriedCount = 0;

    const updatedItems = items.map(item => {
      if (
        item.status === 'failed' &&
        (userId ? item.user_id === userId : true)
      ) {
        retriedCount++;
        return {
          ...item,
          status: 'pending' as QueueItemStatus,
          retryCount: 0,
          error: undefined,
        };
      }
      return item;
    });

    if (retriedCount > 0) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedItems));
      console.debug(`[OfflineQueue] Reset ${retriedCount} failed items to pending`);
    }

    return retriedCount;
  } catch (error) {
    console.error('[OfflineQueue] Error retrying failed items:', error);
    return 0;
  }
}
