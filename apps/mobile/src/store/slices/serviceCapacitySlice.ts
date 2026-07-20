/**
 * Service Capacity Slice
 * State management for district capacity calendars
 * Phase 3 sub-phase 3-10
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { CapacityRow } from '../../services/api/serviceCapacityApi';
import * as serviceCapacityApi from '../../services/api/serviceCapacityApi';

type ThunkError = { error: string; code?: string };

interface ServiceCapacityState {
  calendarByDistrict: Record<string, CapacityRow[]>;
  loading: boolean;
  error: { error: string; code?: string } | null;
}

const initialState: ServiceCapacityState = {
  calendarByDistrict: {},
  loading: false,
  error: null,
};

/**
 * Fetch capacity calendar for a district
 */
export const fetchCapacity = createAsyncThunk(
  'serviceCapacity/fetch',
  async (
    {
      districtId,
      year,
      fromWeek,
      toWeek,
      serviceType,
    }: {
      districtId: string;
      year?: number;
      fromWeek?: number;
      toWeek?: number;
      serviceType?: 'pruning' | 'other';
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await serviceCapacityApi.getCapacityCalendar(districtId, {
        year,
        fromWeek,
        toWeek,
        serviceType,
      });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { districtId, data: response.data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const code = (err as { code?: string })?.code;
      return rejectWithValue({ error: message, code });
    }
  },
);

const serviceCapacitySlice = createSlice({
  name: 'serviceCapacity',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetState: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchCapacity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCapacity.fulfilled, (state, action) => {
        state.loading = false;
        const { districtId, data } = action.payload;
        state.calendarByDistrict[districtId] = data;
        state.error = null;
      })
      .addCase(fetchCapacity.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          error: (action.payload as ThunkError | undefined)?.error ?? 'Error',
          code: (action.payload as ThunkError | undefined)?.code,
        };
      });
  },
});

export const { clearError, resetState } = serviceCapacitySlice.actions;

export default serviceCapacitySlice.reducer;
