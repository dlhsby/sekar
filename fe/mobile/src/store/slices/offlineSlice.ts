/**
 * Offline Slice
 * Offline queue and sync state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Queue item for Redux state (simplified version)
 */
interface QueueItem {
  type: 'shift' | 'report' | 'location';
  data: any;
  timestamp: number;
  id?: string;
}

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  queue: QueueItem[];
  pendingShiftsCount: number;
  pendingReportsCount: number;
  pendingMediaCount: number;
  pendingLocationsCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
}

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

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },

    addToQueue: (state, action: PayloadAction<QueueItem>) => {
      state.queue.push(action.payload);
      // Update counts based on type
      if (action.payload.type === 'shift') {
        state.pendingShiftsCount += 1;
      } else if (action.payload.type === 'report') {
        state.pendingReportsCount += 1;
      } else if (action.payload.type === 'location') {
        state.pendingLocationsCount += 1;
      }
    },

    removeFromQueue: (state, action: PayloadAction<number>) => {
      const item = state.queue[action.payload];
      if (item) {
        // Update counts based on type
        if (item.type === 'shift') {
          state.pendingShiftsCount = Math.max(0, state.pendingShiftsCount - 1);
        } else if (item.type === 'report') {
          state.pendingReportsCount = Math.max(0, state.pendingReportsCount - 1);
        } else if (item.type === 'location') {
          state.pendingLocationsCount = Math.max(0, state.pendingLocationsCount - 1);
        }
      }
      state.queue.splice(action.payload, 1);
    },

    clearQueue: (state) => {
      state.queue = [];
      state.pendingShiftsCount = 0;
      state.pendingReportsCount = 0;
      state.pendingMediaCount = 0;
      state.pendingLocationsCount = 0;
    },

    updatePendingCounts: (
      state,
      action: PayloadAction<{
        shifts?: number;
        reports?: number;
        media?: number;
        locations?: number;
      }>,
    ) => {
      if (action.payload.shifts !== undefined) {
        state.pendingShiftsCount = action.payload.shifts;
      }
      if (action.payload.reports !== undefined) {
        state.pendingReportsCount = action.payload.reports;
      }
      if (action.payload.media !== undefined) {
        state.pendingMediaCount = action.payload.media;
      }
      if (action.payload.locations !== undefined) {
        state.pendingLocationsCount = action.payload.locations;
      }
    },

    syncSuccess: (state) => {
      state.isSyncing = false;
      state.lastSyncTime = new Date().toISOString();
      state.syncError = null;
    },

    syncError: (state, action: PayloadAction<string>) => {
      state.isSyncing = false;
      state.syncError = action.payload;
    },

    clearSyncError: (state) => {
      state.syncError = null;
    },

    resetState: () => initialState,
  },
});

export const {
  setOnlineStatus,
  setSyncing,
  addToQueue,
  removeFromQueue,
  clearQueue,
  updatePendingCounts,
  syncSuccess,
  syncError,
  clearSyncError,
  resetState,
} = offlineSlice.actions;

export default offlineSlice.reducer;

// Selectors
export const selectTotalPendingCount = (state: { offline: OfflineState }) =>
  state.offline.pendingShiftsCount +
  state.offline.pendingReportsCount +
  state.offline.pendingMediaCount +
  state.offline.pendingLocationsCount;

