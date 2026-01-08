/**
 * Offline Slice
 * Offline queue and sync state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
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
  },
});

export const {
  setOnlineStatus,
  setSyncing,
  updatePendingCounts,
  syncSuccess,
  syncError,
  clearSyncError,
} = offlineSlice.actions;

export default offlineSlice.reducer;

// Selectors
export const selectTotalPendingCount = (state: { offline: OfflineState }) =>
  state.offline.pendingShiftsCount +
  state.offline.pendingReportsCount +
  state.offline.pendingMediaCount +
  state.offline.pendingLocationsCount;

