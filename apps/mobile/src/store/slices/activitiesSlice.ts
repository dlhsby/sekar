/**
 * Activities Slice
 * Activity state management (was reportSlice)
 * Phase 2C: ADR-010 terminology cleanup
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Activity } from '../../types/models.types';

interface ActivitiesState {
  activitiesList: Activity[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ActivitiesState = {
  activitiesList: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const activitiesSlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },

    setActivities: (state, action: PayloadAction<Activity[]>) => {
      state.activitiesList = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    addActivity: (state, action: PayloadAction<Activity>) => {
      state.activitiesList.unshift(action.payload);
      state.isSubmitting = false;
      state.error = null;
    },

    updateActivity: (state, action: PayloadAction<Activity>) => {
      const index = state.activitiesList.findIndex(
        (a) => a.id === action.payload.id,
      );
      if (index !== -1) {
        state.activitiesList[index] = action.payload;
      }
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isSubmitting = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    clearActivities: (state) => {
      state.activitiesList = [];
    },

    resetState: () => initialState,
  },
});

export const {
  setLoading,
  setSubmitting,
  setActivities,
  addActivity,
  updateActivity,
  setError,
  clearError,
  clearActivities,
  resetState,
} = activitiesSlice.actions;

// Selectors
export const selectActivities = (state: { activities: ActivitiesState }) =>
  state.activities.activitiesList;

export const selectActivitiesLoading = (state: { activities: ActivitiesState }) =>
  state.activities.isLoading;

export const selectActivitiesSubmitting = (state: { activities: ActivitiesState }) =>
  state.activities.isSubmitting;

export const selectActivitiesError = (state: { activities: ActivitiesState }) =>
  state.activities.error;

export default activitiesSlice.reducer;
