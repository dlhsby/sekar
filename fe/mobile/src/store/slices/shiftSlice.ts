/**
 * Shift Slice
 * Shift/attendance state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Shift } from '../../types/models.types';

interface ShiftState {
  currentShift: Shift | null;
  isClockingIn: boolean;
  isClockingOut: boolean;
  error: string | null;
}

const initialState: ShiftState = {
  currentShift: null,
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
    
    clockInSuccess: (state, action: PayloadAction<Shift>) => {
      state.currentShift = action.payload;
      state.isClockingIn = false;
      state.error = null;
    },
    
    clockOutSuccess: (state) => {
      state.currentShift = null;
      state.isClockingOut = false;
      state.error = null;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isClockingIn = false;
      state.isClockingOut = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setClockingIn,
  setClockingOut,
  setCurrentShift,
  clockInSuccess,
  clockOutSuccess,
  setError,
  clearError,
} = shiftSlice.actions;

export default shiftSlice.reducer;

