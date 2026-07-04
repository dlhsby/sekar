/**
 * Assets Slice
 * Redux state for asset management (Phase 5-3)
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type {
  Asset,
  AssetCategory,
  AssetAssignment,
  PaginatedAssetsResponse,
} from '../../types/assets.types';
import * as assetsApi from '../../services/api/assetsApi';
import i18n from '../../i18n/config';

interface AssetsState {
  assets: Asset[];
  myAssets: AssetAssignment[];
  categories: AssetCategory[];
  selectedAsset: Asset | null;
  currentPage: number;
  totalPages: number;
  totalAssets: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: AssetsState = {
  assets: [],
  myAssets: [],
  categories: [],
  selectedAsset: null,
  currentPage: 1,
  totalPages: 1,
  totalAssets: 0,
  loading: false,
  submitting: false,
  error: null,
};

// Async Thunks

export const fetchCategories = createAsyncThunk(
  'assets/fetchCategories',
  async (_, { rejectWithValue }) => {
    const response = await assetsApi.getCategories();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data || [];
  },
);

export const fetchAssets = createAsyncThunk(
  'assets/fetchAssets',
  async (
    filters: assetsApi.AssetFilters | undefined,
    { rejectWithValue },
  ) => {
    const response = await assetsApi.getAssets(filters);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data || { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };
  },
);

export const fetchAsset = createAsyncThunk(
  'assets/fetchAsset',
  async (id: string, { rejectWithValue }) => {
    const response = await assetsApi.getAssetById(id);
    if (response.error || !response.data) {
      return rejectWithValue(response.error || i18n.t('assets:errors.notFound'));
    }
    return response.data;
  },
);

export const scanAsset = createAsyncThunk(
  'assets/scanAsset',
  async (code: string, { rejectWithValue }) => {
    const response = await assetsApi.scanAssetByCode(code);
    if (response.error || !response.data) {
      return rejectWithValue(response.error || i18n.t('assets:errors.notFound'));
    }
    return response.data;
  },
);

export const fetchMyAssets = createAsyncThunk(
  'assets/fetchMyAssets',
  async (_, { rejectWithValue }) => {
    const response = await assetsApi.getMyAssets();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data || [];
  },
);

export const checkoutAsset = createAsyncThunk(
  'assets/checkoutAsset',
  async (
    {
      assetId,
      payload,
    }: {
      assetId: string;
      payload: assetsApi.CheckoutPayload;
    },
    { rejectWithValue },
  ) => {
    const response = await assetsApi.checkoutAsset(assetId, payload);
    if (response.error || !response.data) {
      return rejectWithValue(response.error || i18n.t('assets:errors.checkoutAsset'));
    }
    return response.data;
  },
);

export const returnAsset = createAsyncThunk(
  'assets/returnAsset',
  async (
    {
      assetId,
      payload,
    }: {
      assetId: string;
      payload: assetsApi.ReturnPayload;
    },
    { rejectWithValue },
  ) => {
    const response = await assetsApi.returnAsset(assetId, payload);
    if (response.error || !response.data) {
      return rejectWithValue(response.error || i18n.t('assets:errors.returnAsset'));
    }
    return response.data;
  },
);

export const fetchAssetAssignments = createAsyncThunk(
  'assets/fetchAssignments',
  async (assetId: string, { rejectWithValue }) => {
    const response = await assetsApi.getAssetAssignments(assetId);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data || [];
  },
);

// Slice

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setSelectedAsset: (state, action: PayloadAction<Asset | null>) => {
      state.selectedAsset = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchCategories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.loading = false;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.fetchCategories');
      });

    // fetchAssets
    builder
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action) => {
        const data = action.payload as PaginatedAssetsResponse;
        state.assets = data.data;
        state.currentPage = data.pagination.page;
        state.totalPages = data.pagination.pages;
        state.totalAssets = data.pagination.total;
        state.loading = false;
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.fetchAssets');
      });

    // fetchAsset
    builder
      .addCase(fetchAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAsset.fulfilled, (state, action) => {
        state.selectedAsset = action.payload;
        state.loading = false;
      })
      .addCase(fetchAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.fetchAsset');
      });

    // scanAsset
    builder
      .addCase(scanAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scanAsset.fulfilled, (state, action) => {
        state.selectedAsset = action.payload;
        state.loading = false;
      })
      .addCase(scanAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.notFound');
      });

    // fetchMyAssets
    builder
      .addCase(fetchMyAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAssets.fulfilled, (state, action) => {
        state.myAssets = action.payload;
        state.loading = false;
      })
      .addCase(fetchMyAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.fetchMyAssets');
      });

    // checkoutAsset
    builder
      .addCase(checkoutAsset.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(checkoutAsset.fulfilled, (state, action) => {
        state.submitting = false;
        // Add to myAssets after checkout
        state.myAssets.unshift(action.payload);
        // Update asset status if in list
        const idx = state.assets.findIndex((a) => a.id === action.payload.asset_id);
        if (idx !== -1) {
          state.assets[idx].status = 'in_use';
        }
      })
      .addCase(checkoutAsset.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.checkoutAsset');
      });

    // returnAsset
    builder
      .addCase(returnAsset.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(returnAsset.fulfilled, (state, action) => {
        state.submitting = false;
        // Remove from myAssets
        state.myAssets = state.myAssets.filter(
          (a) => a.id !== action.payload.id,
        );
        // Update asset status if in list
        const idx = state.assets.findIndex((a) => a.id === action.payload.asset_id);
        if (idx !== -1) {
          state.assets[idx].status = 'available';
        }
      })
      .addCase(returnAsset.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.returnAsset');
      });

    // fetchAssetAssignments
    builder
      .addCase(fetchAssetAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssetAssignments.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchAssetAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || i18n.t('assets:errors.fetchAssignments');
      });
  },
});

export const { setSelectedAsset, clearError, resetState } = assetsSlice.actions;

// Selectors

export const selectAssets = (state: RootState) => state.assets.assets;
export const selectMyAssets = (state: RootState) => state.assets.myAssets;
export const selectCategories = (state: RootState) => state.assets.categories;
export const selectSelectedAsset = (state: RootState) => state.assets.selectedAsset;
export const selectAssetsLoading = (state: RootState) => state.assets.loading;
export const selectAssetsSubmitting = (state: RootState) => state.assets.submitting;
export const selectAssetsError = (state: RootState) => state.assets.error;
export const selectAssetsPagination = (state: RootState) => ({
  page: state.assets.currentPage,
  total: state.assets.totalAssets,
  pages: state.assets.totalPages,
});

export default assetsSlice.reducer;
