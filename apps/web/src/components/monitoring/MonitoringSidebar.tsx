'use client';

/**
 * MonitoringSidebar — right panel for the monitoring page (mobile parity), shown
 * at EVERY drill level. Two tabs:
 *  - Wilayah (first): the current level's child nodes (districts at city, kawasan/
 *    lokasi deeper) with today's attendance trio; tapping a row drills in.
 *  - Petugas (second): the scoped worker list; selecting a worker opens the full
 *    worker detail (shift, location, tugas, aktivitas, kontak, reassignment
 *    history) — the same content mobile's UserDetailSheet shows, rather than the
 *    snapshot-only card this panel used to render.
 *
 * The detail itself is a SLOT (`workerDetail`). The sidebar stays presentational:
 * the day-summary and reassignment fetches belong to the page that owns the
 * selection, and the fallback card below still renders when no slot is supplied.
 * At lokasi scope there are no child nodes, so only the Petugas tab shows.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Battery, MapPin, Users, EyeOff } from 'lucide-react';
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
  /** True when filters removed someone at this scope — changes the empty-state copy. */
  workersNarrowedByFilters?: boolean;
  workers: SnapshotWorker[];
  /** The current level's child nodes (empty at lokasi scope → Wilayah tab hidden). */
  nodes: AggregateNode[];
  onDrillNode: (node: AggregateNode) => void;
  /** Opens a node's detail card from the Wilayah row's ⓘ button. */
  onNodeDetail?: (node: AggregateNode) => void;
  /** Label + indent each row by tier — used when the list spans the whole subtree. */
  showNodeTier?: boolean;
  /** Geo-filter spotlight id — dims non-matching Wilayah rows. */
  activeGeoId?: string | null;
  selectedId: string | null;
  /** The selected worker, resolved from the FULL snapshot (not the scoped list) so
   *  a searched worker still shows their detail even if they sit outside the
   *  current drill scope. Null when nothing is selected. */
  selectedWorker: SnapshotWorker | null;
  onSelect: (id: string | null) => void;
  /**
   * Rich detail for the selected worker. When supplied it replaces the built-in
   * snapshot card entirely — the caller has already fetched more than the
   * snapshot carries.
   */
  workerDetail?: React.ReactNode;
  /**
   * Row-level hide (see `lib/monitoring/hidden.ts`). Applies to BOTH tabs, with
   * one restore control per tab; hiding is presentation only, so the tab counts
   * keep reporting what is in scope, not what survived the filter.
   */
  isHidden?: (kind: 'nodes' | 'workers', id: string) => boolean;
  onToggleHidden?: (kind: 'nodes' | 'workers', id: string) => void;
  onShowAllHidden?: (kind: 'nodes' | 'workers') => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Worker row
// ---------------------------------------------------------------------------

function WorkerRow({
  worker,
  selected,
  onClick,
  onHide,
}: {
  worker: SnapshotWorker;
  selected: boolean;
  onClick: () => void;
  onHide?: () => void;
}) {
  const { t } = useTranslation();
  const statusLabels = getStatusLabels();
  const dot = STATUS_DOT_CLASSES[worker.status as TrackingStatus] ?? STATUS_DOT_CLASSES.offline;
  const roleLabel = ROLE_LABELS[worker.role as UserRole] ?? worker.role;
  const lowBattery = worker.battery_level !== null && worker.battery_level < 20;

  return (
    <div className="flex items-stretch border-b border-nb-gray-200">
    <button
      type="button"
      onClick={onClick}
      aria-current={selected}
      aria-label={`${worker.full_name}, ${statusLabels[worker.status as TrackingStatus] ?? worker.status}`}
      className={cn(
        'flex-1 px-3 py-2.5 text-left transition-colors',
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
            <span className="text-nb-gray-500">·</span>
            <span className="flex-shrink-0 text-nb-gray-500">
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
      {onHide && (
        <button
          type="button"
          onClick={onHide}
          aria-label={t('monitoring:hidden.hideLabel', { name: worker.full_name })}
          title={t('monitoring:hidden.hideLabel', { name: worker.full_name })}
          className="shrink-0 border-l border-nb-gray-200 px-2 text-nb-gray-500 transition-colors hover:bg-nb-gray-50 hover:text-nb-black"
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
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
          {(worker.district_name || worker.location_name) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-nb-gray-600">
              {worker.district_name && (
                <span>
                  {t('monitoring:sidebar.districtLabel')} <strong className="text-nb-black">{worker.district_name}</strong>
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
            <div className="text-nb-gray-500">{formatRelativeTime(worker.last_update)}</div>
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
  workersNarrowedByFilters = false,
  workers,
  nodes,
  onDrillNode,
  onNodeDetail,
  showNodeTier,
  activeGeoId,
  selectedId,
  selectedWorker,
  onSelect,
  workerDetail,
  isHidden,
  onToggleHidden,
  onShowAllHidden,
  className,
}: MonitoringSidebarProps) {
  const { t } = useTranslation();
  // Wilayah (child nodes) leads; at lokasi scope there are none, so default to
  // Petugas and hide the Wilayah tab.
  const hasNodes = nodes.length > 0;
  const [tab, setTab] = useState<SidebarTab>(hasNodes ? 'wilayah' : 'petugas');
  const activeTab: SidebarTab = hasNodes ? tab : 'petugas';

  // Hiding filters the LIST, never the counts: the tab badge below still reports
  // how many workers are in scope, which is the number the map is answering for.
  const visibleWorkers = isHidden ? workers.filter((w) => !isHidden('workers', w.user_id)) : workers;
  const hiddenWorkerCount = workers.length - visibleWorkers.length;

  const workerList =
    visibleWorkers.length === 0 ? (
      <div className="p-4">
        <EmptyState
          variant="noResults"
          title={t('monitoring:sidebar.noWorkers')}
          // Two different facts, and the operator's next move differs: clear a
          // filter, or accept that nobody is here. Saying "no match" when no
          // filter is set sends them hunting for one that does not exist.
          description={t(
            workersNarrowedByFilters
              ? 'monitoring:sidebar.noWorkersMatch'
              : 'monitoring:sidebar.noWorkersHere'
          )}
        />
      </div>
    ) : (
      <ul>
        {visibleWorkers.map((w) => (
          <li key={w.user_id}>
            <WorkerRow
              worker={w}
              selected={w.user_id === selectedId}
              onClick={() => onSelect(w.user_id)}
              onHide={onToggleHidden ? () => onToggleHidden('workers', w.user_id) : undefined}
            />
          </li>
        ))}
      </ul>
    );

  // Never silent: a hidden worker is announced with a one-click way back, or an
  // operator ends up trusting an incomplete list.
  const workerRestoreBanner = hiddenWorkerCount > 0 && onShowAllHidden && (
    <div className="flex items-center justify-between gap-2 border-b-2 border-nb-gray-100 bg-nb-gray-50 px-3 py-1.5 text-xs">
      <span className="font-bold text-nb-gray-600">
        {t('monitoring:hidden.count', { count: hiddenWorkerCount })}
      </span>
      <button
        type="button"
        onClick={() => onShowAllHidden('workers')}
        className="font-bold text-nb-black underline underline-offset-2 hover:text-nb-primary-active"
      >
        {t('monitoring:hidden.showAll')}
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm',
        className
      )}
    >
      {selectedWorker ? (
        (workerDetail ?? <WorkerDetail worker={selectedWorker} onBack={() => onSelect(null)} />)
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
              <AggregateNodeList
                bare
                nodes={nodes}
                onDrill={onDrillNode}
                onDetail={onNodeDetail}
                showTier={showNodeTier}
                activeGeoId={activeGeoId}
                isHidden={isHidden ? (id) => isHidden('nodes', id) : undefined}
                onToggleHidden={onToggleHidden ? (id) => onToggleHidden('nodes', id) : undefined}
                onShowAllHidden={onShowAllHidden ? () => onShowAllHidden('nodes') : undefined}
              />
            ) : (
              <>
                {workerRestoreBanner}
                {workerList}
              </>
            )}
          </div>
        </>
      )}

      {/* Footer hint */}
      {!selectedWorker && (
        <div className="flex-shrink-0 border-t-2 border-nb-gray-200 px-3 py-2 text-[11px] text-nb-gray-500">
          <Users className="mr-1 inline h-3 w-3" />
          {t('monitoring:sidebar.clickToFocus')}
        </div>
      )}
    </div>
  );
}
