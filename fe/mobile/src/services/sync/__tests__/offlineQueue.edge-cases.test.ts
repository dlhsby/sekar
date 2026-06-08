/**
 * Offline Queue Edge Cases Tests
 * Comprehensive tests for storage failures, queue corruption,
 * concurrent operations, and edge cases to achieve 80%+ coverage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as offlineQueue from '../offlineQueue';
import * as secureStorage from '../../storage/secureStorage';
import type { QueueItem } from '../offlineQueue';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock secure storage
jest.mock('../../storage/secureStorage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

describe('Offline Queue - Edge Cases & Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);

    // Default: user is logged in
    mockSecureStorage.getUser.mockResolvedValue({
      id: 'user-1',
      username: 'test-user',
      full_name: 'Test User',
      role: 'satgas',
      rayon_id: 'rayon-1',
    });
  });

  describe('Storage Failure Scenarios', () => {
    it('should handle AsyncStorage getItem failure gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage read error'));

      const items = await offlineQueue.getQueuedItems();

      expect(items).toEqual([]);
    });

    it('should throw on AsyncStorage setItem failure when adding to queue', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(
        offlineQueue.addToQueue('clock-in', { test: 'data' })
      ).rejects.toThrow('Storage full');
    });

    it('should throw on AsyncStorage setItem failure when updating queue item', async () => {
      const existingItems: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: { test: 'data' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingItems));
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage write error'));

      await expect(
        offlineQueue.updateQueueItem('item-1', { status: 'syncing' })
      ).rejects.toThrow('Storage write error');
    });

    it('should throw on AsyncStorage removeItem failure when clearing queue', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(offlineQueue.clearQueue()).rejects.toThrow('Storage error');
    });

    it('should handle getQueueForUser with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const items = await offlineQueue.getQueueForUser('1');

      expect(items).toEqual([]);
    });

    it('should handle getQueueForCurrentUser with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const items = await offlineQueue.getQueueForCurrentUser();

      expect(items).toEqual([]);
    });

    it('should handle getQueueByType with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const items = await offlineQueue.getQueueByType('clock-in');

      expect(items).toEqual([]);
    });

    it('should handle getPendingCount with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const count = await offlineQueue.getPendingCount();

      expect(count).toBe(0);
    });

    it('should handle getFailedCount with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const count = await offlineQueue.getFailedCount();

      expect(count).toBe(0);
    });

    it('should handle getPendingCountsByType with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const counts = await offlineQueue.getPendingCountsByType();

      expect(counts).toEqual({
        'clock-in': 0,
        'clock-out': 0,
        activity: 0,
        location: 0,
      });
    });

    it('should handle getFailedItems with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const items = await offlineQueue.getFailedItems();

      expect(items).toEqual([]);
    });

    it('should handle getOrphanedItems with storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const items = await offlineQueue.getOrphanedItems();

      expect(items).toEqual([]);
    });

    it('should throw on clearQueueForUser storage error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(offlineQueue.clearQueueForUser('1')).rejects.toThrow('Storage error');
    });

    it('should handle clearQueueForCurrentUser with no user', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      await offlineQueue.clearQueueForCurrentUser();

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should throw on clearFailedItems storage error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(offlineQueue.clearFailedItems()).rejects.toThrow('Storage error');
    });

    it('should throw on clearOrphanedItems storage error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(offlineQueue.clearOrphanedItems()).rejects.toThrow('Storage error');
    });

    it('should throw on clearSyncedItems storage error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(offlineQueue.clearSyncedItems()).rejects.toThrow('Storage error');
    });

    it('should handle migrateOrphanedItems storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(0);
    });

    it('should handle retryFailedItems storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const count = await offlineQueue.retryFailedItems();

      expect(count).toBe(0);
    });
  });

  describe('Queue Corruption Recovery', () => {
    it('should recover from corrupted JSON data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json{');

      const items = await offlineQueue.getQueuedItems();

      expect(items).toEqual([]);
    });

    it('should recover from non-array JSON data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('{"not": "an array"}');

      const items = await offlineQueue.getQueuedItems();

      // JSON.parse will succeed, but type casting to QueueItem[] will just return the object
      expect(items).toBeDefined();
    });

    it('should handle malformed queue items', async () => {
      const malformedData = JSON.stringify([
        { id: 'valid', type: 'clock-in', data: {}, timestamp: Date.now(), retryCount: 0, status: 'pending' },
        null, // Malformed
        { id: 'also-valid', type: 'activity', data: {}, timestamp: Date.now(), retryCount: 0, status: 'pending' },
      ]);

      mockAsyncStorage.getItem.mockResolvedValue(malformedData);

      const items = await offlineQueue.getQueuedItems();

      expect(items).toHaveLength(3); // Returns all, even null
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent addToQueue calls', async () => {
      let callCount = 0;
      mockAsyncStorage.getItem.mockImplementation(async () => {
        // Simulate race condition - return different data on each call
        const existing = callCount > 0 ? [{
          id: 'existing-item',
          type: 'clock-in' as const,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending' as const,
          user_id: 'user-1',
        }] : [];
        callCount++;
        return JSON.stringify(existing);
      });

      const promises = [
        offlineQueue.addToQueue('clock-in', { data: 1 }),
        offlineQueue.addToQueue('activity', { data: 2 }),
        offlineQueue.addToQueue('location', { data: 3 }),
      ];

      const ids = await Promise.all(promises);

      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // All unique IDs
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent updateQueueItem calls', async () => {
      const existingItems: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingItems));

      const promises = [
        offlineQueue.updateQueueItem('item-1', { status: 'syncing', retryCount: 1 }),
        offlineQueue.updateQueueItem('item-2', { status: 'syncing', retryCount: 1 }),
      ];

      await Promise.all(promises);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent removeFromQueue calls', async () => {
      const existingItems: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingItems));

      const promises = [
        offlineQueue.removeFromQueue('item-1'),
        offlineQueue.removeFromQueue('item-2'),
      ];

      await Promise.all(promises);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Scoping Edge Cases', () => {
    it('should handle getCurrentUserId with no user', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      const items = await offlineQueue.getQueueForCurrentUser();

      expect(items).toEqual([]);
    });

    it('should handle getCurrentUserId with error', async () => {
      mockSecureStorage.getUser.mockRejectedValue(new Error('User fetch error'));

      const items = await offlineQueue.getQueueForCurrentUser();

      expect(items).toEqual([]);
    });

    it('should add item without user_id when no user logged in', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      const id = await offlineQueue.addToQueue('clock-in', { test: 'data' });

      expect(id).toBeDefined();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].user_id).toBeUndefined();
    });

    it('should filter getPendingCount by user', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-2',
        },
        {
          id: 'item-3',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));
      mockSecureStorage.getUser.mockResolvedValue({
        id: 'user-1',
        username: 'user1',
        full_name: 'User 1',
        role: 'satgas',
        rayon_id: 'rayon-1',
      });

      const count = await offlineQueue.getPendingCount();

      expect(count).toBe(2); // Only user 1's items
    });

    it('should filter getFailedCount by user', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          user_id: 'user-2',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));
      mockSecureStorage.getUser.mockResolvedValue({
        id: 'user-1',
        username: 'user1',
        full_name: 'User 1',
        role: 'satgas',
        rayon_id: 'rayon-1',
      });

      const count = await offlineQueue.getFailedCount();

      expect(count).toBe(1); // Only user 1's items
    });

    it('should identify orphaned items correctly', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1', // Current user
        },
        {
          id: 'item-2',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-2', // Different user - orphaned
        },
        {
          id: 'item-3',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          // No user_id - orphaned
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));
      mockSecureStorage.getUser.mockResolvedValue({
        id: 'user-1',
        username: 'user1',
        full_name: 'User 1',
        role: 'satgas',
        rayon_id: 'rayon-1',
      });

      const orphanedItems = await offlineQueue.getOrphanedItems();

      expect(orphanedItems).toHaveLength(2);
      expect(orphanedItems.map(i => i.id)).toEqual(['item-2', 'item-3']);
    });

    it('should migrate orphaned items correctly', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          // No user_id - should be migrated
        },
        {
          id: 'item-2',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'success',
          // No user_id but success - should NOT be migrated
        },
        {
          id: 'item-3',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'orphaned',
          // Already orphaned - should NOT be migrated again
        },
        {
          id: 'item-4',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1', // Has user - should NOT be migrated
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(1); // Only item-1
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].status).toBe('orphaned'); // item-1 migrated
      expect(savedData[1].status).toBe('success'); // item-2 unchanged
      expect(savedData[2].status).toBe('orphaned'); // item-3 unchanged
      expect(savedData[3].status).toBe('pending'); // item-4 unchanged
    });

    it('should not migrate when no orphaned items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(0);
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Item Update Edge Cases', () => {
    it('should handle updateQueueItem for non-existent item', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      await offlineQueue.updateQueueItem('non-existent', { status: 'syncing' });

      // Should not update storage
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should throw on removeFromQueue storage error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(offlineQueue.removeFromQueue('item-1')).rejects.toThrow('Storage error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed items for current user', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 2,
          status: 'failed',
          error: 'Network error',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          error: 'Server error',
          user_id: 'user-2', // Different user
        },
        {
          id: 'item-3',
          type: 'clock-out',
          data: {},
          timestamp: Date.now(),
          retryCount: 1,
          status: 'pending', // Not failed
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));
      mockSecureStorage.getUser.mockResolvedValue({
        id: 'user-1',
        username: 'user1',
        full_name: 'User 1',
        role: 'satgas',
        rayon_id: 'rayon-1',
      });

      const count = await offlineQueue.retryFailedItems();

      expect(count).toBe(1); // Only item-1
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].status).toBe('pending');
      expect(savedData[0].retryCount).toBe(0);
      expect(savedData[0].error).toBeUndefined();
    });

    it('should not retry when no failed items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      const count = await offlineQueue.retryFailedItems();

      expect(count).toBe(0);
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Clear Operations Edge Cases', () => {
    it('should clear only user queue items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-2',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      await offlineQueue.clearQueueForUser('user-1');

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('item-2');
    });

    it('should clear only failed items for current user', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
        {
          id: 'item-3',
          type: 'clock-out',
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          user_id: 'user-2',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      await offlineQueue.clearFailedItems();

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(savedData.map((i: QueueItem) => i.id)).toEqual(['item-2', 'item-3']);
    });

    it('should clear only orphaned items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1', // Has user_id and not orphaned status
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'orphaned',
          // No user_id - will be cleared
        },
        {
          id: 'item-3',
          type: 'clock-out',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          // No user_id - will be cleared
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      await offlineQueue.clearOrphanedItems();

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('item-1');
    });

    it('should clear only successfully synced items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'success',
          user_id: 'user-1',
        },
        {
          id: 'item-2',
          type: 'activity',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
        {
          id: 'item-3',
          type: 'clock-out',
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          user_id: 'user-1',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(items));

      await offlineQueue.clearSyncedItems();

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(savedData.map((i: QueueItem) => i.id)).toEqual(['item-2', 'item-3']);
    });
  });
});
