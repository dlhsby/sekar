'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User, LoginCredentials } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';

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
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login with username and password
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        setLoading(true);
        setError(null);

        // Call login API
        // Backend sets httpOnly cookies with tokens
        const response = await authApi.login(credentials);
        setUser(response.user);

        // Redirect to dashboard
        router.push('/dashboard');
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
    try {
      setLoading(true);
      setError(null);

      // Call logout API
      // Backend clears httpOnly cookies
      await authApi.logout();
      setUser(null);

      // Redirect to login
      router.push('/login');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Logout error:', errorMessage);
    } finally {
      setLoading(false);
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
      console.error('Refresh user error:', errorMessage);
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
