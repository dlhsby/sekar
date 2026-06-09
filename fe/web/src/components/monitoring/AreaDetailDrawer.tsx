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
import {
  useAreaPlants,
  useNotablePlants,
  usePruningByRayon,
  summarizePlantStatuses,
  type AreaPlantRow,
  type PruningRequestRow,
  type PruningRequestStatus,
} from '@/lib/api/plants';

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

            {/* Plant status (Phase 3 sub-phase 3-8 hookup) */}
            <PlantStatusSection areaId={area.area_id} />

            {/* Pruning requests (rayon-scoped because requests have no area FK) */}
            <PruningRequestsSection
              rayonId={area.rayon_id}
              areaName={area.area_name}
            />

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

// ---------------------------------------------------------------------------
// PlantStatusSection
// ---------------------------------------------------------------------------

const PRUNING_STATUS_LABELS: Record<PruningRequestStatus, string> = {
  submitted: 'Diajukan',
  under_review: 'Ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  assigned: 'Jadi Tugas',
  in_progress: 'Berjalan',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
};

const PRUNING_STATUS_TONE: Record<PruningRequestStatus, string> = {
  submitted: 'bg-nb-info-light text-nb-black',
  under_review: 'bg-nb-warning-light text-nb-black',
  approved: 'bg-nb-success-light text-nb-success-dark',
  rejected: 'bg-nb-danger-light text-nb-danger-dark',
  assigned: 'bg-nb-primary text-nb-white',
  in_progress: 'bg-nb-warning-light text-nb-black',
  done: 'bg-nb-success-light text-nb-success-dark',
  cancelled: 'bg-nb-gray-200 text-nb-gray-700',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

interface PlantStatusSectionProps {
  areaId: string;
}

function PlantStatusSection({ areaId }: PlantStatusSectionProps) {
  const { data: plants, isLoading, isError } = useAreaPlants(areaId);
  const { data: notable } = useNotablePlants(areaId);
  const summary = summarizePlantStatuses(plants);

  return (
    <section
      className="px-4 py-3 border-b border-nb-gray-200 flex-shrink-0"
      aria-labelledby="plant-heading"
    >
      <h3 id="plant-heading" className="text-nb-body-sm font-bold text-nb-black mb-2">
        Status Tanaman
      </h3>

      {isLoading && (
        <div
          className="text-nb-caption text-nb-gray-500"
          role="status"
          aria-live="polite"
        >
          Memuat data tanaman…
        </div>
      )}

      {isError && (
        <div
          className={cn(
            'text-nb-caption text-nb-danger-dark',
            'border-2 border-nb-danger rounded-nb-base bg-nb-danger-light/30 px-3 py-2'
          )}
          role="alert"
        >
          Gagal memuat data tanaman.
        </div>
      )}

      {!isLoading && !isError && summary.total_species === 0 && (
        <div
          className={cn(
            'text-nb-caption text-nb-gray-600 italic',
            'border-2 border-nb-gray-200 rounded-nb-base bg-nb-gray-50 px-3 py-2'
          )}
          role="note"
        >
          Belum ada data tanaman terdaftar untuk area ini.
        </div>
      )}

      {!isLoading && !isError && summary.total_species > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <PlantStatusBadge label="OK" count={summary.ok} tone="ok" />
            <PlantStatusBadge label="Hampir" count={summary.due_soon} tone="due" />
            <PlantStatusBadge label="Lewat" count={summary.overdue} tone="overdue" />
          </div>

          <p className="text-nb-caption text-nb-gray-600 mb-2">
            {summary.total_species} jenis · {summary.total_count} pohon terdata
          </p>

          <ul className="flex flex-col gap-1.5" aria-label="Daftar jenis tanaman">
            {(plants ?? [])
              .slice()
              .sort(plantSeverityOrder)
              .slice(0, 6)
              .map((p) => (
                <PlantRow key={p.id} row={p} />
              ))}
          </ul>

          {notable && notable.length > 0 && (
            <div className="mt-3 pt-3 border-t border-nb-gray-200">
              <p className="text-nb-caption font-bold text-nb-gray-700 uppercase tracking-wide mb-1.5">
                Pohon Heritage ({notable.length})
              </p>
              <ul className="flex flex-col gap-1">
                {notable.slice(0, 3).map((n) => (
                  <li key={n.id} className="text-nb-caption text-nb-gray-700">
                    🌳 <span className="font-bold">{n.label ?? 'Tanpa label'}</span>
                    {n.species?.nameId ? ` · ${n.species.nameId}` : ''}
                    {n.heritage ? ' · Heritage' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function plantSeverityOrder(a: AreaPlantRow, b: AreaPlantRow): number {
  const rank = (s: AreaPlantRow['status']) =>
    s === 'overdue' ? 0 : s === 'due_soon' ? 1 : s === 'ok' ? 2 : 3;
  return rank(a.status) - rank(b.status);
}

interface PlantStatusBadgeProps {
  label: string;
  count: number;
  tone: 'ok' | 'due' | 'overdue';
}

function PlantStatusBadge({ label, count, tone }: PlantStatusBadgeProps) {
  const toneClass =
    tone === 'overdue'
      ? 'bg-nb-danger-light text-nb-danger-dark border-nb-danger'
      : tone === 'due'
        ? 'bg-nb-warning-light text-nb-black border-nb-warning'
        : 'bg-nb-success-light text-nb-success-dark border-nb-success';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-2 py-1.5',
        'border-2 rounded-nb-base',
        toneClass
      )}
    >
      <span className="text-nb-h3 font-black leading-none">{count}</span>
      <span className="text-nb-caption font-bold uppercase tracking-wide mt-0.5">
        {label}
      </span>
    </div>
  );
}

interface PlantRowProps {
  row: AreaPlantRow;
}

function PlantRow({ row }: PlantRowProps) {
  const tone =
    row.status === 'overdue'
      ? 'text-nb-danger-dark'
      : row.status === 'due_soon'
        ? 'text-nb-warning'
        : 'text-nb-gray-700';
  const speciesLabel = row.species?.nameId ?? 'Spesies tidak diketahui';
  return (
    <li className="flex items-center justify-between text-nb-caption">
      <div className="min-w-0 flex-1">
        <span className="font-bold text-nb-black">{speciesLabel}</span>
        <span className="text-nb-gray-500"> · {row.count} pohon</span>
      </div>
      <div className={cn('text-right ml-2 shrink-0', tone)}>
        <div className="font-bold">
          {row.status === 'overdue'
            ? 'Lewat tempo'
            : row.status === 'due_soon'
              ? 'Hampir tempo'
              : row.status === 'ok'
                ? 'OK'
                : '—'}
        </div>
        <div className="text-nb-gray-500">
          {row.lastPrunedAt
            ? `Pangkas: ${formatDate(row.lastPrunedAt)}`
            : 'Belum pernah dipangkas'}
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// PruningRequestsSection
// ---------------------------------------------------------------------------

interface PruningRequestsSectionProps {
  rayonId: string;
  areaName: string;
}

function PruningRequestsSection({ rayonId, areaName }: PruningRequestsSectionProps) {
  const { data, isLoading, isError } = usePruningByRayon(rayonId, { limit: 8 });

  return (
    <section
      className="px-4 py-3 border-b border-nb-gray-200 flex-shrink-0"
      aria-labelledby="pruning-heading"
    >
      <h3 id="pruning-heading" className="text-nb-body-sm font-bold text-nb-black mb-1">
        Permohonan Pangkas
      </h3>
      <p className="text-nb-caption text-nb-gray-500 mb-2">
        Rayon yang mencakup {areaName}
      </p>

      {isLoading && (
        <div className="text-nb-caption text-nb-gray-500" role="status">
          Memuat permohonan…
        </div>
      )}

      {isError && (
        <div
          className="text-nb-caption text-nb-danger-dark border-2 border-nb-danger rounded-nb-base bg-nb-danger-light/30 px-3 py-2"
          role="alert"
        >
          Gagal memuat permohonan pangkas.
        </div>
      )}

      {!isLoading && !isError && (!data || data.length === 0) && (
        <div
          className="text-nb-caption text-nb-gray-600 italic border-2 border-nb-gray-200 rounded-nb-base bg-nb-gray-50 px-3 py-2"
          role="note"
        >
          Tidak ada permohonan pangkas aktif pada rayon ini.
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Daftar permohonan pangkas">
          {data.slice(0, 5).map((r) => (
            <PruningRow key={r.id} row={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

interface PruningRowProps {
  row: PruningRequestRow;
}

function PruningRow({ row }: PruningRowProps) {
  return (
    <li className="border-2 border-nb-gray-200 rounded-nb-base px-2.5 py-2 bg-nb-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-nb-caption font-bold text-nb-black truncate">
            {row.kecamatan_name} · {row.address}
          </p>
          <p className="text-nb-caption text-nb-gray-500 truncate">
            {row.requester_name ?? 'Pemohon tidak diketahui'}
            {row.tree_count != null ? ` · ${row.tree_count} pohon` : ''}
            {row.expected_date ? ` · ${formatDate(row.expected_date)}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'text-nb-caption font-bold px-1.5 py-0.5 rounded-nb-sm border-2 border-nb-black shrink-0',
            PRUNING_STATUS_TONE[row.status]
          )}
        >
          {PRUNING_STATUS_LABELS[row.status]}
        </span>
      </div>
    </li>
  );
}
