/**
 * Offline Queue Simplified Tests
 * Tests for uncovered scenarios without complex mocking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as offlineQueue from '../offlineQueue';
import * as secureStorage from '../../storage/secureStorage';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock secure storage
jest.mock('../../storage/secureStorage');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

describe('offlineQueue - Uncovered Scenarios', () => {
  // In-memory storage for AsyncStorage mock
  let asyncStorageData: { [key: string]: string } = {};

  beforeEach(async () => {
    // Reset in-memory storage
    asyncStorageData = {};

    // Setup AsyncStorage mock to use in-memory storage
    (AsyncStorage.getItem as jest.Mock) = jest.fn((key: string) =>
      Promise.resolve(asyncStorageData[key] || null)
    );
    (AsyncStorage.setItem as jest.Mock) = jest.fn((key: string, value: string) => {
      asyncStorageData[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.removeItem as jest.Mock) = jest.fn((key: string) => {
      delete asyncStorageData[key];
      return Promise.resolve();
    });
    (AsyncStorage.clear as jest.Mock) = jest.fn(() => {
      asyncStorageData = {};
      return Promise.resolve();
    });

    jest.clearAllMocks();
  });

  describe('Orphaned Items', () => {
    it('should identify items without user_id as orphaned', async () => {
      mockSecureStorage.getUser.mockResolvedValue({ id: 1 } as any);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: 1 },
          { id: '2', type: 'report', status: 'pending', user_id: undefined },
          { id: '3', type: 'location', status: 'pending' },
        ])
      );

      const orphaned = await offlineQueue.getOrphanedItems();

      expect(orphaned).toHaveLength(2);
      expect(orphaned.map((i) => i.id).sort()).toEqual(['2', '3']);
    });

    it('should identify items from other users as orphaned', async () => {
      mockSecureStorage.getUser.mockResolvedValue({ id: 1 } as any);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: 1 },
          { id: '2', type: 'report', status: 'pending', user_id: 2 },
          { id: '3', type: 'location', status: 'pending', user_id: 3 },
        ])
      );

      const orphaned = await offlineQueue.getOrphanedItems();

      expect(orphaned).toHaveLength(2);
      expect(orphaned.map((i) => i.id).sort()).toEqual(['2', '3']);
    });
  });

  describe('User-Specific Operations', () => {
    it('should get queue for specific user', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: 5 },
          { id: '2', type: 'report', status: 'pending', user_id: 10 },
        ])
      );

      const items = await offlineQueue.getQueueForUser(5);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('1');
    });

    it('should clear queue for specific user', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: 1 },
          { id: '2', type: 'report', status: 'pending', user_id: 2 },
          { id: '3', type: 'location', status: 'pending', user_id: 1 },
        ])
      );

      await offlineQueue.clearQueueForUser(1);

      const remaining = await offlineQueue.getQueuedItems();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].user_id).toBe(2);
    });

    it('should handle clearQueueForCurrentUser when no user', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      await offlineQueue.clearQueueForCurrentUser();

      // Should not throw
    });

    it('should clear items for current user', async () => {
      mockSecureStorage.getUser.mockResolvedValue({ id: 5 } as any);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: 5 },
          { id: '2', type: 'report', status: 'pending', user_id: 10 },
        ])
      );

      await offlineQueue.clearQueueForCurrentUser();

      const remaining = await offlineQueue.getQueuedItems();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].user_id).toBe(10);
    });
  });

  describe('Orphaned Migration', () => {
    it('should mark items without user_id as orphaned', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: undefined },
          { id: '2', type: 'report', status: 'pending', user_id: 1 },
          { id: '3', type: 'location', status: 'failed' },
        ])
      );

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(2);

      const items = await offlineQueue.getQueuedItems();
      const orphaned = items.filter((i) => i.status === 'orphaned');
      expect(orphaned).toHaveLength(2);
    });

    it('should not mark already orphaned items', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'orphaned', user_id: undefined },
          { id: '2', type: 'report', status: 'pending', user_id: undefined },
        ])
      );

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(1); // Only item 2
    });

    it('should not mark success items as orphaned', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'success', user_id: undefined },
          { id: '2', type: 'report', status: 'pending', user_id: undefined },
        ])
      );

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(1); // Only item 2

      const items = await offlineQueue.getQueuedItems();
      expect(items.find((i) => i.id === '1')?.status).toBe('success');
    });

    it('should return 0 when no items to migrate', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([{ id: '1', type: 'clock-in', status: 'pending', user_id: 1 }])
      );

      const count = await offlineQueue.migrateOrphanedItems();

      expect(count).toBe(0);
    });
  });

  describe('Clear Operations', () => {
    it('should remove orphaned items', async () => {
      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: 1 },
          { id: '2', type: 'report', status: 'pending', user_id: undefined },
          { id: '3', type: 'location', status: 'orphaned', user_id: 2 },
        ])
      );

      await offlineQueue.clearOrphanedItems();

      const remaining = await offlineQueue.getQueuedItems();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('1');
    });
  });

  describe('No User Scenarios', () => {
    it('should count pending items when no user logged in', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: undefined },
          { id: '2', type: 'report', status: 'failed', user_id: undefined },
        ])
      );

      const count = await offlineQueue.getPendingCount();

      expect(count).toBe(1);
    });

    it('should count failed items when no user logged in', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: undefined },
          { id: '2', type: 'report', status: 'failed', user_id: undefined },
          { id: '3', type: 'location', status: 'failed', user_id: undefined },
        ])
      );

      const count = await offlineQueue.getFailedCount();

      expect(count).toBe(2);
    });

    it('should count by type when no user logged in', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: undefined },
          { id: '2', type: 'clock-out', status: 'pending', user_id: undefined },
          { id: '3', type: 'report', status: 'pending', user_id: undefined },
          { id: '4', type: 'location', status: 'pending', user_id: undefined },
          { id: '5', type: 'report', status: 'failed', user_id: undefined },
        ])
      );

      const counts = await offlineQueue.getPendingCountsByType();

      expect(counts).toEqual({
        'clock-in': 1,
        'clock-out': 1,
        report: 1,
        location: 1,
      });
    });

    it('should get failed items when no user logged in', async () => {
      mockSecureStorage.getUser.mockResolvedValue(null);

      await AsyncStorage.setItem(
        'OFFLINE_QUEUE',
        JSON.stringify([
          { id: '1', type: 'clock-in', status: 'pending', user_id: undefined },
          { id: '2', type: 'report', status: 'failed', user_id: undefined },
        ])
      );

      const items = await offlineQueue.getFailedItems();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('2');
    });
  });
});
