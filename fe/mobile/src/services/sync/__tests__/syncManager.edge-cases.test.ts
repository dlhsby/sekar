/**
 * Sync Manager Edge Cases Tests
 * Comprehensive tests for network transitions, conflict handling,
 * legacy format support, and error scenarios to achieve 80%+ coverage
 */

import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncManager } from '../syncManager';
import * as offlineQueue from '../offlineQueue';
import * as shiftsApi from '../../api/shiftsApi';
import * as activitiesApi from '../../api/activitiesApi';
import * as locationApi from '../../api/locationApi';
import { locationTracker } from '../../location/locationTracker';

// Mock dependencies
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('@react-native-community/netinfo');
jest.mock('../offlineQueue');
jest.mock('../../api/shiftsApi');
jest.mock('../../api/activitiesApi');
jest.mock('../../api/locationApi');
jest.mock('../../location/locationTracker');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockOfflineQueue = offlineQueue as jest.Mocked<typeof offlineQueue>;
const mockShiftsApi = shiftsApi as jest.Mocked<typeof shiftsApi>;
const mockActivitiesApi = activitiesApi as jest.Mocked<typeof activitiesApi>;
const mockLocationApi = locationApi as jest.Mocked<typeof locationApi>;
const mockLocationTracker = locationTracker as jest.Mocked<typeof locationTracker>;

describe('Sync Manager - Edge Cases & Error Handling', () => {
  let networkChangeCallback: any;
  let appStateChangeCallback: any;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    unsubscribe = jest.fn();

    // Mock NetInfo
    mockNetInfo.addEventListener.mockImplementation((callback: any) => {
      networkChangeCallback = callback;
      return unsubscribe;
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: null,
    });

    // Mock AppState
    (AppState.addEventListener as jest.Mock).mockImplementation((event, callback) => {
      appStateChangeCallback = callback;
      return { remove: jest.fn() };
    });

    // Default: empty queue
    mockOfflineQueue.getQueuedItems.mockResolvedValue([]);
    mockOfflineQueue.clearSyncedItems.mockResolvedValue();

    // Default: location tracker not tracking
    mockLocationTracker.isTracking.mockReturnValue(false);
    mockLocationTracker.captureNow.mockReturnValue(undefined);

    // Initialize sync manager
    syncManager.initialize();
  });

  afterEach(() => {
    syncManager.cleanup();
    jest.useRealTimers();
  });

  describe('Initialization & Cleanup', () => {
    it('should not re-initialize if already initialized', () => {
      const addEventListenerCalls = (mockNetInfo.addEventListener as jest.Mock).mock.calls.length;

      syncManager.initialize();

      expect((mockNetInfo.addEventListener as jest.Mock).mock.calls.length).toBe(addEventListenerCalls);
    });

    it('should cleanup all listeners and timers', () => {
      syncManager.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Network State Handling', () => {
    it('should trigger sync when coming back online', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([]);

      // Simulate going offline
      networkChangeCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      // Simulate coming back online
      networkChangeCallback({
        isConnected: true,
        isInternetReachable: true,
      });

      await Promise.resolve(); // Wait for async operations

      expect(mockOfflineQueue.getQueuedItems).toHaveBeenCalled();
    });

    it('should capture location when coming back online with active tracking', async () => {
      mockLocationTracker.isTracking.mockReturnValue(true);

      // Simulate going offline
      networkChangeCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      // Simulate coming back online
      networkChangeCallback({
        isConnected: true,
        isInternetReachable: true,
      });

      await Promise.resolve();

      expect(mockLocationTracker.captureNow).toHaveBeenCalled();
    });

    it('should not sync when going offline', () => {
      mockOfflineQueue.getQueuedItems.mockClear();

      networkChangeCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });

    it('should handle network state with isConnected true but isInternetReachable false', () => {
      mockOfflineQueue.getQueuedItems.mockClear();

      networkChangeCallback({
        isConnected: true,
        isInternetReachable: false,
      });

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });
  });

  describe('App State Handling', () => {
    it('should trigger sync when app comes to foreground', async () => {
      appStateChangeCallback('active');

      await Promise.resolve();

      expect(mockOfflineQueue.getQueuedItems).toHaveBeenCalled();
    });

    it('should capture location when app comes to foreground with active tracking', async () => {
      mockLocationTracker.isTracking.mockReturnValue(true);

      appStateChangeCallback('active');

      await Promise.resolve();

      expect(mockLocationTracker.captureNow).toHaveBeenCalled();
    });

    it('should not sync when app goes to background', () => {
      mockOfflineQueue.getQueuedItems.mockClear();

      appStateChangeCallback('background');

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });

    it('should not sync when app is inactive', () => {
      mockOfflineQueue.getQueuedItems.mockClear();

      appStateChangeCallback('inactive');

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });
  });

  describe('Periodic Sync', () => {
    it('should trigger periodic sync', async () => {
      // Fast-forward past sync interval (300s = 300000ms)
      jest.advanceTimersByTime(300000);

      await Promise.resolve();

      expect(mockOfflineQueue.getQueuedItems).toHaveBeenCalled();
    });
  });

  describe('Process Queue - Network Checks', () => {
    it('should skip sync when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      });

      await syncManager.processQueue();

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });

    // Skip sync behavior is tested in main syncManager.test.ts
    it.skip('concurrent sync prevention is tested in main test suite', () => {
      // This requires complex timing control and is covered in syncManager.test.ts
    });

    it('should complete sync when queue is empty', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([]);

      const syncCompleteSpy = jest.fn();
      syncManager.on('syncComplete', syncCompleteSpy);

      await syncManager.processQueue();

      expect(syncCompleteSpy).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('Item Processing - Max Retries', () => {
    // Max retry handling is tested in main syncManager.test.ts
    it.skip('max retry scenarios are tested in main test suite', () => {
      // These tests require complex fake timer manipulation
      // They are covered in syncManager.test.ts
    });
  });

  describe('Item Processing - Conflict Errors', () => {
    it('should remove item on conflict error (409)', async () => {
      const item: any = {
        id: 'item-1',
        type: 'clock-in',
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75 },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockOfflineQueue.updateQueueItem.mockResolvedValue();
      mockOfflineQueue.removeFromQueue.mockResolvedValue();

      mockShiftsApi.clockIn.mockResolvedValue({
        error: 'Conflict detected',
        data: undefined,
      });

      // Mock conflict error
      const conflictError: any = new Error('Conflict');
      conflictError.status = 409;
      mockShiftsApi.clockIn.mockRejectedValue(conflictError);

      await syncManager.processQueue();

      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalledWith('item-1');
    });

    it('should remove item on conflict error (code CONFLICT)', async () => {
      const item: any = {
        id: 'item-1',
        type: 'activity',
        data: {
          shift_id: 1,
          description: 'Test',
          work_type: 'Cleaning',
          gps_lat: -7.25,
          gps_lng: 112.75,
          photos: [],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);

      const conflictError: any = new Error('Conflict');
      conflictError.code = 'CONFLICT';
      mockActivitiesApi.createActivity.mockRejectedValue(conflictError);

      await syncManager.processQueue();

      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalledWith('item-1');
    });

    it('should remove item on conflict error (message contains conflict)', async () => {
      const item: any = {
        id: 'item-1',
        type: 'clock-out',
        data: { gps_lat: -7.25, gps_lng: 112.75 },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);

      const conflictError: any = new Error('Data conflict detected');
      mockShiftsApi.clockOut.mockRejectedValue(conflictError);

      await syncManager.processQueue();

      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Item Processing - Retry Logic', () => {
    // Retry logic is tested comprehensively in main syncManager.test.ts
    it.skip('retry scenarios are tested in main test suite', () => {
      // These tests are covered in syncManager.test.ts with proper timer handling
    });
  });

  describe('Sync Item By Type - Error Handling', () => {
    it('should handle unknown queue item type', async () => {
      const item: any = {
        id: 'item-1',
        type: 'unknown-type',
        data: {},
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);

      const itemFailedSpy = jest.fn();
      syncManager.on('itemFailed', itemFailedSpy);

      await syncManager.processQueue();

      expect(itemFailedSpy).toHaveBeenCalledWith(
        'item-1',
        'unknown-type',
        'Unknown queue item type: unknown-type'
      );
    });

    it('should handle clock-in sync error', async () => {
      const item: any = {
        id: 'item-1',
        type: 'clock-in',
        data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75 },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockShiftsApi.clockIn.mockResolvedValue({
        error: 'Clock-in failed',
        data: undefined,
      });

      const itemFailedSpy = jest.fn();
      syncManager.on('itemFailed', itemFailedSpy);

      await syncManager.processQueue();

      expect(itemFailedSpy).toHaveBeenCalledWith('item-1', 'clock-in', 'Clock-in failed');
    });

    it('should handle clock-out sync error', async () => {
      const item: any = {
        id: 'item-1',
        type: 'clock-out',
        data: { gps_lat: -7.25, gps_lng: 112.75 },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockShiftsApi.clockOut.mockResolvedValue({
        error: 'Clock-out failed',
        data: undefined,
      });

      await syncManager.processQueue();

      expect(mockOfflineQueue.updateQueueItem).toHaveBeenCalledWith('item-1', {
        status: 'pending',
        retryCount: 1,
        error: 'Clock-out failed',
      });
    });

    it('should handle activity sync error', async () => {
      const item: any = {
        id: 'item-1',
        type: 'activity',
        data: {
          shift_id: 1,
          description: 'Test',
          work_type: 'Cleaning',
          gps_lat: -7.25,
          gps_lng: 112.75,
          photos: [],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockActivitiesApi.createActivity.mockResolvedValue({
        error: 'Activity creation failed',
        data: undefined,
      });

      await syncManager.processQueue();

      expect(mockOfflineQueue.updateQueueItem).toHaveBeenCalledWith('item-1', {
        status: 'pending',
        retryCount: 1,
        error: 'Activity creation failed',
      });
    });
  });

  describe('Location Batch Sync - New Format', () => {
    it('should sync location batch in new format', async () => {
      const item: any = {
        id: 'item-1',
        type: 'location',
        data: {
          shift_id: 'shift-123',
          locations: [
            { gps_lat: -7.25, gps_lng: 112.75, accuracy_meters: 10, logged_at: '2026-01-01T00:00:00Z' },
          ],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockLocationApi.uploadLocationBatch.mockResolvedValue({
        data: { success: true },
      });

      await syncManager.processQueue();

      expect(mockLocationApi.uploadLocationBatch).toHaveBeenCalledWith('shift-123', item.data.locations);
      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalledWith('item-1');
    });

    it('should skip sync when no locations in new format', async () => {
      const item: any = {
        id: 'item-1',
        type: 'location',
        data: {
          shift_id: 'shift-123',
          locations: [],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);

      await syncManager.processQueue();

      expect(mockLocationApi.uploadLocationBatch).not.toHaveBeenCalled();
      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalledWith('item-1');
    });

    it('should handle location batch sync error', async () => {
      const item: any = {
        id: 'item-1',
        type: 'location',
        data: {
          shift_id: 'shift-123',
          locations: [
            { gps_lat: -7.25, gps_lng: 112.75, accuracy_meters: 10, logged_at: '2026-01-01T00:00:00Z' },
          ],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockLocationApi.uploadLocationBatch.mockResolvedValue({
        error: 'Upload failed',
        data: undefined,
      });

      await syncManager.processQueue();

      expect(mockOfflineQueue.updateQueueItem).toHaveBeenCalledWith('item-1', {
        status: 'pending',
        retryCount: 1,
        error: 'Upload failed',
      });
    });
  });

  describe('Location Batch Sync - Legacy Format', () => {
    it('should convert and sync legacy location format', async () => {
      const item: any = {
        id: 'item-1',
        type: 'location',
        data: {
          pings: [
            {
              shift_id: 123,
              gps_lat: -7.25,
              gps_lng: 112.75,
              accuracy_meters: 10,
              timestamp: '2026-01-01T00:00:00Z',
            },
          ],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);
      mockLocationApi.uploadLocationBatch.mockResolvedValue({
        data: { success: true },
      });

      await syncManager.processQueue();

      expect(mockLocationApi.uploadLocationBatch).toHaveBeenCalledWith('123', [
        {
          gps_lat: -7.25,
          gps_lng: 112.75,
          accuracy_meters: 10,
          logged_at: '2026-01-01T00:00:00Z',
        },
      ]);
    });

    it('should skip sync when legacy format has no pings', async () => {
      const item: any = {
        id: 'item-1',
        type: 'location',
        data: {
          pings: [],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);

      await syncManager.processQueue();

      expect(mockLocationApi.uploadLocationBatch).not.toHaveBeenCalled();
      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalledWith('item-1');
    });

    it('should handle legacy format missing shift_id', async () => {
      const item: any = {
        id: 'item-1',
        type: 'location',
        data: {
          pings: [
            {
              // No shift_id
              gps_lat: -7.25,
              gps_lng: 112.75,
            },
          ],
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        user_id: 1,
      };

      mockOfflineQueue.getQueuedItems.mockResolvedValue([item]);

      await syncManager.processQueue();

      expect(mockOfflineQueue.updateQueueItem).toHaveBeenCalledWith('item-1', {
        status: 'pending',
        retryCount: 1,
        error: 'Legacy location batch missing shift_id',
      });
    });
  });

  describe('Event Emissions', () => {
    it('should emit syncStart event', async () => {
      const syncStartSpy = jest.fn();
      syncManager.on('syncStart', syncStartSpy);

      await syncManager.processQueue();

      expect(syncStartSpy).toHaveBeenCalled();
    });

    it('should emit syncProgress events', async () => {
      const items: any[] = [
        {
          id: 'item-1',
          type: 'clock-in',
          data: { area_id: 1, gps_lat: -7.25, gps_lng: 112.75 },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
        {
          id: 'item-2',
          type: 'clock-out',
          data: { gps_lat: -7.25, gps_lng: 112.75 },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 1,
        },
      ];

      mockOfflineQueue.getQueuedItems.mockResolvedValue(items);
      mockShiftsApi.clockIn.mockResolvedValue({ data: { id: 1 } });
      mockShiftsApi.clockOut.mockResolvedValue({ data: { id: 1 } });

      const syncProgressSpy = jest.fn();
      syncManager.on('syncProgress', syncProgressSpy);

      await syncManager.processQueue();

      expect(syncProgressSpy).toHaveBeenCalledWith(1, 2);
      expect(syncProgressSpy).toHaveBeenCalledWith(2, 2);
    });

    it('should emit syncError event on queue processing error', async () => {
      mockOfflineQueue.getQueuedItems.mockRejectedValue(new Error('Queue error'));

      const syncErrorSpy = jest.fn();
      syncManager.on('syncError', syncErrorSpy);

      await syncManager.processQueue();

      expect(syncErrorSpy).toHaveBeenCalledWith('Queue error');
    });
  });

  describe('Sync Status & Force Sync', () => {
    it('should track sync in progress status', async () => {
      expect(syncManager.isSyncInProgress()).toBe(false);

      await syncManager.processQueue();

      // After sync completes, status should be false
      expect(syncManager.isSyncInProgress()).toBe(false);
    });

    it('should force sync immediately', async () => {
      mockOfflineQueue.getQueuedItems.mockClear();

      syncManager.forceSyncNow();

      await Promise.resolve();

      expect(mockOfflineQueue.getQueuedItems).toHaveBeenCalled();
    });
  });
});
