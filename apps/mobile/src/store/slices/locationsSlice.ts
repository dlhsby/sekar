/**
 * Locations Slice
 *
 * Lightweight cache of master-data locations. Used by admin flows that need to
 * pick a location (e.g. AssignToTaskSheet). Locations rarely change, so the slice
 * holds the full list once and selectors filter client-side by rayon.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Location } from '../../types/models.types';
import { getLocations } from '../../services/api/locationsApi';
import i18n from '../../i18n/config';

interface LocationsState {
  list: Location[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: LocationsState = {
  list: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchLocations = createAsyncThunk<Location[], void, { rejectValue: string }>(
  'locations/fetchAll',
  async (_arg, { rejectWithValue }) => {
    const response = await getLocations();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data ?? [];
  },
);

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearLocationsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? i18n.t('errors:loadLocationsFailed');
      });
  },
});

export const { clearLocationsError } = locationsSlice.actions;
export default locationsSlice.reducer;
