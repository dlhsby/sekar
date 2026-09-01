'use client';

/**
 * OnLeaveList - Section showing workers on approved leave
 * Displays list of on-leave users with their leave reason pills
 */

import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { AbsentUser } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

export interface OnLeaveListProps {
  /** Workers on approved leave today */
  users?: AbsentUser[];
}

/**
 * Maps leave_reason to a badge variant color.
 * - cuti (leave) → default (sage)
 * - sakit (sick) → warning (yellow-orange)
 * - izin (permission) → secondary (gray)
 * - libur (holiday) → success (green)
 */
function getLeaveReasonVariant(
  reason?: 'cuti' | 'sakit' | 'izin' | 'libur' | null
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (reason) {
    case 'sakit':
      return 'warning';
    case 'cuti':
      return 'default';
    case 'izin':
      return 'secondary';
    case 'libur':
      return 'success';
    default:
      return 'secondary';
  }
}

export function OnLeaveList({ users }: OnLeaveListProps) {
  const { t } = useTranslation(['monitoring']);

  // Only render if there are users on leave
  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-b border-nb-gray-200 flex-shrink-0">
      <div className="mb-2">
        <span className="text-xs font-bold text-nb-gray-600 uppercase tracking-wide">
          {t('monitoring:onLeave.title')}
        </span>
      </div>

      <div className="space-y-1.5">
        {users.map((user) => {
          const roleLabel = ROLE_LABELS[user.role as UserRole] || user.role;
          const leaveReasonKey = `monitoring:onLeave.reasons.${user.leave_reason || 'unknown'}`;
          const leaveReasonLabel = t(leaveReasonKey);
          const variant = getLeaveReasonVariant(user.leave_reason);

          return (
            <div
              key={user.user_id}
              className="flex items-center justify-between gap-2 p-2 bg-nb-gray-50 rounded-nb-base border border-nb-gray-200"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-nb-black truncate">
                  {user.full_name}
                </div>
                <div className="text-xs text-nb-gray-500 truncate">{roleLabel}</div>
              </div>

              <Badge variant={variant} size="sm" className="flex-shrink-0">
                {leaveReasonLabel}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
