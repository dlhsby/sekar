'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, User, LoginCredentials } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { clearAuthCookies, setAuthCookie } from '@/lib/utils/cookies';

interface AuthContextValue {
  /** Current authenticated user or null */
  user: User | null;
  /** Loading state (true during initial check or operations) */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Login with username and password */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Logout current user */
  logout: () => Promise<void>;
  /** Refresh user data from backend */
  refreshUser: () => Promise<void>;
  /** Clear error message */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider
 *
 * Manages authentication state for the application:
 * - Checks for existing session on mount
 * - Provides login/logout functionality
 * - Handles token refresh automatically via API client interceptor
 * - Stores user data in React state (tokens in httpOnly cookies)
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Check for existing session on mount
   * Tries to fetch current user from backend
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get current user from backend
      // If access token exists in cookie, this will succeed
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch {
      // No valid session, user needs to login
      // Clear any stale cookies to prevent redirect loops
      clearAuthCookies();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth on mount, but skip on login page to prevent redirect loops
  useEffect(() => {
    // Skip auth check on login page - no need to verify tokens when user is trying to login
    // This prevents the redirect loop: login → checkAuth → 401 → redirect to login → repeat
    if (pathname === '/login') {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth, pathname]);

  /**
   * Login with username and password
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        setLoading(true);
        setError(null);

        // Call login API - backend returns tokens in response body
        const response = await authApi.login(credentials);

        // Store tokens in cookies
        setAuthCookie('access_token', response.access_token, { maxAge: 7 * 24 * 60 * 60 }); // 7 days
        setAuthCookie('refresh_token', response.refresh_token, { maxAge: 30 * 24 * 60 * 60 }); // 30 days

        setUser(response.user);

        // Redirect to dashboard home
        router.push('/');
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err; // Re-throw for form handling
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Best-effort server-side token blacklist. Never let a failure here strand
      // the user in the app — the local session is cleared regardless below.
      await authApi.logout();
    } catch {
      // Swallow: we still clear the local session and redirect.
    } finally {
      clearAuthCookies();
      setUser(null);
      setLoading(false);
      router.push('/login');
    }
  }, [router]);

  /**
   * Refresh user data from backend
   * Useful after profile updates
   */
  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      // Error already captured in state, no need to log
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
