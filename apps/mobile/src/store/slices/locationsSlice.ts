/**
 * Areas Slice
 *
 * Lightweight cache of master-data areas. Used by admin flows that need to
 * pick an area (e.g. AssignToTaskSheet). Areas rarely change, so the slice
 * holds the full list once and selectors filter client-side by rayon.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Area } from '../../types/models.types';
import { getAreas } from '../../services/api/locationsApi';
import i18n from '../../i18n/config';

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

const locationsSlice = createSlice({
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
        state.error = action.payload ?? i18n.t('errors:loadAreasFailed');
      });
  },
});

export const { clearAreasError } = locationsSlice.actions;
export default locationsSlice.reducer;
