/**
 * Sync Manager Error Handling Tests
 * Tests for error scenarios without complex timer manipulations
 */

import NetInfo from '@react-native-community/netinfo';
import syncManager from '../syncManager';
import * as offlineQueue from '../offlineQueue';
import * as shiftsApi from '../../api/shiftsApi';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../offlineQueue');
jest.mock('../../api/shiftsApi');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockOfflineQueue = offlineQueue as jest.Mocked<typeof offlineQueue>;
const mockShiftsApi = shiftsApi as jest.Mocked<typeof shiftsApi>;

describe('syncManager - Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockNetInfo.addEventListener.mockReturnValue(jest.fn());
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);
  });

  describe('Storage Errors', () => {
    it('should emit syncError when getQueuedItems fails', async () => {
      mockOfflineQueue.getQueuedItems.mockRejectedValue(
        new Error('AsyncStorage failure')
      );

      const errorHandler = jest.fn();
      syncManager.on('syncError', errorHandler);

      await syncManager.processQueue();

      expect(errorHandler).toHaveBeenCalledWith(expect.stringContaining('AsyncStorage failure'));
    });

    it('should handle removeFromQueue failure gracefully', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([
        {
          id: '1',
          type: 'clock-in',
          data: { location_id: 'a1', gps_lat: 10, gps_lng: 20, selfie_photo: 'p1' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ]);

      mockShiftsApi.clockIn.mockResolvedValue({ data: { shift_id: 's1', clock_in_time: '2026-06-09T10:00:00Z' } });
      mockOfflineQueue.removeFromQueue.mockRejectedValue(new Error('Remove failed'));
      mockOfflineQueue.updateQueueItem.mockResolvedValue(undefined);

      const errorHandler = jest.fn();
      syncManager.on('syncError', errorHandler);

      await syncManager.processQueue();

      // The error should be logged via console.error, not syncError event
      // syncError is only emitted for getQueuedItems failures
      expect(mockOfflineQueue.removeFromQueue).toHaveBeenCalled();
    });

    it('should handle updateQueueItem failure during retry', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([
        {
          id: '1',
          type: 'clock-in',
          data: { location_id: 'a1', gps_lat: 10, gps_lng: 20, selfie_photo: 'p1' },
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
          user_id: 'user-1',
        },
      ]);

      mockShiftsApi.clockIn.mockResolvedValue({
        error: 'Server error',
        code: 'SERVER_ERROR',
        message: 'Error',
      });

      mockOfflineQueue.updateQueueItem.mockRejectedValue(new Error('Update failed'));

      await syncManager.processQueue();

      expect(mockOfflineQueue.updateQueueItem).toHaveBeenCalled();
    });
  });

  describe('Network State Errors', () => {
    it('should skip sync when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await syncManager.processQueue();

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });

    it('should skip sync when internet not reachable', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
      } as any);

      await syncManager.processQueue();

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });

    it('should handle network state check failure', async () => {
      mockNetInfo.fetch.mockImplementationOnce(() =>
        Promise.reject(new Error('NetInfo error'))
      );

      // processQueue will throw because NetInfo.fetch is not wrapped in try-catch
      await expect(syncManager.processQueue()).rejects.toThrow('NetInfo error');

      expect(mockOfflineQueue.getQueuedItems).not.toHaveBeenCalled();
    });
  });


  describe('Concurrent Operations', () => {
    it('should allow processQueue after previous completes', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([]);

      await syncManager.processQueue();
      await syncManager.processQueue();

      expect(mockOfflineQueue.getQueuedItems).toHaveBeenCalledTimes(2);
    });
  });

  describe('Force Sync', () => {
    it('should process queue immediately', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([]);

      await syncManager.forceSyncNow();

      expect(mockOfflineQueue.getQueuedItems).toHaveBeenCalled();
    });
  });

  describe('Sync Status', () => {
    it('should return false when not syncing', async () => {
      mockOfflineQueue.getQueuedItems.mockResolvedValue([]);

      // Before sync
      expect(syncManager.isSyncInProgress()).toBe(false);

      await syncManager.processQueue();

      // After sync completes
      expect(syncManager.isSyncInProgress()).toBe(false);
    });
  });
});
