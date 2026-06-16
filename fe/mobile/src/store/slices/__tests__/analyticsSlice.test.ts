/**
 * Analytics Slice Tests
 * Unit tests for analytics reducer, actions, and selectors
 */

import analyticsReducer, {
  setError,
  clearError,
  resetTeamAnalytics,
  resetState,
  selectDashboard,
  selectWorkerAnalytics,
  selectTeamAnalytics,
  selectAreas,
  selectOperational,
  selectAnalyticsLoading,
  selectTeamAnalyticsLoading,
  selectAnalyticsError,
  fetchDashboard,
  fetchWorkerAnalytics,
  fetchTeamAnalytics,
  fetchAreas,
  fetchOperational,
} from '../analyticsSlice';
import type { DashboardSummary, WorkerAnalytics } from '../../../types/analytics.types';

describe('analyticsSlice', () => {
  const initialState = {
    dashboard: null,
    workerAnalytics: null,
    teamAnalytics: [],
    areas: [],
    operational: null,
    teamPage: 1,
    teamHasMore: true,
    loading: false,
    teamLoading: false,
    error: null,
  };

  const mockDashboard: DashboardSummary = {
    today: {
      attendanceRate: 85,
      activeWorkers: 42,
      tasksCompleted: 18,
      activitiesSubmitted: 35,
      openTasks: 12,
      overtimeHours: 8.5,
    },
    trends: {
      attendance: [80, 82, 85, 83, 84, 85, 85],
      taskCompletion: [15, 16, 18, 17, 19, 18, 18],
      activities: [30, 32, 35, 33, 36, 35, 35],
    },
    alerts: {
      understaffedAreas: [],
      overdueMaintenances: 3,
      missingWorkers: 5,
      overdueTasks: 7,
    },
  };

  const mockWorkerAnalytics: WorkerAnalytics = {
    id: 'worker-123',
    full_name: 'John Doe',
    date: '2026-06-16',
    attended: 20,
    late_minutes: 5,
    total_tasks: 15,
    completed_tasks: 14,
    task_completion_rate: 93.3,
    total_activities: 18,
    approved_activities: 17,
    activity_submission_rate: 90,
    activity_approval_rate: 94.4,
    within_area_pings: 450,
    total_pings: 480,
    area_compliance: 93.75,
    overtime_hours: 12.5,
    performance_score: 88,
    grade: 'B',
  };

  describe('reducers', () => {
    it('should set error', () => {
      const state = analyticsReducer(initialState, setError('Test error'));
      expect(state.error).toBe('Test error');
    });

    it('should clear error', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      const state = analyticsReducer(stateWithError, clearError());
      expect(state.error).toBeNull();
    });

    it('should reset team analytics', () => {
      const stateWithTeam = {
        ...initialState,
        teamAnalytics: [mockWorkerAnalytics],
        teamPage: 2,
        teamHasMore: false,
      };
      const state = analyticsReducer(stateWithTeam, resetTeamAnalytics());
      expect(state.teamAnalytics).toEqual([]);
      expect(state.teamPage).toBe(1);
      expect(state.teamHasMore).toBe(true);
    });

    it('should reset entire state', () => {
      const stateWithData = {
        ...initialState,
        dashboard: mockDashboard,
        error: 'Some error',
      };
      const state = analyticsReducer(stateWithData, resetState());
      expect(state).toEqual(initialState);
    });
  });

  describe('async thunks', () => {
    describe('fetchDashboard', () => {
      it('should have pending action', () => {
        const action = fetchDashboard.pending(
          'requestId',
          undefined,
        );
        expect(action.type).toBe('analytics/fetchDashboard/pending');
      });

      it('should set loading on pending', () => {
        const action = fetchDashboard.pending('requestId', undefined);
        const state = analyticsReducer(initialState, action);
        expect(state.loading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set dashboard on fulfilled', () => {
        const action = fetchDashboard.fulfilled(
          mockDashboard,
          'requestId',
          undefined,
        );
        const state = analyticsReducer(initialState, action);
        expect(state.dashboard).toEqual(mockDashboard);
        expect(state.loading).toBe(false);
      });

      it('should set error on rejected', () => {
        const action = fetchDashboard.rejected(
          new Error('Network error'),
          'requestId',
          undefined,
          'Network error',
        );
        const state = analyticsReducer(initialState, action);
        expect(state.error).toBe('Network error');
        expect(state.loading).toBe(false);
      });
    });

    describe('fetchWorkerAnalytics', () => {
      const params = { id: 'worker-123' };

      it('should set loading on pending', () => {
        const action = fetchWorkerAnalytics.pending('requestId', params);
        const state = analyticsReducer(initialState, action);
        expect(state.loading).toBe(true);
      });

      it('should set worker analytics on fulfilled', () => {
        const action = fetchWorkerAnalytics.fulfilled(
          mockWorkerAnalytics,
          'requestId',
          params,
        );
        const state = analyticsReducer(initialState, action);
        expect(state.workerAnalytics).toEqual(mockWorkerAnalytics);
        expect(state.loading).toBe(false);
      });
    });

    describe('fetchTeamAnalytics', () => {
      const params = { page: 1, limit: 10, reset: true };

      it('should reset team list on reset flag', () => {
        const stateWithTeam = {
          ...initialState,
          teamAnalytics: [mockWorkerAnalytics],
          teamPage: 2,
        };
        const action = fetchTeamAnalytics.pending('requestId', params);
        const state = analyticsReducer(stateWithTeam, action);
        expect(state.teamAnalytics).toEqual([]);
        expect(state.teamLoading).toBe(true);
      });

      it('should append team analytics on fulfilled (page > 1)', () => {
        const stateWithTeam = {
          ...initialState,
          teamAnalytics: [mockWorkerAnalytics],
        };
        const mockResponse = {
          data: [mockWorkerAnalytics],
          total: 2,
          page: 2,
          limit: 10,
          hasMore: false,
        };
        const paramsPage2 = { page: 2, limit: 10 };
        const action = fetchTeamAnalytics.fulfilled(
          mockResponse,
          'requestId',
          paramsPage2,
        );
        const state = analyticsReducer(stateWithTeam, action);
        expect(state.teamAnalytics.length).toBe(2);
        expect(state.teamPage).toBe(2);
        expect(state.teamHasMore).toBe(false);
      });
    });
  });

  describe('selectors', () => {
    const stateWithData = {
      analytics: {
        ...initialState,
        dashboard: mockDashboard,
        workerAnalytics: mockWorkerAnalytics,
        teamAnalytics: [mockWorkerAnalytics],
        loading: true,
        error: 'Test error',
      },
    };

    it('should select dashboard', () => {
      const result = selectDashboard(stateWithData as any);
      expect(result).toEqual(mockDashboard);
    });

    it('should select worker analytics', () => {
      const result = selectWorkerAnalytics(stateWithData as any);
      expect(result).toEqual(mockWorkerAnalytics);
    });

    it('should select team analytics', () => {
      const result = selectTeamAnalytics(stateWithData as any);
      expect(result).toEqual([mockWorkerAnalytics]);
    });

    it('should select loading state', () => {
      const result = selectAnalyticsLoading(stateWithData as any);
      expect(result).toBe(true);
    });

    it('should select error', () => {
      const result = selectAnalyticsError(stateWithData as any);
      expect(result).toBe('Test error');
    });
  });
});
