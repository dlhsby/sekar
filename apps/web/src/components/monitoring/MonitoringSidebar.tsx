'use client';

/**
 * MonitoringSidebar — right panel for the monitoring page (mobile parity), shown
 * at EVERY drill level. Two tabs:
 *  - Wilayah (first): the current level's child nodes (rayons at city, kawasan/
 *    lokasi deeper) with today's attendance trio; tapping a row drills in.
 *  - Petugas (second): the scoped worker list; selecting a worker opens an inline
 *    detail card (snapshot fields only — no extra fetch).
 * At lokasi scope there are no child nodes, so only the Petugas tab shows.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Battery, MapPin, Users } from 'lucide-react';
import { Tabs, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { getStatusLabels, STATUS_DOT_CLASSES, STATUS_BADGE_CLASSES } from '@/lib/constants/monitoring';
import { AggregateNodeList } from './AggregateNodeList';
import type { SnapshotWorker, AggregateNode } from '@/lib/api/monitoring-v2';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

type SidebarTab = 'wilayah' | 'petugas';

export interface MonitoringSidebarProps {
  workers: SnapshotWorker[];
  /** The current level's child nodes (empty at lokasi scope → Wilayah tab hidden). */
  nodes: AggregateNode[];
  onDrillNode: (node: AggregateNode) => void;
  /** Geo-filter spotlight id — dims non-matching Wilayah rows. */
  activeGeoId?: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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
            <span className="truncate">{worker.location_name ?? '—'}</span>
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
          {(worker.rayon_name || worker.location_name) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-nb-gray-600">
              {worker.rayon_name && (
                <span>
                  {t('monitoring:sidebar.rayonLabel')} <strong className="text-nb-black">{worker.rayon_name}</strong>
                </span>
              )}
              {worker.location_name && (
                <span>
                  {t('monitoring:sidebar.areaLabel')} <strong className="text-nb-black">{worker.location_name}</strong>
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
// Main
// ---------------------------------------------------------------------------

export function MonitoringSidebar({
  workers,
  nodes,
  onDrillNode,
  activeGeoId,
  selectedId,
  onSelect,
  className,
}: MonitoringSidebarProps) {
  const { t } = useTranslation();
  // Wilayah (child nodes) leads; at lokasi scope there are none, so default to
  // Petugas and hide the Wilayah tab.
  const hasNodes = nodes.length > 0;
  const [tab, setTab] = useState<SidebarTab>(hasNodes ? 'wilayah' : 'petugas');
  const activeTab: SidebarTab = hasNodes ? tab : 'petugas';
  const selectedWorker = selectedId ? workers.find((w) => w.user_id === selectedId) ?? null : null;

  const workerList =
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
    );

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
          {hasNodes && (
            <div className="flex-shrink-0 border-b-2 border-nb-black p-2">
              <Tabs
                fullWidth
                size="sm"
                value={activeTab}
                onValueChange={(k) => setTab(k as SidebarTab)}
                aria-label={t('common:a11y.monitoringPanel')}
                tabs={[
                  { key: 'wilayah', label: t('monitoring:sidebar.tabWilayah'), count: nodes.length },
                  { key: 'petugas', label: t('monitoring:sidebar.tabWorkers'), count: workers.length },
                ]}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'wilayah' ? (
              <AggregateNodeList bare nodes={nodes} onDrill={onDrillNode} activeGeoId={activeGeoId} />
            ) : (
              workerList
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
