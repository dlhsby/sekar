/**
 * Overtime Slice Tests
 * Phase 2C: overtime management state
 */

import overtimeReducer, {
  setLoading,
  setSubmitting,
  setMyOvertimes,
  setPendingApprovals,
  addOvertime,
  updateOvertime,
  setSelectedOvertime,
  setError,
  clearError,
  resetState,
  selectMyOvertimes,
  selectPendingApprovals,
  selectSelectedOvertime,
  selectOvertimeLoading,
  selectOvertimeSubmitting,
  selectPendingApprovalsCount,
} from '../overtimeSlice';
import type { Overtime } from '../../../types/models.types';

describe('overtimeSlice', () => {
  const initialState = {
    myOvertimes: [],
    pendingApprovals: [],
    selectedOvertime: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
  };

  const mockOvertime: Overtime = {
    id: 'ot-001',
    user_id: 'user-001',
    start_datetime: '2026-02-14T17:00:00Z',
    end_datetime: '2026-02-14T20:00:00Z',
    activity_type_id: 'type-001',
    description: 'Lembur penyiraman',
    photo_urls: ['data:image/jpeg;base64,photo1'],
    gps_lat: -7.25,
    gps_lng: 112.75,
    status: 'pending',
    created_at: '2026-02-14T17:00:00Z',
    updated_at: '2026-02-14T17:00:00Z',
  };

  const mockOvertimes: Overtime[] = [
    mockOvertime,
    { ...mockOvertime, id: 'ot-002', status: 'approved' },
    { ...mockOvertime, id: 'ot-003', status: 'rejected' },
  ];

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(overtimeReducer(undefined, { type: 'unknown' })).toEqual(
        initialState,
      );
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = overtimeReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = overtimeReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setSubmitting', () => {
    it('should set submitting to true', () => {
      const state = overtimeReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);
    });

    it('should set submitting to false', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = overtimeReducer(submittingState, setSubmitting(false));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('setMyOvertimes', () => {
    it('should set my overtimes array', () => {
      const state = overtimeReducer(initialState, setMyOvertimes(mockOvertimes));
      expect(state.myOvertimes).toEqual(mockOvertimes);
      expect(state.myOvertimes).toHaveLength(3);
    });

    it('should clear loading', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = overtimeReducer(loadingState, setMyOvertimes(mockOvertimes));
      expect(state.isLoading).toBe(false);
    });

    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = overtimeReducer(errorState, setMyOvertimes(mockOvertimes));
      expect(state.error).toBeNull();
    });
  });

  describe('setPendingApprovals', () => {
    it('should set pending approvals', () => {
      const pending = [mockOvertime];
      const state = overtimeReducer(initialState, setPendingApprovals(pending));
      expect(state.pendingApprovals).toEqual(pending);
    });

    it('should clear loading', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = overtimeReducer(loadingState, setPendingApprovals([]));
      expect(state.isLoading).toBe(false);
    });

    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Error' };
      const state = overtimeReducer(errorState, setPendingApprovals([]));
      expect(state.error).toBeNull();
    });
  });

  describe('addOvertime', () => {
    it('should add overtime to beginning of myOvertimes', () => {
      const stateWithOvertimes = {
        ...initialState,
        myOvertimes: [mockOvertimes[1]],
      };
      const state = overtimeReducer(stateWithOvertimes, addOvertime(mockOvertime));
      expect(state.myOvertimes[0]).toEqual(mockOvertime);
      expect(state.myOvertimes).toHaveLength(2);
    });

    it('should clear submitting', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = overtimeReducer(submittingState, addOvertime(mockOvertime));
      expect(state.isSubmitting).toBe(false);
    });

    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Error' };
      const state = overtimeReducer(errorState, addOvertime(mockOvertime));
      expect(state.error).toBeNull();
    });
  });

  describe('updateOvertime', () => {
    it('should update overtime in myOvertimes', () => {
      const stateWithOvertimes = {
        ...initialState,
        myOvertimes: mockOvertimes,
      };
      const updated = { ...mockOvertime, status: 'approved' as const };
      const state = overtimeReducer(stateWithOvertimes, updateOvertime(updated));
      expect(state.myOvertimes[0].status).toBe('approved');
    });

    it('should update overtime in pendingApprovals', () => {
      const stateWithPending = {
        ...initialState,
        pendingApprovals: [mockOvertime],
      };
      const updated = { ...mockOvertime, status: 'approved' as const };
      const state = overtimeReducer(stateWithPending, updateOvertime(updated));
      expect(state.pendingApprovals[0].status).toBe('approved');
    });

    it('should update selectedOvertime if same ID', () => {
      const stateWithSelected = {
        ...initialState,
        selectedOvertime: mockOvertime,
      };
      const updated = { ...mockOvertime, status: 'rejected' as const };
      const state = overtimeReducer(stateWithSelected, updateOvertime(updated));
      expect(state.selectedOvertime?.status).toBe('rejected');
    });

    it('should not update selectedOvertime if different ID', () => {
      const stateWithSelected = {
        ...initialState,
        selectedOvertime: mockOvertime,
      };
      const updated = { ...mockOvertimes[1], description: 'Changed' };
      const state = overtimeReducer(stateWithSelected, updateOvertime(updated));
      expect(state.selectedOvertime).toEqual(mockOvertime);
    });

    it('should clear submitting', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = overtimeReducer(submittingState, updateOvertime(mockOvertime));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('setSelectedOvertime', () => {
    it('should set selected overtime', () => {
      const state = overtimeReducer(
        initialState,
        setSelectedOvertime(mockOvertime),
      );
      expect(state.selectedOvertime).toEqual(mockOvertime);
    });

    it('should clear selected overtime', () => {
      const stateWithSelected = {
        ...initialState,
        selectedOvertime: mockOvertime,
      };
      const state = overtimeReducer(stateWithSelected, setSelectedOvertime(null));
      expect(state.selectedOvertime).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = overtimeReducer(initialState, setError('Failed'));
      expect(state.error).toBe('Failed');
    });

    it('should clear loading', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = overtimeReducer(loadingState, setError('Error'));
      expect(state.isLoading).toBe(false);
    });

    it('should clear submitting', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = overtimeReducer(submittingState, setError('Error'));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = overtimeReducer(errorState, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('resetState', () => {
    it('should reset to initial state', () => {
      const modifiedState = {
        myOvertimes: mockOvertimes,
        pendingApprovals: [mockOvertime],
        selectedOvertime: mockOvertime,
        isLoading: true,
        isSubmitting: true,
        error: 'Some error',
      };
      const state = overtimeReducer(modifiedState, resetState());
      expect(state).toEqual(initialState);
    });
  });

  describe('selectors', () => {
    it('selectMyOvertimes returns my overtimes', () => {
      const state = { overtime: { ...initialState, myOvertimes: mockOvertimes } };
      expect(selectMyOvertimes(state)).toEqual(mockOvertimes);
    });

    it('selectPendingApprovals returns pending', () => {
      const pending = [mockOvertime];
      const state = { overtime: { ...initialState, pendingApprovals: pending } };
      expect(selectPendingApprovals(state)).toEqual(pending);
    });

    it('selectSelectedOvertime returns selected', () => {
      const state = {
        overtime: { ...initialState, selectedOvertime: mockOvertime },
      };
      expect(selectSelectedOvertime(state)).toEqual(mockOvertime);
    });

    it('selectOvertimeLoading returns loading', () => {
      const state = { overtime: { ...initialState, isLoading: true } };
      expect(selectOvertimeLoading(state)).toBe(true);
    });

    it('selectOvertimeSubmitting returns submitting', () => {
      const state = { overtime: { ...initialState, isSubmitting: true } };
      expect(selectOvertimeSubmitting(state)).toBe(true);
    });

    it('selectPendingApprovalsCount counts only pending', () => {
      const state = {
        overtime: { ...initialState, pendingApprovals: mockOvertimes },
      };
      // mockOvertimes has 1 pending, 1 approved, 1 rejected
      expect(selectPendingApprovalsCount(state)).toBe(1);
    });

    it('selectPendingApprovalsCount returns 0 for empty', () => {
      const state = { overtime: initialState };
      expect(selectPendingApprovalsCount(state)).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('should handle full fetch flow', () => {
      let state = overtimeReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      state = overtimeReducer(state, setMyOvertimes(mockOvertimes));
      expect(state.myOvertimes).toEqual(mockOvertimes);
      expect(state.isLoading).toBe(false);
    });

    it('should handle submit flow', () => {
      let state = overtimeReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);

      state = overtimeReducer(state, addOvertime(mockOvertime));
      expect(state.myOvertimes[0]).toEqual(mockOvertime);
      expect(state.isSubmitting).toBe(false);
    });

    it('should handle approval flow', () => {
      let state = overtimeReducer(initialState, setPendingApprovals([mockOvertime]));

      const approved = { ...mockOvertime, status: 'approved' as const };
      state = overtimeReducer(state, updateOvertime(approved));
      expect(state.pendingApprovals[0].status).toBe('approved');
    });

    it('should handle error flow', () => {
      let state = overtimeReducer(initialState, setLoading(true));

      state = overtimeReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      state = overtimeReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });
});
