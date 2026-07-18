/**
 * Monitoring — unified hierarchical drill-down.
 *
 * One flow, no modes: the map opens directly on the 7 rayons (ADR-046 — no
 * Surabaya bubble). Tapping a rayon reveals its kawasan (or areas if it has
 * none); tapping an area focuses its bounds
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
import { BulkReassignModal } from '@/components/monitoring/BulkReassignModal';
import { SimpleMonitoringMap } from '@/components/monitoring/SimpleMonitoringMapLazy';
import type { SimpleWorker, CurrentNodeMarker } from '@/components/monitoring/SimpleMonitoringMap';
import type { NodeMarker } from '@/components/monitoring/NodeMarkerLayer';
import type { SnapshotAreaSummary } from '@/lib/api/monitoring-v2';
import { MONITORING_ROLES, REASSIGN_ROLES, hasRole } from '@/lib/constants/roles';
import { formatTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

// Drill: rayon (top) -> kawasan -> lokasi -> workers. Workers only at area scope.
type Scope = 'city' | 'rayon' | 'region' | 'area';

const SURABAYA = { lat: -7.2575, lng: 112.7521 };

interface MonitoringView {
  scope: Scope;
  id?: string;
  rayonId?: string;
  regionId?: string;
  name?: string;
  /** Center of the drilled node — anchors the current-node pin + drill-back zoom. */
  lat?: number;
  lng?: number;
}

// Zoom levels per scope (drill-in tightens; drill-back uses these to zoom out).
const ZOOM_RAYON = 13;
const ZOOM_REGION = 14;
const ZOOM_AREA = 15;
const ZOOM_CITY = 11;

const EMPTY_STATUS_COUNTS: Record<TrackingStatus, number> = {
  active: 0,
  offline: 0,
  absent: 0,
};

function aggregateToStatusCounts(
  totals: AggregateStatusCounts | undefined
): Record<TrackingStatus, number> {
  if (!totals) return { ...EMPTY_STATUS_COUNTS };
  return {
    active: totals.active,
    offline: totals.offline,
    absent: totals.absent,
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
    active: n.counts_by_status.active,
    active_inside: n.presence.aktif.dalam,
    marker_icon: n.marker_icon ?? null,
    fill_color: n.fill_color ?? null,
    fill_opacity: n.fill_opacity != null ? Number(n.fill_opacity) : null,
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
    { key: 'tidak_aktif', label: t('monitoring:status.offline'), color: 'var(--color-status-idle)' },
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
    // Top level opens directly on the rayons (ADR-046: no Surabaya bubble).
    return { view: { scope: 'city' }, floor: 'city' };
  }, [user]);

  const [view, setView] = useState<MonitoringView>(roleView.view);
  const [filters, setFilters] = useState<MonitoringFilterState>({
    search: '',
    statuses: new Set(),
    rayonId: 'all',
    areaId: 'all',
    role: 'all',
    teamId: 'all',
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

  // Map layer visibility (persisted).
  const { layers, toggleLayer } = useMonitoringLayers();

  // Keep view in sync when the user (role) resolves.
  useEffect(() => {
    setView(roleView.view);
  }, [roleView]);

  const scope = view.scope;
  const showWorkers = scope === 'area';  // Workers only at area scope, not region.

  // City aggregate feeds BOTH the Surabaya summary (roster_totals) and the rayon
  // list/markers (nodes) — one fetch. Rayon aggregate feeds the region/area level.
  const cityAgg = useMonitoringAggregate(
    'city',
    undefined,
    canMonitor && scope === 'city'
  );
  // `view.id` is the rayon id only at rayon scope. At region/area scope the rayon
  // aggregate is fetched by `view.rayonId` via `regionAreasAgg` below.
  const rayonAgg = useMonitoringAggregate('rayon', view.id, canMonitor && scope === 'rayon');
  // At rayon scope, fetch region aggregate to check if this rayon has regions.
  const regionAgg = useMonitoringAggregate(
    'region',
    view.id,
    canMonitor && scope === 'rayon'
  );
  // At region scope, fetch the rayon aggregate to filter areas by region_id.
  const regionAreasAgg = useMonitoringAggregate(
    'rayon',
    view.rayonId,
    canMonitor && scope === 'region'
  );

  const activeAgg = scope === 'region' ? regionAreasAgg : scope === 'rayon' ? rayonAgg : cityAgg;

  // Snapshot (workers) — rendered only at area scope, but kept loaded so search
  // can find people at any level. Surabaya maps to the city snapshot scope.
  // Region scope shows areas, so snapshot is still at the parent rayon.
  const snapshotScope: 'city' | 'rayon' | 'area' =
    scope === 'region' ? 'rayon' : scope;
  const snapshotId = scope === 'region' ? view.rayonId : view.id;
  const snapshot = useMonitoringSnapshot(snapshotScope, snapshotId, canMonitor);
  const workers = useMemo(() => snapshot.data?.data?.workers ?? [], [snapshot.data]);
  const areaSummaries = useMemo(() => snapshot.data?.data?.area_summaries ?? [], [snapshot.data]);

  // Progressive boundaries: rayon outlines at the top, that rayon's areas deeper.
  const boundaryLevel: 'rayon' | 'area' =
    scope === 'city' ? 'rayon' : 'area';
  const boundaryRayonId =
    scope === 'rayon' || scope === 'region' || scope === 'area' ? view.rayonId ?? view.id : undefined;
  const {
    data: boundaries,
    isFetching: boundariesFetching,
    refetch: refetchBoundaries,
  } = useBoundaries(canMonitor, boundaryLevel, boundaryRayonId);

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
  const drillToRayon = (id: string, name: string, lat?: number | null, lng?: number | null) => {
    const coord = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {};
    setView({ scope: 'rayon', id, rayonId: id, name, ...coord });
    setSelectedId(null);
    if ('lat' in coord) focusOn(coord.lat!, coord.lng!, ZOOM_RAYON);
  };
  const drillToRegion = (
    id: string,
    name: string,
    rayonId?: string,
    lat?: number | null,
    lng?: number | null
  ) => {
    const coord = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {};
    setView({ scope: 'region', id, rayonId, regionId: id, name, ...coord });
    setSelectedId(null);
    if ('lat' in coord) focusOn(coord.lat!, coord.lng!, ZOOM_REGION);
  };

  const drillToArea = (
    id: string,
    name: string,
    rayonId?: string,
    lat?: number | null,
    lng?: number | null,
    regionId?: string
  ) => {
    const coord = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {};
    // Carry regionId so back-from-area returns to the kawasan tier (not straight
    // to the rayon) when the area was reached via a region.
    setView({ scope: 'area', id, rayonId, regionId, name, ...coord });
    setSelectedId(null);
    if ('lat' in coord) focusOn(coord.lat!, coord.lng!, ZOOM_AREA);
  };

  // Map marker tapped.
  const onDrillMarker = (node: NodeMarker) => {
    if (node.variant === 'rayon') drillToRayon(node.id, node.name, node.lat, node.lng);
    else if (node.variant === 'region') drillToRegion(node.id, node.name, view.id, node.lat, node.lng);
    else if (scope === 'region')
      drillToArea(node.id, node.name, view.rayonId, node.lat, node.lng, view.id);
    else drillToArea(node.id, node.name, view.id, node.lat, node.lng);
  };
  // List row tapped (an AggregateNode).
  const onDrillListNode = (node: AggregateNode) => {
    if (node.type === 'rayon') drillToRayon(node.id, node.name, node.center_lat, node.center_lng);
    else if (node.type === 'region') drillToRegion(node.id, node.name, view.id, node.center_lat, node.center_lng);
    else
      drillToArea(
        node.id,
        node.name,
        node.rayon_id ?? view.rayonId ?? view.id,
        node.center_lat,
        node.center_lng,
        node.region_id ?? undefined
      );
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
      // From area: go back to region (if regionId exists) or rayon.
      if (view.regionId && view.rayonId) {
        setView({ scope: 'region', id: view.regionId, rayonId: view.rayonId });
        if (typeof view.lat === 'number' && typeof view.lng === 'number') {
          focusOn(view.lat, view.lng, ZOOM_REGION, true);
        }
      } else {
        setView({ scope: 'rayon', id: view.rayonId, rayonId: view.rayonId });
        if (typeof view.lat === 'number' && typeof view.lng === 'number') {
          focusOn(view.lat, view.lng, ZOOM_RAYON, true);
        }
      }
    } else if (scope === 'region') {
      if (roleView.floor === 'rayon') return;
      setView({ scope: 'rayon', id: view.rayonId, rayonId: view.rayonId });
      if (typeof view.lat === 'number' && typeof view.lng === 'number') {
        focusOn(view.lat, view.lng, ZOOM_RAYON, true);
      }
    } else if (scope === 'rayon') {
      if (roleView.floor === 'rayon') return;
      setView({ scope: 'city' });
      focusOn(SURABAYA.lat, SURABAYA.lng, ZOOM_CITY, true);
    }
    // city is the top level — no drill-up above the rayons.
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

  // Rayons list (surabaya + city), regions list (rayon), or areas list (region or rayon-without-regions),
  // for the side panel.
  const listNodes = useMemo<AggregateNode[]>(() => {
    if (scope === 'region') {
      // At region scope: filter the rayon's area nodes by region_id.
      const areas = regionAreasAgg.data?.nodes ?? [];
      return areas.filter((n) => n.region_id === view.id);
    }
    if (scope === 'rayon') {
      // At rayon scope: show region nodes if available (≥1), otherwise show area nodes (region-less fallback).
      if (regionAgg.data && regionAgg.data.nodes.length > 0) {
        return regionAgg.data.nodes;
      }
      return rayonAgg.data?.nodes ?? [];
    }
    if (scope === 'city') return cityAgg.data?.nodes ?? [];
    return [];
  }, [scope, view.id, regionAgg.data, regionAreasAgg.data, rayonAgg.data, cityAgg.data]);

  // Map markers for the current scope (ADR-046 count+ring markers, not ratio
  // bubbles). Zoom-gated tiers keep dense rayons legible:
  //   city   → rayon markers
  //   rayon  → kawasan markers + the lokasi that belong to NO kawasan
  //            (region-less); a kawasan's own lokasi appear when you drill/zoom
  //            into that kawasan.
  //   region → that kawasan's lokasi markers
  //   area   → no node markers (worker pins render instead)
  const nodeMarkers = useMemo<NodeMarker[]>(() => {
    const toMarkers = (nodes: AggregateNode[]) =>
      nodes.map(aggToMarker).filter((m): m is NodeMarker => m !== null);
    if (scope === 'area') return [];
    if (scope === 'region') {
      return toMarkers((regionAreasAgg.data?.nodes ?? []).filter((n) => n.region_id === view.id));
    }
    if (scope === 'rayon') {
      const kawasan = regionAgg.data?.nodes ?? [];
      const regionlessLokasi = (rayonAgg.data?.nodes ?? []).filter((n) => !n.region_id);
      return toMarkers([...kawasan, ...regionlessLokasi]);
    }
    return toMarkers(listNodes); // city → rayon markers
  }, [scope, view.id, regionAgg.data, rayonAgg.data, regionAreasAgg.data, listNodes]);

  // At region (kawasan) scope the aggregate's top-level totals cover the whole
  // parent rayon; sum just this kawasan's lokasi nodes so the stats pills match
  // the selected kawasan (the roster panel already lists only its lokasi).
  const regionTotals = useMemo(() => {
    if (scope !== 'region') return null;
    const nodes = (regionAreasAgg.data?.nodes ?? []).filter((n) => n.region_id === view.id);
    const totals = { active: 0, offline: 0, absent: 0, outside_area: 0 };
    const presence_totals = { aktif: { dalam: 0, luar: 0 }, tidak_aktif: { dalam: 0, luar: 0 } };
    const roster_totals = { scheduled: 0, clocked_in: 0, not_clocked_in: 0 };
    for (const n of nodes) {
      totals.active += n.counts_by_status.active;
      totals.offline += n.counts_by_status.offline;
      totals.absent += n.counts_by_status.absent;
      totals.outside_area += n.counts_by_status.outside_area;
      presence_totals.aktif.dalam += n.presence.aktif.dalam;
      presence_totals.aktif.luar += n.presence.aktif.luar;
      presence_totals.tidak_aktif.dalam += n.presence.tidak_aktif.dalam;
      presence_totals.tidak_aktif.luar += n.presence.tidak_aktif.luar;
      roster_totals.scheduled += n.roster.scheduled;
      roster_totals.clocked_in += n.roster.clocked_in;
      roster_totals.not_clocked_in += n.roster.not_clocked_in;
    }
    return { totals, presence_totals, roster_totals };
  }, [scope, view.id, regionAreasAgg.data]);

  const statusCounts = useMemo(() => {
    if (showWorkers) {
      const counts = { ...EMPTY_STATUS_COUNTS };
      for (const w of workers) {
        const s = w.status as TrackingStatus;
        if (s in counts) counts[s] += 1;
      }
      return counts;
    }
    // Above area scope, derive the filter chips from the SAME presence/roster
    // model as the status-bar pills (scheduled-active / scheduled-offline /
    // roster not-clocked-in) so the two never disagree for the same label.
    const p = regionTotals?.presence_totals ?? activeAgg.data?.presence_totals;
    const r = regionTotals?.roster_totals ?? activeAgg.data?.roster_totals;
    return aggregateToStatusCounts({
      active: (p?.aktif.dalam ?? 0) + (p?.aktif.luar ?? 0),
      offline: (p?.tidak_aktif.dalam ?? 0) + (p?.tidak_aktif.luar ?? 0),
      absent: r?.not_clocked_in ?? 0,
      outside_area: (p?.aktif.luar ?? 0) + (p?.tidak_aktif.luar ?? 0),
    });
  }, [showWorkers, regionTotals, activeAgg.data, workers]);

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
    const p = regionTotals?.presence_totals ?? activeAgg.data?.presence_totals;
    const r = regionTotals?.roster_totals ?? activeAgg.data?.roster_totals;
    return {
      aktif: (p?.aktif.dalam ?? 0) + (p?.aktif.luar ?? 0),
      tidak_aktif: (p?.tidak_aktif.dalam ?? 0) + (p?.tidak_aktif.luar ?? 0),
      tidak_hadir: r?.not_clocked_in ?? 0,
      // Ad-hoc (Luar jadwal): clocked in but off the current-shift roster — now
      // surfaced above area scope from the aggregate (was hard-0, hiding them).
      adhoc: activeAgg.data?.off_schedule_count ?? 0,
    };

  }, [showWorkers, workers, regionTotals, activeAgg.data]);

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

  // Lokasi options, narrowed to the selected rayon so the two selects cascade.
  const areaOptions = useMemo<RayonOption[]>(() => {
    const map = new Map<string, string>();
    for (const w of workers) {
      if (filters.rayonId !== 'all' && w.rayon_id !== filters.rayonId) continue;
      if (w.area_id && w.area_name && !map.has(w.area_id)) map.set(w.area_id, w.area_name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, filters.rayonId]);

  const roleOptions = useMemo<UserRole[]>(() => {
    const set = new Set<string>();
    for (const w of workers) set.add(w.role);
    return [...set] as UserRole[];
  }, [workers]);

  const teamOptions = useMemo<RayonOption[]>(() => {
    const map = new Map<string, string>();
    for (const w of workers) {
      if (w.team_id && w.team_name && !map.has(w.team_id)) map.set(w.team_id, w.team_name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return workers.filter((w) => {
      if (filters.statuses.size > 0 && !filters.statuses.has(w.status as TrackingStatus)) return false;
      if (filters.rayonId !== 'all' && w.rayon_id !== filters.rayonId) return false;
      if (filters.areaId !== 'all' && w.area_id !== filters.areaId) return false;
      if (filters.role !== 'all' && w.role !== filters.role) return false;
      if (filters.teamId !== 'all' && w.team_id !== filters.teamId) return false;
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
        role_marker_icon: w.role_marker_icon ?? null,
        is_within_area: w.is_within_area,
        is_scheduled: w.is_scheduled ?? true,
        team_id: w.team_id ?? null,
        team_name: w.team_name ?? null,
        team_color: w.team_color ?? null,
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
            areaOptions={areaOptions}
            roleOptions={roleOptions}
            teamOptions={teamOptions}
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
