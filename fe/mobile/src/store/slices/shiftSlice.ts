/**
 * Shift Slice
 * Shift/attendance state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Shift } from '../../types/models.types';

interface ShiftState {
  currentShift: Shift | null;
  shiftHistory: Shift[]; // All shifts (last 50)
  isClockingIn: boolean;
  isClockingOut: boolean;
  error: string | null;
}

const initialState: ShiftState = {
  currentShift: null,
  shiftHistory: [],
  isClockingIn: false,
  isClockingOut: false,
  error: null,
};

const shiftSlice = createSlice({
  name: 'shift',
  initialState,
  reducers: {
    setClockingIn: (state, action: PayloadAction<boolean>) => {
      state.isClockingIn = action.payload;
    },

    setClockingOut: (state, action: PayloadAction<boolean>) => {
      state.isClockingOut = action.payload;
    },

    setCurrentShift: (state, action: PayloadAction<Shift | null>) => {
      state.currentShift = action.payload;
      state.error = null;
    },

    setShiftHistory: (state, action: PayloadAction<Shift[]>) => {
      state.shiftHistory = action.payload;
      state.error = null;
    },

    clockInSuccess: (state, action: PayloadAction<Shift>) => {
      state.currentShift = action.payload;
      // Add new shift to history
      state.shiftHistory = [action.payload, ...state.shiftHistory];
      state.isClockingIn = false;
      state.error = null;
    },

    clockOutSuccess: (state) => {
      state.currentShift = null;
      state.isClockingOut = false;
      state.error = null;
      // Note: Shift history will be refreshed by the screen after clock out
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isClockingIn = false;
      state.isClockingOut = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetState: () => initialState,
  },
});

export const {
  setClockingIn,
  setClockingOut,
  setCurrentShift,
  setShiftHistory,
  clockInSuccess,
  clockOutSuccess,
  setError,
  clearError,
  resetState,
} = shiftSlice.actions;

export default shiftSlice.reducer;

