/**
 * Offline Sync Integration Tests
 * Tests offline queue management and synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addToQueue,
  getQueuedItems,
  clearQueue,
  removeFromQueue,
  updateQueueItem,
  getPendingCount,
  getFailedCount,
  QueueItem,
  QueueItemType,
} from '../../services/sync/offlineQueue';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock secure storage for user ID
jest.mock('../../services/storage/secureStorage', () => ({
  getUser: jest.fn().mockResolvedValue({ id: 1, username: 'testuser' }),
}));

// Mock API client
jest.mock('../../services/api/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Offline Sync Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Queue persistence', () => {
    it('should save queue to AsyncStorage when action is added', async () => {
      const item: Omit<QueueItem, 'id' | 'status'> = {
        type: 'clock-in' as QueueItemType,
        data: { latitude: -7.257472, longitude: 112.75209 },
        timestamp: Date.now(),
        retryCount: 0,
      };

      await addToQueue(item.type, item.data);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'OFFLINE_QUEUE',
        expect.any(String)
      );
    });

    it('should load queue from AsyncStorage', async () => {
      const storedQueue: QueueItem[] = [
        {
          id: 'stored-1',
          type: 'activity' as QueueItemType,
          data: { reportText: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedQueue)
      );

      const queue = await getQueuedItems();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('OFFLINE_QUEUE');
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('stored-1');
    });

    it('should handle corrupted queue data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');

      const queue = await getQueuedItems();

      expect(queue).toEqual([]);
    });

    it('should clear queue from AsyncStorage', async () => {
      await clearQueue();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('OFFLINE_QUEUE');
    });
  });

  describe('Retry mechanism', () => {
    it('should increment retry count on update', async () => {
      const storedQueue: QueueItem[] = [
        {
          id: 'retry-test',
          type: 'activity' as QueueItemType,
          data: { reportText: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedQueue)
      );

      await updateQueueItem('retry-test', { retryCount: 1 });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedQueue = JSON.parse(savedData);
      expect(savedQueue[0].retryCount).toBe(1);
    });
  });

  describe('Queue ordering', () => {
    it('should maintain order when adding items', async () => {
      // Start with empty queue
      let currentQueue: QueueItem[] = [];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
        Promise.resolve(JSON.stringify(currentQueue))
      );

      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        currentQueue = JSON.parse(value);
        return Promise.resolve();
      });

      await addToQueue('clock-in', { location: 'test1' });
      await addToQueue('report', { data: 'test2' });
      await addToQueue('clock-out', { location: 'test3' });

      const queue = await getQueuedItems();
      expect(queue).toHaveLength(3);
      expect(queue[0].type).toBe('clock-in');
      expect(queue[1].type).toBe('report');
      expect(queue[2].type).toBe('clock-out');
    });
  });

  describe('Queue counting', () => {
    it('should count pending items correctly', async () => {
      const storedQueue: QueueItem[] = [
        {
          id: 'pending-1',
          type: 'activity' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
        {
          id: 'pending-2',
          type: 'location' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
        {
          id: 'syncing-1',
          type: 'clock-in' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'syncing',
          user_id: 1,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedQueue)
      );

      const count = await getPendingCount();
      expect(count).toBe(2);
    });

    it('should count failed items correctly', async () => {
      const storedQueue: QueueItem[] = [
        {
          id: 'failed-1',
          type: 'activity' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 3,
          status: 'failed',
          error: 'Network error',
          user_id: 1,
        },
        {
          id: 'pending-1',
          type: 'location' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedQueue)
      );

      const count = await getFailedCount();
      expect(count).toBe(1);
    });
  });

  describe('Remove from queue', () => {
    it('should remove item by id', async () => {
      const storedQueue: QueueItem[] = [
        {
          id: 'remove-1',
          type: 'activity' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
        {
          id: 'keep-1',
          type: 'location' as QueueItemType,
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedQueue)
      );

      await removeFromQueue('remove-1');

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedQueue = JSON.parse(savedData);
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].id).toBe('keep-1');
    });
  });

  describe('Error recovery', () => {
    it('should throw if AsyncStorage fails on add', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage full')
      );

      // Should throw with storage error
      await expect(addToQueue('report', { test: true })).rejects.toThrow('Storage full');
    });

    it('should return empty array if AsyncStorage fails on get', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const queue = await getQueuedItems();
      expect(queue).toEqual([]);
    });
  });

  describe('Data integrity', () => {
    it('should preserve action data through save/load cycle', async () => {
      const testData = {
        reportText: 'Test report with Indonesian: Laporan kebersihan',
        photos: ['photo1.jpg', 'photo2.jpg'],
        metadata: {
          location: { lat: -7.257472, lng: 112.75209 },
          timestamp: '2026-01-22T10:00:00Z',
        },
      };

      let savedQueue: QueueItem[] = [];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
        Promise.resolve(JSON.stringify(savedQueue))
      );

      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        savedQueue = JSON.parse(value);
        return Promise.resolve();
      });

      await addToQueue('report', testData);

      const queue = await getQueuedItems();
      expect(queue[0].data).toEqual(testData);
    });

    it('should handle special characters in action data', async () => {
      const testData = {
        reportText: 'Special chars: !@#$%^&*()_+-={}[]|:;"<>?,./~`',
        emoji: '😊🌳🏞️',
      };

      let savedQueue: QueueItem[] = [];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
        Promise.resolve(JSON.stringify(savedQueue))
      );

      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        savedQueue = JSON.parse(value);
        return Promise.resolve();
      });

      await addToQueue('report', testData);

      const queue = await getQueuedItems();
      expect(queue[0].data).toEqual(testData);
    });
  });
});
