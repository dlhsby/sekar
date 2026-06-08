/**
 * Plant Seeds Slice
 * State management for seed inventory operations
 * Phase 3 sub-phase 3-12
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { PlantSeed, SeedTransaction } from '../../types/models.types';
import * as plantSeedsApi from '../../services/api/plantSeedsApi';

type ThunkError = { error: string; code?: string };

interface PlantSeedsState {
  seeds: PlantSeed[];
  seedsTotal: number;
  byId: Record<string, PlantSeed>;
  transactionsBySeed: Record<string, SeedTransaction[]>;
  isLoading: boolean;
  error: { error: string; code?: string } | null;
  selectedSeedId: string | null;
  // Recording transaction state
  isRecording: boolean;
  recordError: string | null;
  // Pagination state
  pagination: { currentPage: number; limit: number };
  searchQuery: string;
}

const initialState: PlantSeedsState = {
  seeds: [],
  seedsTotal: 0,
  byId: {},
  transactionsBySeed: {},
  isLoading: false,
  error: null,
  selectedSeedId: null,
  isRecording: false,
  recordError: null,
  pagination: { currentPage: 1, limit: 20 },
  searchQuery: '',
};

/**
 * Fetch all seeds with optional search and pagination
 */
export const fetchSeeds = createAsyncThunk(
  'plantSeeds/fetchSeeds',
  async (
    filters: {
      search?: string;
      page?: number;
      limit?: number;
    } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const response = await plantSeedsApi.getSeeds(filters);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data || { items: [], total: 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

/**
 * Fetch details for a single seed
 */
export const fetchSeedById = createAsyncThunk(
  'plantSeeds/fetchSeedById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await plantSeedsApi.getSeedById(id);
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
 * Create a new seed
 */
export const createSeed = createAsyncThunk(
  'plantSeeds/createSeed',
  async (
    data: {
      nameId: string;
      speciesId?: string;
      unit: 'gram' | 'piece' | 'packet';
      stockQty?: number;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await plantSeedsApi.createSeed(data);
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
 * Record a transaction (purchase, distribution, or adjustment)
 */
export const recordTransaction = createAsyncThunk(
  'plantSeeds/recordTransaction',
  async (
    {
      seedId,
      data,
    }: {
      seedId: string;
      data: {
        transactionType: 'purchase' | 'distribution' | 'adjustment';
        qty: number;
        unitPrice?: number;
        supplier?: string;
        receiptUrl?: string;
        toRayonId?: string;
        toAreaId?: string;
        recipientName?: string;
        occurredAt: string;
        notes?: string;
      };
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await plantSeedsApi.recordTransaction(seedId, data);
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
 * Fetch transaction ledger for a seed
 */
export const fetchSeedTransactions = createAsyncThunk(
  'plantSeeds/fetchTransactions',
  async (
    {
      seedId,
      filters,
    }: {
      seedId: string;
      filters?: {
        type?: 'purchase' | 'distribution' | 'adjustment';
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
      };
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await plantSeedsApi.getSeedTransactions(seedId, filters);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { seedId, data: response.data || { items: [], total: 0 } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

const plantSeedsSlice = createSlice({
  name: 'plantSeeds',
  initialState,
  reducers: {
    /**
     * Select a seed for detail view
     */
    selectSeed: (state, action: PayloadAction<string | null>) => {
      state.selectedSeedId = action.payload;
    },

    /**
     * Update search query
     */
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.pagination.currentPage = 1; // Reset to page 1 on search
    },

    /**
     * Set current page
     */
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = action.payload;
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
      state.recordError = null;
    },

    /**
     * Reset slice to initial state
     */
    resetState: () => initialState,
  },

  extraReducers: (builder) => {
    // Fetch seeds list
    builder
      .addCase(fetchSeeds.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSeeds.fulfilled, (state, action) => {
        state.isLoading = false;
        state.seeds = action.payload.items;
        state.seedsTotal = action.payload.total;
        // Index seeds for quick lookup
        action.payload.items.forEach((seed) => {
          state.byId[seed.id] = seed;
        });
        state.error = null;
      })
      .addCase(fetchSeeds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = {
          error: (action.payload as ThunkError | undefined)?.error ?? 'Error',
          code: (action.payload as ThunkError | undefined)?.code,
        };
      });

    // Fetch single seed
    builder
      .addCase(fetchSeedById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSeedById.fulfilled, (state, action) => {
        state.isLoading = false;
        const seed = action.payload;
        if (!seed) {
          return;
        }
        state.byId[seed.id] = seed;
        // Update in seeds list if it exists
        const index = state.seeds.findIndex((s) => s.id === seed.id);
        if (index !== -1) {
          state.seeds[index] = seed;
        }
        state.error = null;
      })
      .addCase(fetchSeedById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = {
          error: (action.payload as ThunkError | undefined)?.error ?? 'Error',
          code: (action.payload as ThunkError | undefined)?.code,
        };
      });

    // Create seed
    builder
      .addCase(createSeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSeed.fulfilled, (state, action) => {
        state.isLoading = false;
        const seed = action.payload;
        if (!seed) {
          return;
        }
        state.seeds.unshift(seed); // Prepend new seed
        state.byId[seed.id] = seed;
        state.seedsTotal += 1;
        state.error = null;
      })
      .addCase(createSeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = {
          error: (action.payload as ThunkError | undefined)?.error ?? 'Error',
          code: (action.payload as ThunkError | undefined)?.code,
        };
      });

    // Record transaction
    builder
      .addCase(recordTransaction.pending, (state) => {
        state.isRecording = true;
        state.recordError = null;
      })
      .addCase(recordTransaction.fulfilled, (state, action) => {
        state.isRecording = false;
        const payload = action.payload;
        if (!payload) {
          return;
        }
        const { seed, transaction } = payload;
        // Update seed in state
        state.byId[seed.id] = seed;
        const seedIndex = state.seeds.findIndex((s) => s.id === seed.id);
        if (seedIndex !== -1) {
          state.seeds[seedIndex] = seed;
        }
        // Add transaction to ledger
        if (!state.transactionsBySeed[seed.id]) {
          state.transactionsBySeed[seed.id] = [];
        }
        state.transactionsBySeed[seed.id].unshift(transaction);
        state.recordError = null;
      })
      .addCase(recordTransaction.rejected, (state, action) => {
        state.isRecording = false;
        state.recordError = (action.payload as ThunkError | undefined)?.error ?? 'Error';
      });

    // Fetch transactions
    builder
      .addCase(fetchSeedTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSeedTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        const { seedId, data } = action.payload;
        state.transactionsBySeed[seedId] = data.items;
        state.error = null;
      })
      .addCase(fetchSeedTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = {
          error: (action.payload as ThunkError | undefined)?.error ?? 'Error',
          code: (action.payload as ThunkError | undefined)?.code,
        };
      });
  },
});

export const {
  selectSeed,
  setSearchQuery,
  setPage,
  clearError,
  resetState,
} = plantSeedsSlice.actions;

export default plantSeedsSlice.reducer;
