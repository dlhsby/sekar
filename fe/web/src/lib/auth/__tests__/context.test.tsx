/**
 * Unit Tests: Auth Context
 * Tests AuthProvider, authentication state management, and auth operations
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../context';
import { authApi } from '@/lib/api/auth';
import * as cookieUtils from '@/lib/utils/cookies';
import type { User, LoginCredentials, AuthResponse } from '@/lib/api/auth';

// Mock dependencies
jest.mock('@/lib/api/auth', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('@/lib/utils/cookies', () => ({
  setAuthCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
  hasAuthCookies: jest.fn(),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = '/';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockCookieUtils = cookieUtils as jest.Mocked<typeof cookieUtils>;

describe('Auth Context', () => {
  const mockUser: User = {
    id: '1',
    username: 'admin',
    full_name: 'Admin User',
    role: 'admin_system',
  };

  const mockAuthResponse: AuthResponse = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should provide auth context to children', async () => {
      mockPathname = '/login'; // On login page, no auth check
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toBeDefined();
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should check auth on mount for non-login pages', async () => {
      mockPathname = '/dashboard';
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
    });

    it('should not check auth on login page', async () => {
      mockPathname = '/login';
      mockAuthApi.getCurrentUser.mockClear();

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAuthApi.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should clear cookies when auth check fails', async () => {
      mockPathname = '/dashboard';
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(mockCookieUtils.clearAuthCookies).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login user', async () => {
      mockPathname = '/login';
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123',
      };

      mockAuthApi.login.mockResolvedValue(mockAuthResponse);
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);
      mockPush.mockClear();

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
      expect(mockCookieUtils.setAuthCookie).toHaveBeenCalledWith('access_token', 'access-token', {
        maxAge: 7 * 24 * 60 * 60,
      });
      expect(mockCookieUtils.setAuthCookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', {
        maxAge: 30 * 24 * 60 * 60,
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should set error on login failure', async () => {
      mockPathname = '/login';
      const credentials: LoginCredentials = {
        username: 'invalid',
        password: 'wrong',
      };

      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));
      mockAuthApi.getCurrentUser.mockResolvedValue(null as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (err) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });
    });

    it('should set loading state during login', async () => {
      mockPathname = '/login';
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'admin123',
      };

      let resolveLogin: (value: AuthResponse) => void;
      const loginPromise = new Promise<AuthResponse>((resolve) => {
        resolveLogin = resolve;
      });

      mockAuthApi.login.mockReturnValue(loginPromise);
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.login(credentials);
      });

      await waitFor(() => expect(result.current.loading).toBe(true));

      await act(async () => {
        resolveLogin!(mockAuthResponse);
        await loginPromise;
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockPathname = '/dashboard';
      mockAuthApi.logout.mockResolvedValue({ message: 'Logged out' });
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);
      mockPush.mockClear();

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(mockCookieUtils.clearAuthCookies).toHaveBeenCalled();
      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should set error on logout failure', async () => {
      mockPathname = '/dashboard';
      mockAuthApi.logout.mockRejectedValue(new Error('Logout failed'));
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.error).toBe('Logout failed');
    });
  });

  describe('refreshUser', () => {
    it('should refresh user data', async () => {
      mockPathname = '/dashboard';
      const updatedUser: User = {
        ...mockUser,
        full_name: 'Updated Admin',
      };

      mockAuthApi.getCurrentUser.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(result.current.error).toBeNull();
    });

    it('should set error on refresh failure', async () => {
      mockPathname = '/dashboard';
      mockAuthApi.getCurrentUser
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('clearError', () => {
    it('should clear error message', async () => {
      mockPathname = '/login';
      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));
      mockAuthApi.getCurrentUser.mockResolvedValue(null as any);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.login({
            username: 'invalid',
            password: 'wrong',
          });
        } catch (err) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
