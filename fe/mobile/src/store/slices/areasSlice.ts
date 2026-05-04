/**
 * Areas Slice
 *
 * Lightweight cache of master-data areas. Used by admin flows that need to
 * pick an area (e.g. ConvertToTaskSheet). Areas rarely change, so the slice
 * holds the full list once and selectors filter client-side by rayon.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Area } from '../../types/models.types';
import { getAreas } from '../../services/api/areasApi';

interface AreasState {
  list: Area[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: AreasState = {
  list: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchAreas = createAsyncThunk<Area[], void, { rejectValue: string }>(
  'areas/fetchAll',
  async (_arg, { rejectWithValue }) => {
    const response = await getAreas();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data ?? [];
  },
);

const areasSlice = createSlice({
  name: 'areas',
  initialState,
  reducers: {
    clearAreasError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAreas.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAreas.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchAreas.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Gagal memuat daftar area';
      });
  },
});

export const { clearAreasError } = areasSlice.actions;
export default areasSlice.reducer;
