/**
 * Report Slice
 * Work reports state management
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WorkReport } from '../../types/models.types';

interface ReportState {
  reports: WorkReport[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reports: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },
    
    setReports: (state, action: PayloadAction<WorkReport[]>) => {
      state.reports = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    
    addReport: (state, action: PayloadAction<WorkReport>) => {
      state.reports.unshift(action.payload);
      state.isSubmitting = false;
      state.error = null;
    },
    
    updateReport: (state, action: PayloadAction<WorkReport>) => {
      const index = state.reports.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.reports[index] = action.payload;
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
    
    clearReports: (state) => {
      state.reports = [];
    },
  },
});

export const {
  setLoading,
  setSubmitting,
  setReports,
  addReport,
  updateReport,
  setError,
  clearError,
  clearReports,
} = reportSlice.actions;

export default reportSlice.reducer;

