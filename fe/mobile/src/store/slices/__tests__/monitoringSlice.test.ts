/**
 * Monitoring Slice Tests
 * Phase 2D: Real-time monitoring state — live users, filters, selected user,
 * location history, staffing summary, and status counts.
 */

import monitoringReducer, {
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
  fetchLiveUsers,
  fetchUserDaySummary,
  fetchLocationHistory,
  fetchStaffingSummary,
} from '../monitoringSlice';
import type {
  LiveUser,
  UserDaySummary,
  LocationHistory,
  StaffingSummaryItem,
} from '../../../types/models.types';

// ─── Mock monitoringApi ────────────────────────────────────────────────────────

jest.mock('../../../services/api/monitoringApi', () => ({
  getLiveUsers: jest.fn(),
  getUserDaySummary: jest.fn(),
  getUserLocationHistory: jest.fn(),
  getStaffingSummary: jest.fn(),
  getBoundaries: jest.fn(),
}));

import {
  getLiveUsers,
  getUserDaySummary,
  getUserLocationHistory,
  getStaffingSummary,
} from '../../../services/api/monitoringApi';

const mockGetLiveUsers = getLiveUsers as jest.MockedFunction<typeof getLiveUsers>;
const mockGetUserDaySummary = getUserDaySummary as jest.MockedFunction<typeof getUserDaySummary>;
const mockGetUserLocationHistory = getUserLocationHistory as jest.MockedFunction<typeof getUserLocationHistory>;
const mockGetStaffingSummary = getStaffingSummary as jest.MockedFunction<typeof getStaffingSummary>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockLiveUser: LiveUser = {
  id: 'user-123',
  full_name: 'Ahmad Satgas',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-123',
  area_name: 'Taman A',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  latitude: -7.250445,
  longitude: 112.768845,
  accuracy: 10,
  battery_level: 85,
  last_update: '2026-02-15T08:00:00Z',
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-123',
  shift_name: 'Shift Pagi',
  shift_definition_id: null,
  clock_in_time: '2026-02-15T07:00:00Z',
  current_task_status: null,
  current_task_title: null,
};

const mockLiveUserInactive: LiveUser = {
  ...mockLiveUser,
  id: 'user-456',
  full_name: 'Budi Linmas',
  role: 'linmas',
  status: 'inactive',
};

const mockLiveUserOutsideArea: LiveUser = {
  ...mockLiveUser,
  id: 'user-789',
  full_name: 'Citra Korlap',
  role: 'korlap',
  status: 'outside_area',
  is_within_area: false,
};

const mockLiveUserMissing: LiveUser = {
  ...mockLiveUser,
  id: 'user-missing',
  full_name: 'Dodi Satgas',
  role: 'satgas',
  status: 'missing',
};

const mockLiveUserOffline: LiveUser = {
  ...mockLiveUser,
  id: 'user-offline',
  full_name: 'Eko Satgas',
  role: 'satgas',
  status: 'offline',
};

const mockUserDaySummary: UserDaySummary = {
  user_id: 'user-123',
  full_name: 'Ahmad Satgas',
  username: 'satgas1',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-123',
  area_name: 'Taman A',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  shift: {
    id: 'shift-123',
    name: 'Shift Pagi',
    clock_in_time: '2026-02-15T07:00:00Z',
    clock_out_time: null,
    duration_minutes: 60,
    outside_boundary: false,
  },
  last_location: {
    latitude: -7.250445,
    longitude: 112.768845,
    accuracy: 10,
    battery_level: 85,
    logged_at: '2026-02-15T08:00:00Z',
    is_within_area: true,
  },
  activities_today: [],
  tasks_today: [],
  whatsapp_links: {
    chat: 'https://wa.me/628123456789',
    call: 'https://wa.me/628123456789',
  },
};

const mockLocationHistory: LocationHistory = {
  user_id: 'user-123',
  user_name: 'Ahmad Satgas',
  role: 'satgas',
  date: '2026-02-15',
  shift_id: 'shift-123',
  shift_name: 'Shift Pagi',
  area_id: 'area-123',
  area_name: 'Taman A',
  clock_in_time: '2026-02-15T07:00:00Z',
  clock_out_time: null,
  points: [
    {
      latitude: -7.250445,
      longitude: 112.768845,
      accuracy: 10,
      battery_level: 85,
      logged_at: '2026-02-15T07:05:00Z',
      is_within_area: true,
    },
  ],
  total_points: 1,
  total_distance_meters: 0,
  time_inside_area_minutes: 55,
  time_outside_area_minutes: 5,
  generated_at: '2026-02-15T08:00:00Z',
};

const mockStaffingItem: StaffingSummaryItem = {
  id: 'rayon-1',
  name: 'Rayon 1',
  type: 'rayon',
  roles: [
    {
      role: 'satgas',
      active: 3,
      idle: 1,
      outside_area: 0,
      missing: 0,
      offline: 1,
      total_assigned: 5,
      total_required: 6,
    },
  ],
  total_active: 3,
  total_idle: 1,
  total_outside_area: 0,
  total_missing: 0,
  total_offline: 1,
  is_fully_staffed: false,
};

// ─── Initial State ─────────────────────────────────────────────────────────────

const initialState = {
  liveUsers: [],
  cityStats: null,
  rayonStats: {},
  areaStats: {},
  filters: {},
  selectedUser: null,
  userDaySummary: null,
  locationHistory: null,
  staffingSummary: [],
  boundaries: null,
  isLoadingBoundaries: false,
  currentDayType: null,
  currentDayTypeLabel: null,
  statusCounts: {
    active: 0,
    inactive: 0,
    outside_area: 0,
    missing: 0,
    offline: 0,
  },
  isLoading: false,
  isLoadingDaySummary: false,
  isLoadingLocationHistory: false,
  isLoadingStaffing: false,
  error: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('monitoringSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial State ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should return initial state on unknown action', () => {
      expect(monitoringReducer(undefined, { type: 'unknown' })).toEqual(
        initialState,
      );
    });
  });

  // ── setLiveUsers ───────────────────────────────────────────────────────────

  describe('setLiveUsers', () => {
    it('should set liveUsers array', () => {
      const state = monitoringReducer(
        initialState,
        setLiveUsers([mockLiveUser]),
      );
      expect(state.liveUsers).toEqual([mockLiveUser]);
      expect(state.liveUsers).toHaveLength(1);
    });

    it('should clear error when setting live users', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = monitoringReducer(errorState, setLiveUsers([mockLiveUser]));
      expect(state.error).toBeNull();
    });

    it('should handle empty array', () => {
      const state = monitoringReducer(
        { ...initialState, liveUsers: [mockLiveUser] },
        setLiveUsers([]),
      );
      expect(state.liveUsers).toEqual([]);
    });
  });

  // ── computeStatusCounts (via setLiveUsers) ─────────────────────────────────

  describe('computeStatusCounts (via setLiveUsers)', () => {
    it('should count a single active user correctly', () => {
      const state = monitoringReducer(
        initialState,
        setLiveUsers([mockLiveUser]),
      );
      expect(state.statusCounts).toEqual({
        active: 1,
        inactive: 0,
        outside_area: 0,
        missing: 0,
        offline: 0,
      });
    });

    it('should count a mixed set of statuses correctly', () => {
      const users: LiveUser[] = [
        mockLiveUser,
        { ...mockLiveUser, id: 'u2', status: 'active' },
        mockLiveUserInactive,
        mockLiveUserOutsideArea,
        mockLiveUserMissing,
        mockLiveUserOffline,
      ];
      const state = monitoringReducer(initialState, setLiveUsers(users));
      expect(state.statusCounts).toEqual({
        active: 2,
        inactive: 1,
        outside_area: 1,
        missing: 1,
        offline: 1,
      });
    });

    it('should produce zero counts for an empty array', () => {
      const state = monitoringReducer(initialState, setLiveUsers([]));
      expect(state.statusCounts).toEqual({
        active: 0,
        inactive: 0,
        outside_area: 0,
        missing: 0,
        offline: 0,
      });
    });

    it('should ignore unknown status values and leave counts unchanged', () => {
      const userWithUnknownStatus = {
        ...mockLiveUser,
        id: 'u-unknown',
        status: 'unknown_status' as LiveUser['status'],
      };
      const state = monitoringReducer(
        initialState,
        setLiveUsers([mockLiveUser, userWithUnknownStatus]),
      );
      // 'unknown_status' is not a key in StatusCounts — count stays at 0 for all except active
      expect(state.statusCounts.active).toBe(1);
      expect(state.statusCounts.inactive).toBe(0);
      expect(state.statusCounts.offline).toBe(0);
    });
  });

  // ── updateLiveUser ─────────────────────────────────────────────────────────

  describe('updateLiveUser', () => {
    it('should update the matching user in liveUsers', () => {
      const stateWithUsers = {
        ...initialState,
        liveUsers: [mockLiveUser, mockLiveUserInactive],
      };
      const state = monitoringReducer(
        stateWithUsers,
        updateLiveUser({ id: 'user-123', status: 'inactive' }),
      );
      expect(state.liveUsers[0].status).toBe('inactive');
    });

    it('should not modify other users', () => {
      const stateWithUsers = {
        ...initialState,
        liveUsers: [mockLiveUser, mockLiveUserInactive],
      };
      const state = monitoringReducer(
        stateWithUsers,
        updateLiveUser({ id: 'user-123', battery_level: 50 }),
      );
      expect(state.liveUsers[1]).toEqual(mockLiveUserInactive);
    });

    it('should recompute statusCounts after update', () => {
      const stateWithUsers = {
        ...initialState,
        liveUsers: [mockLiveUser, mockLiveUserInactive],
        statusCounts: { active: 1, inactive: 1, outside_area: 0, missing: 0, offline: 0 },
      };
      const state = monitoringReducer(
        stateWithUsers,
        updateLiveUser({ id: 'user-123', status: 'offline' }),
      );
      expect(state.statusCounts.active).toBe(0);
      expect(state.statusCounts.offline).toBe(1);
      expect(state.statusCounts.inactive).toBe(1);
    });

    it('should update selectedUser when ids match', () => {
      const stateWithSelected = {
        ...initialState,
        liveUsers: [mockLiveUser],
        selectedUser: mockLiveUser,
      };
      const state = monitoringReducer(
        stateWithSelected,
        updateLiveUser({ id: 'user-123', battery_level: 20, status: 'inactive' }),
      );
      expect(state.selectedUser?.battery_level).toBe(20);
      expect(state.selectedUser?.status).toBe('inactive');
    });

    it('should not change selectedUser when ids do not match', () => {
      const stateWithSelected = {
        ...initialState,
        liveUsers: [mockLiveUser, mockLiveUserInactive],
        selectedUser: mockLiveUser,
      };
      const state = monitoringReducer(
        stateWithSelected,
        updateLiveUser({ id: 'user-456', status: 'offline' }),
      );
      expect(state.selectedUser).toEqual(mockLiveUser);
    });

    it('should leave selectedUser unchanged when no user is selected', () => {
      const stateWithUsers = {
        ...initialState,
        liveUsers: [mockLiveUser],
        selectedUser: null,
      };
      const state = monitoringReducer(
        stateWithUsers,
        updateLiveUser({ id: 'user-123', status: 'inactive' }),
      );
      expect(state.selectedUser).toBeNull();
    });
  });

  // ── setCityStats ───────────────────────────────────────────────────────────

  describe('setCityStats', () => {
    it('should set city stats', () => {
      const stats = { total_active: 5, total_offline: 2 };
      const state = monitoringReducer(initialState, setCityStats(stats));
      expect(state.cityStats).toEqual(stats);
    });

    it('should clear city stats when null is passed', () => {
      const stateWithStats = { ...initialState, cityStats: { total_active: 5 } };
      const state = monitoringReducer(stateWithStats, setCityStats(null));
      expect(state.cityStats).toBeNull();
    });
  });

  // ── setRayonStats ──────────────────────────────────────────────────────────

  describe('setRayonStats', () => {
    it('should set rayon stats map', () => {
      const rayonStats = { 'rayon-1': { active: 3 }, 'rayon-2': { active: 1 } };
      const state = monitoringReducer(initialState, setRayonStats(rayonStats));
      expect(state.rayonStats).toEqual(rayonStats);
    });

    it('should overwrite existing rayon stats', () => {
      const oldStats = { 'rayon-1': { active: 3 } };
      const newStats = { 'rayon-2': { active: 1 } };
      const stateWithOld = { ...initialState, rayonStats: oldStats };
      const state = monitoringReducer(stateWithOld, setRayonStats(newStats));
      expect(state.rayonStats).toEqual(newStats);
      expect(state.rayonStats['rayon-1']).toBeUndefined();
    });
  });

  // ── setAreaStats ───────────────────────────────────────────────────────────

  describe('setAreaStats', () => {
    it('should set area stats map', () => {
      const areaStats = { 'area-1': { staffed: true }, 'area-2': { staffed: false } };
      const state = monitoringReducer(initialState, setAreaStats(areaStats));
      expect(state.areaStats).toEqual(areaStats);
    });
  });

  // ── setMonitoringFilters ───────────────────────────────────────────────────

  describe('setMonitoringFilters', () => {
    it('should merge partial filters into existing filters', () => {
      const stateWithFilters = {
        ...initialState,
        filters: { rayon_id: 'rayon-1', role: 'satgas' },
      };
      const state = monitoringReducer(
        stateWithFilters,
        setMonitoringFilters({ area_id: 'area-1' }),
      );
      expect(state.filters).toEqual({
        rayon_id: 'rayon-1',
        role: 'satgas',
        area_id: 'area-1',
      });
    });

    it('should set filters from empty state', () => {
      const state = monitoringReducer(
        initialState,
        setMonitoringFilters({ role: 'korlap', status: ['active'] }),
      );
      expect(state.filters.role).toBe('korlap');
      expect(state.filters.status).toEqual(['active']);
    });

    it('should overwrite an existing filter key with the new value', () => {
      const stateWithFilters = {
        ...initialState,
        filters: { rayon_id: 'rayon-1' },
      };
      const state = monitoringReducer(
        stateWithFilters,
        setMonitoringFilters({ rayon_id: 'rayon-2' }),
      );
      expect(state.filters.rayon_id).toBe('rayon-2');
    });
  });

  // ── resetMonitoringFilters ─────────────────────────────────────────────────

  describe('resetMonitoringFilters', () => {
    it('should reset filters to empty object', () => {
      const stateWithFilters = {
        ...initialState,
        filters: { rayon_id: 'rayon-1', role: 'satgas', search: 'ahmad' },
      };
      const state = monitoringReducer(stateWithFilters, resetMonitoringFilters());
      expect(state.filters).toEqual({});
    });

    it('should be a no-op when filters are already empty', () => {
      const state = monitoringReducer(initialState, resetMonitoringFilters());
      expect(state.filters).toEqual({});
    });
  });

  // ── setSelectedUser ────────────────────────────────────────────────────────

  describe('setSelectedUser', () => {
    it('should set selected user', () => {
      const state = monitoringReducer(
        initialState,
        setSelectedUser(mockLiveUser),
      );
      expect(state.selectedUser).toEqual(mockLiveUser);
    });

    it('should clear selected user when null is passed', () => {
      const stateWithSelected = { ...initialState, selectedUser: mockLiveUser };
      const state = monitoringReducer(stateWithSelected, setSelectedUser(null));
      expect(state.selectedUser).toBeNull();
    });
  });

  // ── setUserDaySummary ──────────────────────────────────────────────────────

  describe('setUserDaySummary', () => {
    it('should set userDaySummary', () => {
      const state = monitoringReducer(
        initialState,
        setUserDaySummary(mockUserDaySummary),
      );
      expect(state.userDaySummary).toEqual(mockUserDaySummary);
    });

    it('should clear userDaySummary when null is passed', () => {
      const stateWithSummary = { ...initialState, userDaySummary: mockUserDaySummary };
      const state = monitoringReducer(stateWithSummary, setUserDaySummary(null));
      expect(state.userDaySummary).toBeNull();
    });
  });

  // ── setLocationHistory ─────────────────────────────────────────────────────

  describe('setLocationHistory', () => {
    it('should set locationHistory', () => {
      const state = monitoringReducer(
        initialState,
        setLocationHistory(mockLocationHistory),
      );
      expect(state.locationHistory).toEqual(mockLocationHistory);
    });

    it('should clear locationHistory when null is passed', () => {
      const stateWithHistory = { ...initialState, locationHistory: mockLocationHistory };
      const state = monitoringReducer(stateWithHistory, setLocationHistory(null));
      expect(state.locationHistory).toBeNull();
    });
  });

  // ── setStaffingSummary ─────────────────────────────────────────────────────

  describe('setStaffingSummary', () => {
    it('should set staffingSummary array', () => {
      const state = monitoringReducer(
        initialState,
        setStaffingSummary([mockStaffingItem]),
      );
      expect(state.staffingSummary).toEqual([mockStaffingItem]);
      expect(state.staffingSummary).toHaveLength(1);
    });

    it('should handle empty staffingSummary array', () => {
      const stateWithItems = { ...initialState, staffingSummary: [mockStaffingItem] };
      const state = monitoringReducer(stateWithItems, setStaffingSummary([]));
      expect(state.staffingSummary).toEqual([]);
    });
  });

  // ── setStatusCounts ────────────────────────────────────────────────────────

  describe('setStatusCounts', () => {
    it('should set status counts directly', () => {
      const counts = { active: 5, inactive: 2, outside_area: 1, missing: 0, offline: 3 };
      const state = monitoringReducer(initialState, setStatusCounts(counts));
      expect(state.statusCounts).toEqual(counts);
    });
  });

  // ── setLoading ─────────────────────────────────────────────────────────────

  describe('setLoading', () => {
    it('should set isLoading to true', () => {
      const state = monitoringReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set isLoading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = monitoringReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  // ── setError ───────────────────────────────────────────────────────────────

  describe('setError', () => {
    it('should set an error message', () => {
      const state = monitoringReducer(initialState, setError('Gagal memuat'));
      expect(state.error).toBe('Gagal memuat');
    });

    it('should clear isLoading when setting an error', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = monitoringReducer(loadingState, setError('Network error'));
      expect(state.isLoading).toBe(false);
    });

    it('should clear error when null is passed', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = monitoringReducer(errorState, setError(null));
      expect(state.error).toBeNull();
    });
  });

  // ── fetchLiveUsers (async thunk) ───────────────────────────────────────────

  describe('fetchLiveUsers', () => {
    it('should set isLoading and clear error on pending', () => {
      const state = monitoringReducer(
        { ...initialState, error: 'old error' },
        fetchLiveUsers.pending('req-id', undefined),
      );
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should populate liveUsers and statusCounts from API response on fulfilled', () => {
      const apiPayload = {
        users: [mockLiveUser, mockLiveUserInactive],
        total_active: 1,
        total_inactive: 1,
        total_outside_area: 0,
        total_missing: 0,
        total_offline: 0,
        total_online: 1,
        generated_at: '2026-02-15T08:00:00Z',
      };
      const state = monitoringReducer(
        { ...initialState, isLoading: true },
        fetchLiveUsers.fulfilled(apiPayload, 'req-id', undefined),
      );
      expect(state.isLoading).toBe(false);
      expect(state.liveUsers).toEqual([mockLiveUser, mockLiveUserInactive]);
      expect(state.statusCounts).toEqual({
        active: 1,
        inactive: 1,
        outside_area: 0,
        missing: 0,
        offline: 0,
      });
    });

    it('should clear isLoading and not crash when payload is undefined on fulfilled', () => {
      const state = monitoringReducer(
        { ...initialState, isLoading: true },
        fetchLiveUsers.fulfilled(undefined, 'req-id', undefined),
      );
      expect(state.isLoading).toBe(false);
      // liveUsers and statusCounts should remain unchanged from initial
      expect(state.liveUsers).toEqual([]);
    });

    it('should set error and clear isLoading on rejected', () => {
      const state = monitoringReducer(
        { ...initialState, isLoading: true },
        fetchLiveUsers.rejected(
          new Error(),
          'req-id',
          undefined,
          'Gagal memuat data pengguna aktif',
        ),
      );
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Gagal memuat data pengguna aktif');
    });

    it('should call getLiveUsers with provided filters', async () => {
      mockGetLiveUsers.mockResolvedValueOnce({
        data: {
          users: [],
          total_active: 0,
          total_inactive: 0,
          total_outside_area: 0,
          total_missing: 0,
          total_offline: 0,
          total_online: 0,
          generated_at: '2026-02-15T08:00:00Z',
        },
      });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchLiveUsers({ rayon_id: 'rayon-1' });
      await thunk(dispatch, getState, undefined);
      expect(mockGetLiveUsers).toHaveBeenCalledWith({ rayon_id: 'rayon-1' });
    });

    it('should reject with error message when getLiveUsers returns an error field', async () => {
      mockGetLiveUsers.mockResolvedValueOnce({ error: 'Server error' });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchLiveUsers(undefined);
      await thunk(dispatch, getState, undefined);
      const rejectedCall = dispatch.mock.calls.find(
        ([action]) => action.type === fetchLiveUsers.rejected.type,
      );
      expect(rejectedCall).toBeTruthy();
    });
  });

  // ── fetchUserDaySummary (async thunk) ──────────────────────────────────────

  describe('fetchUserDaySummary', () => {
    it('should set isLoadingDaySummary on pending', () => {
      const state = monitoringReducer(
        initialState,
        fetchUserDaySummary.pending('req-id', 'user-123'),
      );
      expect(state.isLoadingDaySummary).toBe(true);
    });

    it('should set userDaySummary and clear isLoadingDaySummary on fulfilled', () => {
      const state = monitoringReducer(
        { ...initialState, isLoadingDaySummary: true },
        fetchUserDaySummary.fulfilled(mockUserDaySummary, 'req-id', 'user-123'),
      );
      expect(state.isLoadingDaySummary).toBe(false);
      expect(state.userDaySummary).toEqual(mockUserDaySummary);
    });

    it('should set userDaySummary to null when payload is undefined on fulfilled', () => {
      const state = monitoringReducer(
        { ...initialState, isLoadingDaySummary: true, userDaySummary: mockUserDaySummary },
        fetchUserDaySummary.fulfilled(undefined, 'req-id', 'user-123'),
      );
      expect(state.isLoadingDaySummary).toBe(false);
      expect(state.userDaySummary).toBeNull();
    });

    it('should clear isLoadingDaySummary on rejected', () => {
      const state = monitoringReducer(
        { ...initialState, isLoadingDaySummary: true },
        fetchUserDaySummary.rejected(
          new Error(),
          'req-id',
          'user-123',
          'Gagal memuat ringkasan harian pengguna',
        ),
      );
      expect(state.isLoadingDaySummary).toBe(false);
    });

    it('should call getUserDaySummary with the correct userId', async () => {
      mockGetUserDaySummary.mockResolvedValueOnce({ data: mockUserDaySummary });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchUserDaySummary('user-123');
      await thunk(dispatch, getState, undefined);
      expect(mockGetUserDaySummary).toHaveBeenCalledWith('user-123');
    });
  });

  // ── fetchLocationHistory (async thunk) ────────────────────────────────────

  describe('fetchLocationHistory', () => {
    it('should set isLoadingLocationHistory on pending', () => {
      const args = { userId: 'user-123', date: '2026-02-15' };
      const state = monitoringReducer(
        initialState,
        fetchLocationHistory.pending('req-id', args),
      );
      expect(state.isLoadingLocationHistory).toBe(true);
    });

    it('should set locationHistory and clear isLoadingLocationHistory on fulfilled', () => {
      const args = { userId: 'user-123', date: '2026-02-15' };
      const state = monitoringReducer(
        { ...initialState, isLoadingLocationHistory: true },
        fetchLocationHistory.fulfilled(mockLocationHistory, 'req-id', args),
      );
      expect(state.isLoadingLocationHistory).toBe(false);
      expect(state.locationHistory).toEqual(mockLocationHistory);
    });

    it('should set locationHistory to null when payload is undefined on fulfilled', () => {
      const args = { userId: 'user-123', date: '2026-02-15' };
      const state = monitoringReducer(
        { ...initialState, isLoadingLocationHistory: true, locationHistory: mockLocationHistory },
        fetchLocationHistory.fulfilled(undefined, 'req-id', args),
      );
      expect(state.isLoadingLocationHistory).toBe(false);
      expect(state.locationHistory).toBeNull();
    });

    it('should clear isLoadingLocationHistory on rejected', () => {
      const args = { userId: 'user-123', date: '2026-02-15' };
      const state = monitoringReducer(
        { ...initialState, isLoadingLocationHistory: true },
        fetchLocationHistory.rejected(new Error(), 'req-id', args, 'Gagal memuat riwayat lokasi'),
      );
      expect(state.isLoadingLocationHistory).toBe(false);
    });

    it('should call getUserLocationHistory without shiftId when not provided', async () => {
      mockGetUserLocationHistory.mockResolvedValueOnce({ data: mockLocationHistory });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchLocationHistory({ userId: 'user-123', date: '2026-02-15' });
      await thunk(dispatch, getState, undefined);
      expect(mockGetUserLocationHistory).toHaveBeenCalledWith(
        'user-123',
        '2026-02-15',
        undefined,
      );
    });

    it('should call getUserLocationHistory with shiftId when provided', async () => {
      mockGetUserLocationHistory.mockResolvedValueOnce({ data: mockLocationHistory });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchLocationHistory({
        userId: 'user-123',
        date: '2026-02-15',
        shiftId: 'shift-123',
      });
      await thunk(dispatch, getState, undefined);
      expect(mockGetUserLocationHistory).toHaveBeenCalledWith(
        'user-123',
        '2026-02-15',
        'shift-123',
      );
    });
  });

  // ── fetchStaffingSummary (async thunk) ────────────────────────────────────

  describe('fetchStaffingSummary', () => {
    it('should set isLoadingStaffing on pending', () => {
      const state = monitoringReducer(
        initialState,
        fetchStaffingSummary.pending('req-id', undefined),
      );
      expect(state.isLoadingStaffing).toBe(true);
    });

    it('should set staffingSummary and clear isLoadingStaffing on fulfilled', () => {
      const payload = {
        items: [mockStaffingItem],
        current_day_type: 'workday' as string | null,
        current_day_type_label: 'Hari Kerja' as string | null,
      };
      const state = monitoringReducer(
        { ...initialState, isLoadingStaffing: true },
        fetchStaffingSummary.fulfilled(payload, 'req-id', undefined),
      );
      expect(state.isLoadingStaffing).toBe(false);
      expect(state.staffingSummary).toEqual([mockStaffingItem]);
      expect(state.currentDayType).toBe('workday');
      expect(state.currentDayTypeLabel).toBe('Hari Kerja');
    });

    it('should not change staffingSummary when payload is undefined on fulfilled', () => {
      const state = monitoringReducer(
        { ...initialState, isLoadingStaffing: true, staffingSummary: [mockStaffingItem] },
        fetchStaffingSummary.fulfilled(
          undefined as any, // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test for undefined payload
          'req-id',
          undefined,
        ),
      );
      expect(state.isLoadingStaffing).toBe(false);
      expect(state.staffingSummary).toEqual([mockStaffingItem]);
    });

    it('should clear isLoadingStaffing on rejected', () => {
      const state = monitoringReducer(
        { ...initialState, isLoadingStaffing: true },
        fetchStaffingSummary.rejected(
          new Error(),
          'req-id',
          undefined,
          'Gagal memuat ringkasan kepegawaian',
        ),
      );
      expect(state.isLoadingStaffing).toBe(false);
    });

    it('should call getStaffingSummary with optional filters', async () => {
      mockGetStaffingSummary.mockResolvedValueOnce({
        data: { items: [mockStaffingItem] },
      });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchStaffingSummary({ rayon_id: 'rayon-1' });
      await thunk(dispatch, getState, undefined);
      expect(mockGetStaffingSummary).toHaveBeenCalledWith({ rayon_id: 'rayon-1' });
    });

    it('should return empty items when getStaffingSummary response has no items', async () => {
      mockGetStaffingSummary.mockResolvedValueOnce({ data: { items: [] } });
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = fetchStaffingSummary(undefined);
      await thunk(dispatch, getState, undefined);
      const fulfilledCall = dispatch.mock.calls.find(
        ([action]) => action.type === fetchStaffingSummary.fulfilled.type,
      );
      expect(fulfilledCall).toBeTruthy();
      expect((fulfilledCall?.[0] as any).payload.items).toEqual([]); // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing dispatch calls
    });
  });

  // ── State Transitions ──────────────────────────────────────────────────────

  describe('state transitions', () => {
    it('should handle full fetch-live-users flow', () => {
      let state = monitoringReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      state = monitoringReducer(state, setLiveUsers([mockLiveUser]));
      expect(state.liveUsers).toHaveLength(1);
      expect(state.error).toBeNull();
    });

    it('should handle error flow and recovery', () => {
      let state = monitoringReducer(initialState, setLoading(true));

      state = monitoringReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      state = monitoringReducer(state, setError(null));
      expect(state.error).toBeNull();
    });

    it('should handle selecting a user then deselecting', () => {
      let state = monitoringReducer(initialState, setSelectedUser(mockLiveUser));
      expect(state.selectedUser).toEqual(mockLiveUser);

      state = monitoringReducer(state, setSelectedUser(null));
      expect(state.selectedUser).toBeNull();
    });

    it('should handle filter apply and reset flow', () => {
      let state = monitoringReducer(
        initialState,
        setMonitoringFilters({ rayon_id: 'rayon-1', role: 'satgas' }),
      );
      expect(state.filters.rayon_id).toBe('rayon-1');

      state = monitoringReducer(state, resetMonitoringFilters());
      expect(state.filters).toEqual({});
    });

    it('should keep other loading flags independent', () => {
      // Setting main isLoading should not affect specialized loading flags
      let state = monitoringReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
      expect(state.isLoadingDaySummary).toBe(false);
      expect(state.isLoadingLocationHistory).toBe(false);
      expect(state.isLoadingStaffing).toBe(false);
    });
  });
});
