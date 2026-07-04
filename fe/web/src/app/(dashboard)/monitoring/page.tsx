/**
 * Monitoring (revamp)
 *
 * Hierarchy-aware, zoom/scope-driven monitoring. Default is an aggregate-first
 * drill-down (town → rayon → area → workers): the map shows lightweight summary
 * bubbles, and drilling into an area reveals individual workers. A
 * [Ringkasan]/[Semua Petugas] toggle switches to a clustered all-workers view.
 * Worker positions arrive incrementally over WebSocket (no full-refresh flash);
 * boundaries load progressively per scope. Native Google Maps controls.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, RefreshCw, X, List, ChevronDown, ChevronLeft, Sprout, LayoutGrid, Users } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import {
  useMonitoringSnapshot,
  useMonitoringAggregate,
  type AggregateNode,
  type AggregateStatusCounts,
} from '@/lib/api/monitoring-v2';
import { useBoundaries } from '@/lib/api/monitoring';
import { useMonitoringSocket } from '@/lib/monitoring/useMonitoringSocket';
import {
  MonitoringFilters,
  type MonitoringFilterState,
  type RayonOption,
} from '@/components/monitoring/MonitoringFilters';
import { MonitoringSidebar } from '@/components/monitoring/MonitoringSidebar';
import { AggregateNodeList } from '@/components/monitoring/AggregateNodeList';
import { BulkReassignModal } from '@/components/monitoring/BulkReassignModal';
import { usePlantStatusSummary } from '@/lib/api/plants';
import { SimpleMonitoringMap } from '@/components/monitoring/SimpleMonitoringMapLazy';
import type { SimpleWorker } from '@/components/monitoring/SimpleMonitoringMap';
import type { SnapshotAreaSummary } from '@/lib/api/monitoring-v2';
import { MONITORING_ROLES, REASSIGN_ROLES, hasRole } from '@/lib/constants/roles';
import { formatTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

type Scope = 'city' | 'rayon' | 'area';
type Mode = 'aggregate' | 'workers';

interface MonitoringView {
  scope: Scope;
  id?: string;
  rayonId?: string;
  name?: string;
}

const EMPTY_STATUS_COUNTS: Record<TrackingStatus, number> = {
  active: 0,
  inactive: 0,
  outside_area: 0,
  missing: 0,
  offline: 0,
};

function aggregateToStatusCounts(
  totals: AggregateStatusCounts | undefined
): Record<TrackingStatus, number> {
  if (!totals) return { ...EMPTY_STATUS_COUNTS };
  return {
    active: totals.active,
    inactive: totals.inactive,
    outside_area: totals.outside_area,
    missing: totals.missing,
    offline: totals.offline,
  };
}

export default function MonitoringPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const STATUS_PILLS: { key: TrackingStatus; label: string; color: string }[] = [
    { key: 'active', label: t('monitoring:status.active'), color: 'var(--color-status-active)' },
    { key: 'inactive', label: t('monitoring:status.inactive'), color: 'var(--color-status-idle)' },
    { key: 'outside_area', label: t('monitoring:status.outside_area'), color: 'var(--color-status-outside)' },
    { key: 'missing', label: t('monitoring:status.missing'), color: 'var(--color-status-missing)' },
    { key: 'offline', label: t('monitoring:status.offline'), color: 'var(--color-status-offline)' },
  ];

  const canMonitor = !!user && hasRole(user.role as UserRole, MONITORING_ROLES);
  const canReassign = !!user && hasRole(user.role as UserRole, REASSIGN_ROLES);

  // Role determines the landing view + the floor the user can never drill above.
  const roleView = useMemo<{ view: MonitoringView; floor: Scope; mode: Mode }>(() => {
    if (user?.role === 'korlap' && user.area_id) {
      return { view: { scope: 'area', id: user.area_id }, floor: 'area', mode: 'workers' };
    }
    if ((user?.role === 'kepala_rayon' || user?.role === 'admin_data') && user.rayon_id) {
      return {
        view: { scope: 'rayon', id: user.rayon_id, rayonId: user.rayon_id },
        floor: 'rayon',
        mode: 'aggregate',
      };
    }
    return { view: { scope: 'city' }, floor: 'city', mode: 'aggregate' };
  }, [user]);

  const [view, setView] = useState<MonitoringView>(roleView.view);
  const [mode, setMode] = useState<Mode>(roleView.mode);
  const [filters, setFilters] = useState<MonitoringFilterState>({
    search: '',
    statuses: new Set(),
    rayonId: 'all',
    role: 'all',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<SnapshotAreaSummary | null>(null);
  const [showOverdue, setShowOverdue] = useState(false);

  // Keep view/mode in sync when the user (role) resolves.
  useEffect(() => {
    setView(roleView.view);
    setMode(roleView.mode);
  }, [roleView]);

  // Areas have no sub-aggregate, so the area scope is always the worker view.
  const effectiveMode: Mode = view.scope === 'area' ? 'workers' : mode;
  const canToggle = view.scope !== 'area';

  // Data hooks — only the one feeding the current view is enabled.
  const aggregateEnabled =
    canMonitor && effectiveMode === 'aggregate' && (view.scope === 'city' || view.scope === 'rayon');
  const aggregate = useMonitoringAggregate(
    (view.scope === 'rayon' ? 'rayon' : 'city') as 'city' | 'rayon',
    view.scope === 'rayon' ? view.id : undefined,
    aggregateEnabled
  );

  const snapshotEnabled = canMonitor && effectiveMode === 'workers';
  const snapshot = useMonitoringSnapshot(view.scope, view.id, snapshotEnabled);

  // Progressive boundaries: rayon outlines at city, that rayon's areas when deeper.
  const boundaryLevel: 'rayon' | 'area' = view.scope === 'city' ? 'rayon' : 'area';
  const boundaryRayonId = view.scope === 'city' ? undefined : view.rayonId ?? view.id;
  const { data: boundaries } = useBoundaries(canMonitor, boundaryLevel, boundaryRayonId);

  const plantSummary = usePlantStatusSummary(canMonitor && showOverdue);
  const overdueByArea = useMemo(() => {
    if (!showOverdue || !plantSummary.data) return null;
    const map: Record<string, number> = {};
    for (const rayon of plantSummary.data.rayons) {
      for (const a of rayon.overdue_areas) map[a.area_id] = a.overdue;
    }
    return map;
  }, [showOverdue, plantSummary.data]);

  // Live incremental updates (replaces the old 30 s full-refresh flash).
  useMonitoringSocket(canMonitor);

  useEffect(() => {
    if (!authLoading && user && !canMonitor) router.push('/');
  }, [user, authLoading, canMonitor, router]);

  const selectWorker = (id: string | null) => {
    setSelectedId(id);
    if (id) setListOpen(true);
  };

  // Drill one level deeper when an aggregate bubble is tapped.
  const onDrillNode = (node: AggregateNode) => {
    if (node.type === 'rayon') {
      setView({ scope: 'rayon', id: node.id, rayonId: node.id, name: node.name });
    } else {
      setView({ scope: 'area', id: node.id, rayonId: view.rayonId ?? node.rayon_id ?? undefined, name: node.name });
      setMode('workers');
    }
    setSelectedId(null);
  };

  const canGoBack = view.scope !== roleView.floor;
  const goBack = () => {
    setSelectedId(null);
    if (view.scope === 'area') {
      // Back to the parent rayon aggregate (or city if that's the floor).
      if (roleView.floor === 'city' && view.rayonId) {
        setView({ scope: 'rayon', id: view.rayonId, rayonId: view.rayonId });
      } else if (roleView.floor === 'rayon') {
        setView(roleView.view);
      } else {
        setView({ scope: 'rayon', id: view.rayonId, rayonId: view.rayonId });
      }
      setMode('aggregate');
    } else if (view.scope === 'rayon') {
      setView({ scope: 'city' });
      setMode('aggregate');
    }
  };

  const workers = useMemo(() => snapshot.data?.data?.workers ?? [], [snapshot.data]);
  const areaSummaries = useMemo(() => snapshot.data?.data?.area_summaries ?? [], [snapshot.data]);
  const aggregateNodes = useMemo(() => aggregate.data?.nodes ?? [], [aggregate.data]);

  const statusCounts = useMemo(() => {
    if (effectiveMode === 'aggregate') return aggregateToStatusCounts(aggregate.data?.totals);
    const counts = { ...EMPTY_STATUS_COUNTS };
    for (const w of workers) {
      const s = w.status as TrackingStatus;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [effectiveMode, aggregate.data, workers]);

  const rayonOptions = useMemo<RayonOption[]>(() => {
    const map = new Map<string, string>();
    for (const w of workers) {
      if (w.rayon_id && w.rayon_name && !map.has(w.rayon_id)) map.set(w.rayon_id, w.rayon_name);
    }
    if (map.size === 0 && boundaries?.rayons) {
      for (const r of boundaries.rayons) if (!map.has(r.id)) map.set(r.id, r.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, boundaries]);

  const roleOptions = useMemo<UserRole[]>(() => {
    const set = new Set<string>();
    for (const w of workers) set.add(w.role);
    return [...set] as UserRole[];
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return workers.filter((w) => {
      if (filters.statuses.size > 0 && !filters.statuses.has(w.status as TrackingStatus)) return false;
      if (filters.rayonId !== 'all' && w.rayon_id !== filters.rayonId) return false;
      if (filters.role !== 'all' && w.role !== filters.role) return false;
      if (q && !w.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workers, filters]);

  const filteredNodes = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return aggregateNodes;
    return aggregateNodes.filter((n) => n.name.toLowerCase().includes(q));
  }, [aggregateNodes, filters.search]);

  const filteredAreaSummaries = useMemo(() => {
    if (filters.rayonId === 'all') return areaSummaries;
    return areaSummaries.filter((a) => a.rayon_id === filters.rayonId);
  }, [areaSummaries, filters.rayonId]);

  const mapWorkers = useMemo<SimpleWorker[]>(
    () =>
      filteredWorkers.map((w) => ({
        user_id: w.user_id,
        full_name: w.full_name,
        lat: w.lat,
        lng: w.lng,
        status: w.status,
      })),
    [filteredWorkers]
  );

  const isLoading = effectiveMode === 'aggregate' ? aggregate.isLoading : snapshot.isLoading;
  const generatedAt =
    effectiveMode === 'aggregate' ? aggregate.data?.generated_at : snapshot.data?.data?.generated_at;
  const refetch = () => {
    if (effectiveMode === 'aggregate') aggregate.refetch();
    else snapshot.refetch();
  };
  const listCount = effectiveMode === 'aggregate' ? filteredNodes.length : filteredWorkers.length;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-nb-gray-600">
        {t('monitoring:page.loading')}
      </div>
    );
  }

  if (!canMonitor) return null;

  const updatedLabel = isLoading
    ? t('monitoring:page.loading')
    : generatedAt
      ? t('monitoring:page.updated', { time: formatTime(generatedAt) })
      : t('monitoring:page.noData');

  return (
    <div className="relative h-[calc(100dvh_-_7rem)] min-h-[28rem] w-full overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-gray-100">
      {/* Map (base layer) */}
      <SimpleMonitoringMap
        mode={effectiveMode}
        aggregateNodes={filteredNodes}
        onDrillNode={onDrillNode}
        workers={mapWorkers}
        boundaries={boundaries ?? null}
        selectedId={selectedId}
        onSelect={selectWorker}
        overdueByArea={overdueByArea}
      />

      {/* Top overlay: breadcrumb + search + toggle + filter + refresh + status pills */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2">
        <div className="pointer-events-none flex items-center gap-2">
          {/* Back / breadcrumb */}
          {canGoBack && (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('monitoring:page.backLabel')}
              className="pointer-events-auto flex h-11 items-center gap-1 rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 text-sm font-bold text-nb-black shadow-nb-sm hover:bg-nb-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden max-w-[8rem] truncate sm:inline">
                {view.name ?? t('monitoring:page.backLabel')}
              </span>
            </button>
          )}
          {/* Search */}
          <div className="pointer-events-auto relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nb-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder={t('monitoring:page.searchPlaceholder')}
              aria-label={t('monitoring:page.searchLabel')}
              className="h-11 w-full rounded-nb-base border-2 border-nb-black bg-nb-white pl-9 pr-3 text-sm font-medium text-nb-black shadow-nb-sm placeholder:text-nb-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
            />
          </div>
          {/* Ringkasan / Semua Petugas toggle */}
          {canToggle && (
            <div className="pointer-events-auto flex h-11 items-center rounded-nb-base border-2 border-nb-black bg-nb-white p-0.5 shadow-nb-sm">
              <button
                type="button"
                onClick={() => setMode('aggregate')}
                aria-pressed={effectiveMode === 'aggregate'}
                className={cn(
                  'flex h-full items-center gap-1 rounded-nb-sm px-2.5 text-sm font-bold transition-colors',
                  effectiveMode === 'aggregate' ? 'bg-nb-primary text-nb-black' : 'text-nb-gray-600 hover:bg-nb-gray-50'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden md:inline">{t('monitoring:page.modeSummary')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('workers')}
                aria-pressed={effectiveMode === 'workers'}
                className={cn(
                  'flex h-full items-center gap-1 rounded-nb-sm px-2.5 text-sm font-bold transition-colors',
                  effectiveMode === 'workers' ? 'bg-nb-primary text-nb-black' : 'text-nb-gray-600 hover:bg-nb-gray-50'
                )}
              >
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">{t('monitoring:page.modeAllWorkers')}</span>
              </button>
            </div>
          )}
          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label={t('monitoring:page.filterLabel')}
            className={cn(
              'pointer-events-auto flex h-11 items-center gap-1.5 rounded-nb-base border-2 border-nb-black px-3 text-sm font-bold shadow-nb-sm transition-colors',
              filtersOpen ? 'bg-nb-primary text-nb-black' : 'bg-nb-white text-nb-black hover:bg-nb-gray-50'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t('monitoring:page.filterLabel')}</span>
          </button>
          {/* Plant-overdue overlay toggle */}
          <button
            type="button"
            onClick={() => setShowOverdue((v) => !v)}
            aria-pressed={showOverdue}
            aria-label={t('monitoring:page.overdueToggleLabel')}
            title={t('monitoring:page.overdueToggleTitle')}
            className={cn(
              'pointer-events-auto flex h-11 items-center gap-1.5 rounded-nb-base border-2 border-nb-black px-3 text-sm font-bold shadow-nb-sm transition-colors',
              showOverdue ? 'bg-nb-warning text-nb-black' : 'bg-nb-white text-nb-black hover:bg-nb-gray-50'
            )}
          >
            <Sprout className="h-4 w-4" />
            <span className="hidden sm:inline">{t('monitoring:page.overdueButtonLabel')}</span>
          </button>
          {/* Refresh */}
          <button
            type="button"
            onClick={refetch}
            aria-label={t('monitoring:page.refreshLabel')}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-sm transition-colors hover:bg-nb-gray-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Status pills */}
        <div className="pointer-events-none flex flex-wrap items-center gap-1.5" aria-live="polite">
          {STATUS_PILLS.map((p) => (
            <span
              key={p.key}
              className="flex items-center gap-1.5 rounded-nb-base border-2 border-nb-black bg-nb-white/95 px-2 py-1 text-xs font-semibold text-nb-gray-700 shadow-nb-xs backdrop-blur-sm"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
              {p.label}
              <span className="font-mono tabular-nums text-nb-black">{statusCounts[p.key]}</span>
            </span>
          ))}
          <span className="rounded-nb-base bg-nb-white/95 px-2 py-1 text-xs text-nb-gray-500 shadow-nb-xs backdrop-blur-sm">
            {updatedLabel}
          </span>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="absolute left-3 right-3 top-28 z-30 max-h-[60%] w-auto overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white p-4 shadow-nb-lg sm:right-auto sm:w-80">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-nb-black">{t('monitoring:page.filterPanelTitle')}</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label={t('monitoring:page.closePanelLabel')}
              className="rounded-nb-sm p-1 text-nb-gray-500 hover:bg-nb-gray-100 hover:text-nb-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <MonitoringFilters
            filters={filters}
            onChange={setFilters}
            statusCounts={statusCounts}
            rayonOptions={rayonOptions}
            roleOptions={roleOptions}
            total={effectiveMode === 'aggregate' ? aggregateNodes.length : workers.length}
            matched={listCount}
            showSearch={false}
          />
        </div>
      )}

      {/* Worker/area/node sheet */}
      {listOpen ? (
        <div className="absolute inset-x-3 bottom-3 z-20 flex h-[45vh] max-h-[60%] flex-col sm:inset-x-auto sm:left-3 sm:w-96">
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-1 text-xs font-bold text-nb-black shadow-nb-xs">
              {t('monitoring:page.listLabel')}
            </span>
            <button
              type="button"
              onClick={() => {
                setListOpen(false);
                setSelectedId(null);
              }}
              aria-label={t('monitoring:page.closeListLabel')}
              className="flex h-8 w-8 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-xs hover:bg-nb-gray-50"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {effectiveMode === 'aggregate' ? (
            <AggregateNodeList
              nodes={filteredNodes}
              onDrill={onDrillNode}
              className="min-h-0 flex-1 shadow-nb-lg"
            />
          ) : (
            <MonitoringSidebar
              workers={filteredWorkers}
              areaSummaries={filteredAreaSummaries}
              selectedId={selectedId}
              onSelect={selectWorker}
              onBulkReassign={canReassign ? setBulkTarget : undefined}
              className="min-h-0 flex-1 shadow-nb-lg"
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-primary px-4 py-2.5 text-sm font-bold text-nb-black shadow-nb-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <List className="h-4 w-4" />
          {t('monitoring:page.listLabel')}
          <span className="rounded-full bg-nb-black px-1.5 font-mono text-xs text-nb-primary">
            {listCount}
          </span>
        </button>
      )}

      {/* Bulk reassign modal */}
      {canReassign && bulkTarget && (
        <BulkReassignModal
          open={!!bulkTarget}
          onOpenChange={(open) => {
            if (!open) setBulkTarget(null);
          }}
          targetAreaId={bulkTarget.area_id}
          targetAreaName={bulkTarget.area_name}
          boundaries={boundaries}
        />
      )}
    </div>
  );
}
