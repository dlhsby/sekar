/**
 * Shift Slice Tests
 * Unit tests for shift/attendance state management
 */

import shiftReducer, {
  setClockingIn,
  setClockingOut,
  setCurrentShift,
  setShiftHistory,
  clockInSuccess,
  clockOutSuccess,
  setError,
  clearError,
} from '../shiftSlice';

describe('shiftSlice', () => {
  const initialState = {
    currentShift: null,
    shiftHistory: [],
    isClockingIn: false,
    isClockingOut: false,
    error: null,
  };

  const mockShift = {
    id: 1,
    user_id: 1,
    area_id: 1,
    clock_in_time: '2026-01-19T08:00:00Z',
    clock_in_lat: -7.25,
    clock_in_lng: 112.75,
    clock_out_time: null,
    clock_out_lat: null,
    clock_out_lng: null,
    status: 'active' as const,
  };

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(shiftReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('setClockingIn', () => {
    it('should set clocking in to true', () => {
      const state = shiftReducer(initialState, setClockingIn(true));
      expect(state.isClockingIn).toBe(true);
    });

    it('should set clocking in to false', () => {
      const clockingInState = { ...initialState, isClockingIn: true };
      const state = shiftReducer(clockingInState, setClockingIn(false));
      expect(state.isClockingIn).toBe(false);
    });
  });

  describe('setClockingOut', () => {
    it('should set clocking out to true', () => {
      const state = shiftReducer(initialState, setClockingOut(true));
      expect(state.isClockingOut).toBe(true);
    });

    it('should set clocking out to false', () => {
      const clockingOutState = { ...initialState, isClockingOut: true };
      const state = shiftReducer(clockingOutState, setClockingOut(false));
      expect(state.isClockingOut).toBe(false);
    });
  });

  describe('setCurrentShift', () => {
    it('should set current shift', () => {
      const state = shiftReducer(initialState, setCurrentShift(mockShift));

      expect(state.currentShift).toEqual(mockShift);
    });

    it('should set current shift to null', () => {
      const shiftState = { ...initialState, currentShift: mockShift };
      const state = shiftReducer(shiftState, setCurrentShift(null));

      expect(state.currentShift).toBeNull();
    });

    it('should clear error when setting shift', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = shiftReducer(errorState, setCurrentShift(mockShift));

      expect(state.error).toBeNull();
    });
  });

  describe('clockInSuccess', () => {
    it('should set current shift and clear clocking in', () => {
      const clockingInState = { ...initialState, isClockingIn: true };
      const state = shiftReducer(clockingInState, clockInSuccess(mockShift));

      expect(state.currentShift).toEqual(mockShift);
      expect(state.isClockingIn).toBe(false);
      expect(state.shiftHistory).toContainEqual(mockShift);
    });

    it('should clear error on success', () => {
      const errorState = { ...initialState, isClockingIn: true, error: 'Error' };
      const state = shiftReducer(errorState, clockInSuccess(mockShift));

      expect(state.error).toBeNull();
    });

    it('should add shift to history', () => {
      const existingShift = { ...mockShift, id: 2 };
      const stateWithHistory = {
        ...initialState,
        shiftHistory: [existingShift],
        isClockingIn: true
      };
      const state = shiftReducer(stateWithHistory, clockInSuccess(mockShift));

      expect(state.shiftHistory).toHaveLength(2);
      expect(state.shiftHistory[0]).toEqual(mockShift);
      expect(state.shiftHistory[1]).toEqual(existingShift);
    });
  });

  describe('clockOutSuccess', () => {
    it('should clear current shift and clocking out', () => {
      const shiftState = {
        ...initialState,
        currentShift: mockShift,
        isClockingOut: true,
      };
      const state = shiftReducer(shiftState, clockOutSuccess());

      expect(state.currentShift).toBeNull();
      expect(state.isClockingOut).toBe(false);
    });

    it('should clear error on success', () => {
      const errorState = {
        ...initialState,
        currentShift: mockShift,
        isClockingOut: true,
        error: 'Error',
      };
      const state = shiftReducer(errorState, clockOutSuccess());

      expect(state.error).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = shiftReducer(initialState, setError('Clock in failed'));

      expect(state.error).toBe('Clock in failed');
    });

    it('should clear clocking in when setting error', () => {
      const clockingInState = { ...initialState, isClockingIn: true };
      const state = shiftReducer(clockingInState, setError('Error'));

      expect(state.isClockingIn).toBe(false);
    });

    it('should clear clocking out when setting error', () => {
      const clockingOutState = { ...initialState, isClockingOut: true };
      const state = shiftReducer(clockingOutState, setError('Error'));

      expect(state.isClockingOut).toBe(false);
    });

    it('should clear both clocking states', () => {
      const bothState = {
        ...initialState,
        isClockingIn: true,
        isClockingOut: true,
      };
      const state = shiftReducer(bothState, setError('Error'));

      expect(state.isClockingIn).toBe(false);
      expect(state.isClockingOut).toBe(false);
    });
  });

  describe('setShiftHistory', () => {
    it('should set shift history', () => {
      const shifts = [mockShift, { ...mockShift, id: 2 }];
      const state = shiftReducer(initialState, setShiftHistory(shifts));

      expect(state.shiftHistory).toEqual(shifts);
      expect(state.shiftHistory).toHaveLength(2);
    });

    it('should clear error when setting history', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = shiftReducer(errorState, setShiftHistory([mockShift]));

      expect(state.error).toBeNull();
    });

    it('should replace existing history', () => {
      const oldShifts = [{ ...mockShift, id: 99 }];
      const newShifts = [mockShift, { ...mockShift, id: 2 }];
      const stateWithHistory = { ...initialState, shiftHistory: oldShifts };
      const state = shiftReducer(stateWithHistory, setShiftHistory(newShifts));

      expect(state.shiftHistory).toEqual(newShifts);
      expect(state.shiftHistory).not.toContainEqual(oldShifts[0]);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = shiftReducer(errorState, clearError());

      expect(state.error).toBeNull();
    });

    it('should not affect current shift', () => {
      const stateWithShiftAndError = {
        ...initialState,
        currentShift: mockShift,
        error: 'Error',
      };
      const state = shiftReducer(stateWithShiftAndError, clearError());

      expect(state.currentShift).toEqual(mockShift);
    });
  });

  describe('state transitions', () => {
    it('should handle full clock in flow', () => {
      // Start clocking in
      let state = shiftReducer(initialState, setClockingIn(true));
      expect(state.isClockingIn).toBe(true);

      // Clock in success
      state = shiftReducer(state, clockInSuccess(mockShift));
      expect(state.currentShift).toEqual(mockShift);
      expect(state.isClockingIn).toBe(false);
    });

    it('should handle full clock out flow', () => {
      // Start with active shift
      let state = shiftReducer(initialState, setCurrentShift(mockShift));

      // Start clocking out
      state = shiftReducer(state, setClockingOut(true));
      expect(state.isClockingOut).toBe(true);

      // Clock out success
      state = shiftReducer(state, clockOutSuccess());
      expect(state.currentShift).toBeNull();
      expect(state.isClockingOut).toBe(false);
    });

    it('should handle clock in error flow', () => {
      // Start clocking in
      let state = shiftReducer(initialState, setClockingIn(true));

      // Error occurs
      state = shiftReducer(state, setError('GPS not available'));
      expect(state.error).toBe('GPS not available');
      expect(state.isClockingIn).toBe(false);

      // Clear error
      state = shiftReducer(state, clearError());
      expect(state.error).toBeNull();
    });

    it('should handle clock out error flow', () => {
      // Start with active shift
      let state = shiftReducer(initialState, setCurrentShift(mockShift));

      // Start clocking out
      state = shiftReducer(state, setClockingOut(true));

      // Error occurs
      state = shiftReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isClockingOut).toBe(false);
      expect(state.currentShift).toEqual(mockShift); // Shift should still be active
    });
  });
});
