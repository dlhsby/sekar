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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SlidersHorizontal, RefreshCw, X, List, ChevronDown, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import {
  useMonitoringSnapshot,
  useMonitoringAggregate,
  type AggregateNode,
} from '@/lib/api/monitoring-v2';
import { useBoundaries, useLocationHistory } from '@/lib/api/monitoring';
import { useMonitoringSocket } from '@/lib/monitoring/useMonitoringSocket';
import { useMonitoringLayers } from '@/lib/monitoring/layers';
import { statusToActivity } from '@/lib/monitoring/markers';
import type { TeamGroup } from '@/lib/monitoring/teamGrouping';
import type { MonitoringSearchResult } from '@/lib/monitoring/useMonitoringSearch';
import {
  MonitoringFilters,
  type MonitoringFilterState,
  type RayonOption,
} from '@/components/monitoring/MonitoringFilters';
import { MonitoringSidebar } from '@/components/monitoring/MonitoringSidebar';
import { MonitoringSearch } from '@/components/monitoring/MonitoringSearch';
import { MonitoringLayersPanel } from '@/components/monitoring/MonitoringLayersPanel';
import { SimpleMonitoringMap } from '@/components/monitoring/SimpleMonitoringMapLazy';
import type { SimpleWorker, CurrentNodeMarker } from '@/components/monitoring/SimpleMonitoringMap';
import type { NodeMarker } from '@/components/monitoring/NodeMarkerLayer';
import { MONITORING_ROLES, hasRole, roleLabel } from '@/lib/constants/roles';
import { formatTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

// Drill: rayon (top) -> kawasan -> lokasi -> workers. Workers only at location scope.
type Scope = 'city' | 'rayon' | 'region' | 'location';

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

// Status → dot color for compact lists (team members, etc.).
const STATUS_DOT: Record<TrackingStatus, string> = {
  active: 'var(--color-status-active)',
  offline: 'var(--color-status-idle)',
  absent: 'var(--color-status-missing)',
};

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
    belum_hadir: n.roster.belum_hadir,
    tidak_hadir: n.roster.tidak_hadir,
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
    { key: 'tidak_aktif', label: t('monitoring:status.inactive'), color: 'var(--color-status-idle)' },
    { key: 'tidak_hadir', label: t('monitoring:status.absent'), color: 'var(--color-status-missing)' },
    { key: 'adhoc', label: t('monitoring:status.adhoc'), color: 'var(--color-status-offline)' },
  ];

  const canMonitor = !!user && hasRole(user.role as UserRole, MONITORING_ROLES);

  // Role determines the landing view + the floor the user can never drill above.
  const roleView = useMemo<{ view: MonitoringView; floor: Scope }>(() => {
    if (user?.role === 'korlap' && user.area_id) {
      return { view: { scope: 'location', id: user.area_id }, floor: 'location' };
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
    regionId: 'all',
    locationId: 'all',
    jenis: 'individu',
    role: 'all',
    teamId: 'all',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [areaDetailOpen, setAreaDetailOpen] = useState(false);
  const [teamDetail, setTeamDetail] = useState<TeamGroup | null>(null);
  const [statsOpen, setStatsOpen] = useState(false); // tappable stat legend (mobile)
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
  const showWorkers = scope === 'location';  // Workers only at location scope, not region.

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

  // Snapshot (workers) — rendered only at location scope, but kept loaded so search
  // can find people at any level. Surabaya maps to the city snapshot scope.
  // Region scope shows locations, so snapshot is still at the parent rayon.
  const snapshotScope: 'city' | 'rayon' | 'location' =
    scope === 'region' ? 'rayon' : scope;
  const snapshotId = scope === 'region' ? view.rayonId : view.id;
  const snapshot = useMonitoringSnapshot(snapshotScope, snapshotId, canMonitor);
  const workers = useMemo(() => snapshot.data?.data?.workers ?? [], [snapshot.data]);

  // Progressive boundaries: rayon outlines at the top, that rayon's locations deeper.
  // NB: the boundaries `level` param stays 'area' — it's part of the retained
  // AreaBoundaryDto / `.areas[]` boundary contract (backend accepts 'rayon'|'area').
  const boundaryLevel: 'rayon' | 'area' =
    scope === 'city' ? 'rayon' : 'area';
  const boundaryRayonId =
    scope === 'rayon' || scope === 'region' || scope === 'location' ? view.rayonId ?? view.id : undefined;
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
    if (id) {
      setListOpen(true);
      setAreaDetailOpen(false);
      setTeamDetail(null);
    }
  };

  // Clicking a team marker reveals its members (no zoom-to-expand).
  const onTeamClick = (team: TeamGroup) => {
    setTeamDetail(team);
    setAreaDetailOpen(false);
    setSelectedId(null);
  };

  // Selected worker's movement trail for today — drawn as a polyline on the map
  // so a marker click reads like the mobile detail (position + where they've been).
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const trailQuery = useLocationHistory(selectedId, todayStr);
  const trail = useMemo(
    () =>
      (trailQuery.data?.points ?? [])
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => ({ lat: p.latitude, lng: p.longitude })),
    [trailQuery.data]
  );

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

  const drillToLocation = (
    id: string,
    name: string,
    rayonId?: string,
    lat?: number | null,
    lng?: number | null,
    regionId?: string
  ) => {
    const coord = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : {};
    // Carry regionId so back-from-location returns to the kawasan tier (not straight
    // to the rayon) when the location was reached via a region.
    setView({ scope: 'location', id, rayonId, regionId, name, ...coord });
    setSelectedId(null);
    if ('lat' in coord) focusOn(coord.lat!, coord.lng!, ZOOM_AREA);
  };

  // Map marker tapped.
  const onDrillMarker = (node: NodeMarker) => {
    if (node.variant === 'rayon') drillToRayon(node.id, node.name, node.lat, node.lng);
    else if (node.variant === 'region') drillToRegion(node.id, node.name, view.id, node.lat, node.lng);
    else if (scope === 'region')
      drillToLocation(node.id, node.name, view.rayonId, node.lat, node.lng, view.id);
    else drillToLocation(node.id, node.name, view.id, node.lat, node.lng);
  };
  // List row tapped (an AggregateNode).
  const onDrillListNode = (node: AggregateNode) => {
    if (node.type === 'rayon') drillToRayon(node.id, node.name, node.center_lat, node.center_lng);
    else if (node.type === 'region') drillToRegion(node.id, node.name, view.id, node.center_lat, node.center_lng);
    else
      drillToLocation(
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
      // Drill to the worker's OWN scope level (their display_scope), so their row
      // appears in the scoped list; then select + focus. (Detail still shows even
      // if scope resolution is imperfect — it's looked up from the full snapshot.)
      const w = workers.find((x) => x.user_id === result.id);
      const ds = w?.display_scope ?? 'location';
      const sid = w?.display_scope_id ?? null;
      if (ds === 'city') {
        setView({ scope: 'city' });
      } else if (ds === 'rayon' && sid) {
        setView({ scope: 'rayon', id: sid, rayonId: sid, name: w?.rayon_name ?? undefined });
      } else if (ds === 'region' && sid) {
        setView({ scope: 'region', id: sid, rayonId: w?.rayon_id ?? undefined, name: w?.region_name ?? undefined });
      } else if (sid ?? w?.location_id) {
        setView({
          scope: 'location',
          id: (sid ?? w?.location_id)!,
          rayonId: w?.rayon_id ?? result.rayonId ?? undefined,
          name: w?.location_name ?? undefined,
        });
      }
      setSelectedId(result.id);
      setListOpen(true);
      focusOn(result.latitude, result.longitude, 16);
    } else if (result.type === 'area') {
      drillToLocation(result.id, result.name, result.rayonId ?? view.rayonId, result.latitude, result.longitude);
    } else {
      drillToRayon(result.id, result.name, result.latitude, result.longitude);
    }
  };

  const canGoBack = scope !== roleView.floor;
  // Drilling OUT zooms back out (exact zoom) to frame the parent level.
  const goBack = () => {
    setSelectedId(null);
    if (scope === 'location') {
      if (roleView.floor === 'location') return;
      // From location: go back to region (if regionId exists) or rayon.
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

  // Jump straight back to the city (Surabaya) view — used by the breadcrumb root.
  const resetToCity = () => {
    setSelectedId(null);
    setView({ scope: 'city' });
    focusOn(SURABAYA.lat, SURABAYA.lng, ZOOM_CITY, true);
  };

  // Resolve rayon/kawasan/lokasi names from the loaded boundaries so the
  // breadcrumb can label each drill level (view only carries the current name).
  const geoNames = useMemo(() => {
    const rayon = new Map<string, string>();
    const region = new Map<string, string>();
    const area = new Map<string, string>();
    for (const r of boundaries?.rayons ?? []) {
      rayon.set(r.id, r.name);
      for (const k of r.regions ?? []) region.set(k.id, k.name);
      for (const a of r.areas ?? []) area.set(a.id, a.name);
    }
    return { rayon, region, area };
  }, [boundaries]);

  // Breadcrumb trail: Surabaya › Rayon › Kawasan › Lokasi. Each ancestor is a
  // button that drills back to that level; the current (last) crumb is static.
  const crumbs = useMemo<{ key: string; label: string; onClick?: () => void }[]>(() => {
    const items: { key: string; label: string; onClick?: () => void }[] = [];
    items.push({
      key: 'city',
      label: t('monitoring:breadcrumb.city'),
      onClick: scope === 'city' ? undefined : resetToCity,
    });
    const rid = scope === 'rayon' ? view.id : view.rayonId;
    if (rid) {
      const name = geoNames.rayon.get(rid) ?? (scope === 'rayon' ? view.name : undefined) ?? t('common:entities.rayon');
      items.push({
        key: 'rayon',
        label: name,
        onClick: scope === 'rayon' ? undefined : () => drillToRayon(rid, name),
      });
    }
    const kid = scope === 'region' ? view.id : scope === 'location' ? view.regionId : undefined;
    if (kid) {
      const name = geoNames.region.get(kid) ?? (scope === 'region' ? view.name : undefined) ?? t('monitoring:filters.kawasanLabel');
      items.push({
        key: 'region',
        label: name,
        onClick: scope === 'region' ? undefined : () => drillToRegion(kid, name, view.rayonId),
      });
    }
    if (scope === 'location') {
      items.push({
        key: 'location',
        label: geoNames.area.get(view.id ?? '') ?? view.name ?? t('monitoring:filters.lokasiLabel'),
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, view, geoNames, t]);

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
        return {
          variant: 'rayon',
          id: view.id,
          name: view.name ?? node?.name ?? '',
          lat,
          lng,
          fill_color: node?.fill_color ?? null,
        };
      }
    }
    if (scope === 'region' && view.id) {
      let lat = view.lat;
      let lng = view.lng;
      const region = boundaries?.rayons
        .flatMap((r) => r.regions ?? [])
        .find((rg) => rg.id === view.id);
      if ((lat == null || lng == null) && region?.center_lat != null && region?.center_lng != null) {
        lat = region.center_lat;
        lng = region.center_lng;
      }
      if (lat != null && lng != null) {
        return {
          variant: 'region',
          id: view.id,
          name: view.name ?? region?.name ?? '',
          lat,
          lng,
          fill_color: region?.fill_color ?? null,
        };
      }
    }
    if (scope === 'location' && view.id) {
      let lat = view.lat;
      let lng = view.lng;
      const area = boundaries?.rayons.flatMap((r) => r.areas).find((a) => a.id === view.id);
      if ((lat == null || lng == null) && area?.center_lat != null && area?.center_lng != null) {
        lat = area.center_lat;
        lng = area.center_lng;
      }
      if (lat != null && lng != null) {
        return {
          variant: 'location',
          id: view.id,
          name: view.name ?? area?.name ?? '',
          lat,
          lng,
          fill_color: area?.fill_color ?? null,
        };
      }
    }
    return null;
  }, [scope, view, cityAgg.data, boundaries]);

  // Tapping the current-node pin focuses it a touch tighter and opens the list
  // sheet (its children/detail) — mirrors mobile's marker → detail.
  // Clicking the current node's pin opens its LOCATION DETAIL card (not the list).
  const onNodeDetail = (node: CurrentNodeMarker) => {
    focusOn(node.lat, node.lng, node.variant === 'location' ? 16 : 14);
    setAreaDetailOpen(true);
  };

  // Rayons list (surabaya + city), regions list (rayon), or locations list (region or rayon-without-regions),
  // for the side panel.
  const listNodes = useMemo<AggregateNode[]>(() => {
    if (scope === 'region') {
      // At region scope: filter the rayon's location nodes by region_id.
      const areas = regionAreasAgg.data?.nodes ?? [];
      return areas.filter((n) => n.region_id === view.id);
    }
    if (scope === 'rayon') {
      // At rayon scope: show region nodes if available (≥1), otherwise show location nodes (region-less fallback).
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
  //   location → no node markers (worker pins render instead)
  const nodeMarkers = useMemo<NodeMarker[]>(() => {
    const toMarkers = (nodes: AggregateNode[]) =>
      nodes.map(aggToMarker).filter((m): m is NodeMarker => m !== null);
    if (scope === 'location') return [];
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
    const roster_totals = { scheduled: 0, clocked_in: 0, belum_hadir: 0, tidak_hadir: 0 };
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
      roster_totals.belum_hadir += n.roster.belum_hadir;
      roster_totals.tidak_hadir += n.roster.tidak_hadir;
    }
    return { totals, presence_totals, roster_totals };
  }, [scope, view.id, regionAreasAgg.data]);

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
      tidak_hadir: r?.tidak_hadir ?? 0,
      // Ad-hoc (Luar jadwal): clocked in but off the current-shift roster — now
      // surfaced above area scope from the aggregate (was hard-0, hiding them).
      adhoc: activeAgg.data?.off_schedule_count ?? 0,
    };

  }, [showWorkers, workers, regionTotals, activeAgg.data]);

  // ALL rayons from the city aggregate (not just those with live workers), so
  // the cascade root lists every rayon. Fetched independently of the view scope
  // (react-query dedupes with the city-scope view fetch); falls back to the
  // snapshot/boundaries until it loads.
  const allRayonsAgg = useMonitoringAggregate('city', undefined, canMonitor);
  const rayonOptions = useMemo<RayonOption[]>(() => {
    const nodes = allRayonsAgg.data?.nodes ?? [];
    if (nodes.length > 0) {
      return nodes
        .map((n) => ({ id: n.id, name: n.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // Fallback before the aggregate resolves.
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
  }, [allRayonsAgg.data, workers, boundaries]);

  // Full geo hierarchy for the FILTER-selected rayon (independent of the current
  // view + of who is on shift): its kawasan (`region` aggregate) + its lokasi
  // (`rayon` aggregate). Reuses the monitoring aggregate — perm-safe for every
  // monitoring role, and react-query dedupes with the view's own fetches when
  // the ids align. Gated on a concrete rayon selection (the cascade root).
  const filterRayonId = filters.rayonId !== 'all' ? filters.rayonId : undefined;
  const filterKawasanAgg = useMonitoringAggregate('region', filterRayonId, canMonitor && !!filterRayonId);
  const filterLokasiAgg = useMonitoringAggregate('rayon', filterRayonId, canMonitor && !!filterRayonId);

  // Kawasan options — EMPTY until a rayon is picked, then ALL kawasan in that
  // rayon (even ones with no live worker). A rayon like Taman Aktif has none →
  // stays empty and the panel disables the select.
  const regionOptions = useMemo<RayonOption[]>(() => {
    if (!filterRayonId) return [];
    return (filterKawasanAgg.data?.nodes ?? [])
      .map((n) => ({ id: n.id, name: n.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filterRayonId, filterKawasanAgg.data]);

  // Lokasi options — EMPTY until a rayon is picked; then ALL lokasi in the rayon
  // (direct + under-kawasan), narrowed to a single kawasan's lokasi (by the
  // node's region_id) once a kawasan is selected.
  const locationOptions = useMemo<RayonOption[]>(() => {
    if (!filterRayonId) return [];
    return (filterLokasiAgg.data?.nodes ?? [])
      .filter((n) => filters.regionId === 'all' || n.region_id === filters.regionId)
      .map((n) => ({ id: n.id, name: n.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filterRayonId, filters.regionId, filterLokasiAgg.data]);

  const regionLoading = !!filterRayonId && filterKawasanAgg.isLoading;
  const locationLoading = !!filterRayonId && filterLokasiAgg.isLoading;

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

  // Petugas options cascade from the geo + status/role/team filters: the snapshot
  // workers that everything ELSE would keep (the userId filter itself is excluded
  // so picking a worker never empties its own list).
  // Cascade / stale-selection guard: drop a kawasan / lokasi / team selection
  // once it is no longer a valid option — after the parent rayon changes, or
  // when the entity leaves the live snapshot (WS churn) — so a select never
  // silently filters to nothing while showing a blank value.
  useEffect(() => {
    const patch: Partial<MonitoringFilterState> = {};
    // Skip while the kawasan/lokasi hierarchy is still loading — its options are
    // transiently empty then, and resetting would drop a still-valid selection.
    if (
      !regionLoading &&
      filters.regionId !== 'all' &&
      !regionOptions.some((o) => o.id === filters.regionId)
    ) {
      patch.regionId = 'all';
    }
    if (
      !locationLoading &&
      filters.locationId !== 'all' &&
      !locationOptions.some((o) => o.id === filters.locationId)
    ) {
      patch.locationId = 'all';
    }
    // Team is snapshot-derived; only reset once workers have loaded.
    if (
      workers.length > 0 &&
      filters.teamId !== 'all' &&
      !teamOptions.some((o) => o.id === filters.teamId)
    ) {
      patch.teamId = 'all';
    }
    if (Object.keys(patch).length > 0) setFilters((prev) => ({ ...prev, ...patch }));
  }, [
    workers.length,
    regionOptions,
    locationOptions,
    teamOptions,
    regionLoading,
    locationLoading,
    filters.regionId,
    filters.locationId,
    filters.teamId,
  ]);

  // The geo selection that scopes the node bubbles at the current drill level.
  // Each level's nodes are CHILDREN of the current view, so we match only the
  // child tier: city → rayon; rayon → kawasan (or region-less lokasi); region →
  // lokasi. At region scope, `regionId` is the parent view (not a child), so it
  // must NOT drive dimming or every lokasi bubble would fade. Null = no filter.
  const activeGeoId = useMemo<string | null>(() => {
    if (scope === 'city') return filters.rayonId !== 'all' ? filters.rayonId : null;
    if (scope === 'rayon') {
      if (filters.locationId !== 'all') return filters.locationId;
      if (filters.regionId !== 'all') return filters.regionId;
      return null;
    }
    if (scope === 'region') return filters.locationId !== 'all' ? filters.locationId : null;
    return null;
  }, [scope, filters.rayonId, filters.regionId, filters.locationId]);

  // Base filter (status + geo + search) — shared by the MAP and the list. The
  // Individu/Tim (jenis) split is deliberately NOT applied here: the map must
  // always show BOTH individuals and team crews, so a fully-staffed team is never
  // hidden just because the list is scoped to "Individu" (the default).
  const baseFilteredWorkers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return workers.filter((w) => {
      if (filters.statuses.size > 0 && !filters.statuses.has(w.status as TrackingStatus)) return false;
      if (filters.rayonId !== 'all' && w.rayon_id !== filters.rayonId) return false;
      if (filters.regionId !== 'all' && w.region_id !== filters.regionId) return false;
      if (filters.locationId !== 'all' && w.location_id !== filters.locationId) return false;
      if (q && !w.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workers, filters.statuses, filters.rayonId, filters.regionId, filters.locationId, filters.search]);

  // LIST view of workers: the Individu/Tim toggle applies HERE ONLY. Individu =
  // individually-assigned (no team) + Peran (role); Tim = team-assigned + team
  // category. The map (below) uses `baseFilteredWorkers` so it isn't narrowed.
  const filteredWorkers = useMemo(() => {
    return baseFilteredWorkers.filter((w) => {
      if (filters.jenis === 'individu') {
        if (w.team_id) return false;
        if (filters.role !== 'all' && w.role !== filters.role) return false;
      } else {
        if (!w.team_id) return false;
        if (filters.teamId !== 'all' && w.team_id !== filters.teamId) return false;
      }
      return true;
    });
  }, [baseFilteredWorkers, filters.jenis, filters.role, filters.teamId]);

  // The list shows every search match and DIMS the ones outside the geo
  // spotlight (parity with the map, which dims rather than hides). The geo match
  // only drives the "matched" count + which rows dim, not which rows render.
  const filteredNodes = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return q ? listNodes.filter((n) => n.name.toLowerCase().includes(q)) : listNodes;
  }, [listNodes, filters.search]);

  // A worker belongs to the drill level that matches THEIR SCHEDULE SCOPE
  // (`display_scope`): a lokasi-scheduled worker shows only at that lokasi, a
  // rayon-scheduled worker only at that rayon, a city-wide/unassigned worker only
  // at the city view — never at the levels above. So each level shows its own
  // scoped crews (not every worker that happens to sit inside the geography).
  const scopeMatches = useCallback(
    (w: { display_scope?: string; display_scope_id?: string | null }): boolean => {
      const s = w.display_scope ?? 'location';
      if (scope === 'city') return s === 'city';
      if (scope === 'rayon') return s === 'rayon' && w.display_scope_id === view.id;
      if (scope === 'region') return s === 'region' && w.display_scope_id === view.id;
      if (scope === 'location') return s === 'location' && w.display_scope_id === view.id;
      return true;
    },
    [scope, view.id]
  );

  // Map source: base filter (no jenis split) so teams + individuals both draw.
  const drillScopedWorkers = useMemo(
    () => baseFilteredWorkers.filter(scopeMatches),
    [baseFilteredWorkers, scopeMatches]
  );

  // The Petugas tab's list: the jenis-filtered set (Individu/Tim), same scope match.
  const listScopedWorkers = useMemo(
    () => filteredWorkers.filter(scopeMatches),
    [filteredWorkers, scopeMatches]
  );

  const mapWorkers = useMemo<SimpleWorker[]>(
    () =>
      drillScopedWorkers.map((w) => ({
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
        team_icon: w.team_icon ?? null,
      })),
    [drillScopedWorkers]
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
  // Collapsed "Daftar Petugas" badge counts the scoped workers (the panel leads
  // with Wilayah, but the button names the worker list).
  const listCount = listScopedWorkers.length;

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
        scope={scope}
        nodeMarkers={nodeMarkers}
        activeGeoId={activeGeoId}
        onDrillNode={onDrillMarker}
        currentNode={currentNode}
        onNodeDetail={onNodeDetail}
        areaId={scope === 'location' ? view.id ?? null : null}
        regionId={scope === 'region' ? view.id ?? null : null}
        workers={mapWorkers}
        boundaries={boundaries ?? null}
        selectedId={selectedId}
        onSelect={selectWorker}
        layers={layers}
        focusTarget={focusTarget}
        trail={trail}
        onTeamClick={onTeamClick}
      />

      {/* Top overlay: breadcrumb + search + settings + filter + refresh + status pills */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2">
        {/* Row 1 — full-width breadcrumb so the current location is always visible
            (esp. mobile, where the back button used to be an unlabeled icon). Back
            steps up one level; each ancestor crumb jumps straight to that level. */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white/95 px-2 py-1.5 shadow-nb-sm backdrop-blur-sm">
          {canGoBack && (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('monitoring:page.backLabel')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-nb-sm text-nb-black hover:bg-nb-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <nav
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm"
            aria-label={t('monitoring:breadcrumb.label')}
          >
            {/* Mobile (<sm): current level only — the ‹ back handles going up, so
                intermediate crumbs (and their truncation) are dropped for space. */}
            <span className="truncate font-bold text-nb-black sm:hidden" aria-current="page">
              {crumbs[crumbs.length - 1]?.label}
            </span>
            {/* Desktop (≥sm): the full clickable trail. */}
            <span className="hidden items-center gap-1 sm:flex">
              {crumbs.map((c, i) => (
                <span key={c.key} className="flex shrink-0 items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-nb-gray-400" aria-hidden="true" />}
                  {c.onClick ? (
                    <button
                      type="button"
                      onClick={c.onClick}
                      className="max-w-[8rem] truncate font-semibold text-nb-gray-600 hover:text-nb-black hover:underline"
                    >
                      {c.label}
                    </button>
                  ) : (
                    <span className="max-w-[10rem] truncate font-bold text-nb-black" aria-current="page">
                      {c.label}
                    </span>
                  )}
                </span>
              ))}
            </span>
          </nav>
          {/* Presence stats, pinned right of the breadcrumb (replaces a whole
              extra row). Desktop (≥md) has room → labels + counts + timestamp
              inline, no tap. Mobile → compact dot+number chips that tap open a
              labeled legend (the only way to read the labels there). */}
          <div
            className="hidden shrink-0 items-center gap-2 border-l-2 border-nb-gray-200 pl-2 md:flex"
            aria-live="polite"
          >
            {PRESENCE_PILLS.map((p) => (
              <span key={p.key} className="flex items-center gap-1 text-xs font-semibold text-nb-gray-700">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                {p.label}
                <span className="font-mono tabular-nums text-nb-black">{presenceCounts[p.key]}</span>
              </span>
            ))}
            <span className="whitespace-nowrap text-[10px] text-nb-gray-400">{updatedLabel}</span>
          </div>
          <div className="relative shrink-0 md:hidden">
            <button
              type="button"
              onClick={() => setStatsOpen((v) => !v)}
              aria-expanded={statsOpen}
              aria-label={t('monitoring:breadcrumb.statsLegend')}
              className="flex items-center gap-1 border-l-2 border-nb-gray-200 pl-1.5"
              aria-live="polite"
            >
              {PRESENCE_PILLS.map((p) => (
                <span
                  key={p.key}
                  title={p.label}
                  className="flex items-center gap-1 rounded-nb-sm px-1 py-0.5 text-xs font-semibold text-nb-gray-700"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                  <span className="font-mono tabular-nums text-nb-black">{presenceCounts[p.key]}</span>
                </span>
              ))}
            </button>
            {statsOpen && (
              <div
                className="absolute right-0 top-full z-40 mt-1 w-44 rounded-nb-md border-2 border-nb-black bg-nb-white p-2 shadow-nb-lg"
                role="dialog"
              >
                <ul className="space-y-1">
                  {PRESENCE_PILLS.map((p) => (
                    <li key={p.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-nb-gray-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                        {p.label}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-nb-black">{presenceCounts[p.key]}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t-2 border-nb-gray-200 pt-1.5 text-[10px] text-nb-gray-500">
                  {updatedLabel}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2 — search + tools */}
        <div className="pointer-events-none flex items-center gap-2">
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
            rayonOptions={rayonOptions}
            regionOptions={regionOptions}
            locationOptions={locationOptions}
            regionLoading={regionLoading}
            locationLoading={locationLoading}
            roleOptions={roleOptions}
            teamOptions={teamOptions}
            total={drillScopedWorkers.length}
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
          {/* One sidebar at every level: Wilayah (child nodes, drillable) + Petugas
              (workers). At lokasi scope there are no child nodes, so only Petugas
              shows. */}
          <MonitoringSidebar
            workers={listScopedWorkers}
            nodes={filteredNodes}
            onDrillNode={onDrillListNode}
            activeGeoId={activeGeoId}
            selectedId={selectedId}
            selectedWorker={
              selectedId ? workers.find((w) => w.user_id === selectedId) ?? null : null
            }
            onSelect={selectWorker}
            className="min-h-0 flex-1 shadow-nb-lg"
          />
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

      {/* Area detail card — opens when the current node's pin is tapped (parity
          with mobile's area info). Shows the drilled node's presence + roster. */}
      {areaDetailOpen && currentNode && (
        <div className="absolute right-3 top-40 z-30 w-72 rounded-nb-md border-2 border-nb-black bg-nb-white p-3 shadow-nb-lg sm:top-32">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase text-nb-gray-500">
                {t(`monitoring:areaDetail.${currentNode.variant}`)}
              </p>
              <h2 className="text-sm font-black leading-tight text-nb-black">{currentNode.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setAreaDetailOpen(false)}
              aria-label={t('monitoring:page.closePanelLabel')}
              className="shrink-0 rounded-nb-sm p-1 text-nb-gray-500 hover:bg-nb-gray-100 hover:text-nb-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Presence */}
          <div className="grid grid-cols-2 gap-1.5">
            {PRESENCE_PILLS.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between rounded-nb-sm border border-nb-gray-200 px-2 py-1 text-xs"
              >
                <span className="flex items-center gap-1.5 text-nb-gray-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                  {p.label}
                </span>
                <span className="font-mono font-bold tabular-nums text-nb-black">{presenceCounts[p.key]}</span>
              </div>
            ))}
          </div>
          {/* Roster */}
          {(() => {
            const r = regionTotals?.roster_totals ?? activeAgg.data?.roster_totals;
            if (!r) return null;
            const rows: [string, number][] = [
              [t('monitoring:aggregate.scheduledLabel'), r.scheduled],
              [t('monitoring:aggregate.clockedInLabel'), r.clocked_in],
              [t('monitoring:aggregate.belumHadirLabel'), r.belum_hadir],
              [t('monitoring:aggregate.tidakHadirLabel'), r.tidak_hadir],
            ];
            return (
              <div className="mt-2 border-t-2 border-nb-gray-200 pt-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-nb-gray-600">
                  {rows.map(([label, n]) => (
                    <span key={label} className="flex items-baseline gap-1">
                      <span className="font-mono font-bold tabular-nums text-nb-black">{n}</span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Team member list — opens when a team marker is clicked. Lists the team's
          individual workers; tapping one opens that worker's detail + trail. */}
      {teamDetail && (
        <div className="absolute right-3 top-40 z-30 flex max-h-[60%] w-72 flex-col rounded-nb-md border-2 border-nb-black bg-nb-white shadow-nb-lg sm:top-32">
          <div className="flex items-start justify-between gap-2 border-b-2 border-nb-black p-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-nb-black"
                style={{ backgroundColor: teamDetail.team_color ?? 'var(--color-nb-gray-400)' }}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold uppercase text-nb-gray-500">
                  {t('monitoring:teamDetail.title')}
                </p>
                <h2 className="text-sm font-black leading-tight text-nb-black">
                  {teamDetail.team_name} · {teamDetail.member_count}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTeamDetail(null)}
              aria-label={t('monitoring:page.closePanelLabel')}
              className="shrink-0 rounded-nb-sm p-1 text-nb-gray-500 hover:bg-nb-gray-100 hover:text-nb-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-nb-gray-200 overflow-y-auto">
            {workers
              .filter((w) => teamDetail.member_ids.includes(w.user_id))
              .map((w) => (
                <li key={w.user_id}>
                  <button
                    type="button"
                    onClick={() => selectWorker(w.user_id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-nb-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-nb-black">
                        {w.full_name}
                      </span>
                      <span className="block text-xs text-nb-gray-500">{roleLabel(w.role)}</span>
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_DOT[w.status as TrackingStatus] ?? 'var(--color-status-idle)' }}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
