/**
 * Auth Slice
 * Authentication state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/models.types';
import type { Area } from '../../types/models.types';

interface AuthState {
  user: User | null;
  assignedArea: Area | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  assignedArea: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setUser: (state, action: PayloadAction<{ user: User; area?: Area }>) => {
      state.user = action.payload.user;
      state.assignedArea = action.payload.area || null;
      state.isAuthenticated = true;
      state.error = null;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    logout: (state) => {
      state.user = null;
      state.assignedArea = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const { setLoading, setUser, setError, clearError, logout } =
  authSlice.actions;

export default authSlice.reducer;

