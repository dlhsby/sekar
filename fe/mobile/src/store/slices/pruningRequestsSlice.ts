/**
 * Pruning Requests Slice
 * State management for kecamatan pruning request submissions
 * Phase 3 sub-phase 3-10
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { PruningRequest } from '../../types/models.types';
import * as pruningRequestsApi from '../../services/api/pruningRequestsApi';

type ThunkError = { error: string; code?: string };

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
  // Admin list state
  adminList: PruningRequest[];
  adminListLoading: boolean;
  adminListError: { error: string; code?: string } | null;
  adminListPagination: { page: number; total: number; limit: number };
  // Review/convert state
  reviewingId: string | null;
  convertingId: string | null;
  reschedulingId: string | null;
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
  adminList: [],
  adminListLoading: false,
  adminListError: null,
  adminListPagination: { page: 1, total: 0, limit: 20 },
  reviewingId: null,
  convertingId: null,
  reschedulingId: null,
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
      // Optional after Phase 3 Apr 27 redesign — admin sets the date during convert-to-task
      detail_date?: string;
      target_count?: number;
      photo_keys: string[];
      notes?: string;
      rayon_id?: string;
      kecamatan_name?: string;
      // Phase 3 Apr 27 — staff_kecamatan redesign fields
      tree_count?: number;
      tree_height_estimate?: string;
      tree_diameter_estimate?: string;
      requester_name?: string;
      requester_phone?: string;
      rt_leader_name?: string;
      rt_leader_phone?: string;
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
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
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
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
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
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Fetch pruning requests for admin review
 */
export const fetchAdminPruningRequests = createAsyncThunk(
  'pruningRequests/fetchAdmin',
  async (
    filters?: {
      status?: string;
      rayonId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await pruningRequestsApi.getAdminPruningRequests(filters);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Review a pruning request
 */
export const reviewPruningRequest = createAsyncThunk(
  'pruningRequests/review',
  async (
    {
      id,
      decision,
      reviewNotes,
    }: {
      id: string;
      decision: 'approve' | 'reject';
      reviewNotes?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await pruningRequestsApi.reviewPruningRequest(id, {
        decision,
        reviewNotes,
      });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Convert pruning request to task
 */
export const convertPruningRequestToTask = createAsyncThunk(
  'pruningRequests/convertToTask',
  async (
    {
      id,
      areaId,
      assignedTo,
      scheduledDate,
      caseType,
      pruningAction,
      units,
    }: {
      id: string;
      areaId: string;
      assignedTo: string;
      scheduledDate: string;
      caseType: 'GT' | 'PT' | 'PS' | 'PD' | 'PK';
      pruningAction: 'PM' | 'PB' | 'PC';
      units?: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await pruningRequestsApi.convertPruningRequestToTask(
        id,
        {
          areaId,
          assignedTo,
          scheduledDate,
          caseType,
          pruningAction,
          units,
        },
      );
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Reschedule a pruning request's expected date (Round 4).
 */
export const reschedulePruningRequest = createAsyncThunk(
  'pruningRequests/reschedule',
  async (
    { id, expectedDate }: { id: string; expectedDate: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await pruningRequestsApi.reschedulePruningRequest(id, {
        expectedDate,
      });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
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
     * Set sync error (from syncManager when offline queue fails)
     */
    setSyncError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
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
        state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
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
        state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
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
        state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
      });

    // Fetch admin list
    builder
      .addCase(fetchAdminPruningRequests.pending, (state) => {
        state.adminListLoading = true;
        state.adminListError = null;
      })
      .addCase(fetchAdminPruningRequests.fulfilled, (state, action) => {
        state.adminListLoading = false;
        state.adminList = action.payload;
        // Index into byId
        action.payload.forEach((request) => {
          state.byId[request.id] = request;
        });
        state.adminListError = null;
      })
      .addCase(fetchAdminPruningRequests.rejected, (state, action) => {
        state.adminListLoading = false;
        state.adminListError = {
          error: (action.payload as ThunkError | undefined)?.error ?? 'Error',
          code: (action.payload as ThunkError | undefined)?.code,
        };
      });

    // Review request
    builder
      .addCase(reviewPruningRequest.pending, (state, action) => {
        state.reviewingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(reviewPruningRequest.fulfilled, (state, action) => {
        state.reviewingId = null;
        const request = action.payload;
        state.byId[request.id] = request;
        // Update in adminList
        const adminIndex = state.adminList.findIndex((r) => r.id === request.id);
        if (adminIndex !== -1) {
          state.adminList[adminIndex] = request;
        }
        state.error = null;
      })
      .addCase(reviewPruningRequest.rejected, (state, action) => {
        state.reviewingId = null;
        state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
      });

    // Convert to task
    builder
      .addCase(convertPruningRequestToTask.pending, (state, action) => {
        state.convertingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(convertPruningRequestToTask.fulfilled, (state, action) => {
        state.convertingId = null;
        const request = action.payload;
        state.byId[request.id] = request;
        // Update in adminList
        const adminIndex = state.adminList.findIndex((r) => r.id === request.id);
        if (adminIndex !== -1) {
          state.adminList[adminIndex] = request;
        }
        state.error = null;
      })
      .addCase(convertPruningRequestToTask.rejected, (state, action) => {
        state.convertingId = null;
        state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
      });

    // Reschedule (Round 4)
    builder
      .addCase(reschedulePruningRequest.pending, (state, action) => {
        state.reschedulingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(reschedulePruningRequest.fulfilled, (state, action) => {
        state.reschedulingId = null;
        const request = action.payload;
        if (request) {
          state.byId[request.id] = request;
          const adminIndex = state.adminList.findIndex((r) => r.id === request.id);
          if (adminIndex !== -1) {
            state.adminList[adminIndex] = request;
          }
          const myIndex = state.mine.findIndex((r) => r.id === request.id);
          if (myIndex !== -1) {
            state.mine[myIndex] = request;
          }
        }
        state.error = null;
      })
      .addCase(reschedulePruningRequest.rejected, (state, action) => {
        state.reschedulingId = null;
        state.error = (action.payload as ThunkError | undefined)?.error ?? 'Error';
      });
  },
});

export const {
  updateDraft,
  setDraft,
  clearDraft,
  selectRequest,
  clearError,
  setSyncError,
  resetState,
} = pruningRequestsSlice.actions;

export default pruningRequestsSlice.reducer;
