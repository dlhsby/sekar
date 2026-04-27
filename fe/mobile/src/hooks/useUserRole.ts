/**
 * useUserRole Hook
 * Returns the current user's role
 * Phase 3 sub-phase 3-10
 */

import { useAppSelector } from '../store/hooks';

export function useUserRole(): string | null {
  const user = useAppSelector((state) => state.auth.user);
  return user?.role ?? null;
}
