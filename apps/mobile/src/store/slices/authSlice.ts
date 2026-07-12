/**
 * Auth Slice
 * Authentication state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User, Location } from '../../types/models.types';

interface AuthState {
  user: User | null;
  /** Primary location (first assigned) — kept for backward compat. */
  assignedArea: Location | null;
  /** All permanent + task-based locations the worker is assigned to (ADR-013). */
  assignedAreas: Location[];
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
  assignedAreas: [],
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

    setUser: (state, action: PayloadAction<{ user: User; location?: Location }>) => {
      state.user = action.payload.user;
      state.assignedArea = action.payload.location || null;
      state.isAuthenticated = true;
      state.error = null;
    },

    /** Set the worker's full assigned-location list (fetched after auth). */
    setAssignedAreas: (state, action: PayloadAction<Location[]>) => {
      state.assignedAreas = action.payload;
      // Keep the single primary in sync (first area) when not already set.
      if (!state.assignedArea && action.payload.length > 0) {
        state.assignedArea = action.payload[0];
      }
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
      state.assignedAreas = [];
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
      action: PayloadAction<{ user: User; location: Location | null }>,
    ) => {
      state.user = action.payload.user;
      state.assignedArea = action.payload.location;
      state.isAuthenticated = true;
      state.isRestoring = false;
    },

    resetState: () => initialState,
  },
});

export const {
  setLoading,
  setUser,
  setAssignedAreas,
  setError,
  clearError,
  completeOnboarding,
  logout,
  setRestoring,
  restoreAuth,
  resetState,
} = authSlice.actions;

export default authSlice.reducer;

