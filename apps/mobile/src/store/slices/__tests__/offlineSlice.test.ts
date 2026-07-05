/**
 * Offline Slice Tests
 * Tests for offline queue and network status management
 */

import offlineReducer, {
  setOnlineStatus,
  setSyncing,
  addToQueue,
  removeFromQueue,
  clearQueue,
  updatePendingCounts,
  syncSuccess,
  syncError,
  clearSyncError,
  selectTotalPendingCount,
} from '../offlineSlice';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  queue: Array<{ type: 'shift' | 'report' | 'location'; data: any; timestamp: number; id?: string }>;
  pendingShiftsCount: number;
  pendingReportsCount: number;
  pendingMediaCount: number;
  pendingLocationsCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
}

describe('offlineSlice', () => {
  const initialState: OfflineState = {
    isOnline: true,
    isSyncing: false,
    queue: [],
    pendingShiftsCount: 0,
    pendingReportsCount: 0,
    pendingMediaCount: 0,
    pendingLocationsCount: 0,
    lastSyncTime: null,
    syncError: null,
  };

  describe('setOnlineStatus', () => {
    it('should set isOnline to true', () => {
      const previousState = {
        ...initialState,
        isOnline: false,
      };

      const newState = offlineReducer(previousState, setOnlineStatus(true));

      expect(newState.isOnline).toBe(true);
    });

    it('should set isOnline to false', () => {
      const previousState = {
        ...initialState,
        isOnline: true,
      };

      const newState = offlineReducer(previousState, setOnlineStatus(false));

      expect(newState.isOnline).toBe(false);
    });

    it('should update online status without affecting other state', () => {
      const previousState = {
        ...initialState,
        isOnline: true,
        isSyncing: true,
        pendingReportsCount: 5,
        lastSyncTime: '2026-01-16T10:00:00Z',
      };

      const newState = offlineReducer(previousState, setOnlineStatus(false));

      expect(newState.isOnline).toBe(false);
      expect(newState.isSyncing).toBe(true);
      expect(newState.pendingReportsCount).toBe(5);
      expect(newState.lastSyncTime).toBe('2026-01-16T10:00:00Z');
    });

    it('should handle toggling online status multiple times', () => {
      let state: OfflineState = initialState;

      state = offlineReducer(state, setOnlineStatus(false));
      expect(state.isOnline).toBe(false);

      state = offlineReducer(state, setOnlineStatus(true));
      expect(state.isOnline).toBe(true);

      state = offlineReducer(state, setOnlineStatus(false));
      expect(state.isOnline).toBe(false);

      state = offlineReducer(state, setOnlineStatus(true));
      expect(state.isOnline).toBe(true);
    });
  });

  describe('setSyncing', () => {
    it('should set isSyncing to true', () => {
      const newState = offlineReducer(initialState, setSyncing(true));
      expect(newState.isSyncing).toBe(true);
    });

    it('should set isSyncing to false', () => {
      const previousState = {
        ...initialState,
        isSyncing: true,
      };

      const newState = offlineReducer(previousState, setSyncing(false));
      expect(newState.isSyncing).toBe(false);
    });
  });

  describe('addToQueue', () => {
    it('should add shift to queue and increment pendingShiftsCount', () => {
      const queueItem = {
        type: 'shift' as const,
        data: { area_id: 1, gps_lat: -7.250445, gps_lng: 112.768845 },
        timestamp: Date.now(),
      };

      const newState = offlineReducer(initialState, addToQueue(queueItem));

      expect(newState.queue).toHaveLength(1);
      expect(newState.queue[0]).toEqual(queueItem);
      expect(newState.pendingShiftsCount).toBe(1);
    });

    it('should add report to queue and increment pendingReportsCount', () => {
      const queueItem = {
        type: 'report' as const,
        data: { description: 'Test report', work_type: 'cleaning' },
        timestamp: Date.now(),
      };

      const newState = offlineReducer(initialState, addToQueue(queueItem));

      expect(newState.queue).toHaveLength(1);
      expect(newState.pendingReportsCount).toBe(1);
    });

    it('should add location to queue and increment pendingLocationsCount', () => {
      const queueItem = {
        type: 'location' as const,
        data: { gps_lat: -7.250445, gps_lng: 112.768845 },
        timestamp: Date.now(),
      };

      const newState = offlineReducer(initialState, addToQueue(queueItem));

      expect(newState.queue).toHaveLength(1);
      expect(newState.pendingLocationsCount).toBe(1);
    });

    it('should add multiple items to queue', () => {
      let state: OfflineState = initialState;

      const shiftItem = {
        type: 'shift' as const,
        data: { area_id: 1 },
        timestamp: Date.now(),
      };

      const reportItem = {
        type: 'report' as const,
        data: { description: 'Report' },
        timestamp: Date.now(),
      };

      state = offlineReducer(state, addToQueue(shiftItem));
      state = offlineReducer(state, addToQueue(reportItem));

      expect(state.queue).toHaveLength(2);
      expect(state.pendingShiftsCount).toBe(1);
      expect(state.pendingReportsCount).toBe(1);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove shift from queue and decrement pendingShiftsCount', () => {
      const previousState = {
        ...initialState,
        queue: [
          { type: 'shift' as const, data: {}, timestamp: Date.now() },
          { type: 'report' as const, data: {}, timestamp: Date.now() },
        ],
        pendingShiftsCount: 1,
        pendingReportsCount: 1,
      };

      const newState = offlineReducer(previousState, removeFromQueue(0));

      expect(newState.queue).toHaveLength(1);
      expect(newState.pendingShiftsCount).toBe(0);
      expect(newState.pendingReportsCount).toBe(1);
    });

    it('should remove report from queue and decrement pendingReportsCount', () => {
      const previousState = {
        ...initialState,
        queue: [
          { type: 'report' as const, data: {}, timestamp: Date.now() },
        ],
        pendingReportsCount: 1,
      };

      const newState = offlineReducer(previousState, removeFromQueue(0));

      expect(newState.queue).toHaveLength(0);
      expect(newState.pendingReportsCount).toBe(0);
    });

    it('should not go below zero when decrementing counts', () => {
      const previousState = {
        ...initialState,
        queue: [
          { type: 'shift' as const, data: {}, timestamp: Date.now() },
        ],
        pendingShiftsCount: 0, // Already zero
      };

      const newState = offlineReducer(previousState, removeFromQueue(0));

      expect(newState.pendingShiftsCount).toBe(0); // Should stay at zero
    });
  });

  describe('clearQueue', () => {
    it('should clear all queue items and reset counts', () => {
      const previousState = {
        ...initialState,
        queue: [
          { type: 'shift' as const, data: {}, timestamp: Date.now() },
          { type: 'report' as const, data: {}, timestamp: Date.now() },
          { type: 'location' as const, data: {}, timestamp: Date.now() },
        ],
        pendingShiftsCount: 1,
        pendingReportsCount: 1,
        pendingMediaCount: 2,
        pendingLocationsCount: 1,
      };

      const newState = offlineReducer(previousState, clearQueue());

      expect(newState.queue).toHaveLength(0);
      expect(newState.pendingShiftsCount).toBe(0);
      expect(newState.pendingReportsCount).toBe(0);
      expect(newState.pendingMediaCount).toBe(0);
      expect(newState.pendingLocationsCount).toBe(0);
    });
  });

  describe('updatePendingCounts', () => {
    it('should update shifts count', () => {
      const newState = offlineReducer(
        initialState,
        updatePendingCounts({ shifts: 5 })
      );

      expect(newState.pendingShiftsCount).toBe(5);
    });

    it('should update reports count', () => {
      const newState = offlineReducer(
        initialState,
        updatePendingCounts({ reports: 3 })
      );

      expect(newState.pendingReportsCount).toBe(3);
    });

    it('should update media count', () => {
      const newState = offlineReducer(
        initialState,
        updatePendingCounts({ media: 7 })
      );

      expect(newState.pendingMediaCount).toBe(7);
    });

    it('should update locations count', () => {
      const newState = offlineReducer(
        initialState,
        updatePendingCounts({ locations: 2 })
      );

      expect(newState.pendingLocationsCount).toBe(2);
    });

    it('should update multiple counts at once', () => {
      const newState = offlineReducer(
        initialState,
        updatePendingCounts({
          shifts: 1,
          reports: 2,
          media: 3,
          locations: 4,
        })
      );

      expect(newState.pendingShiftsCount).toBe(1);
      expect(newState.pendingReportsCount).toBe(2);
      expect(newState.pendingMediaCount).toBe(3);
      expect(newState.pendingLocationsCount).toBe(4);
    });
  });

  describe('syncSuccess', () => {
    it('should set isSyncing to false and update lastSyncTime', () => {
      const previousState = {
        ...initialState,
        isSyncing: true,
        syncError: 'Previous error',
      };

      const newState = offlineReducer(previousState, syncSuccess());

      expect(newState.isSyncing).toBe(false);
      expect(newState.lastSyncTime).toBeTruthy();
      expect(newState.syncError).toBeNull();
    });

    it('should set lastSyncTime as ISO string', () => {
      const newState = offlineReducer(initialState, syncSuccess());

      expect(newState.lastSyncTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });

  describe('syncError', () => {
    it('should set isSyncing to false and store error message', () => {
      const previousState = {
        ...initialState,
        isSyncing: true,
      };

      const newState = offlineReducer(
        previousState,
        syncError('Network error')
      );

      expect(newState.isSyncing).toBe(false);
      expect(newState.syncError).toBe('Network error');
    });
  });

  describe('clearSyncError', () => {
    it('should clear sync error', () => {
      const previousState = {
        ...initialState,
        syncError: 'Some error',
      };

      const newState = offlineReducer(previousState, clearSyncError());

      expect(newState.syncError).toBeNull();
    });
  });

  describe('selectTotalPendingCount selector', () => {
    it('should calculate total pending count', () => {
      const state = {
        offline: {
          ...initialState,
          pendingShiftsCount: 2,
          pendingReportsCount: 3,
          pendingMediaCount: 1,
          pendingLocationsCount: 4,
        },
      };

      const total = selectTotalPendingCount(state);

      expect(total).toBe(10); // 2 + 3 + 1 + 4
    });

    it('should return zero when no pending items', () => {
      const state = {
        offline: initialState,
      };

      const total = selectTotalPendingCount(state);

      expect(total).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete offline workflow', () => {
      let state = initialState;

      // Go offline
      state = offlineReducer(state, setOnlineStatus(false));
      expect(state.isOnline).toBe(false);

      // Add items to queue
      state = offlineReducer(
        state,
        addToQueue({
          type: 'shift',
          data: { area_id: 1 },
          timestamp: Date.now(),
        })
      );
      state = offlineReducer(
        state,
        addToQueue({
          type: 'report',
          data: { description: 'Report' },
          timestamp: Date.now(),
        })
      );

      expect(state.queue).toHaveLength(2);
      expect(state.pendingShiftsCount).toBe(1);
      expect(state.pendingReportsCount).toBe(1);

      // Come back online
      state = offlineReducer(state, setOnlineStatus(true));
      expect(state.isOnline).toBe(true);

      // Start syncing
      state = offlineReducer(state, setSyncing(true));
      expect(state.isSyncing).toBe(true);

      // Remove items as they sync
      state = offlineReducer(state, removeFromQueue(0));
      state = offlineReducer(state, removeFromQueue(0));

      expect(state.queue).toHaveLength(0);
      expect(state.pendingShiftsCount).toBe(0);
      expect(state.pendingReportsCount).toBe(0);

      // Sync complete
      state = offlineReducer(state, syncSuccess());
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncTime).toBeTruthy();
    });

    it('should handle sync failure scenario', () => {
      let state: OfflineState = {
        ...initialState,
        isOnline: true,
        isSyncing: true,
        queue: [
          { type: 'report' as const, data: {}, timestamp: Date.now() },
        ],
      };

      // Sync fails
      state = offlineReducer(state, syncError('Failed to sync'));

      expect(state.isSyncing).toBe(false);
      expect(state.syncError).toBe('Failed to sync');
      expect(state.queue).toHaveLength(1); // Items remain in queue

      // Clear error for retry
      state = offlineReducer(state, clearSyncError());
      expect(state.syncError).toBeNull();
    });

    it('should handle rapid online/offline transitions', () => {
      let state: OfflineState = initialState;

      for (let i = 0; i < 10; i++) {
        state = offlineReducer(state, setOnlineStatus(false));
        expect(state.isOnline).toBe(false);

        state = offlineReducer(state, setOnlineStatus(true));
        expect(state.isOnline).toBe(true);
      }

      expect(state.isOnline).toBe(true);
    });
  });
});
