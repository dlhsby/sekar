'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from './context';
import { UserRole, User } from '@/lib/api/auth';

/**
 * Hook to access authentication context
 *
 * @example
 * ```tsx
 * const { user, loading, login, logout } = useAuth();
 * ```
 */
export function useAuth() {
  return useAuthContext();
}

/**
 * Hook to get current user or null
 * Convenience wrapper around useAuth
 *
 * @example
 * ```tsx
 * const user = useUser();
 * if (user) {
 *   console.log('Logged in as:', user.full_name);
 * }
 * ```
 */
export function useUser(): User | null {
  const { user } = useAuthContext();
  return user;
}

/**
 * Hook to require authentication and optionally specific roles
 * Redirects to /login if not authenticated or wrong role
 *
 * @param requiredRoles - Optional array of required roles (user must have one of these)
 *
 * @example
 * ```tsx
 * // Require any authenticated user
 * useRequireAuth();
 *
 * // Require admin or management
 * useRequireAuth(['admin', 'management']);
 * ```
 */
export function useRequireAuth(requiredRoles?: UserRole[]) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) {
      return;
    }

    // Not authenticated, redirect to login
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.includes(user.role);
      if (!hasRequiredRole) {
        // User doesn't have required role
        // Redirect to dashboard with error message
        console.error(
          `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${user.role}`
        );
        router.push('/dashboard?error=access_denied');
      }
    }
  }, [user, loading, requiredRoles, router, pathname]);

  return { user, loading };
}

/**
 * Check if user has any of the specified roles
 *
 * @param roles - Array of roles to check
 * @returns true if user has any of the roles, false otherwise
 *
 * @example
 * ```tsx
 * const canManageUsers = useHasRole(['admin', 'management']);
 * ```
 */
export function useHasRole(roles: UserRole[]): boolean {
  const { user } = useAuthContext();

  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}

/**
 * Check if user is authenticated
 *
 * @returns true if user is authenticated, false otherwise
 *
 * @example
 * ```tsx
 * const isAuthenticated = useIsAuthenticated();
 * ```
 */
export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuthContext();
  return !loading && user !== null;
}
