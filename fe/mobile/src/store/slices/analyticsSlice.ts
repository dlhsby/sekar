/**
 * Analytics Slice
 * Redux store for analytics data (Phase 5-2)
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { analyticsApi } from '../../services/api';
import type {
  WorkerAnalytics,
  AreaAnalytics,
  DashboardSummary,
  OperationalAnalytics,
} from '../../types/analytics.types';

interface AnalyticsState {
  dashboard: DashboardSummary | null;
  workerAnalytics: WorkerAnalytics | null;
  teamAnalytics: WorkerAnalytics[];
  areas: AreaAnalytics[];
  operational: OperationalAnalytics | null;
  teamPage: number;
  teamHasMore: boolean;
  loading: boolean;
  teamLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  dashboard: null,
  workerAnalytics: null,
  teamAnalytics: [],
  areas: [],
  operational: null,
  teamPage: 1,
  teamHasMore: true,
  loading: false,
  teamLoading: false,
  error: null,
};

/**
 * Thunk: Fetch dashboard summary
 */
export const fetchDashboard = createAsyncThunk(
  'analytics/fetchDashboard',
  async (_, { rejectWithValue }) => {
    const response = await analyticsApi.getDashboard();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data;
  },
);

/**
 * Thunk: Fetch worker's own analytics
 */
export const fetchWorkerAnalytics = createAsyncThunk(
  'analytics/fetchWorkerAnalytics',
  async (
    params: { id: string; date_from?: string; date_to?: string },
    { rejectWithValue },
  ) => {
    const response = await analyticsApi.getWorker(params.id, {
      date_from: params.date_from,
      date_to: params.date_to,
    });
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data;
  },
);

/**
 * Thunk: Fetch team analytics (paginated)
 */
export const fetchTeamAnalytics = createAsyncThunk(
  'analytics/fetchTeamAnalytics',
  async (
    params: {
      page: number;
      limit?: number;
      rayon_id?: string;
      area_id?: string;
      reset?: boolean;
    },
    { rejectWithValue },
  ) => {
    const response = await analyticsApi.getWorkers({
      page: params.page,
      limit: params.limit || 10,
      rayon_id: params.rayon_id,
      area_id: params.area_id,
      sort_by: 'performance_score',
      sort_dir: 'desc',
    });
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data;
  },
);

/**
 * Thunk: Fetch area analytics
 */
export const fetchAreas = createAsyncThunk(
  'analytics/fetchAreas',
  async (
    params: { rayon_id?: string; limit?: number } | undefined,
    { rejectWithValue },
  ): Promise<AreaAnalytics[]> => {
    const response = await analyticsApi.getAreaAnalytics({
      page: 1,
      limit: params?.limit || 20,
      rayon_id: params?.rayon_id,
    });
    if (response.error) {
      return rejectWithValue(response.error) as unknown as AreaAnalytics[];
    }
    return response.data?.data || [];
  },
);

/**
 * Thunk: Fetch operational analytics
 */
export const fetchOperational = createAsyncThunk(
  'analytics/fetchOperational',
  async (params: { date_from?: string; date_to?: string } | undefined, { rejectWithValue }) => {
    const response = await analyticsApi.getOperational(params);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data;
  },
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetTeamAnalytics: (state) => {
      state.teamAnalytics = [];
      state.teamPage = 1;
      state.teamHasMore = true;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch Dashboard
    builder.addCase(fetchDashboard.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDashboard.fulfilled, (state, action) => {
      if (action.payload) {
        state.dashboard = action.payload;
      }
      state.loading = false;
    });
    builder.addCase(fetchDashboard.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });

    // Fetch Worker Analytics
    builder.addCase(fetchWorkerAnalytics.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWorkerAnalytics.fulfilled, (state, action) => {
      if (action.payload) {
        state.workerAnalytics = action.payload;
      }
      state.loading = false;
    });
    builder.addCase(fetchWorkerAnalytics.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });

    // Fetch Team Analytics
    builder.addCase(fetchTeamAnalytics.pending, (state, action) => {
      const arg = action.meta.arg;
      if ((arg?.reset ?? false) || arg?.page === 1) {
        state.teamLoading = true;
        state.teamAnalytics = [];
      }
      state.error = null;
    });
    builder.addCase(fetchTeamAnalytics.fulfilled, (state, action) => {
      const arg = action.meta.arg;
      const isReset = (arg?.reset ?? false) || arg?.page === 1;
      const payload = action.payload;
      if (payload) {
        if (isReset) {
          state.teamAnalytics = payload.data || [];
        } else {
          state.teamAnalytics = [...state.teamAnalytics, ...(payload.data || [])];
        }
        state.teamPage = payload.page;
        state.teamHasMore = payload.hasMore;
      }
      state.teamLoading = false;
    });
    builder.addCase(fetchTeamAnalytics.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Error fetching team analytics';
      state.teamLoading = false;
    });

    // Fetch Areas
    builder.addCase(fetchAreas.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAreas.fulfilled, (state, action) => {
      state.areas = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchAreas.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });

    // Fetch Operational
    builder.addCase(fetchOperational.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchOperational.fulfilled, (state, action) => {
      if (action.payload) {
        state.operational = action.payload;
      }
      state.loading = false;
    });
    builder.addCase(fetchOperational.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });
  },
});

export const { setError, clearError, resetTeamAnalytics, resetState } = analyticsSlice.actions;

// Selectors
export const selectDashboard = (state: { analytics: AnalyticsState }) =>
  state.analytics.dashboard;

export const selectWorkerAnalytics = (state: { analytics: AnalyticsState }) =>
  state.analytics.workerAnalytics;

export const selectTeamAnalytics = (state: { analytics: AnalyticsState }) =>
  state.analytics.teamAnalytics;

export const selectAreas = (state: { analytics: AnalyticsState }) =>
  state.analytics.areas;

export const selectOperational = (state: { analytics: AnalyticsState }) =>
  state.analytics.operational;

export const selectAnalyticsLoading = (state: { analytics: AnalyticsState }) =>
  state.analytics.loading;

export const selectTeamAnalyticsLoading = (state: { analytics: AnalyticsState }) =>
  state.analytics.teamLoading;

export const selectTeamPage = (state: { analytics: AnalyticsState }) =>
  state.analytics.teamPage;

export const selectTeamHasMore = (state: { analytics: AnalyticsState }) =>
  state.analytics.teamHasMore;

export const selectAnalyticsError = (state: { analytics: AnalyticsState }) =>
  state.analytics.error;

export default analyticsSlice.reducer;
