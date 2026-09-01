/**
 * Users Slice
 *
 * Lightweight cache of master-data users. Used by admin flows that need to
 * pick an assignee (e.g. AssignToTaskSheet, task assign sheets). Selectors
 * filter client-side by role / area / district since the user list is small
 * enough to ship in one request.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from '../../types/models.types';
import { getUsers } from '../../services/api/usersApi';
import i18n from '../../i18n/config';

interface UsersState {
  list: User[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: UsersState = {
  list: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
  'users/fetchAll',
  async (_arg, { rejectWithValue }) => {
    const response = await getUsers();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data ?? [];
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? i18n.t('errors:loadUsersFailed');
      });
  },
});

export const { clearUsersError } = usersSlice.actions;
export default usersSlice.reducer;
