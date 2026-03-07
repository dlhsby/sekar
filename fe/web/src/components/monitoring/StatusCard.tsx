'use client';

/**
 * StatusCard - Neo Brutalism status counter card
 * Displays a single tracking status with count
 * Uses WCAG 2.1 AA compliant colors from monitoring constants
 */

import { cn } from '@/lib/utils/cn';
import { STATUS_CARD_STYLES } from '@/lib/constants/monitoring';
import type { TrackingStatus } from '@/lib/api/monitoring';

export interface StatusCardProps {
  label: string;
  count: number;
  status: TrackingStatus;
  isActive: boolean;
  onClick: () => void;
}

export function StatusCard({ label, count, status, isActive, onClick }: StatusCardProps) {
  const styles = STATUS_CARD_STYLES[status];

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
