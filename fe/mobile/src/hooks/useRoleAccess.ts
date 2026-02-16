/**
 * useRoleAccess Hook
 * Provides role-based access checks for the current user
 */

import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  isClockableRole,
  canSubmitActivities,
  canCreateTasks,
  canReceiveTasks,
  canSubmitOvertime,
  canApproveOvertime,
  canMonitor,
  getMonitoringScope,
} from '../constants/roles';

export function useRoleAccess() {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;

  return useMemo(() => ({
    canClock: !!role && isClockableRole(role),
    canSubmitActivity: !!role && canSubmitActivities(role),
    canCreateTask: !!role && canCreateTasks(role),
    canReceiveTask: !!role && canReceiveTasks(role),
    canSubmitOvertime: !!role && canSubmitOvertime(role),
    canApproveOvertime: !!role && canApproveOvertime(role),
    canMonitor: !!role && canMonitor(role),
    monitoringScope: role ? getMonitoringScope(role) : null,
    role,
  }), [role]);
}
