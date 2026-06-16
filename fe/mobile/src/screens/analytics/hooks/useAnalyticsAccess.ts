/**
 * useAnalyticsAccess Hook
 * Provides role-based access checks for analytics features
 */

import { useMemo } from 'react';
import { useAppSelector } from '../../../store/hooks';
import type { UserRole } from '../../../types/models.types';

// Roles that can view analytics
const ANALYTICS_VIEWERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

// Roles that can view team analytics
const TEAM_ANALYTICS_VIEWERS: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'admin_data',
  'top_management',
  'admin_system',
  'superadmin',
];

export function useAnalyticsAccess() {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;

  return useMemo(() => ({
    canViewAnalytics: !!role && ANALYTICS_VIEWERS.includes(role),
    canViewTeamAnalytics: !!role && TEAM_ANALYTICS_VIEWERS.includes(role),
    role,
  }), [role]);
}
