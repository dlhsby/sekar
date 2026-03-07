/**
 * Monitoring Slice
 * Phase 2D: Real-time monitoring state for map dashboard
 * Manages live users, filters, selected user, location history, staffing summary
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  LiveUser,
  UserDaySummary,
  LocationHistory,
  StaffingSummaryItem,
  TrackingStatus,
} from '../../types/models.types';
import type { MonitoringFilters } from '../../types/api.types';
import {
  getLiveUsers,
  getUserDaySummary,
  getUserLocationHistory,
  getStaffingSummary,
} from '../../services/api/monitoringApi';

// ─── State ────────────────────────────────────────────────────────────────────

interface StatusCounts {
  active: number;
  inactive: number;
  outside_area: number;
  missing: number;
  offline: number;
}

interface MonitoringState {
  liveUsers: LiveUser[];
  cityStats: Record<string, unknown> | null;
  rayonStats: Record<string, Record<string, unknown>>;
  areaStats: Record<string, Record<string, unknown>>;
  filters: MonitoringFilters;
  selectedUser: LiveUser | null;
  userDaySummary: UserDaySummary | null;
  locationHistory: LocationHistory | null;
  staffingSummary: StaffingSummaryItem[];
  statusCounts: StatusCounts;
  isLoading: boolean;
  isLoadingDaySummary: boolean;
  isLoadingLocationHistory: boolean;
  isLoadingStaffing: boolean;
  error: string | null;
}

const initialStatusCounts: StatusCounts = {
  active: 0,
  inactive: 0,
  outside_area: 0,
  missing: 0,
  offline: 0,
};

const initialState: MonitoringState = {
  liveUsers: [],
  cityStats: null,
  rayonStats: {},
  areaStats: {},
  filters: {},
  selectedUser: null,
  userDaySummary: null,
  locationHistory: null,
  staffingSummary: [],
  statusCounts: initialStatusCounts,
  isLoading: false,
  isLoadingDaySummary: false,
  isLoadingLocationHistory: false,
  isLoadingStaffing: false,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatusCounts(users: LiveUser[]): StatusCounts {
  return users.reduce(
    (counts, user) => {
      const key = user.status as keyof StatusCounts;
      if (key in counts) {
        return { ...counts, [key]: counts[key] + 1 };
      }
      return counts;
    },
    { ...initialStatusCounts },
  );
}

function updateUserInList(
  users: LiveUser[],
  updatedUser: Partial<LiveUser> & { id: string },
): LiveUser[] {
  return users.map(u =>
    u.id === updatedUser.id ? { ...u, ...updatedUser } : u,
  );
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchLiveUsers = createAsyncThunk(
  'monitoring/fetchLiveUsers',
  async (filters: MonitoringFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await getLiveUsers(filters);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue('Gagal memuat data pengguna aktif');
    }
  },
);

export const fetchUserDaySummary = createAsyncThunk(
  'monitoring/fetchUserDaySummary',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await getUserDaySummary(userId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue('Gagal memuat ringkasan harian pengguna');
    }
  },
);

export const fetchLocationHistory = createAsyncThunk(
  'monitoring/fetchLocationHistory',
  async (
    args: { userId: string; date: string; shiftId?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await getUserLocationHistory(
        args.userId,
        args.date,
        args.shiftId,
      );
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue('Gagal memuat riwayat lokasi');
    }
  },
);

export const fetchStaffingSummary = createAsyncThunk(
  'monitoring/fetchStaffingSummary',
  async (
    filters: { rayon_id?: string; area_id?: string } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const response = await getStaffingSummary(filters);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data?.items ?? [];
    } catch (err) {
      return rejectWithValue('Gagal memuat ringkasan kepegawaian');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    setLiveUsers(state, action: PayloadAction<LiveUser[]>) {
      state.liveUsers = action.payload;
      state.statusCounts = computeStatusCounts(action.payload);
      state.error = null;
    },

    updateLiveUser(
      state,
      action: PayloadAction<Partial<LiveUser> & { id: string }>,
    ) {
      state.liveUsers = updateUserInList(state.liveUsers, action.payload);
      state.statusCounts = computeStatusCounts(state.liveUsers);
      if (state.selectedUser?.id === action.payload.id) {
        state.selectedUser = { ...state.selectedUser, ...action.payload };
      }
    },

    setCityStats(state, action: PayloadAction<Record<string, unknown> | null>) {
      state.cityStats = action.payload;
    },

    setRayonStats(
      state,
      action: PayloadAction<Record<string, Record<string, unknown>>>,
    ) {
      state.rayonStats = action.payload;
    },

    setAreaStats(
      state,
      action: PayloadAction<Record<string, Record<string, unknown>>>,
    ) {
      state.areaStats = action.payload;
    },

    setMonitoringFilters(
      state,
      action: PayloadAction<Partial<MonitoringFilters>>,
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetMonitoringFilters(state) {
      state.filters = {};
    },

    setSelectedUser(state, action: PayloadAction<LiveUser | null>) {
      state.selectedUser = action.payload;
    },

    setUserDaySummary(state, action: PayloadAction<UserDaySummary | null>) {
      state.userDaySummary = action.payload;
    },

    setLocationHistory(state, action: PayloadAction<LocationHistory | null>) {
      state.locationHistory = action.payload;
    },

    setStaffingSummary(state, action: PayloadAction<StaffingSummaryItem[]>) {
      state.staffingSummary = action.payload;
    },

    setStatusCounts(state, action: PayloadAction<StatusCounts>) {
      state.statusCounts = action.payload;
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
  extraReducers: builder => {
    // fetchLiveUsers
    builder.addCase(fetchLiveUsers.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchLiveUsers.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload) {
        state.liveUsers = action.payload.users;
        state.statusCounts = {
          active: action.payload.total_active ?? 0,
          inactive: action.payload.total_inactive ?? 0,
          outside_area: action.payload.total_outside_area ?? 0,
          missing: action.payload.total_missing ?? 0,
          offline: action.payload.total_offline ?? 0,
        };
      }
    });
    builder.addCase(fetchLiveUsers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // fetchUserDaySummary
    builder.addCase(fetchUserDaySummary.pending, state => {
      state.isLoadingDaySummary = true;
    });
    builder.addCase(fetchUserDaySummary.fulfilled, (state, action) => {
      state.isLoadingDaySummary = false;
      state.userDaySummary = action.payload ?? null;
    });
    builder.addCase(fetchUserDaySummary.rejected, state => {
      state.isLoadingDaySummary = false;
    });

    // fetchLocationHistory
    builder.addCase(fetchLocationHistory.pending, state => {
      state.isLoadingLocationHistory = true;
    });
    builder.addCase(fetchLocationHistory.fulfilled, (state, action) => {
      state.isLoadingLocationHistory = false;
      state.locationHistory = action.payload ?? null;
    });
    builder.addCase(fetchLocationHistory.rejected, state => {
      state.isLoadingLocationHistory = false;
    });

    // fetchStaffingSummary
    builder.addCase(fetchStaffingSummary.pending, state => {
      state.isLoadingStaffing = true;
    });
    builder.addCase(fetchStaffingSummary.fulfilled, (state, action) => {
      state.isLoadingStaffing = false;
      state.staffingSummary = action.payload ?? [];
    });
    builder.addCase(fetchStaffingSummary.rejected, state => {
      state.isLoadingStaffing = false;
    });
  },
});

export const {
  setLiveUsers,
  updateLiveUser,
  setCityStats,
  setRayonStats,
  setAreaStats,
  setMonitoringFilters,
  resetMonitoringFilters,
  setSelectedUser,
  setUserDaySummary,
  setLocationHistory,
  setStaffingSummary,
  setStatusCounts,
  setLoading,
  setError,
} = monitoringSlice.actions;

export default monitoringSlice.reducer;
