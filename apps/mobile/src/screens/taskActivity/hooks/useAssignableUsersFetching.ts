/**
 * Assignable users fetching hook for task creation
 */

import { useState, useEffect, useRef } from 'react';
import { getUsers } from '../../../services/api/usersApi';
import { VALID_TASK_ASSIGNMENTS } from '../../../constants/roles';
import type { User, UserRole } from '../../../types/models.types';

/**
 * Hook to manage assignable users fetching and filtering
 */
export const useAssignableUsersFetching = (
  role: UserRole | null,
  areaId: string,
  rayonId: string,
) => {
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const prevAreaIdRef = useRef(areaId);

  // Fetch assignable users based on role hierarchy and selected location
  useEffect(() => {
    const fetchAssignableUsers = async () => {
      if (!role) return;
      // Don't fetch until area is selected (unless area is fixed from profile)
      if (!areaId) {
        setAssignableUsers([]);
        return;
      }

      const assignableRoles = VALID_TASK_ASSIGNMENTS[role];
      if (!assignableRoles) return;

      setIsLoadingUsers(true);
      try {
        const response = await getUsers();
        if (response.data) {
          const filtered = response.data.filter((u) => {
            // Must have assignable role
            if (!assignableRoles.includes(u.role as UserRole)) return false;
            // Filter by area — user must be in the selected area
            if (u.location_id && u.location_id === areaId) return true;
            // Also include users in the same rayon but no specific area (rayon-level users)
            if (!u.location_id && u.rayon_id && u.rayon_id === rayonId) return true;
            return false;
          });

          setAssignableUsers(filtered);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchAssignableUsers();
  }, [role, areaId, rayonId]);

  return {
    isLoadingUsers,
    assignableUsers,
    prevAreaIdRef,
  };
};
