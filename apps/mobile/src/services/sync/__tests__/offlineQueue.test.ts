/**
 * Offline Queue Tests
 * Unit tests for AsyncStorage-based queue management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getQueuedItems,
  addToQueue,
  updateQueueItem,
  removeFromQueue,
  getQueueByType,
  getPendingCount,
  getPendingCountsByType,
  clearQueue,
  clearSyncedItems,
  getFailedCount,
  getFailedItems,
  clearFailedItems,
  retryFailedItems,
  getQueueForUser,
  clearQueueForUser,
} from '../offlineQueue';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock uuid
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

// Mock secureStorage
jest.mock('../../storage/secureStorage', () => ({
  getUser: jest.fn(() => Promise.resolve({ id: 1, username: 'testuser' })),
}));

describe('offlineQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueuedItems', () => {
    it('should return empty array when no items exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const items = await getQueuedItems();

      expect(items).toEqual([]);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('OFFLINE_QUEUE');
    });

    it('should return parsed items from AsyncStorage', async () => {
      const mockItems = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockItems));

      const items = await getQueuedItems();

      expect(items).toEqual(mockItems);
    });

    it('should return empty array on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const items = await getQueuedItems();

      expect(items).toEqual([]);
    });
  });

  describe('addToQueue', () => {
    it('should add new item to empty queue', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const id = await addToQueue('clock-in', { location_id: 1 });

      expect(id).toBe('test-uuid-123');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'OFFLINE_QUEUE',
        expect.stringContaining('test-uuid-123'),
      );
    });

    it('should add item with correct structure including user_id', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const mockData = { location_id: 1, gps_lat: -7.25, gps_lng: 112.75 };
      await addToQueue('clock-in', mockData);

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        id: 'test-uuid-123',
        type: 'clock-in',
        data: mockData,
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      });
      expect(savedData[0].timestamp).toBeDefined();
    });

    it('should append to existing queue', async () => {
      const existingItems = [
        { id: '1', type: 'activity', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingItems));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await addToQueue('location', { pings: [] });

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
    });

    it('should throw error when storage fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(addToQueue('clock-in', {})).rejects.toThrow('Storage error');
    });
  });

  describe('updateQueueItem', () => {
    it('should update existing item', async () => {
      const items = [
        { id: 'item-1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
        { id: 'item-2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await updateQueueItem('item-1', { status: 'syncing', retryCount: 1 });

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData[0]).toMatchObject({
        id: 'item-1',
        status: 'syncing',
        retryCount: 1,
      });
      expect(savedData[1]).toMatchObject({ id: 'item-2' }); // Unchanged
    });

    it('should handle non-existent item gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await updateQueueItem('non-existent', { status: 'failed' });

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeFromQueue', () => {
    it('should remove item from queue', async () => {
      const items = [
        { id: 'item-1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
        { id: 'item-2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await removeFromQueue('item-1');

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('item-2');
    });

    it('should handle non-existent item', async () => {
      const items = [
        { id: 'item-1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await removeFromQueue('non-existent');

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1); // Unchanged
    });
  });

  describe('getQueueByType', () => {
    it('should filter items by type', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending' },
        { id: '3', type: 'clock-in', data: {}, timestamp: 125, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const clockInItems = await getQueueByType('clock-in');

      expect(clockInItems).toHaveLength(2);
      expect(clockInItems[0].type).toBe('clock-in');
      expect(clockInItems[1].type).toBe('clock-in');
    });

    it('should return empty array when no items match', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const locationItems = await getQueueByType('location');

      expect(locationItems).toEqual([]);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending items for current user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'syncing', user_id: 1 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '4', type: 'activity', data: {}, timestamp: 126, retryCount: 0, status: 'success', user_id: 1 },
        { id: '5', type: 'activity', data: {}, timestamp: 127, retryCount: 0, status: 'pending', user_id: 2 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const count = await getPendingCount();

      expect(count).toBe(2); // Only pending items for user_id: 1
    });

    it('should return 0 when no items exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const count = await getPendingCount();

      expect(count).toBe(0);
    });
  });

  describe('getPendingCountsByType', () => {
    it('should return counts grouped by type for current user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '2', type: 'clock-in', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '3', type: 'activity', data: {}, timestamp: 125, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '4', type: 'location', data: {}, timestamp: 126, retryCount: 0, status: 'syncing', user_id: 1 },
        { id: '5', type: 'clock-out', data: {}, timestamp: 127, retryCount: 0, status: 'success', user_id: 1 },
        { id: '6', type: 'clock-in', data: {}, timestamp: 128, retryCount: 0, status: 'pending', user_id: 2 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const counts = await getPendingCountsByType();

      expect(counts).toEqual({
        'clock-in': 2,
        'clock-out': 0,
        activity: 1,
        location: 0,
      });
    });
  });

  describe('getFailedCount', () => {
    it('should return count of failed items for current user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 3, status: 'failed', user_id: 1 },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 3, status: 'failed', user_id: 1 },
        { id: '4', type: 'activity', data: {}, timestamp: 126, retryCount: 3, status: 'failed', user_id: 2 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const count = await getFailedCount();

      expect(count).toBe(2); // Only failed items for user_id: 1
    });
  });

  describe('getFailedItems', () => {
    it('should return failed items for current user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 3, status: 'failed', user_id: 1 },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 3, status: 'failed', user_id: 2 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const failedItems = await getFailedItems();

      expect(failedItems).toHaveLength(1);
      expect(failedItems[0].id).toBe('1');
    });
  });

  describe('clearFailedItems', () => {
    it('should remove failed items for current user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 3, status: 'failed', user_id: 1 },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 3, status: 'failed', user_id: 2 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await clearFailedItems();

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(savedData.find((item: any) => item.id === '2')).toBeDefined();
      expect(savedData.find((item: any) => item.id === '3')).toBeDefined();
    });
  });

  describe('retryFailedItems', () => {
    it('should reset failed items to pending for current user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 3, status: 'failed', user_id: 1, error: 'Network error' },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 3, status: 'failed', user_id: 2 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const count = await retryFailedItems();

      expect(count).toBe(1);
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      const retriedItem = savedData.find((item: any) => item.id === '1');
      expect(retriedItem.status).toBe('pending');
      expect(retriedItem.retryCount).toBe(0);
      expect(retriedItem.error).toBeUndefined();
    });
  });

  describe('getQueueForUser', () => {
    it('should return items for specific user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 2 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 0, status: 'pending', user_id: 1 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));

      const userItems = await getQueueForUser(1 as unknown as string);

      expect(userItems).toHaveLength(2);
      expect(userItems.every(item => (item.user_id as unknown as number) === 1)).toBe(true);
    });
  });

  describe('clearQueueForUser', () => {
    it('should remove items for specific user', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending', user_id: 1 },
        { id: '2', type: 'activity', data: {}, timestamp: 124, retryCount: 0, status: 'pending', user_id: 2 },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 0, status: 'pending', user_id: 1 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await clearQueueForUser(1 as unknown as string);

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].user_id).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('should remove queue from storage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearQueue();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('OFFLINE_QUEUE');
    });
  });

  describe('clearSyncedItems', () => {
    it('should remove only successfully synced items', async () => {
      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'success' },
        { id: '2', type: 'report', data: {}, timestamp: 124, retryCount: 0, status: 'pending' },
        { id: '3', type: 'location', data: {}, timestamp: 125, retryCount: 0, status: 'success' },
        { id: '4', type: 'report', data: {}, timestamp: 126, retryCount: 0, status: 'failed' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(items));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await clearSyncedItems();

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(savedData.find((item: any) => item.id === '2')).toBeDefined();
      expect(savedData.find((item: any) => item.id === '4')).toBeDefined();
    });
  });
});
