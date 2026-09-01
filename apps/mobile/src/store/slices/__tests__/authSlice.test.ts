/**
 * Auth Slice Tests
 * Unit tests for authentication state management
 */

import authReducer, {
  setLoading,
  setUser,
  setError,
  clearError,
  logout,
  setRestoring,
  restoreAuth,
} from '../authSlice';
import type { User, Area } from '../../../types/models.types';

describe('authSlice', () => {
  const initialState = {
    user: null,
    assignedArea: null,
    assignedAreas: [],
    isAuthenticated: false,
    isLoading: false,
    isRestoring: true,
    error: null,
    onboardingCompleted: false,
  };

  const mockUser: User = {
    id: 'user-1',
    username: 'worker1',
    full_name: 'Test Worker',
    role: 'satgas' as const,
  };

  const mockArea: Area = {
    id: 'area-1',
    name: 'Taman Bungkul',
    area_type_id: 'at-1',
    gps_lat: -7.25,
    gps_lng: 112.75,
    created_at: '2026-02-14T00:00:00Z',
    updated_at: '2026-02-14T00:00:00Z',
  };

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = authReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = authReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const state = authReducer(initialState, setUser({ user: mockUser }));

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set user with assigned area', () => {
      const state = authReducer(
        initialState,
        setUser({ user: mockUser, area: mockArea })
      );

      expect(state.user).toEqual(mockUser);
      expect(state.assignedArea).toEqual(mockArea);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set assignedArea to null when area not provided', () => {
      const state = authReducer(initialState, setUser({ user: mockUser }));

      expect(state.assignedArea).toBeNull();
    });

    it('should clear error when user is set', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = authReducer(errorState, setUser({ user: mockUser }));

      expect(state.error).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = authReducer(initialState, setError('Invalid credentials'));

      expect(state.error).toBe('Invalid credentials');
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = authReducer(loadingState, setError('Error'));

      expect(state.isLoading).toBe(false);
    });

    it('should overwrite previous error', () => {
      const errorState = { ...initialState, error: 'Old error' };
      const state = authReducer(errorState, setError('New error'));

      expect(state.error).toBe('New error');
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = authReducer(errorState, clearError());

      expect(state.error).toBeNull();
    });

    it('should not affect other state properties', () => {
      const stateWithUser = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
        error: 'Error',
      };
      const state = authReducer(stateWithUser, clearError());

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear user and mark as not authenticated', () => {
      const authenticatedState = {
        user: mockUser,
        assignedArea: mockArea,
        assignedAreas: [],
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isRestoring: false,
        onboardingCompleted: false,
      };
      const state = authReducer(authenticatedState, logout());

      expect(state.user).toBeNull();
      expect(state.assignedArea).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear error on logout', () => {
      const stateWithError = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
        error: 'Some error',
      };
      const state = authReducer(stateWithError, logout());

      expect(state.error).toBeNull();
    });

    it('should handle logout from initial state', () => {
      const state = authReducer(initialState, logout());

      expect(state.user).toBeNull();
      expect(state.assignedArea).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setRestoring', () => {
    it('should set restoring to true', () => {
      const state = authReducer(
        { ...initialState, isRestoring: false },
        setRestoring(true),
      );
      expect(state.isRestoring).toBe(true);
    });

    it('should set restoring to false', () => {
      const state = authReducer(initialState, setRestoring(false));
      expect(state.isRestoring).toBe(false);
    });
  });

  describe('restoreAuth', () => {
    it('should restore user and mark as authenticated', () => {
      const state = authReducer(
        initialState,
        restoreAuth({ user: mockUser, area: null }),
      );

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isRestoring).toBe(false);
    });

    it('should restore user with assigned area', () => {
      const state = authReducer(
        initialState,
        restoreAuth({ user: mockUser, area: mockArea }),
      );

      expect(state.user).toEqual(mockUser);
      expect(state.assignedArea).toEqual(mockArea);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isRestoring).toBe(false);
    });

    it('should set isRestoring to false', () => {
      const state = authReducer(
        { ...initialState, isRestoring: true },
        restoreAuth({ user: mockUser, area: null }),
      );

      expect(state.isRestoring).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should handle full login flow', () => {
      // Start loading
      let state = authReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      // Set user
      state = authReducer(state, setUser({ user: mockUser, area: mockArea }));
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);

      // Clear loading
      state = authReducer(state, setLoading(false));
      expect(state.isLoading).toBe(false);
    });

    it('should handle login error flow', () => {
      // Start loading
      let state = authReducer(initialState, setLoading(true));

      // Error occurs
      state = authReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      // Clear error
      state = authReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });
});
