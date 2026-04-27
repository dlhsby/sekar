/**
 * Pruning Requests Slice
 * State management for kecamatan pruning request submissions
 * Phase 3 sub-phase 3-10
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { PruningRequest } from '../../types/models.types';
import * as pruningRequestsApi from '../../services/api/pruningRequestsApi';

/**
 * Pruning request submission form draft (persisted in offline queue if offline)
 */
export interface PruningRequestDraft {
  address: string;
  lat: number | null;
  lng: number | null;
  detail_date: string | null; // ISO date (YYYY-MM-DD)
  target_count: number;
  photo_keys: string[]; // S3 keys from upload
  notes: string;
  rayon_id?: string;
}

interface PruningRequestsState {
  mine: PruningRequest[];
  byId: Record<string, PruningRequest>;
  draft: PruningRequestDraft | null;
  isLoading: boolean;
  isSubmitting: boolean;
  submitStatus: 'idle' | 'submitting' | 'success' | 'error';
  error: string | null;
  selectedRequestId: string | null;
}

const initialDraft: PruningRequestDraft = {
  address: '',
  lat: null,
  lng: null,
  detail_date: null,
  target_count: 0,
  photo_keys: [],
  notes: '',
};

const initialState: PruningRequestsState = {
  mine: [],
  byId: {},
  draft: null,
  isLoading: false,
  isSubmitting: false,
  submitStatus: 'idle',
  error: null,
  selectedRequestId: null,
};

/**
 * Submit a new pruning request
 * On success, prepends to `mine` array
 * Phase 3 3-10: When offline, queue action for Phase 4 sync
 */
export const submitPruningRequest = createAsyncThunk(
  'pruningRequests/submit',
  async (
    data: {
      address: string;
      lat: number;
      lng: number;
      detail_date: string;
      target_count: number;
      photo_keys: string[];
      notes?: string;
      rayon_id?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await pruningRequestsApi.submitPruningRequest(data);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(String(err));
    }
  },
);

/**
 * Fetch pruning requests submitted by current user
 */
export const fetchMyPruningRequests = createAsyncThunk(
  'pruningRequests/fetchMine',
  async (
    filters?: {
      limit?: number;
      offset?: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await pruningRequestsApi.getMyPruningRequests(filters);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || [];
    } catch (err) {
      return rejectWithValue(String(err));
    }
  },
);

/**
 * Fetch a single pruning request by ID
 */
export const fetchPruningRequestById = createAsyncThunk(
  'pruningRequests/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await pruningRequestsApi.getPruningRequestById(id);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(String(err));
    }
  },
);

const pruningRequestsSlice = createSlice({
  name: 'pruningRequests',
  initialState,
  reducers: {
    /**
     * Update draft field(s)
     */
    updateDraft: (
      state,
      action: PayloadAction<Partial<PruningRequestDraft>>,
    ) => {
      if (!state.draft) {
        state.draft = { ...initialDraft };
      }
      state.draft = {
        ...state.draft,
        ...action.payload,
      };
    },

    /**
     * Set complete draft
     */
    setDraft: (state, action: PayloadAction<PruningRequestDraft | null>) => {
      state.draft = action.payload;
    },

    /**
     * Clear draft (after successful submit or on cancel)
     */
    clearDraft: (state) => {
      state.draft = null;
      state.submitStatus = 'idle';
      state.error = null;
    },

    /**
     * Select a request for detail view
     */
    selectRequest: (state, action: PayloadAction<string | null>) => {
      state.selectedRequestId = action.payload;
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Reset slice to initial state
     */
    resetState: () => initialState,
  },

  extraReducers: (builder) => {
    // Submit request
    builder
      .addCase(submitPruningRequest.pending, (state) => {
        state.isSubmitting = true;
        state.submitStatus = 'submitting';
        state.error = null;
      })
      .addCase(submitPruningRequest.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submitStatus = 'success';
        const request = action.payload;
        // Prepend to mine array (newest first)
        state.mine.unshift(request);
        // Store in byId map
        state.byId[request.id] = request;
        state.draft = null;
        state.error = null;
      })
      .addCase(submitPruningRequest.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitStatus = 'error';
        state.error = String(action.payload);
      });

    // Fetch my requests
    builder
      .addCase(fetchMyPruningRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyPruningRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mine = action.payload;
        // Index into byId for quick lookup
        action.payload.forEach((request) => {
          state.byId[request.id] = request;
        });
        state.error = null;
      })
      .addCase(fetchMyPruningRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = String(action.payload);
      });

    // Fetch by ID
    builder
      .addCase(fetchPruningRequestById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPruningRequestById.fulfilled, (state, action) => {
        state.isLoading = false;
        const request = action.payload;
        state.byId[request.id] = request;
        // Update in mine if it exists
        const existingIndex = state.mine.findIndex((r) => r.id === request.id);
        if (existingIndex !== -1) {
          state.mine[existingIndex] = request;
        }
        state.error = null;
      })
      .addCase(fetchPruningRequestById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = String(action.payload);
      });
  },
});

export const {
  updateDraft,
  setDraft,
  clearDraft,
  selectRequest,
  clearError,
  resetState,
} = pruningRequestsSlice.actions;

export default pruningRequestsSlice.reducer;
