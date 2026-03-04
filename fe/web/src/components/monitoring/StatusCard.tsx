'use client';

/**
 * StatusCard - Neo Brutalism status counter card
 * Displays a single tracking status with count
 */

import { cn } from '@/lib/utils/cn';
import type { TrackingStatus } from '@/lib/api/monitoring';

export interface StatusCardProps {
  label: string;
  count: number;
  status: TrackingStatus;
  isActive: boolean;
  onClick: () => void;
}

const STATUS_STYLES: Record<
  TrackingStatus,
  { bg: string; activeBg: string; text: string; dot: string }
> = {
  active: {
    bg: 'bg-green-100 hover:bg-green-200',
    activeBg: 'bg-green-400',
    text: 'text-green-900',
    dot: 'bg-green-500',
  },
  inactive: {
    bg: 'bg-amber-100 hover:bg-amber-200',
    activeBg: 'bg-amber-400',
    text: 'text-amber-900',
    dot: 'bg-amber-500',
  },
  outside_area: {
    bg: 'bg-purple-100 hover:bg-purple-200',
    activeBg: 'bg-purple-400',
    text: 'text-white',
    dot: 'bg-purple-500',
  },
  missing: {
    bg: 'bg-red-100 hover:bg-red-200',
    activeBg: 'bg-red-500',
    text: 'text-white',
    dot: 'bg-red-600',
  },
  offline: {
    bg: 'bg-gray-100 hover:bg-gray-200',
    activeBg: 'bg-gray-300',
    text: 'text-gray-700',
    dot: 'bg-gray-500',
  },
};

export function StatusCard({ label, count, status, isActive, onClick }: StatusCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left border-2 border-nb-black rounded-nb-base transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary focus-visible:ring-offset-1',
        isActive
          ? cn(styles.activeBg, styles.text, 'shadow-[4px_4px_0_0_#000] translate-x-0 translate-y-0')
          : cn(styles.bg, 'text-nb-black', 'shadow-nb-sm hover:shadow-[4px_4px_0_0_#000]'),
        'p-3'
      )}
      aria-pressed={isActive}
      aria-label={`Saring ${label}: ${count} petugas`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wide',
            isActive ? styles.text : 'text-nb-gray-600'
          )}
        >
          {label}
        </span>
        <span className={cn('h-2 w-2 rounded-full flex-shrink-0', styles.dot)} />
      </div>
      <div
        className={cn(
          'text-2xl font-black',
          isActive ? styles.text : 'text-nb-black'
        )}
      >
        {count}
      </div>
    </button>
  );
}
