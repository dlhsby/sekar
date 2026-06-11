/**
 * useTaskAssignment Hook
 * Manages subordinate loading for assignment/delegation
 */

import { useState, useCallback } from 'react';
import { getUsers } from '../../../services/api';
import { FILTER_SUBORDINATE_ROLES } from '../../../constants/roles';
import type { User } from '../../../types/models.types';

export interface UseTaskAssignmentReturn {
  subordinates: User[];
  loadingSubordinates: boolean;
  loadSubordinates: () => Promise<void>;
}

export function useTaskAssignment(userRole: string | undefined): UseTaskAssignmentReturn {
  const [subordinates, setSubordinates] = useState<User[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  const loadSubordinates = useCallback(async () => {
    if (!userRole) { return; }
    const subordinateRoles = FILTER_SUBORDINATE_ROLES[userRole as keyof typeof FILTER_SUBORDINATE_ROLES] ?? [];
    if (subordinateRoles.length === 0) { return; }
    setLoadingSubordinates(true);
    try {
      const response = await getUsers(100);
      const all: User[] = response.data ?? [];
      setSubordinates(all.filter((u) => subordinateRoles.includes(u.role as any)));
    } catch {
      // non-critical
    } finally {
      setLoadingSubordinates(false);
    }
  }, [userRole]);

  return { subordinates, loadingSubordinates, loadSubordinates };
}
