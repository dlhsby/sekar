'use client';

/**
 * MonitoringStatusBar — Compact activity status summary
 * Mobile-aligned three-state model (Aktif / Idle / Tidak terdeteksi) + secondary stats.
 *
 * Phase 4-R rework (ADR-029)
 */

import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

export interface MonitoringStatusBarProps {
  totals: {
    total_active: number;
    total_inactive: number;
    total_outside_area: number;
    total_missing: number;
    total_offline: number;
  } | null;
  className?: string;
}

interface StatusChip {
  label: string;
  count: number;
  color: string;
}

export function MonitoringStatusBar({ totals, className }: MonitoringStatusBarProps) {
  if (!totals) {
    return (
      <div className={cn('px-4 py-3 border-b-2 border-nb-black bg-white', className)}>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="card" className="h-10 flex-1 rounded-nb-base" />
          ))}
        </div>
      </div>
    );
  }

  // Mobile activity states (from dashboard page model)
  // Aktif = total_active + total_outside_area
  // Idle = total_inactive
  // Tidak terdeteksi = total_missing
  const chips: StatusChip[] = [
    {
      label: 'Aktif',
      count: totals.total_active + totals.total_outside_area,
      color: 'var(--color-status-active)',
    },
    {
      label: 'Idle',
      count: totals.total_inactive,
      color: 'var(--color-status-idle)',
    },
    {
      label: 'Tidak terdeteksi',
      count: totals.total_missing,
      color: 'var(--color-status-missing)',
    },
  ];

  // Secondary muted stats
  const secondaryChips: StatusChip[] = [
    {
      label: 'Di luar area',
      count: totals.total_outside_area,
      color: 'var(--color-status-outside)',
    },
    {
      label: 'Offline',
      count: totals.total_offline,
      color: 'var(--color-status-offline)',
    },
  ];

  return (
    <div
      className={cn('px-4 py-3 border-b-2 border-nb-black bg-white', className)}
      role="region"
      aria-live="polite"
      aria-label="Status petugas"
    >
      {/* Primary activity chips */}
      <div className="flex flex-wrap gap-2.5">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex items-center gap-2 px-3 py-2 border-2 border-nb-black rounded-nb-base"
            style={{ borderColor: chip.color }}
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: chip.color }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-nb-gray-700">{chip.label}</span>
            <span className="text-xs font-bold" style={{ color: chip.color }}>
              {chip.count}
            </span>
          </div>
        ))}
      </div>

      {/* Secondary muted stats (smaller, less prominent) */}
      {(totals.total_outside_area > 0 || totals.total_offline > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {secondaryChips.map((chip) =>
            chip.count > 0 ? (
              <span
                key={chip.label}
                className="text-xs text-nb-gray-500"
                style={{ '--accent-color': chip.color } as React.CSSProperties}
              >
                {chip.label}: <strong>{chip.count}</strong>
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
