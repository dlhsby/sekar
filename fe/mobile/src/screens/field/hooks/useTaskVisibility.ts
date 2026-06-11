/**
 * useTaskVisibility Hook
 * Determines which action buttons should be visible based on task status and user role
 */

import { useMemo } from 'react';
import { FILTER_SUBORDINATE_ROLES } from '../../../constants/roles';
import type { Task } from '../../../types/models.types';
import type { User } from '../../../types/models.types';

const TASK_VERIFIER_ROLES = ['korlap', 'kepala_rayon', 'top_management'];

export interface UseTaskVisibilityReturn {
  showAccept: boolean;
  showDecline: boolean;
  showStart: boolean;
  showComplete: boolean;
  showAssign: boolean;
  showReassign: boolean;
  showReassignByCreator: boolean;
  showDelegate: boolean;
  showVerify: boolean;
  showRevision: boolean;
  isDeadlinePast: boolean;
}

export function useTaskVisibility(
  task: Task | null,
  user: User | null | undefined,
): UseTaskVisibilityReturn {
  return useMemo(() => {
    if (!task || !user) {
      return {
        showAccept: false,
        showDecline: false,
        showStart: false,
        showComplete: false,
        showAssign: false,
        showReassign: false,
        showReassignByCreator: false,
        showDelegate: false,
        showVerify: false,
        showRevision: false,
        isDeadlinePast: false,
      };
    }

    const isDeadlinePast = task.deadline && new Date(task.deadline) < new Date();
    const isAssignee = user.id === task.assigned_to;
    const isCreator = user.id === task.created_by;
    const canVerify = TASK_VERIFIER_ROLES.includes(user.role);

    const showAccept = task.status === 'assigned' && isAssignee;
    const showDecline = task.status === 'assigned' && isAssignee;
    const showStart = (task.status === 'accepted' || task.status === 'revision_needed') && isAssignee;
    const showComplete = task.status === 'in_progress' && isAssignee;
    const showAssign = task.status === 'pending' && isCreator;
    const showReassign = task.status === 'declined' && isCreator;
    const showReassignByCreator = task.status === 'assigned' && isCreator && !isAssignee;

    const hasSubordinates = user.role && (FILTER_SUBORDINATE_ROLES[user.role as keyof typeof FILTER_SUBORDINATE_ROLES] ?? []).length > 0;
    const showDelegate = task.status === 'assigned' && isAssignee && !!hasSubordinates;

    const canVerifyThisTask = task.status === 'completed' && !isAssignee && (isCreator || canVerify);
    const showVerify = canVerifyThisTask;
    const showRevision = canVerifyThisTask;

    return {
      showAccept,
      showDecline,
      showStart,
      showComplete,
      showAssign,
      showReassign,
      showReassignByCreator,
      showDelegate,
      showVerify,
      showRevision,
      isDeadlinePast: isDeadlinePast || false,
    };
  }, [task, user]);
}
