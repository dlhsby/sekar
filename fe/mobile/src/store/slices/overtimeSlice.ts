/**
 * Overtime Slice
 * Overtime management state (Phase 2C: new module)
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Overtime } from '../../types/models.types';

interface OvertimeState {
  myOvertimes: Overtime[];
  pendingApprovals: Overtime[];
  selectedOvertime: Overtime | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: OvertimeState = {
  myOvertimes: [],
  pendingApprovals: [],
  selectedOvertime: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const overtimeSlice = createSlice({
  name: 'overtime',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },

    setMyOvertimes: (state, action: PayloadAction<Overtime[]>) => {
      state.myOvertimes = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    setPendingApprovals: (state, action: PayloadAction<Overtime[]>) => {
      state.pendingApprovals = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    addOvertime: (state, action: PayloadAction<Overtime>) => {
      state.myOvertimes.unshift(action.payload);
      state.isSubmitting = false;
      state.error = null;
    },

    updateOvertime: (state, action: PayloadAction<Overtime>) => {
      const myIdx = state.myOvertimes.findIndex(
        (o) => o.id === action.payload.id,
      );
      if (myIdx !== -1) {
        state.myOvertimes[myIdx] = action.payload;
      }
      const pendIdx = state.pendingApprovals.findIndex(
        (o) => o.id === action.payload.id,
      );
      if (pendIdx !== -1) {
        state.pendingApprovals[pendIdx] = action.payload;
      }
      if (state.selectedOvertime?.id === action.payload.id) {
        state.selectedOvertime = action.payload;
      }
      state.isSubmitting = false;
    },

    setSelectedOvertime: (state, action: PayloadAction<Overtime | null>) => {
      state.selectedOvertime = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isSubmitting = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetState: () => initialState,
  },
});

export const {
  setLoading,
  setSubmitting,
  setMyOvertimes,
  setPendingApprovals,
  addOvertime,
  updateOvertime,
  setSelectedOvertime,
  setError,
  clearError,
  resetState,
} = overtimeSlice.actions;

// Selectors
export const selectMyOvertimes = (state: { overtime: OvertimeState }) =>
  state.overtime.myOvertimes;

export const selectPendingApprovals = (state: { overtime: OvertimeState }) =>
  state.overtime.pendingApprovals;

export const selectSelectedOvertime = (state: { overtime: OvertimeState }) =>
  state.overtime.selectedOvertime;

export const selectOvertimeLoading = (state: { overtime: OvertimeState }) =>
  state.overtime.isLoading;

export const selectOvertimeSubmitting = (state: { overtime: OvertimeState }) =>
  state.overtime.isSubmitting;

export const selectPendingApprovalsCount = (state: { overtime: OvertimeState }) =>
  state.overtime.pendingApprovals.filter((o) => o.status === 'pending').length;

export default overtimeSlice.reducer;
