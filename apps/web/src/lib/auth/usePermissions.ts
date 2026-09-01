'use client';

import { useMemo } from 'react';
import { useAuth } from './hooks';
import { hasPermission, hasAllPermissions, hasAnyPermission } from './permissions';

/**
 * usePermissions — client-side permission gating (ADR-044). Reads the current
 * user's granted keys (from /auth/me) and exposes wildcard-aware checks that
 * mirror the backend. UX-only: the server remains authoritative.
 */
export function usePermissions() {
  const { user } = useAuth();
  const granted = useMemo(() => user?.permissions ?? [], [user?.permissions]);

  return useMemo(
    () => ({
      permissions: granted,
      can: (permission: string) => hasPermission(granted, permission),
      canAll: (permissions: string[]) => hasAllPermissions(granted, permissions),
      canAny: (permissions: string[]) => hasAnyPermission(granted, permissions),
    }),
    [granted],
  );
}
