'use client';

/**
 * WorkerListVirtual — virtualized worker list using @tanstack/react-virtual.
 * Row height: 72 px. Max height: 560 px. Shows name, status badge,
 * area name, and last-seen time.
 *
 * Phase 3 sub-phase 3-4 (ADR-029)
 */

import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils/cn';
import {
  STATUS_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  getStatusLabels,
} from '@/lib/constants/monitoring';
import { formatRelativeTime } from '@/lib/utils/formatters';
import type { TrackingStatus } from '@/lib/api/monitoring';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkerListItem {
  user_id: string;
  full_name: string;
  role: string;
  status: TrackingStatus;
  location_id: string | null;
  area_name: string | null;
  last_update: string;
}

export interface WorkerListVirtualProps {
  workers: WorkerListItem[];
  onSelect: (userId: string) => void;
  selectedUserId?: string | null;
  maxHeight?: number;
  className?: string;
  'aria-label'?: string;
}

const ROW_HEIGHT = 72;
const DEFAULT_MAX_HEIGHT = 560;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkerListVirtual({
  workers,
  onSelect,
  selectedUserId,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
  'aria-label': ariaLabel,
}: WorkerListVirtualProps) {
  const { t } = useTranslation(['monitoring']);
  const statusLabels = getStatusLabels();
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: workers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, userId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(userId);
      }
    },
    [onSelect]
  );

  if (!workers.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center py-10 text-nb-gray-500 text-nb-body-sm',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {t('monitoring:workerList.noWorkers')}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-y-auto overflow-x-hidden overscroll-contain', className)}
      style={{ maxHeight, height: Math.min(workers.length * ROW_HEIGHT, maxHeight) }}
      role="list"
      aria-label={ariaLabel ?? t('monitoring:workerList.list')}
    >
      {/* Spacer to give virtualizer its full scroll height */}
      <div
        style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const worker = workers[virtualRow.index];
          if (!worker) return null;

          const isSelected = selectedUserId === worker.user_id;

          return (
            <div
              key={worker.user_id}
              role="listitem"
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
              }}
            >
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(worker.user_id)}
              onKeyDown={(e) => handleKeyDown(e, worker.user_id)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 text-left transition-colors duration-100',
                'border-b border-nb-gray-100 hover:bg-nb-gray-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary',
                isSelected && 'bg-nb-gray-100 border-l-4 border-l-nb-primary'
              )}
            >
              {/* Status dot */}
              <span
                className={cn(
                  'shrink-0 w-2.5 h-2.5 rounded-full',
                  STATUS_DOT_CLASSES[worker.status]
                )}
                aria-hidden="true"
              />

              {/* Name + area */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-nb-body-sm font-bold text-nb-black truncate',
                    isSelected && 'text-nb-primary'
                  )}
                >
                  {worker.full_name}
                </p>
                <p className="text-nb-caption text-nb-gray-500 truncate">
                  {worker.area_name ?? '—'}
                </p>
              </div>

              {/* Status badge + time */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold',
                    'border rounded-nb-sm',
                    STATUS_BADGE_CLASSES[worker.status]
                  )}
                >
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT_CLASSES[worker.status])}
                    aria-hidden="true"
                  />
                  {statusLabels[worker.status]}
                </span>
                <span className="text-[10px] text-nb-gray-400">
                  {formatRelativeTime(worker.last_update)}
                </span>
              </div>
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
