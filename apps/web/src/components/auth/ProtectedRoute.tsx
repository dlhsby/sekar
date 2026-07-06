'use client';

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '@/lib/auth/hooks';
import { UserRole } from '@/lib/api/auth';

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Required roles (user must have one of these) */
  requiredRoles?: UserRole[];
  /** Loading fallback component */
  loadingFallback?: ReactNode;
}

/**
 * Protected Route Component
 *
 * Client-side route protection component.
 * Use this as an alternative to middleware for more granular control.
 *
 * Features:
 * - Redirects to login if not authenticated
 * - Redirects to dashboard if user doesn't have required role
 * - Shows loading state while checking auth
 *
 * @example
 * ```tsx
 * // Require any authenticated user
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 *
 * // Require admin or top_management
 * <ProtectedRoute requiredRoles={['admin', 'top_management']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ children, requiredRoles, loadingFallback }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { user, loading } = useRequireAuth(requiredRoles);

  // Show loading state
  if (loading) {
    return (
      loadingFallback || (
        <div className="min-h-screen bg-nb-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-nb-primary border-r-transparent" />
            </div>
            <p className="text-nb-gray-600 font-medium">{t("common:appError.checkingAuth")}</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if no user (redirect is handled by useRequireAuth)
  if (!user) {
    return null;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
}
