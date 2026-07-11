/**
 * Monitoring — unified hierarchical drill-down.
 *
 * One flow, no modes: the map opens on a single Surabaya summary node
 * (today's scheduled / clocked-in / not-clocked-in). Tapping it reveals the 7
 * rayons; tapping a rayon reveals its areas; tapping an area focuses its bounds
 * and shows the individual workers. Each non-worker level carries the same
 * attendance trio. Worker positions arrive incrementally over WebSocket;
 * boundaries load progressively per scope. Native Google Maps controls.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SlidersHorizontal, RefreshCw, X, List, ChevronDown, ChevronLeft, Settings } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import {
  useMonitoringSnapshot,
  useMonitoringAggregate,
  type AggregateNode,
  type AggregateStatusCounts,
  type AggregateRosterCounts,
} from '@/lib/api/monitoring-v2';
import { useBoundaries } from '@/lib/api/monitoring';
import { useMonitoringSocket } from '@/lib/monitoring/useMonitoringSocket';
import { useMonitoringLayers } from '@/lib/monitoring/layers';
import { statusToActivity } from '@/lib/monitoring/markers';
import type { MonitoringSearchResult } from '@/lib/monitoring/useMonitoringSearch';
import {
  MonitoringFilters,
  type MonitoringFilterState,
  type RayonOption,
} from '@/components/monitoring/MonitoringFilters';
import { MonitoringSidebar } from '@/components/monitoring/MonitoringSidebar';
import { MonitoringSearch } from '@/components/monitoring/MonitoringSearch';
import { MonitoringLayersPanel } from '@/components/monitoring/MonitoringLayersPanel';
import { AggregateNodeList } from '@/components/monitoring/AggregateNodeList';
import { SurabayaSummaryCard } from '@/components/monitoring/SurabayaSummaryCard';
import { BulkReassignModal } from '@/components/monitoring/BulkReassignModal';
import { usePlantStatusSummary } from '@/lib/api/plants';
import { SimpleMonitoringMap } from '@/components/monitoring/SimpleMonitoringMapLazy';
import type { SimpleWorker, CurrentNodeMarker } from '@/components/monitoring/SimpleMonitoringMap';
import type { NodeMarker } from '@/components/monitoring/NodeMarkerLayer';
import type { SnapshotAreaSummary } from '@/lib/api/monitoring-v2';
import { MONITORING_ROLES, REASSIGN_ROLES, hasRole } from '@/lib/constants/roles';
import { formatTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

// Surabaya-wide drill above the rayon list; workers only render at area scope.
type Scope = 'surabaya' | 'city' | 'rayon' | 'area';

const SURABAYA = { lat: -7.2575, lng: 112.7521 };
const EMPTY_ROSTER: AggregateRosterCounts = { scheduled: 0, clocked_in: 0, not_clocked_in: 0 };

interface MonitoringView {
  scope: Scope;
  id?: string;
  rayonId?: string;
  name?: string;
  /** Center of the drilled node — anchors the current-node pin + drill-back zoom. */
  lat?: number;
  lng?: number;
}

// Zoom levels per scope (drill-in tightens; drill-back uses these to zoom out).
const ZOOM_RAYON = 13;
const ZOOM_AREA = 15;
const ZOOM_CITY = 11;

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

/** An aggregate node → a map marker (skips nodes without a center point). */
function aggToMarker(n: AggregateNode): NodeMarker | null {
  if (typeof n.center_lat !== 'number' || typeof n.center_lng !== 'number') return null;
  return {
    id: n.id,
    name: n.name,
    variant: n.type,
    lat: n.center_lat,
    lng: n.center_lng,
    scheduled: n.roster.scheduled,
    clocked_in: n.roster.clocked_in,
    not_clocked_in: n.roster.not_clocked_in,
    active_inside: n.presence.aktif.dalam,
  };
}

export default function MonitoringPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Presence-model pills (Aktif / Tidak aktif / Tidak hadir / Luar jadwal).
  type PresenceKey = 'aktif' | 'tidak_aktif' | 'tidak_hadir' | 'adhoc';
  const PRESENCE_PILLS: { key: PresenceKey; label: string; color: string }[] = [
    { key: 'aktif', label: t('monitoring:status.active'), color: 'var(--color-status-active)' },
    { key: 'tidak_aktif', label: t('monitoring:status.inactive'), color: 'var(--color-status-idle)' },
    { key: 'tidak_hadir', label: t('monitoring:status.absent'), color: 'var(--color-status-missing)' },
    { key: 'adhoc', label: t('monitoring:status.adhoc'), color: 'var(--color-status-offline)' },
  ];

  const canMonitor = !!user && hasRole(user.role as UserRole, MONITORING_ROLES);
  const canReassign = !!user && hasRole(user.role as UserRole, REASSIGN_ROLES);

  // Role determines the landing view + the floor the user can never drill above.
  const roleView = useMemo<{ view: MonitoringView; floor: Scope }>(() => {
    if (user?.role === 'korlap' && user.area_id) {
      return { view: { scope: 'area', id: user.area_id }, floor: 'area' };
    }
    if ((user?.role === 'kepala_rayon' || user?.role === 'admin_rayon') && user.rayon_id) {
      return {
        view: { scope: 'rayon', id: user.rayon_id, rayonId: user.rayon_id },
        floor: 'rayon',
      };
    }
    return { view: { scope: 'surabaya' }, floor: 'surabaya' };
  }, [user]);

  const [view, setView] = useState<MonitoringView>(roleView.view);
  const [filters, setFilters] = useState<MonitoringFilterState>({
    search: '',
    statuses: new Set(),
    rayonId: 'all',
    role: 'all',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<SnapshotAreaSummary | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    exact?: boolean;
    key: number;
  } | null>(null);

  // Map layer visibility (persisted). Overdue-plant overlay is a layer now.
  const { layers, toggleLayer } = useMonitoringLayers();
  const showOverdue = layers.overdue;

  // Keep view in sync when the user (role) resolves.
  useEffect(() => {
    setView(roleView.view);
  }, [roleView]);

  const scope = view.scope;
  const showWorkers = scope === 'area';

  // City aggregate feeds BOTH the Surabaya summary (roster_totals) and the rayon
  // list/markers (nodes) — one fetch. Rayon aggregate feeds the area level.
  const cityAgg = useMonitoringAggregate(
    'city',
    undefined,
    canMonitor && (scope === 'surabaya' || scope === 'city')
  );
  const rayonAgg = useMonitoringAggregate('rayon', view.id, canMonitor && scope === 'rayon');
  const activeAgg = scope === 'rayon' ? rayonAgg : cityAgg;

  // Snapshot (workers) — rendered only at area scope, but kept loaded so search
  // can find people at any level. Surabaya maps to the city snapshot scope.
  const snapshotScope: 'city' | 'rayon' | 'area' = scope === 'surabaya' ? 'city' : scope;
  const snapshotId = scope === 'surabaya' ? undefined : view.id;
  const snapshot = useMonitoringSnapshot(snapshotScope, snapshotId, canMonitor);
  const workers = useMemo(() => snapshot.data?.data?.workers ?? [], [snapshot.data]);
  const areaSummaries = useMemo(() => snapshot.data?.data?.area_summaries ?? [], [snapshot.data]);

  // Progressive boundaries: rayon outlines at the top, that rayon's areas deeper.
  const boundaryLevel: 'rayon' | 'area' =
    scope === 'surabaya' || scope === 'city' ? 'rayon' : 'area';
  const boundaryRayonId =
    scope === 'rayon' || scope === 'area' ? view.rayonId ?? view.id : undefined;
  const {
    data: boundaries,
    isFetching: boundariesFetching,
    refetch: refetchBoundaries,
  } = useBoundaries(canMonitor, boundaryLevel, boundaryRayonId);

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

  const focusOn = (lat: number, lng: number, zoom?: number, exact?: boolean) =>
    setFocusTarget((cur) => ({ lat, lng, zoom, exact, key: cur ? cur.key + 1 : 1 }));

  // ---- Drill navigation (scope only; no modes) ----------------------------
  const drillToCity = () => {
    setView({ scope: 'city' });
    setSelectedId(null);
    focusOn(SURABAYA.lat, SURABAYA.lng, ZOOM_CITY, true);
  };
  const drillToRayon = (id: string, name: string, lat?: number | null, lng?: number | null) => {
    const coord = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {};
    setView({ scope: 'rayon', id, rayonId: id, name, ...coord });
    setSelectedId(null);
    if ('lat' in coord) focusOn(coord.lat!, coord.lng!, ZOOM_RAYON);
  };
  const drillToArea = (
    id: string,
    name: string,
    rayonId?: string,
    lat?: number | null,
    lng?: number | null
  ) => {
    const coord = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {};
    setView({ scope: 'area', id, rayonId, name, ...coord });
    setSelectedId(null);
    if ('lat' in coord) focusOn(coord.lat!, coord.lng!, ZOOM_AREA);
  };

  // Map marker tapped.
  const onDrillMarker = (node: NodeMarker) => {
    if (node.variant === 'surabaya') drillToCity();
    else if (node.variant === 'rayon') drillToRayon(node.id, node.name, node.lat, node.lng);
    else drillToArea(node.id, node.name, view.id, node.lat, node.lng);
  };
  // List row tapped (an AggregateNode).
  const onDrillListNode = (node: AggregateNode) => {
    if (node.type === 'rayon') drillToRayon(node.id, node.name, node.center_lat, node.center_lng);
    else drillToArea(node.id, node.name, node.rayon_id ?? view.id, node.center_lat, node.center_lng);
  };

  const handleSearchSelect = (result: MonitoringSearchResult) => {
    if (result.type === 'petugas') {
      // Drill into the worker's area so the pin renders, then select + focus.
      const w = workers.find((x) => x.user_id === result.id);
      if (w?.area_id) {
        setView({
          scope: 'area',
          id: w.area_id,
          rayonId: w.rayon_id ?? result.rayonId ?? undefined,
          name: w.area_name ?? undefined,
        });
      }
      setSelectedId(result.id);
      setListOpen(true);
      focusOn(result.latitude, result.longitude, 16);
    } else if (result.type === 'area') {
      drillToArea(result.id, result.name, result.rayonId ?? view.rayonId, result.latitude, result.longitude);
    } else {
      drillToRayon(result.id, result.name, result.latitude, result.longitude);
    }
  };

  const canGoBack = scope !== roleView.floor;
  // Drilling OUT zooms back out (exact zoom) to frame the parent level.
  const goBack = () => {
    setSelectedId(null);
    if (scope === 'area') {
      if (roleView.floor === 'area') return;
      setView({ scope: 'rayon', id: view.rayonId, rayonId: view.rayonId });
      if (typeof view.lat === 'number' && typeof view.lng === 'number') {
        focusOn(view.lat, view.lng, ZOOM_RAYON, true);
      }
    } else if (scope === 'rayon') {
      if (roleView.floor === 'rayon') return;
      setView({ scope: 'city' });
      focusOn(SURABAYA.lat, SURABAYA.lng, ZOOM_CITY, true);
    } else if (scope === 'city') {
      setView({ scope: 'surabaya' });
      focusOn(SURABAYA.lat, SURABAYA.lng, ZOOM_CITY, true);
    }
  };

  // The current node's own pin (rayon at rayon scope / area at area scope) — the
  // detail-opener. Coords come from the drill; fall back to the aggregate node /
  // boundary centre so it also renders on role-landing + drill-back.
  const currentNode = useMemo<CurrentNodeMarker | null>(() => {
    if (scope === 'rayon' && view.id) {
      let lat = view.lat;
      let lng = view.lng;
      const node = cityAgg.data?.nodes.find((n) => n.id === view.id);
      if ((lat == null || lng == null) && node?.center_lat != null && node?.center_lng != null) {
        lat = node.center_lat;
        lng = node.center_lng;
      }
      if (lat != null && lng != null) {
        return { variant: 'rayon', id: view.id, name: view.name ?? node?.name ?? '', lat, lng };
      }
    }
    if (scope === 'area' && view.id) {
      let lat = view.lat;
      let lng = view.lng;
      const area = boundaries?.rayons.flatMap((r) => r.areas).find((a) => a.id === view.id);
      if ((lat == null || lng == null) && area?.center_lat != null && area?.center_lng != null) {
        lat = area.center_lat;
        lng = area.center_lng;
      }
      if (lat != null && lng != null) {
        return { variant: 'area', id: view.id, name: view.name ?? area?.name ?? '', lat, lng };
      }
    }
    return null;
  }, [scope, view, cityAgg.data, boundaries]);

  // Tapping the current-node pin focuses it a touch tighter and opens the list
  // sheet (its children/detail) — mirrors mobile's marker → detail.
  const onNodeDetail = (node: CurrentNodeMarker) => {
    focusOn(node.lat, node.lng, node.variant === 'area' ? 16 : 14);
    setListOpen(true);
  };

  // Rayons list (surabaya + city) or areas list (rayon), for the side panel.
  const listNodes = useMemo<AggregateNode[]>(() => {
    if (scope === 'rayon') return rayonAgg.data?.nodes ?? [];
    if (scope === 'surabaya' || scope === 'city') return cityAgg.data?.nodes ?? [];
    return [];
  }, [scope, rayonAgg.data, cityAgg.data]);

  const cityRosterTotals = cityAgg.data?.roster_totals ?? EMPTY_ROSTER;
  const cityActiveInside = cityAgg.data?.presence_totals?.aktif.dalam ?? 0;

  // Map markers for the current scope.
  const nodeMarkers = useMemo<NodeMarker[]>(() => {
    if (scope === 'surabaya') {
      return [
        {
          id: 'surabaya',
          name: 'Surabaya',
          variant: 'surabaya',
          lat: SURABAYA.lat,
          lng: SURABAYA.lng,
          scheduled: cityRosterTotals.scheduled,
          clocked_in: cityRosterTotals.clocked_in,
          not_clocked_in: cityRosterTotals.not_clocked_in,
          active_inside: cityActiveInside,
        },
      ];
    }
    if (scope === 'area') return [];
    return listNodes.map(aggToMarker).filter((m): m is NodeMarker => m !== null);
  }, [scope, listNodes, cityRosterTotals, cityActiveInside]);

  const statusCounts = useMemo(() => {
    if (showWorkers) {
      const counts = { ...EMPTY_STATUS_COUNTS };
      for (const w of workers) {
        const s = w.status as TrackingStatus;
        if (s in counts) counts[s] += 1;
      }
      return counts;
    }
    return aggregateToStatusCounts(activeAgg.data?.totals);
  }, [showWorkers, activeAgg.data, workers]);

  // Presence-model counts for the top pills. At area scope, derive from the
  // worker list (scheduled → aktif/tidak-aktif; unscheduled → ad-hoc); above
  // area, read the aggregate's presence + roster totals.
  const presenceCounts = useMemo<Record<PresenceKey, number>>(() => {
    if (showWorkers) {
      let aktif = 0;
      let tidak_aktif = 0;
      let adhoc = 0;
      for (const w of workers) {
        if (w.is_scheduled === false) {
          adhoc += 1;
          continue;
        }
        if (statusToActivity(w.status) === 'aktif') aktif += 1;
        else tidak_aktif += 1;
      }
      return { aktif, tidak_aktif, tidak_hadir: 0, adhoc };
    }
    const p = activeAgg.data?.presence_totals;
    const r = activeAgg.data?.roster_totals;
    return {
      aktif: (p?.aktif.dalam ?? 0) + (p?.aktif.luar ?? 0),
      tidak_aktif: (p?.tidak_aktif.dalam ?? 0) + (p?.tidak_aktif.luar ?? 0),
      tidak_hadir: r?.not_clocked_in ?? 0,
      adhoc: 0,
    };
     
  }, [showWorkers, workers, activeAgg.data]);

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
    if (!q) return listNodes;
    return listNodes.filter((n) => n.name.toLowerCase().includes(q));
  }, [listNodes, filters.search]);

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
        role: w.role,
        is_within_area: w.is_within_area,
        is_scheduled: w.is_scheduled ?? true,
      })),
    [filteredWorkers]
  );

  const isLoading = showWorkers ? snapshot.isLoading : activeAgg.isLoading;
  const generatedAt = showWorkers ? snapshot.data?.data?.generated_at : activeAgg.data?.generated_at;
  // `isFetching` (not `isLoading`) is what's true during a manual refetch —
  // drives the spinner. A toast confirms the result since the change is subtle.
  const isFetching =
    (showWorkers ? snapshot.isFetching : activeAgg.isFetching) || boundariesFetching;
  const handleRefresh = async () => {
    try {
      await Promise.all([
        showWorkers ? snapshot.refetch() : activeAgg.refetch(),
        refetchBoundaries(),
      ]);
      toast.success(t('monitoring:page.refreshSuccess'));
    } catch {
      toast.error(t('monitoring:page.refreshError'));
    }
  };
  const listCount = showWorkers ? filteredWorkers.length : filteredNodes.length;

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
        showWorkers={showWorkers}
        scope={scope}
        nodeMarkers={nodeMarkers}
        onDrillNode={onDrillMarker}
        currentNode={currentNode}
        onNodeDetail={onNodeDetail}
        areaId={scope === 'area' ? view.id ?? null : null}
        workers={mapWorkers}
        boundaries={boundaries ?? null}
        selectedId={selectedId}
        onSelect={selectWorker}
        overdueByArea={overdueByArea}
        layers={layers}
        focusTarget={focusTarget}
      />

      {/* Top overlay: breadcrumb + search + settings + filter + refresh + status pills */}
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
          {/* Search (recent + grouped results + click-to-locate) */}
          <MonitoringSearch
            workers={workers}
            rayons={boundaries?.rayons}
            onSelect={handleSearchSelect}
            className="max-w-md flex-1"
          />
          {/* Settings control (map overlay toggles) — "Pengaturan" */}
          <button
            type="button"
            onClick={() => {
              setLayersOpen((v) => !v);
              setFiltersOpen(false);
            }}
            aria-expanded={layersOpen}
            aria-label={t('monitoring:layers.title')}
            className={cn(
              'pointer-events-auto flex h-11 items-center gap-1.5 rounded-nb-base border-2 border-nb-black px-3 text-sm font-bold shadow-nb-sm transition-colors',
              layersOpen ? 'bg-nb-primary text-nb-black' : 'bg-nb-white text-nb-black hover:bg-nb-gray-50'
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('monitoring:layers.title')}</span>
          </button>
          {/* Filter toggle (status / role / rayon worker filters) */}
          <button
            type="button"
            onClick={() => {
              setFiltersOpen((v) => !v);
              setLayersOpen(false);
            }}
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
          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label={t('monitoring:page.refreshLabel')}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-sm transition-colors hover:bg-nb-gray-50 disabled:opacity-70"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>

        {/* Status pills (presence model) */}
        <div className="pointer-events-none flex flex-wrap items-center gap-1.5" aria-live="polite">
          {PRESENCE_PILLS.map((p) => (
            <span
              key={p.key}
              className="flex items-center gap-1.5 rounded-nb-base border-2 border-nb-black bg-nb-white/95 px-2 py-1 text-xs font-semibold text-nb-gray-700 shadow-nb-xs backdrop-blur-sm"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
              {p.label}
              <span className="font-mono tabular-nums text-nb-black">{presenceCounts[p.key]}</span>
            </span>
          ))}
          <span className="rounded-nb-base bg-nb-white/95 px-2 py-1 text-xs text-nb-gray-500 shadow-nb-xs backdrop-blur-sm">
            {updatedLabel}
          </span>
        </div>

        {/* Surabaya summary card (top level only) */}
        {scope === 'surabaya' && (
          <SurabayaSummaryCard
            roster={cityRosterTotals}
            onDrill={drillToCity}
            className="max-w-md"
          />
        )}
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
            total={showWorkers ? workers.length : listNodes.length}
            matched={listCount}
            showSearch={false}
          />
        </div>
      )}

      {/* Settings panel (map overlay toggles) */}
      {layersOpen && (
        <MonitoringLayersPanel
          layers={layers}
          onToggleLayer={toggleLayer}
          onClose={() => setLayersOpen(false)}
        />
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
          {showWorkers ? (
            <MonitoringSidebar
              workers={filteredWorkers}
              areaSummaries={filteredAreaSummaries}
              selectedId={selectedId}
              onSelect={selectWorker}
              onBulkReassign={canReassign ? setBulkTarget : undefined}
              className="min-h-0 flex-1 shadow-nb-lg"
            />
          ) : (
            <AggregateNodeList
              nodes={filteredNodes}
              onDrill={onDrillListNode}
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
