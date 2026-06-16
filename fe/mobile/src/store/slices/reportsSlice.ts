/**
 * Reports Slice
 * Phase 5-1: Report generation and management state
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import * as reportsApi from '../../services/api/reportsApi';
import type {
  ReportTemplate,
  GeneratedReport,
  GenerateReportRequest,
} from '../../types/reports.types';

interface ReportsState {
  reports: GeneratedReport[];
  templates: ReportTemplate[];
  selectedReport: GeneratedReport | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isRefreshing: boolean;
  error: string | null;
  page: number;
  limit: number;
  hasMore: boolean;
}

const initialState: ReportsState = {
  reports: [],
  templates: [],
  selectedReport: null,
  isLoading: false,
  isSubmitting: false,
  isRefreshing: false,
  error: null,
  page: 1,
  limit: 10,
  hasMore: true,
};

/**
 * Thunk: Fetch all report templates
 */
export const fetchTemplates = createAsyncThunk(
  'reports/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await reportsApi.getTemplates();
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || [];
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to fetch templates');
    }
  },
);

/**
 * Thunk: Fetch paginated list of generated reports
 */
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (
    params: { page?: number; limit?: number; reportType?: string; status?: string; reset?: boolean },
    { rejectWithValue },
  ) => {
    try {
      const response = await reportsApi.getReports({
        page: params.page || 1,
        limit: params.limit || 10,
        report_type: params.reportType,
        status: params.status,
      });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || { data: [], meta: { total: 0, page: 1, limit: 10, pages: 0 } };
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to fetch reports');
    }
  },
);

/**
 * Thunk: Fetch a single report by ID
 */
export const fetchReport = createAsyncThunk(
  'reports/fetchReport',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await reportsApi.getReport(id);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || null;
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to fetch report');
    }
  },
);

/**
 * Thunk: Generate a new report
 */
export const generateNewReport = createAsyncThunk(
  'reports/generateNewReport',
  async (data: GenerateReportRequest, { rejectWithValue }) => {
    try {
      const response = await reportsApi.generateReport(data);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || null;
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to generate report');
    }
  },
);

/**
 * Thunk: Delete a report
 */
export const deleteReportThunk = createAsyncThunk(
  'reports/deleteReport',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await reportsApi.deleteReport(id);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to delete report');
    }
  },
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setSelectedReport: (state, action: PayloadAction<GeneratedReport | null>) => {
      state.selectedReport = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isSubmitting = false;
      state.isRefreshing = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetState: () => initialState,

    resetReports: (state) => {
      state.reports = [];
      state.page = 1;
      state.hasMore = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Templates
    builder.addCase(fetchTemplates.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplates.fulfilled, (state, action) => {
      state.templates = action.payload;
      state.isLoading = false;
    });
    builder.addCase(fetchTemplates.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Reports (paginated)
    builder.addCase(fetchReports.pending, (state, action) => {
      const isReset = (action.meta.arg as any).reset;
      if (isReset) {
        state.isLoading = true;
        state.reports = [];
        state.page = 1;
      } else {
        state.isRefreshing = true;
      }
      state.error = null;
    });
    builder.addCase(fetchReports.fulfilled, (state, action) => {
      const newReports = action.payload.data || [];
      const isReset = (action.meta.arg as any).reset;

      if (isReset) {
        state.reports = newReports;
      } else {
        state.reports = [...state.reports, ...newReports];
      }

      state.page = action.payload.meta?.page || 1;
      state.hasMore = (action.payload.meta?.pages || 0) > state.page;
      state.isLoading = false;
      state.isRefreshing = false;
    });
    builder.addCase(fetchReports.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = action.payload as string;
    });

    // Fetch Single Report
    builder.addCase(fetchReport.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchReport.fulfilled, (state, action) => {
      state.selectedReport = action.payload;
      state.isLoading = false;
      // Also update in reports list if present
      if (action.payload) {
        const idx = state.reports.findIndex((r) => r.id === action.payload?.id);
        if (idx !== -1) {
          state.reports[idx] = action.payload;
        }
      }
    });
    builder.addCase(fetchReport.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Generate New Report
    builder.addCase(generateNewReport.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(generateNewReport.fulfilled, (state, action) => {
      if (action.payload) {
        // Add new report to the front (most recent first)
        state.reports.unshift(action.payload);
        state.selectedReport = action.payload;
      }
      state.isSubmitting = false;
    });
    builder.addCase(generateNewReport.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });

    // Delete Report
    builder.addCase(deleteReportThunk.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(deleteReportThunk.fulfilled, (state, action) => {
      state.reports = state.reports.filter((r) => r.id !== action.payload);
      if (state.selectedReport?.id === action.payload) {
        state.selectedReport = null;
      }
      state.isSubmitting = false;
    });
    builder.addCase(deleteReportThunk.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });
  },
});

export const {
  setSelectedReport,
  setError,
  clearError,
  resetState,
  resetReports,
} = reportsSlice.actions;

// Selectors
export const selectReports = (state: { reports: ReportsState }) =>
  state.reports.reports;

export const selectTemplates = (state: { reports: ReportsState }) =>
  state.reports.templates;

export const selectSelectedReport = (state: { reports: ReportsState }) =>
  state.reports.selectedReport;

export const selectReportsLoading = (state: { reports: ReportsState }) =>
  state.reports.isLoading;

export const selectReportsRefreshing = (state: { reports: ReportsState }) =>
  state.reports.isRefreshing;

export const selectReportsSubmitting = (state: { reports: ReportsState }) =>
  state.reports.isSubmitting;

export const selectReportsError = (state: { reports: ReportsState }) =>
  state.reports.error;

export const selectReportsHasMore = (state: { reports: ReportsState }) =>
  state.reports.hasMore;

export const selectReportsPage = (state: { reports: ReportsState }) =>
  state.reports.page;

export default reportsSlice.reducer;
