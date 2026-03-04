'use client';

/**
 * UserListItem - Single user row in monitoring side panel
 * Shows status dot, name, role badge, area, last update, and battery warning
 */

import { cn } from '@/lib/utils/cn';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { LiveUser, TrackingStatus } from '@/lib/api/monitoring';
import type { UserRole } from '@/types/models';

export interface UserListItemProps {
  user: LiveUser;
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_DOT_COLORS: Record<TrackingStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-amber-400',
  outside_area: 'bg-purple-500',
  missing: 'bg-red-500 animate-pulse',
  offline: 'bg-gray-400',
};

const STATUS_LABELS: Record<TrackingStatus, string> = {
  active: 'Aktif',
  inactive: 'Idle',
  outside_area: 'Luar Area',
  missing: 'Hilang',
  offline: 'Offline',
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hr lalu`;
}

export function UserListItem({ user, isSelected, onClick }: UserListItemProps) {
  const dotColor = STATUS_DOT_COLORS[user.status] ?? 'bg-gray-400';
  const statusLabel = STATUS_LABELS[user.status] ?? user.status;
  const roleLabel = ROLE_LABELS[user.role as UserRole] || user.role;
  const isLowBattery = user.battery_level !== null && user.battery_level < 20;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 border-b border-nb-gray-200 transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary focus-visible:ring-inset',
        isSelected
          ? 'bg-nb-primary/10 border-l-4 border-l-nb-primary'
          : 'hover:bg-nb-gray-50'
      )}
      aria-selected={isSelected}
      aria-label={`${user.full_name}, ${statusLabel}`}
    >
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span
          className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', dotColor)}
          aria-hidden="true"
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-nb-black truncate">{user.full_name}</span>
            <span className="text-xs font-semibold bg-nb-gray-100 border border-nb-gray-300 px-1.5 py-0.5 rounded-nb-sm text-nb-gray-700">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-nb-gray-500 truncate">{user.area_name || '—'}</span>
            <span className="text-xs text-nb-gray-400">·</span>
            <span className="text-xs text-nb-gray-400">
              {formatRelativeTime(user.last_update)}
            </span>
          </div>
        </div>

        {/* Right badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isLowBattery && (
            <span
              className="text-xs bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded-nb-sm font-semibold"
              aria-label={`Baterai rendah: ${user.battery_level}%`}
            >
              {user.battery_level}%
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
