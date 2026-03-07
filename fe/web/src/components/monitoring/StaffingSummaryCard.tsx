'use client';

/**
 * StaffingSummaryCard - Shows staffing levels per role for a selected area
 * Displays active/total counts, progress bars, and understaffing warnings
 */

import { cn } from '@/lib/utils/cn';
import { useStaffingSummary } from '@/lib/api/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants/monitoring';
import { AlertTriangle, Users } from 'lucide-react';
import type { UserRole } from '@/types/models';

export interface StaffingSummaryCardProps {
  areaId: string;
}

export function StaffingSummaryCard({ areaId }: StaffingSummaryCardProps) {
  const { data, isLoading } = useStaffingSummary({ area_id: areaId });

  if (isLoading) {
    return (
      <div className="px-3 py-2 border-b border-nb-gray-200">
        <div className="h-24 bg-nb-gray-200 animate-pulse rounded-nb-base" />
      </div>
    );
  }

  const areaItem = data?.items?.find((item) => item.id === areaId);
  if (!areaItem) return null;

  const totalPresent = areaItem.total_active + areaItem.total_idle + areaItem.total_outside_area;
  const totalAll = totalPresent + areaItem.total_missing + areaItem.total_offline;

  return (
    <div className="px-3 py-2 border-b-2 border-nb-black bg-nb-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase text-nb-gray-600 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          Ketersediaan Petugas
        </h3>
        {!areaItem.is_fully_staffed && (
          <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-status-missing)]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Kurang Staf
          </span>
        )}
      </div>

      {/* Overall progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-nb-black">{totalPresent} / {totalAll} hadir</span>
          <span className="text-nb-gray-500">
            {totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0}%
          </span>
        </div>
        <div className="h-2 bg-nb-gray-200 border border-nb-black rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-status-active)] transition-all duration-300"
            style={{ width: `${totalAll > 0 ? (totalPresent / totalAll) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Per-role breakdown */}
      <div className="space-y-1">
        {areaItem.roles.map((role) => {
          const present = role.active + role.idle + role.outside_area;
          const total = role.total_assigned;
          const roleLabel = ROLE_LABELS[role.role as UserRole] ?? role.role;

          return (
            <div key={role.role} className="flex items-center gap-2 text-xs">
              <span className="w-20 truncate font-medium text-nb-gray-700">{roleLabel}</span>
              <div className="flex-1 h-1.5 bg-nb-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    present >= total
                      ? 'bg-[var(--color-status-active)]'
                      : 'bg-[var(--color-status-idle)]'
                  )}
                  style={{ width: `${total > 0 ? Math.min((present / total) * 100, 100) : 0}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-nb-gray-500">
                {present}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
