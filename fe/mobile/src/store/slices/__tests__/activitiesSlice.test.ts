/**
 * Activities Slice Tests
 * Phase 2C: ADR-010 terminology cleanup (reports → activities)
 */

import activitiesReducer, {
  setLoading,
  setSubmitting,
  setActivities,
  addActivity,
  updateActivity,
  setError,
  clearError,
  clearActivities,
  resetState,
  selectActivities,
  selectActivitiesLoading,
  selectActivitiesSubmitting,
  selectActivitiesError,
} from '../activitiesSlice';
import type { Activity } from '../../../types/models.types';

describe('activitiesSlice', () => {
  const initialState = {
    activitiesList: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
  };

  const mockActivity: Activity = {
    id: 'act-001',
    shift_id: 'shift-001',
    activity_type_id: 'type-001',
    description: 'Menyiram tanaman',
    photos: ['data:image/jpeg;base64,abc'],
    gps_lat: -7.25,
    gps_lng: 112.75,
    created_at: '2026-02-14T08:00:00Z',
    updated_at: '2026-02-14T08:00:00Z',
  };

  const mockActivities: Activity[] = [
    mockActivity,
    {
      ...mockActivity,
      id: 'act-002',
      description: 'Pemotongan rumput',
    },
    {
      ...mockActivity,
      id: 'act-003',
      description: 'Pembersihan area',
    },
  ];

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(activitiesReducer(undefined, { type: 'unknown' })).toEqual(
        initialState,
      );
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = activitiesReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = activitiesReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setSubmitting', () => {
    it('should set submitting to true', () => {
      const state = activitiesReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);
    });

    it('should set submitting to false', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = activitiesReducer(submittingState, setSubmitting(false));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('setActivities', () => {
    it('should set activities array', () => {
      const state = activitiesReducer(initialState, setActivities(mockActivities));
      expect(state.activitiesList).toEqual(mockActivities);
      expect(state.activitiesList).toHaveLength(3);
    });

    it('should clear loading when setting activities', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = activitiesReducer(loadingState, setActivities(mockActivities));
      expect(state.isLoading).toBe(false);
    });

    it('should clear error when setting activities', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = activitiesReducer(errorState, setActivities(mockActivities));
      expect(state.error).toBeNull();
    });

    it('should handle empty activities array', () => {
      const state = activitiesReducer(initialState, setActivities([]));
      expect(state.activitiesList).toEqual([]);
    });
  });

  describe('addActivity', () => {
    it('should add activity to beginning of array', () => {
      const stateWithActivities = {
        ...initialState,
        activitiesList: [mockActivities[1]],
      };
      const state = activitiesReducer(stateWithActivities, addActivity(mockActivity));
      expect(state.activitiesList[0]).toEqual(mockActivity);
      expect(state.activitiesList).toHaveLength(2);
    });

    it('should clear submitting when adding activity', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = activitiesReducer(submittingState, addActivity(mockActivity));
      expect(state.isSubmitting).toBe(false);
    });

    it('should clear error when adding activity', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = activitiesReducer(errorState, addActivity(mockActivity));
      expect(state.error).toBeNull();
    });
  });

  describe('updateActivity', () => {
    it('should update existing activity', () => {
      const stateWithActivities = {
        ...initialState,
        activitiesList: mockActivities,
      };
      const updatedActivity = {
        ...mockActivity,
        description: 'Updated description',
      };
      const state = activitiesReducer(
        stateWithActivities,
        updateActivity(updatedActivity),
      );
      expect(state.activitiesList[0].description).toBe('Updated description');
    });

    it('should not modify other activities', () => {
      const stateWithActivities = {
        ...initialState,
        activitiesList: mockActivities,
      };
      const updatedActivity = {
        ...mockActivity,
        description: 'Updated description',
      };
      const state = activitiesReducer(
        stateWithActivities,
        updateActivity(updatedActivity),
      );
      expect(state.activitiesList[1]).toEqual(mockActivities[1]);
    });

    it('should not change state if activity not found', () => {
      const stateWithActivities = {
        ...initialState,
        activitiesList: mockActivities,
      };
      const unknownActivity = { ...mockActivity, id: 'unknown-id' };
      const state = activitiesReducer(
        stateWithActivities,
        updateActivity(unknownActivity),
      );
      expect(state.activitiesList).toEqual(mockActivities);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = activitiesReducer(initialState, setError('Failed to load'));
      expect(state.error).toBe('Failed to load');
    });

    it('should clear loading when setting error', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = activitiesReducer(loadingState, setError('Error'));
      expect(state.isLoading).toBe(false);
    });

    it('should clear submitting when setting error', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = activitiesReducer(submittingState, setError('Error'));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = activitiesReducer(errorState, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('clearActivities', () => {
    it('should clear all activities', () => {
      const stateWithActivities = {
        ...initialState,
        activitiesList: mockActivities,
      };
      const state = activitiesReducer(stateWithActivities, clearActivities());
      expect(state.activitiesList).toEqual([]);
    });
  });

  describe('resetState', () => {
    it('should reset to initial state', () => {
      const modifiedState = {
        activitiesList: mockActivities,
        isLoading: true,
        isSubmitting: true,
        error: 'Some error',
      };
      const state = activitiesReducer(modifiedState, resetState());
      expect(state).toEqual(initialState);
    });
  });

  describe('selectors', () => {
    it('selectActivities returns activities list', () => {
      const state = { activities: { ...initialState, activitiesList: mockActivities } };
      expect(selectActivities(state)).toEqual(mockActivities);
    });

    it('selectActivitiesLoading returns loading state', () => {
      const state = { activities: { ...initialState, isLoading: true } };
      expect(selectActivitiesLoading(state)).toBe(true);
    });

    it('selectActivitiesSubmitting returns submitting state', () => {
      const state = { activities: { ...initialState, isSubmitting: true } };
      expect(selectActivitiesSubmitting(state)).toBe(true);
    });

    it('selectActivitiesError returns error', () => {
      const state = { activities: { ...initialState, error: 'Test error' } };
      expect(selectActivitiesError(state)).toBe('Test error');
    });
  });

  describe('state transitions', () => {
    it('should handle full fetch flow', () => {
      let state = activitiesReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      state = activitiesReducer(state, setActivities(mockActivities));
      expect(state.activitiesList).toEqual(mockActivities);
      expect(state.isLoading).toBe(false);
    });

    it('should handle submit flow', () => {
      let state = activitiesReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);

      state = activitiesReducer(state, addActivity(mockActivity));
      expect(state.activitiesList[0]).toEqual(mockActivity);
      expect(state.isSubmitting).toBe(false);
    });

    it('should handle error flow', () => {
      let state = activitiesReducer(initialState, setLoading(true));

      state = activitiesReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      state = activitiesReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });
});
