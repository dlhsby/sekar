/**
 * Unit Tests: Auth Hooks
 * Tests authentication hooks for auth context access, role checking, and route protection
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser, useRequireAuth, useHasRole, useIsAuthenticated } from '../hooks';
import * as authContext from '../context';
import type { User } from '@/lib/api/auth';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth context
jest.mock('../context', () => ({
  useAuthContext: jest.fn(),
}));

describe('Auth Hooks', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush, replace: jest.fn(), prefetch: jest.fn() };

  const mockUser: User = {
    id: '1',
    username: 'admin',
    full_name: 'Admin User',
    role: 'admin_system',
  };

  const mockWorker: User = {
    id: '2',
    username: 'worker1',
    full_name: 'Worker One',
    role: 'satgas',
  };

  const mockAuthContext = (user: User | null, loading = false) => {
    (authContext.useAuthContext as jest.Mock).mockReturnValue({
      user,
      loading,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
      clearError: jest.fn(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  describe('useAuth', () => {
    it('should return auth context when user is authenticated', () => {
      mockAuthContext(mockUser);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
      expect(typeof result.current.logout).toBe('function');
    });

    it('should return null user when not authenticated', () => {
      mockAuthContext(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should return loading state during initialization', () => {
      mockAuthContext(null, true);

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });
  });

  describe('useUser', () => {
    it('should return current user when authenticated', () => {
      mockAuthContext(mockUser);

      const { result } = renderHook(() => useUser());

      expect(result.current).toEqual(mockUser);
    });

    it('should return null when not authenticated', () => {
      mockAuthContext(null);

      const { result } = renderHook(() => useUser());

      expect(result.current).toBeNull();
    });
  });

  describe('useRequireAuth', () => {
    it('should not redirect when user is authenticated', () => {
      mockAuthContext(mockUser);

      renderHook(() => useRequireAuth());

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect to login when user is not authenticated', async () => {
      mockAuthContext(null);

      renderHook(() => useRequireAuth());

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login?redirect='));
      });
    });

    it('should not redirect while loading', () => {
      mockAuthContext(null, true);

      renderHook(() => useRequireAuth());

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow user with required role', () => {
      mockAuthContext(mockUser);

      renderHook(() => useRequireAuth(['admin_system', 'management']));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect when user lacks required role', async () => {
      mockAuthContext(mockWorker);

      // Spy on console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useRequireAuth(['admin_system', 'korlap']));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/dashboard?error=access_denied')
        );
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Access denied'));

      consoleErrorSpy.mockRestore();
    });

    it('should allow user when no roles specified', () => {
      mockAuthContext(mockWorker);

      renderHook(() => useRequireAuth());

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should include redirect parameter in login URL', async () => {
      (usePathname as jest.Mock).mockReturnValue('/users/123');
      mockAuthContext(null);

      renderHook(() => useRequireAuth());

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fusers%2F123');
      });
    });
  });

  describe('useHasRole', () => {
    it('should return true when user has one of the specified roles', () => {
      mockAuthContext(mockUser);

      const { result } = renderHook(() => useHasRole(['admin_system', 'korlap']));

      expect(result.current).toBe(true);
    });

    it('should return false when user does not have any of the specified roles', () => {
      mockAuthContext(mockWorker);

      const { result } = renderHook(() => useHasRole(['admin_system', 'korlap']));

      expect(result.current).toBe(false);
    });

    it('should return false when user is not authenticated', () => {
      mockAuthContext(null);

      const { result } = renderHook(() => useHasRole(['admin_system']));

      expect(result.current).toBe(false);
    });

    it('should return true for exact role match', () => {
      mockAuthContext(mockUser);

      const { result } = renderHook(() => useHasRole(['admin_system']));

      expect(result.current).toBe(true);
    });

    it('should handle multiple role checks correctly', () => {
      mockAuthContext(mockWorker);

      const { result } = renderHook(() => useHasRole(['satgas', 'korlap', 'admin_system']));

      expect(result.current).toBe(true);
    });
  });

  describe('useIsAuthenticated', () => {
    it('should return true when user is authenticated and not loading', () => {
      mockAuthContext(mockUser);

      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      mockAuthContext(null);

      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toBe(false);
    });

    it('should return false while loading', () => {
      mockAuthContext(null, true);

      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toBe(false);
    });

    it('should return true immediately after authentication', () => {
      mockAuthContext(mockUser, false);

      const { result } = renderHook(() => useIsAuthenticated());

      expect(result.current).toBe(true);
    });
  });
});
