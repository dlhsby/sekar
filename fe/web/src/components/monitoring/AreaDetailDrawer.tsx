'use client';

/**
 * AreaDetailDrawer — slide-in drawer (right, 380 px) showing area details.
 * Shows: area name, staffing counts, plant status placeholder (Phase 3-8),
 * and virtualized worker list for the selected area.
 *
 * Phase 3 sub-phase 3-4 (ADR-029)
 */

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { WorkerListVirtual, type WorkerListItem } from './WorkerListVirtual';
import type { SnapshotAreaSummary } from '@/lib/api/monitoring-v2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AreaDetailDrawerProps {
  area: SnapshotAreaSummary | null;
  workers: WorkerListItem[];
  onClose: () => void;
  onWorkerSelect: (userId: string) => void;
  selectedUserId?: string | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AreaDetailDrawer({
  area,
  workers,
  onClose,
  onWorkerSelect,
  selectedUserId,
  className,
}: AreaDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the close button when the drawer opens
  useEffect(() => {
    if (area) {
      closeButtonRef.current?.focus();
    }
  }, [area]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && area) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [area, onClose]);

  const staffingPercent = area
    ? area.required_count > 0
      ? Math.round((area.active_count / area.required_count) * 100)
      : 100
    : 0;

  const staffingColor =
    !area || area.is_understaffed ? 'var(--color-nb-danger)' : 'var(--color-nb-success)';

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <>
      {/* Backdrop — only renders when area is selected */}
      {area && (
        <div
          className="fixed inset-0 z-30 bg-nb-black/10"
          aria-hidden="true"
          onClick={handleBackdropClick}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={area ? `Detail area ${area.area_name}` : 'Detail area'}
        aria-hidden={!area}
        className={cn(
          'fixed top-0 right-0 h-full z-40',
          'flex flex-col bg-nb-white',
          'border-l-2 border-nb-black',
          'transition-transform duration-200 ease-in-out',
          area ? 'translate-x-0' : 'translate-x-full',
          className
        )}
        style={{ width: 380, boxShadow: '-6px 0 0 var(--color-nb-black)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-nb-black flex-shrink-0">
          <div className="min-w-0">
            <p className="text-nb-caption text-nb-gray-500 font-bold uppercase tracking-wide">
              {area?.rayon_name ?? 'Rayon —'}
            </p>
            <h2 className="text-nb-h3 font-black text-nb-black truncate">
              {area?.area_name ?? '—'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup drawer detail area"
            className={cn(
              'shrink-0 ml-3 w-9 h-9 flex items-center justify-center',
              'border-2 border-nb-black rounded-nb-base bg-nb-white',
              'shadow-nb-xs hover:shadow-nb-sm active:shadow-none',
              'transition-shadow duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary'
            )}
          >
            <span aria-hidden="true" className="text-lg font-black leading-none">
              ×
            </span>
          </button>
        </div>

        {area && (
          <>
            {/* Staffing section */}
            <section
              className="px-4 py-3 border-b border-nb-gray-200 flex-shrink-0"
              aria-labelledby="staffing-heading"
            >
              <h3 id="staffing-heading" className="text-nb-body-sm font-bold text-nb-black mb-2">
                Ketersediaan Staf
              </h3>
              <div className="flex items-center gap-3">
                {/* Circular-style count */}
                <div
                  className="w-14 h-14 rounded-full border-4 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: staffingColor }}
                  aria-label={`${area.active_count} dari ${area.required_count} petugas aktif`}
                >
                  <span
                    className="text-nb-body-sm font-black leading-none"
                    style={{ color: staffingColor }}
                  >
                    {area.active_count}/{area.required_count}
                  </span>
                </div>
                <div>
                  <p
                    className="text-nb-body-sm font-bold"
                    style={{ color: staffingColor }}
                  >
                    {area.is_understaffed ? 'Kekurangan staf' : 'Staf terpenuhi'} ({staffingPercent}
                    %)
                  </p>
                  <p className="text-nb-caption text-nb-gray-500">
                    {area.active_count} aktif dari {area.required_count} yang diperlukan
                  </p>
                </div>
              </div>
            </section>

            {/* Plant status — Phase 3-8 placeholder */}
            <section
              className="px-4 py-3 border-b border-nb-gray-200 flex-shrink-0"
              aria-labelledby="plant-heading"
            >
              <h3 id="plant-heading" className="text-nb-body-sm font-bold text-nb-black mb-2">
                Status Tanaman
              </h3>
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2',
                  'border-2 border-nb-gray-200 rounded-nb-base bg-nb-gray-50',
                  'text-nb-caption text-nb-gray-500 italic'
                )}
                role="note"
              >
                <span aria-hidden="true">🌿</span>
                Data tanaman tersedia di Phase 3-8 (in progress)
              </div>
            </section>

            {/* Worker list */}
            <section
              className="flex-1 overflow-hidden flex flex-col"
              aria-labelledby="workers-heading"
            >
              <div className="px-4 py-2 border-b border-nb-gray-200 flex-shrink-0">
                <h3
                  id="workers-heading"
                  className="text-nb-body-sm font-bold text-nb-black"
                >
                  Petugas di Area Ini{' '}
                  <span className="text-nb-gray-500 font-normal">({workers.length})</span>
                </h3>
              </div>

              <WorkerListVirtual
                workers={workers}
                onSelect={onWorkerSelect}
                selectedUserId={selectedUserId}
                maxHeight={320}
                aria-label="Daftar petugas di area ini"
                className="flex-1"
              />
            </section>
          </>
        )}
      </div>
    </>
  );
}
