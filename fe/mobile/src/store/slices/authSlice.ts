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
  isRestoring: boolean;
  error: string | null;
  // In-session flag so finishing/skipping onboarding routes immediately. The
  // durable per-user flag lives in AsyncStorage (hasCompletedOnboarding); this
  // mirror exists because RootNavigator only reads storage once at login.
  onboardingCompleted: boolean;
}

const initialState: AuthState = {
  user: null,
  assignedArea: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true, // Start as true, will be set to false after checking storage
  error: null,
  onboardingCompleted: false,
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

    completeOnboarding: (state) => {
      state.onboardingCompleted = true;
    },

    logout: (state) => {
      state.user = null;
      state.assignedArea = null;
      state.isAuthenticated = false;
      state.isRestoring = false; // Ensure we're not stuck on loading spinner
      state.error = null;
      state.onboardingCompleted = false;
    },

    setRestoring: (state, action: PayloadAction<boolean>) => {
      state.isRestoring = action.payload;
    },

    restoreAuth: (
      state,
      action: PayloadAction<{ user: User; area: Area | null }>,
    ) => {
      state.user = action.payload.user;
      state.assignedArea = action.payload.area;
      state.isAuthenticated = true;
      state.isRestoring = false;
    },

    resetState: () => initialState,
  },
});

export const {
  setLoading,
  setUser,
  setError,
  clearError,
  completeOnboarding,
  logout,
  setRestoring,
  restoreAuth,
  resetState,
} = authSlice.actions;

export default authSlice.reducer;

