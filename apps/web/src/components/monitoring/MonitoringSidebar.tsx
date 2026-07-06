'use client';

/**
 * MonitoringSidebar — right panel for the monitoring page (mobile parity).
 * Two tabs:
 *  - Petugas: filtered worker list; selecting a worker opens an inline detail
 *    card (snapshot fields only — no extra fetch).
 *  - Area: per-area staffing summary (active/required) with understaffed flags.
 * All data is the unified snapshot; no legacy day-summary call.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRightLeft, Battery, MapPin, AlertTriangle, Users } from 'lucide-react';
import { Tabs, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { getStatusLabels, STATUS_DOT_CLASSES, STATUS_BADGE_CLASSES } from '@/lib/constants/monitoring';
import type { SnapshotWorker, SnapshotAreaSummary } from '@/lib/api/monitoring-v2';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

type SidebarTab = 'petugas' | 'area';

export interface MonitoringSidebarProps {
  workers: SnapshotWorker[];
  areaSummaries: SnapshotAreaSummary[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Phase 4-4: opens the bulk-reassign modal targeting the given area (role-gated by the page) */
  onBulkReassign?: (area: SnapshotAreaSummary) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Worker row
// ---------------------------------------------------------------------------

function WorkerRow({
  worker,
  selected,
  onClick,
}: {
  worker: SnapshotWorker;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const statusLabels = getStatusLabels();
  const dot = STATUS_DOT_CLASSES[worker.status as TrackingStatus] ?? STATUS_DOT_CLASSES.offline;
  const roleLabel = ROLE_LABELS[worker.role as UserRole] ?? worker.role;
  const lowBattery = worker.battery_level !== null && worker.battery_level < 20;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected}
      aria-label={`${worker.full_name}, ${statusLabels[worker.status as TrackingStatus] ?? worker.status}`}
      className={cn(
        'w-full border-b border-nb-gray-200 px-3 py-2.5 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nb-primary',
        selected ? 'border-l-4 border-l-nb-primary bg-nb-primary/10' : 'hover:bg-nb-gray-50'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dot)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-nb-black">{worker.full_name}</span>
            <span className="rounded-nb-sm border border-nb-gray-300 bg-nb-gray-100 px-1.5 py-0.5 text-xs font-semibold text-nb-gray-700">
              {roleLabel}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-nb-gray-500">
            <span className="truncate">{worker.area_name ?? '—'}</span>
            <span className="text-nb-gray-300">·</span>
            <span className="flex-shrink-0 text-nb-gray-400">
              {formatRelativeTime(worker.last_update)}
            </span>
          </div>
        </div>
        {lowBattery && (
          <span
            className="flex-shrink-0 rounded-nb-sm border border-nb-danger bg-nb-danger-light/30 px-1.5 py-0.5 text-xs font-semibold text-nb-danger-dark"
            aria-label={t('monitoring:sidebar.batteryLabel', { level: worker.battery_level })}
          >
            {worker.battery_level}%
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Worker detail (snapshot fields only)
// ---------------------------------------------------------------------------

function WorkerDetail({ worker, onBack }: { worker: SnapshotWorker; onBack: () => void }) {
  const { t } = useTranslation();
  const statusLabels = getStatusLabels();
  const status = worker.status as TrackingStatus;
  const roleLabel = ROLE_LABELS[worker.role as UserRole] ?? worker.role;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b-2 border-nb-black px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-nb-gray-600 hover:text-nb-black"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('monitoring:sidebar.backToList')}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Header card */}
        <div className="rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-sm">
          <h2 className="text-lg font-black leading-tight text-nb-black">{worker.full_name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-nb-sm border border-nb-gray-300 bg-nb-gray-100 px-2 py-0.5 text-xs font-semibold">
              {roleLabel}
            </span>
            <span
              className={cn(
                'rounded-nb-sm border px-2 py-0.5 text-xs font-semibold',
                STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.offline
              )}
            >
              {statusLabels[status] ?? worker.status}
            </span>
          </div>
          {(worker.rayon_name || worker.area_name) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-nb-gray-600">
              {worker.rayon_name && (
                <span>
                  {t('monitoring:sidebar.rayonLabel')} <strong className="text-nb-black">{worker.rayon_name}</strong>
                </span>
              )}
              {worker.area_name && (
                <span>
                  {t('monitoring:sidebar.areaLabel')} <strong className="text-nb-black">{worker.area_name}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Location card */}
        <div className="rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-sm">
          <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-nb-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {t('monitoring:sidebar.location')}
          </h3>
          <div className="space-y-1 text-xs text-nb-gray-600">
            <div className="font-mono">
              {worker.lat.toFixed(6)}, {worker.lng.toFixed(6)}
            </div>
            <div className="text-nb-gray-400">{formatRelativeTime(worker.last_update)}</div>
            <div
              className={
                worker.is_within_area
                  ? 'font-semibold text-[var(--color-status-active)]'
                  : 'font-semibold text-[var(--color-status-outside)]'
              }
            >
              {worker.is_within_area ? t('monitoring:sidebar.withinArea') : t('monitoring:sidebar.outsideArea')}
            </div>
            {worker.battery_level !== null && (
              <div
                className={cn(
                  'flex items-center gap-1',
                  worker.battery_level < 20 && 'font-semibold text-nb-danger-dark'
                )}
              >
                <Battery className="h-3 w-3" />
                {worker.battery_level}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Area staffing list
// ---------------------------------------------------------------------------

function AreaSummaryList({
  summaries,
  onBulkReassign,
}: {
  summaries: SnapshotAreaSummary[];
  onBulkReassign?: (area: SnapshotAreaSummary) => void;
}) {
  const { t } = useTranslation();

  if (summaries.length === 0) {
    return (
      <div className="p-4">
        <EmptyState variant="noData" title={t('monitoring:sidebar.noAreasData')} description={t('monitoring:sidebar.noAreasSummary')} />
      </div>
    );
  }

  return (
    <ul className="space-y-2 p-3">
      {summaries.map((area) => {
        const shortage = Math.max(0, area.required_count - area.active_count);
        const pct =
          area.required_count > 0
            ? Math.min(100, Math.round((area.active_count / area.required_count) * 100))
            : 0;
        return (
          <li
            key={area.area_id}
            className={cn(
              'rounded-nb-base border-2 border-nb-black bg-nb-white p-2.5 shadow-nb-sm',
              area.is_understaffed && 'border-l-4 border-l-[var(--color-status-missing)]'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-nb-black">{area.area_name}</p>
                {area.rayon_name && (
                  <p className="truncate text-xs text-nb-gray-500">{area.rayon_name}</p>
                )}
              </div>
              <span className="flex-shrink-0 font-mono text-xs tabular-nums text-nb-gray-600">
                {area.active_count}/{area.required_count}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-nb-gray-300 bg-nb-gray-200">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  area.is_understaffed
                    ? 'bg-[var(--color-status-idle)]'
                    : 'bg-[var(--color-status-active)]'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              {area.is_understaffed && shortage > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-nb-sm border border-[var(--color-status-missing)] bg-[var(--color-status-missing-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-status-missing)]">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {t('monitoring:sidebar.staffingShortage', { shortage })}
                </span>
              ) : (
                <span />
              )}
              {onBulkReassign && (
                <button
                  type="button"
                  onClick={() => onBulkReassign(area)}
                  aria-label={t('monitoring:sidebar.bulkReassignLabel', { area: area.area_name })}
                  className="inline-flex items-center gap-1 rounded-nb-sm border border-nb-black bg-nb-white px-1.5 py-0.5 text-[10px] font-bold text-nb-black shadow-nb-xs hover:bg-nb-gray-50"
                >
                  <ArrowRightLeft className="h-2.5 w-2.5" />
                  {t('monitoring:sidebar.bulkReassignButton')}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function MonitoringSidebar({
  workers,
  areaSummaries,
  selectedId,
  onSelect,
  onBulkReassign,
  className,
}: MonitoringSidebarProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SidebarTab>('petugas');
  const selectedWorker = selectedId ? workers.find((w) => w.user_id === selectedId) ?? null : null;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm',
        className
      )}
    >
      {selectedWorker ? (
        <WorkerDetail worker={selectedWorker} onBack={() => onSelect(null)} />
      ) : (
        <>
          <div className="flex-shrink-0 border-b-2 border-nb-black p-2">
            <Tabs
              fullWidth
              size="sm"
              value={tab}
              onValueChange={(k) => setTab(k as SidebarTab)}
              aria-label={t("common:a11y.monitoringPanel")}
              tabs={[
                { key: 'petugas', label: t('monitoring:sidebar.tabWorkers'), count: workers.length },
                { key: 'area', label: t('monitoring:sidebar.tabAreas'), count: areaSummaries.length },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'petugas' ? (
              workers.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    variant="noResults"
                    title={t('monitoring:sidebar.noWorkers')}
                    description={t('monitoring:sidebar.noWorkersMatch')}
                  />
                </div>
              ) : (
                <ul>
                  {workers.map((w) => (
                    <li key={w.user_id}>
                      <WorkerRow
                        worker={w}
                        selected={w.user_id === selectedId}
                        onClick={() => onSelect(w.user_id)}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <AreaSummaryList summaries={areaSummaries} onBulkReassign={onBulkReassign} />
            )}
          </div>
        </>
      )}

      {/* Footer hint */}
      {!selectedWorker && (
        <div className="flex-shrink-0 border-t-2 border-nb-gray-200 px-3 py-2 text-[11px] text-nb-gray-400">
          <Users className="mr-1 inline h-3 w-3" />
          {t('monitoring:sidebar.clickToFocus')}
        </div>
      )}
    </div>
  );
}
