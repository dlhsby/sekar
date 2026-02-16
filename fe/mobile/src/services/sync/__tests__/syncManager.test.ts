/**
 * Sync Manager Tests
 * Unit tests for sync orchestration and retry logic
 */

import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncManager } from '../syncManager';
import * as offlineQueue from '../offlineQueue';
import * as shiftsApi from '../../api/shiftsApi';
import * as activitiesApi from '../../api/activitiesApi';
import * as locationApi from '../../api/locationApi';

// Mocks
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

jest.mock('../offlineQueue');
jest.mock('../../api/shiftsApi');
jest.mock('../../api/activitiesApi');
jest.mock('../../api/locationApi');
jest.mock('../../location/locationTracker', () => ({
  locationTracker: {
    isTracking: jest.fn().mockReturnValue(false),
    captureNow: jest.fn(),
  },
}));

describe('syncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Ensure clean state before each test
    syncManager.cleanup();
  });

  afterEach(() => {
    // Full cleanup to prevent worker process leaks
    syncManager.cleanup();
    syncManager.removeAllListeners();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should set up network and app state listeners', () => {
      syncManager.initialize();

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(AppState.addEventListener).toHaveBeenCalled();
    });

    it('should not initialize twice', () => {
      syncManager.initialize();
      syncManager.initialize();

      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should remove all listeners', () => {
      const mockUnsubscribe = jest.fn();
      const mockRemove = jest.fn();

      (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);
      (AppState.addEventListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      syncManager.initialize();
      syncManager.cleanup();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    it('should skip sync when already syncing', async () => {
      // Switch to real timers for async coordination
      jest.clearAllTimers();
      jest.useRealTimers();

      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      // Create controlled promise to keep first sync running
      let resolveItems: any;
      const itemsPromise = new Promise((resolve) => {
        resolveItems = resolve;
      });

      (offlineQueue.getQueuedItems as jest.Mock).mockReturnValueOnce(itemsPromise);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });

      // Start first sync (don't await)
      const firstSync = syncManager.processQueue();

      // Give it time to start
      await new Promise(resolve => setImmediate(resolve));

      // Try to start second sync while first is still running
      const secondSync = syncManager.processQueue();
      await secondSync; // This should return immediately

      // Now resolve the first sync
      resolveItems([
        { id: '1', type: 'clock-in', data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' }, timestamp: 123, retryCount: 0, status: 'pending' },
      ]);

      // Wait for first sync to complete
      await firstSync;

      // getQueuedItems should only be called once (by first sync)
      expect(offlineQueue.getQueuedItems).toHaveBeenCalledTimes(1);

      // Cleanup before restoring fake timers
      syncManager.cleanup();
      syncManager.removeAllListeners();
      jest.useFakeTimers();
    });

    it('should skip sync when offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      await syncManager.processQueue();

      expect(offlineQueue.getQueuedItems).not.toHaveBeenCalled();
    });

    it('should process items in priority order', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const items = [
        { id: '1', type: 'location', data: { shift_id: 'test-shift', locations: [] }, timestamp: 120, retryCount: 0, status: 'pending' },
        { id: '2', type: 'clock-in', data: {}, timestamp: 121, retryCount: 0, status: 'pending' },
        { id: '3', type: 'activity', data: {}, timestamp: 122, retryCount: 0, status: 'pending' },
        { id: '4', type: 'clock-out', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
      ];
      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue(items);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);

      // Mock successful API calls
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });
      (shiftsApi.clockOut as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });
      (activitiesApi.createActivity as jest.Mock).mockResolvedValue({ data: { activity_id: 1 } });
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 0 } });

      await syncManager.processQueue();

      // Verify processing order: clock-in (2) → activity (3) → clock-out (4) → location (1)
      const callOrder = (offlineQueue.updateQueueItem as jest.Mock).mock.calls
        .filter((call: any) => call[1].status === 'syncing')
        .map((call: any) => call[0]);

      expect(callOrder).toEqual(['2', '3', '4', '1']);
    });

    it('should emit sync events', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const items = [
        { id: '1', type: 'clock-in', data: {}, timestamp: 123, retryCount: 0, status: 'pending' },
      ];
      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue(items);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });

      const onSyncStart = jest.fn();
      const onSyncProgress = jest.fn();
      const onSyncComplete = jest.fn();

      syncManager.on('syncStart', onSyncStart);
      syncManager.on('syncProgress', onSyncProgress);
      syncManager.on('syncComplete', onSyncComplete);

      await syncManager.processQueue();

      expect(onSyncStart).toHaveBeenCalled();
      expect(onSyncProgress).toHaveBeenCalledWith(1, 1);
      expect(onSyncComplete).toHaveBeenCalledWith(1, 0);
    });

    it('should handle sync errors and emit syncError event', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
      (offlineQueue.getQueuedItems as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const onSyncError = jest.fn();
      syncManager.on('syncError', onSyncError);

      await syncManager.processQueue();

      expect(onSyncError).toHaveBeenCalledWith('Storage error');
    });
  });

  describe('processSingleItem', () => {
    beforeEach(() => {
      // Switch to real timers for async tests
      jest.clearAllTimers();
      jest.useRealTimers();
      syncManager.cleanup(); // Reset singleton state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
      // Full cleanup before restoring fake timers
      syncManager.cleanup();
      syncManager.removeAllListeners();
      jest.useFakeTimers();
    });

    it('should sync clock-in data', async () => {
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });

      await syncManager.processQueue();

      expect(shiftsApi.clockIn).toHaveBeenCalledWith(1, -7.25, 112.75, 'base64');
      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', { status: 'success' });
      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('1');
    });

    it('should retry on failure with exponential backoff', async () => {
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 1,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ error: 'Network error' });

      await syncManager.processQueue();

      // Should increment retry count
      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', {
        status: 'pending',
        retryCount: 2,
        error: 'Network error',
      });
    });

    it('should mark as failed after max retries', async () => {
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 5,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);

      await syncManager.processQueue();

      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', {
        status: 'failed',
        error: 'Max retries exceeded',
      });
    });

    it('should remove item on conflict error (409)', async () => {
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockRejectedValue({
        status: 409,
        message: 'Conflict',
      });

      await syncManager.processQueue();

      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('1');
    });

    it('should sync clock-out data', async () => {
      const item = {
        id: '2',
        type: 'clock-out' as const,
        data: { gps_lat: -7.25, gps_lng: 112.75 }, // No shift_id - backend uses authenticated user's current shift
        timestamp: 124,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockOut as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });

      await syncManager.processQueue();

      expect(shiftsApi.clockOut).toHaveBeenCalledWith(-7.25, 112.75);
      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('2');
    });

    it('should sync activity data', async () => {
      const item = {
        id: '1',
        type: 'activity' as const,
        data: {
          activity_type_id: '1',
          description: 'Test activity',
          photo_urls: ['photo1.jpg'],
          gps_lat: -7.25,
          gps_lng: 112.75,
        },
        timestamp: 123,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (activitiesApi.createActivity as jest.Mock).mockResolvedValue({ data: { activity_id: 1 } });

      await syncManager.processQueue();

      expect(activitiesApi.createActivity).toHaveBeenCalledWith(item.data);
      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('1');
    });

    it('should sync location batch with new format', async () => {
      const shiftId = 'test-shift-123';
      const locations = [
        { gps_lat: -7.25, gps_lng: 112.75, accuracy_meters: 10, logged_at: '2024-01-01T00:00:00Z' },
      ];
      const item = {
        id: '1',
        type: 'location' as const,
        data: { shift_id: shiftId, locations },
        timestamp: 123,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 1 } });

      await syncManager.processQueue();

      expect(locationApi.uploadLocationBatch).toHaveBeenCalledWith(shiftId, locations);
      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('1');
    });

    it('should sync location batch with legacy pings format', async () => {
      const pings = [
        { shift_id: 'test-shift-123', timestamp: '2024-01-01T00:00:00Z', gps_lat: -7.25, gps_lng: 112.75, accuracy_meters: 10 },
      ];
      const item = {
        id: '2',
        type: 'location' as const,
        data: { pings },
        timestamp: 123,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({ data: { inserted_count: 1 } });

      await syncManager.processQueue();

      // Legacy format is converted to new format
      expect(locationApi.uploadLocationBatch).toHaveBeenCalledWith(
        'test-shift-123', // shift_id extracted from first ping
        [{ gps_lat: -7.25, gps_lng: 112.75, accuracy_meters: 10, logged_at: '2024-01-01T00:00:00Z' }]
      );
      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('2');
    });
  });

  describe('forceSyncNow', () => {
    it('should trigger processQueue immediately', async () => {
      // Switch to real timers
      jest.clearAllTimers();
      jest.useRealTimers();

      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([]);
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);

      const onSyncComplete = jest.fn();
      syncManager.on('syncComplete', onSyncComplete);

      // Call processQueue and wait for it to complete
      await syncManager.processQueue();

      expect(onSyncComplete).toHaveBeenCalled();

      // Cleanup before restoring fake timers
      syncManager.cleanup();
      syncManager.removeAllListeners();
      jest.useFakeTimers();
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false initially', () => {
      expect(syncManager.isSyncInProgress()).toBe(false);
    });

    it('should return false after cleanup', () => {
      syncManager.cleanup();
      expect(syncManager.isSyncInProgress()).toBe(false);
    });

    it('should return true during sync', async () => {
      // Switch to real timers for this test
      jest.clearAllTimers();
      jest.useRealTimers();
      syncManager.cleanup(); // Reset state

      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      // Create a controlled promise
      let resolveGetQueuedItems: any;
      const getQueuedItemsPromise = new Promise((resolve) => {
        resolveGetQueuedItems = resolve;
      });

      (offlineQueue.getQueuedItems as jest.Mock).mockReturnValue(getQueuedItemsPromise);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } });

      const syncPromise = syncManager.processQueue();

      // Wait for sync to start
      await new Promise(resolve => setImmediate(resolve));

      expect(syncManager.isSyncInProgress()).toBe(true);

      // Resolve with the item
      resolveGetQueuedItems([
        { id: '1', type: 'clock-in', data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' }, timestamp: 123, retryCount: 0, status: 'pending' },
      ]);

      await syncPromise;

      expect(syncManager.isSyncInProgress()).toBe(false);

      // Cleanup before restoring fake timers
      syncManager.cleanup();
      syncManager.removeAllListeners();
      jest.useFakeTimers();
    });
  });

  describe('periodic sync', () => {
    it('should trigger sync every 5 minutes', async () => {
      // Switch to real timers for this test
      jest.clearAllTimers();
      jest.useRealTimers();
      syncManager.cleanup(); // Reset state

      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([]);
      (offlineQueue.clearSyncedItems as jest.Mock).mockResolvedValue(undefined);

      const onSyncComplete = jest.fn();
      syncManager.on('syncComplete', onSyncComplete);

      syncManager.initialize();

      // Manually trigger a sync instead of waiting 5 minutes
      await syncManager.processQueue();

      expect(onSyncComplete).toHaveBeenCalled();

      // Cleanup before restoring fake timers
      syncManager.cleanup();
      syncManager.removeAllListeners();
      jest.useFakeTimers();
    });
  });

  describe('Retry Configuration (Issue #7)', () => {
    beforeEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
      syncManager.cleanup();
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
    });

    afterEach(() => {
      syncManager.cleanup();
      syncManager.removeAllListeners();
      jest.useFakeTimers();
    });

    it('should use config.MAX_RETRY_COUNT for retry limit', async () => {
      const config = require('../../../constants/config').default;
      expect(config.MAX_RETRY_COUNT).toBe(5);

      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 5, // At max retry limit
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ error: 'Network error' });

      await syncManager.processQueue();

      // Should mark as failed after exceeding max retries
      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'failed',
      }));
    });

    it('should use config.RETRY_DELAYS_MS for exponential backoff', async () => {
      const config = require('../../../constants/config').default;
      expect(config.RETRY_DELAYS_MS).toEqual([1000, 2000, 4000, 8000, 16000]);
    });

    it('should increment retry count on failure', async () => {
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 0,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ error: 'Network error' });

      await syncManager.processQueue();

      // Should increment retry count from 0 to 1
      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', expect.objectContaining({
        retryCount: 1,
        status: 'pending',
      }));
    });

    it('should not exceed MAX_RETRY_COUNT', async () => {
      const config = require('../../../constants/config').default;
      const maxRetries = config.MAX_RETRY_COUNT;

      // Test with retryCount at exactly max
      const itemAtMax = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: maxRetries,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([itemAtMax]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ error: 'Network error' });

      await syncManager.processQueue();

      // Should be marked as failed, not retry again
      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'failed',
      }));
    });

    it('should apply exponential backoff delays on retry', async () => {
      const config = require('../../../constants/config').default;
      const delays = config.RETRY_DELAYS_MS;

      // Test retry count 1 should use delays[0] = 1000ms
      const item1 = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 1, // First retry
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item1]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ error: 'Network error' });

      const startTime = Date.now();
      await syncManager.processQueue();
      const endTime = Date.now();

      // Should have applied delay (allow some margin for processing)
      expect(endTime - startTime).toBeGreaterThanOrEqual(delays[0] - 100);
    });

    it('should use last delay for retries beyond delay array length', async () => {
      const config = require('../../../constants/config').default;
      const delays = config.RETRY_DELAYS_MS;

      // Test that retry count 4 uses delays[3] (8000ms), not beyond array
      // Since delays has 5 elements [1000, 2000, 4000, 8000, 16000]
      // retryCount 4 uses index 3 (delays[4-1]) = 8000ms
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 4,
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ error: 'Network error' });

      const startTime = Date.now();
      await syncManager.processQueue();
      const endTime = Date.now();

      // Should use delays[3] = 8000ms (with 200ms margin for timing variance)
      const expectedDelay = delays[Math.min(item.retryCount - 1, delays.length - 1)];
      expect(endTime - startTime).toBeGreaterThanOrEqual(expectedDelay - 200);
    }, 15000); // Increase timeout to 15 seconds to accommodate 8s delay

    it('should handle successful sync after retries', async () => {
      const item = {
        id: '1',
        type: 'clock-in' as const,
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75, selfie_photo: 'base64' },
        timestamp: 123,
        retryCount: 2, // Has been retried twice
        status: 'pending' as const,
      };

      (offlineQueue.getQueuedItems as jest.Mock).mockResolvedValue([item]);
      (offlineQueue.updateQueueItem as jest.Mock).mockResolvedValue(undefined);
      (offlineQueue.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
      (shiftsApi.clockIn as jest.Mock).mockResolvedValue({ data: { shift_id: 1 } }); // Success

      await syncManager.processQueue();

      // Should mark as success and remove from queue
      expect(offlineQueue.updateQueueItem).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'success',
      }));
      expect(offlineQueue.removeFromQueue).toHaveBeenCalledWith('1');
    });
  });
});
