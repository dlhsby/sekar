/**
 * usePruningRequestDetail — state management for RequestDetailScreen
 * Handles load, refresh, derived state (canAdmin, canCancel, permissions checks).
 */

import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchPruningRequestById } from '../../../store/slices/pruningRequestsSlice';
import { useUserRole } from '../../../hooks/useUserRole';

const ADMIN_ROLES = [
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];

const ACTIONABLE_STATUSES = ['submitted', 'under_review'];
const RESCHEDULABLE_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'assigned',
  'in_progress',
];
const CANCELLABLE_STATUSES = ['submitted', 'under_review', 'approved'];

export function usePruningRequestDetail(requestId: string, adminMode: boolean) {
  const dispatch = useAppDispatch();
  const userRole = useUserRole();

  const { byId, isLoading, error, reviewingId } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const request = byId[requestId] || null;
  const authUserId = useAppSelector((s) => s.auth.user?.id);

  useEffect(() => {
    if (!request && requestId) {
      dispatch(fetchPruningRequestById(requestId));
    }
  }, [requestId, request, dispatch]);

  const canAdmin = useMemo(
    () => adminMode && userRole != null && ADMIN_ROLES.includes(userRole),
    [adminMode, userRole],
  );

  const canCancel = useMemo(() => {
    if (!request) return false;
    if (canAdmin) return false;
    if (!CANCELLABLE_STATUSES.includes(request.status)) return false;
    return !!authUserId && request.submittedBy === authUserId;
  }, [request, authUserId, canAdmin]);

  const isReschedulable = useMemo(
    () => canAdmin && RESCHEDULABLE_STATUSES.includes(request?.status || ''),
    [canAdmin, request?.status],
  );

  const hasSchedule = useMemo(() => !!request?.scheduledDate, [request?.scheduledDate]);

  const needsSchedule = useMemo(
    () => isReschedulable && !hasSchedule,
    [isReschedulable, hasSchedule],
  );

  const canActApprove = useMemo(
    () =>
      canAdmin &&
      ACTIONABLE_STATUSES.includes(request?.status || '') &&
      hasSchedule,
    [canAdmin, request?.status, hasSchedule],
  );

  const canReject = useMemo(
    () => canAdmin && ACTIONABLE_STATUSES.includes(request?.status || ''),
    [canAdmin, request?.status],
  );

  const canConvert = useMemo(
    () => canAdmin && request?.status === 'approved' && hasSchedule,
    [canAdmin, request?.status, hasSchedule],
  );

  const showAdminBar = useMemo(
    () => canAdmin && (isReschedulable || canConvert),
    [canAdmin, isReschedulable, canConvert],
  );

  return {
    request,
    isLoading,
    error,
    reviewingId,
    canAdmin,
    canCancel,
    isReschedulable,
    hasSchedule,
    needsSchedule,
    canActApprove,
    canReject,
    canConvert,
    showAdminBar,
  };
}
