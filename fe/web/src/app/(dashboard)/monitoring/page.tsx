/**
 * Monitoring Dashboard v2 (Phase 4-R rework)
 * - Single data source: useMonitoringSnapshot (snapshot workers)
 * - Unified WS: status:v2 patches only (legacy Phase 2D handlers removed)
 * - Clean responsive layout: header → status bar → filters → split map/panel
 * - MonitoringStatusBar: activity-state summary (Aktif/Idle/Tidak terdeteksi)
 * - Role gate: MONITORING_ROLES only — staff_kecamatan has NO access
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import {
  useUserDaySummary,
  useLocationHistory,
  useBoundaries,
  type LiveUser,
} from '@/lib/api/monitoring';
import {
  useMonitoringSnapshot,
  snapshotKeys,
  type StatusV2Event,
  type MonitoringSnapshotResponse,
} from '@/lib/api/monitoring-v2';
import { Button } from '@/components/ui';
import { MonitoringMap } from '@/components/monitoring/MonitoringMap';
import { UserDetailPanel } from '@/components/monitoring/UserDetailPanel';
import { LocationTimeline } from '@/components/monitoring/LocationTimeline';
import { StaffingSummaryCard } from '@/components/monitoring/StaffingSummaryCard';
import { ReassignWorkerModal } from '@/components/monitoring/ReassignWorkerModal';
import {
  HierarchyFilterPanel,
  type HierarchyFilterState,
} from '@/components/monitoring/HierarchyFilterPanel';
import { WorkerListVirtual, type WorkerListItem } from '@/components/monitoring/WorkerListVirtual';
import { AreaDetailDrawer } from '@/components/monitoring/AreaDetailDrawer';
import { MonitoringStatusBar } from '@/components/monitoring/MonitoringStatusBar';
import {
  MonitoringTogglePanel,
  DEFAULT_LAYER_VISIBILITY,
  type MonitoringLayerVisibility,
} from '@/components/monitoring/MonitoringTogglePanel';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MONITORING_ROLES, hasRole } from '@/lib/constants/roles';
import { cn } from '@/lib/utils/cn';
import { formatTime } from '@/lib/utils/formatters';
import type { UserRole } from '@/types/models';
import io, { type Socket } from 'socket.io-client';
import { getCookie } from '@/lib/utils/cookies';
import { toast } from 'sonner';
import type { SnapshotAreaSummary } from '@/lib/api/monitoring-v2';

type PanelView = 'list' | 'detail' | 'timeline';

const LAYER_STORAGE_KEY = 'monitoring.layers.v1';

/** Read persisted map-layer visibility (lazy useState init — avoids a hydrate effect). */
function loadLayerVisibility(): MonitoringLayerVisibility {
  if (typeof window === 'undefined') return DEFAULT_LAYER_VISIBILITY;
  try {
    const raw = window.localStorage.getItem(LAYER_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYER_VISIBILITY;
    return { ...DEFAULT_LAYER_VISIBILITY, ...(JSON.parse(raw) as Partial<MonitoringLayerVisibility>) };
  } catch {
    return DEFAULT_LAYER_VISIBILITY;
  }
}

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Hierarchy filter state
  // ---------------------------------------------------------------------------
  const [filterState, setFilterState] = useState<HierarchyFilterState>({ scope: 'city' });

  // Panel state
  const [panelView, setPanelView] = useState<PanelView>('list');
  const [selectedUser, setSelectedUser] = useState<LiveUser | null>(null);
  // Worker-list overlay (collapsed by default — the map is full-width).
  const [listOpen, setListOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Trail sync state (Phase 2D-10)
  const [trailSelectedIndex, setTrailSelectedIndex] = useState<number | null>(null);
  const [showOnlyTrailUser, setShowOnlyTrailUser] = useState(false);

  // Reassign modal state (Phase 2D-10)
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTargetAreaId, setReassignTargetAreaId] = useState('');
  const [reassignTargetAreaName, setReassignTargetAreaName] = useState('');

  // Area detail drawer state (Phase 3)
  const [selectedAreaSummary, setSelectedAreaSummary] = useState<SnapshotAreaSummary | null>(null);

  // Map layer visibility — hydrated once from localStorage via lazy init.
  const [layerVisibility, setLayerVisibility] = useState<MonitoringLayerVisibility>(
    loadLayerVisibility
  );
  const handleLayerVisibilityChange = useCallback(
    (next: MonitoringLayerVisibility) => {
      setLayerVisibility(next);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* localStorage unavailable */
        }
      }
    },
    []
  );

  const socketRef = useRef<Socket | null>(null);

  // ---------------------------------------------------------------------------
  // Role-based access
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role as UserRole, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Auto-scope when the (async-loaded) user resolves: korlap → their area,
  // kepala_rayon → their rayon. A one-shot derive from an async value — there
  // is no synchronous source to seed the initial filter state from.
  useEffect(() => {
    if (!user) return;
    let next: HierarchyFilterState | null = null;
    if (user.role === 'korlap' && user.area_id) {
      next = { scope: 'area', areaId: user.area_id };
    } else if (user.role === 'kepala_rayon' && user.rayon_id) {
      next = { scope: 'rayon', rayonId: user.rayon_id };
    }
    if (next) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterState(next);
    }
  }, [user]);

  // ---------------------------------------------------------------------------
  // Data queries — unified snapshot source
  // ---------------------------------------------------------------------------

  const snapshotScope = filterState.scope;
  const snapshotId =
    filterState.scope === 'rayon'
      ? filterState.rayonId
      : filterState.scope === 'area'
        ? filterState.areaId
        : undefined;

  const {
    data: snapshotData,
    isLoading: snapshotLoading,
    refetch: refetchSnapshot,
  } = useMonitoringSnapshot(snapshotScope, snapshotId);

  const { data: boundariesData } = useBoundaries();

  // User day summary (detail panel)
  const { data: userDaySummary, isLoading: summaryLoading } = useUserDaySummary(
    panelView === 'detail' || panelView === 'timeline' ? (selectedUser?.id ?? null) : null
  );

  // Location history (timeline panel)
  const { data: locationHistory, isLoading: historyLoading } = useLocationHistory(
    panelView === 'timeline' ? (selectedUser?.id ?? null) : null,
    historyDate
  );

  // ---------------------------------------------------------------------------
  // WebSocket — snapshot status:v2 patches only
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    const token = getCookie('access_token');
    const socket = io(apiUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10_000,
      auth: { token },
    });

    socketRef.current = socket;

    // Incremental snapshot patch via status:v2
    socket.on('status:v2', (event: StatusV2Event) => {
      const queryKey = snapshotKeys.byScope(snapshotScope, snapshotId);
      queryClient.setQueryData(queryKey, (old: MonitoringSnapshotResponse | undefined) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            workers: old.data.workers.map((w) =>
              w.user_id === event.user_id
                ? {
                    ...w,
                    status: event.next,
                    ...(event.lat !== undefined ? { lat: event.lat } : {}),
                    ...(event.lng !== undefined ? { lng: event.lng } : {}),
                  }
                : w
            ),
          },
        };
      });

      if (event.next === 'missing') {
        toast.warning('Petugas tidak terdeteksi', {
          description: `Status berubah dari ${event.prev} ke missing`,
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // snapshotScope/snapshotId in deps so the patch targets the active scope key.
  }, [queryClient, snapshotScope, snapshotId]);

  // ---------------------------------------------------------------------------
  // Derived data — all from snapshot
  // ---------------------------------------------------------------------------

  const snapshotWorkers = useMemo(
    () => snapshotData?.data?.workers ?? [],
    [snapshotData?.data?.workers]
  );

  const snapshotAreaSummaries = useMemo(
    () => snapshotData?.data?.area_summaries ?? [],
    [snapshotData?.data?.area_summaries]
  );

  // Build LiveUser[] from snapshot workers for map rendering
  // Map requires: id, latitude, longitude, status, full_name + optional role, area_id, rayon_id, etc.
  const mapUsers: LiveUser[] = useMemo(
    () =>
      snapshotWorkers.map((w) => ({
        id: w.user_id,
        full_name: w.full_name,
        role: w.role as UserRole,
        phone: null,
        status: w.status,
        area_id: w.area_id,
        area_name: w.area_name ?? '',
        rayon_id: w.rayon_id,
        rayon_name: w.rayon_name ?? '',
        latitude: w.lat,
        longitude: w.lng,
        accuracy: null,
        battery_level: w.battery_level,
        last_update: w.last_update,
        is_within_area: w.is_within_area,
        outside_boundary: false,
        shift_id: '',
        shift_name: '',
        clock_in_time: w.last_update,
        current_task_status: null,
        current_task_title: null,
      })),
    [snapshotWorkers]
  );

  // Build WorkerListItem[] from snapshot workers
  const workerListItems = useMemo<WorkerListItem[]>(
    () =>
      snapshotWorkers.map((w) => ({
        user_id: w.user_id,
        full_name: w.full_name,
        role: w.role,
        status: w.status,
        area_id: w.area_id,
        area_name: w.area_name,
        last_update: w.last_update,
      })),
    [snapshotWorkers]
  );

  // Filter workers for the selected area drawer
  const areaDrawerWorkers = useMemo<WorkerListItem[]>(() => {
    if (!selectedAreaSummary) return [];
    return workerListItems.filter((w) => w.area_id === selectedAreaSummary.area_id);
  }, [workerListItems, selectedAreaSummary]);

  // Map filter props for auto-focus
  const mapFilters = useMemo(
    () => ({
      rayon_id: filterState.scope !== 'city' && filterState.rayonId ? filterState.rayonId : undefined,
      area_id: filterState.scope === 'area' && filterState.areaId ? filterState.areaId : undefined,
      user_id: selectedUser?.id,
    }),
    [filterState, selectedUser]
  );

  const snapshotTotals = useMemo(() => {
    const d = snapshotData?.data;
    if (!d) return null;
    return {
      total_active: d.total_active,
      total_inactive: d.total_inactive,
      total_outside_area: d.total_outside_area,
      total_missing: d.total_missing,
      total_offline: d.total_offline,
    };
  }, [snapshotData]);

  const generatedAt = snapshotData?.data?.generated_at;

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleUserSelect = useCallback((u: LiveUser) => {
    setSelectedUser(u);
    setPanelView('detail');
    setTrailSelectedIndex(null);
    setShowOnlyTrailUser(false);
    setSelectedAreaSummary(null);
  }, []);

  const handleWorkerListSelect = useCallback(
    (userId: string) => {
      const liveUser = mapUsers.find((u) => u.id === userId);
      if (liveUser) {
        handleUserSelect(liveUser);
      }
    },
    [mapUsers, handleUserSelect]
  );

  const handleBackToList = useCallback(() => {
    setPanelView('list');
    setSelectedUser(null);
    setTrailSelectedIndex(null);
    setShowOnlyTrailUser(false);
  }, []);

  const handleViewLocationHistory = useCallback(() => {
    setPanelView('timeline');
    setTrailSelectedIndex(null);
  }, []);

  const handleBackToDetail = useCallback(() => {
    setPanelView('detail');
    setTrailSelectedIndex(null);
    setShowOnlyTrailUser(false);
  }, []);

  const handleReassign = useCallback(
    (areaId: string) => {
      let areaName = '';
      if (boundariesData) {
        for (const rayon of boundariesData.rayons) {
          const area = rayon.areas.find((a) => a.id === areaId);
          if (area) {
            areaName = area.name;
            break;
          }
        }
      }
      setReassignTargetAreaId(areaId);
      setReassignTargetAreaName(areaName || 'Area');
      setReassignModalOpen(true);
    },
    [boundariesData]
  );

  const handleBoundaryClick = useCallback(
    (_type: 'rayon' | 'area', id: string) => {
      if (_type === 'rayon') {
        setFilterState({ scope: 'rayon', rayonId: id });
      } else {
        const summary = snapshotAreaSummaries.find((s) => s.area_id === id);
        if (summary) {
          setSelectedAreaSummary(summary);
        }
        setFilterState((prev) => ({ scope: 'area', rayonId: prev.rayonId, areaId: id }));
      }
    },
    [snapshotAreaSummaries]
  );

  const handleFilterChange = useCallback((next: HierarchyFilterState) => {
    setFilterState(next);
    if (next.scope !== 'area') {
      setSelectedAreaSummary(null);
    }
  }, []);

  const handleAreaDrawerClose = useCallback(() => {
    setSelectedAreaSummary(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchSnapshot();
  }, [refetchSnapshot]);

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4" />
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role as UserRole, MONITORING_ROLES)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 py-3 border-b-2 border-nb-black bg-white flex-shrink-0 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-nb-h3 text-nb-black leading-tight">Monitoring Real-Time</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'h-2 w-2 rounded-full flex-shrink-0',
                snapshotLoading ? 'bg-nb-warning' : 'bg-nb-success animate-pulse'
              )}
              aria-hidden="true"
            />
            <span className="text-xs text-nb-gray-500">Diperbarui</span>
            {generatedAt && (
              <span className="text-xs text-nb-gray-400">{formatTime(generatedAt)}</span>
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          className="flex-shrink-0"
          aria-label="Segarkan data monitoring"
        >
          Segarkan
        </Button>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <MonitoringStatusBar totals={snapshotTotals} />

      {/* ── Hierarchy filter panel ──────────────────────────────────────────── */}
      <HierarchyFilterPanel
        value={filterState}
        onChange={handleFilterChange}
        activeWorkerCount={snapshotTotals ? snapshotTotals.total_active : 0}
      />

      {/* ── Full-width map ──────────────────────────────────────────────────── */}
      {/* The map fills the full body width. The worker list + selected-worker
          detail/timeline float OVER the map as overlays instead of a side panel.
          Explicit viewport height (valid calc — underscores around the operator,
          else Tailwind emits invalid CSS and the height collapses to 0). */}
      <div className="relative w-full h-[calc(100vh_-_13rem)] min-h-[28rem] overflow-hidden border-2 border-nb-black m-4 rounded-nb-base bg-white">
        <MonitoringMap
          users={mapUsers}
          boundaries={boundariesData}
          filters={mapFilters}
          selectedUserId={selectedUser?.id ?? null}
          onUserSelect={handleUserSelect}
          onBoundaryClick={handleBoundaryClick}
          trailPoints={panelView === 'timeline' ? locationHistory?.points : undefined}
          trailSelectedIndex={panelView === 'timeline' ? trailSelectedIndex : undefined}
          onTrailPointClick={setTrailSelectedIndex}
          showOnlyTrailUser={showOnlyTrailUser}
          layerVisibility={{
            workers: layerVisibility.workers,
            rayons: layerVisibility.rayons,
            areas: layerVisibility.areas,
          }}
          className="h-full"
        />
        <MonitoringTogglePanel value={layerVisibility} onChange={handleLayerVisibilityChange} />

        {/* Worker-list toggle (top-left), only in list view */}
        {panelView === 'list' && (
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            className="absolute left-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-nb-base border-2 border-nb-black bg-white px-3 py-1.5 text-xs font-bold shadow-nb-sm transition-shadow hover:shadow-nb-md"
            aria-expanded={listOpen}
          >
            {listOpen ? 'Tutup daftar' : `Daftar petugas (${workerListItems.length})`}
          </button>
        )}

        {/* Worker-list overlay (left) */}
        {panelView === 'list' && listOpen && (
          <div className="absolute left-2 top-12 bottom-2 z-20 flex w-72 max-w-[calc(100%_-_1rem)] flex-col overflow-hidden rounded-nb-base border-2 border-nb-black bg-white shadow-nb-md">
            <StaffingSummaryCard
              filters={{
                rayon_id:
                  filterState.scope !== 'city' && filterState.rayonId ? filterState.rayonId : undefined,
                area_id:
                  filterState.scope === 'area' && filterState.areaId ? filterState.areaId : undefined,
              }}
              boundaries={boundariesData}
              onReassign={handleReassign}
            />
            <div className="flex-shrink-0 border-b-2 border-nb-black px-3 py-2">
              <p className="text-nb-caption font-bold uppercase tracking-wide text-nb-gray-600">
                Petugas ({workerListItems.length})
              </p>
            </div>
            <WorkerListVirtual
              workers={workerListItems}
              onSelect={handleWorkerListSelect}
              selectedUserId={selectedUser?.id}
              className="flex-1"
              aria-label="Daftar semua petugas aktif"
            />
          </div>
        )}

        {/* Selected-worker detail / timeline overlay (right) */}
        {panelView === 'detail' && (
          <div className="absolute right-2 top-2 bottom-2 z-20 flex w-full max-w-sm flex-col overflow-y-auto rounded-nb-base border-2 border-nb-black bg-white shadow-nb-md">
            <UserDetailPanel
              summary={userDaySummary}
              isLoading={summaryLoading}
              onBack={handleBackToList}
              onViewLocationHistory={handleViewLocationHistory}
            />
          </div>
        )}

        {panelView === 'timeline' && (
          <div className="absolute right-2 top-2 bottom-2 z-20 flex w-full max-w-sm flex-col overflow-y-auto rounded-nb-base border-2 border-nb-black bg-white shadow-nb-md">
            <LocationTimeline
              history={locationHistory}
              isLoading={historyLoading}
              selectedDate={historyDate}
              onDateChange={setHistoryDate}
              onBack={handleBackToDetail}
              userName={selectedUser?.full_name ?? ''}
              selectedPointIndex={trailSelectedIndex}
              onPointSelect={setTrailSelectedIndex}
              showOnlyThisUser={showOnlyTrailUser}
              onToggleShowOnly={setShowOnlyTrailUser}
            />
          </div>
        )}
      </div>

      {/* ── Area Detail Drawer ──────────────────────────────────────────────── */}
      <AreaDetailDrawer
        area={selectedAreaSummary}
        workers={areaDrawerWorkers}
        onClose={handleAreaDrawerClose}
        onWorkerSelect={handleWorkerListSelect}
        selectedUserId={selectedUser?.id}
      />

      {/* ── Reassign Worker Modal ──────────────────────────────────────────── */}
      <ReassignWorkerModal
        open={reassignModalOpen}
        onOpenChange={setReassignModalOpen}
        targetAreaId={reassignTargetAreaId}
        targetAreaName={reassignTargetAreaName}
        boundaries={boundariesData}
      />
    </div>
  );
}
