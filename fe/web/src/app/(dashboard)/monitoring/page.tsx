/**
 * Monitoring Dashboard v2 (Phase 3 sub-phase 3-4)
 * - useMonitoringSnapshot for initial data
 * - Incremental WS status:v2 patches via queryClient.setQueryData
 * - ClusterLayer for map rendering (supercluster)
 * - WorkerListVirtual for sidebar worker list
 * - HierarchyFilterPanel for filtering
 * - AreaDetailDrawer when area polygon is clicked
 * - Role gate: MONITORING_ROLES only — staff_kecamatan has NO access
 *
 * Backward-compatible: all Phase 2D panels (detail, timeline, reassign) preserved.
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import {
  useLiveUsers,
  useUserDaySummary,
  useLocationHistory,
  useBoundaries,
  type LiveUser,
  type UserStatusChangedEvent,
  type UserAreaEvent,
} from '@/lib/api/monitoring';
import { monitoringKeys } from '@/lib/api/monitoring';
import {
  useMonitoringSnapshot,
  snapshotKeys,
  type StatusV2Event,
  type MonitoringSnapshotResponse,
} from '@/lib/api/monitoring-v2';
import { Button } from '@/components/ui';
import { MonitoringMap } from '@/components/monitoring/MonitoringMap';
import { MonitoringSidePanel } from '@/components/monitoring/MonitoringSidePanel';
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

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Hierarchy filter state (replaces flat rayon/area filters)
  // ---------------------------------------------------------------------------
  const [filterState, setFilterState] = useState<HierarchyFilterState>({ scope: 'city' });

  // Derived convenience values
  const rayonFilter = filterState.scope !== 'city' ? (filterState.rayonId ?? 'all') : 'all';
  const areaFilter = filterState.scope === 'area' ? (filterState.areaId ?? 'all') : 'all';

  // Panel state
  const [panelView, setPanelView] = useState<PanelView>('list');
  const [selectedUser, setSelectedUser] = useState<LiveUser | null>(null);
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

  // Map layer visibility (Phase 3 sub-phase 3-4 — Tampilan Peta toggles)
  const LAYER_STORAGE_KEY = 'monitoring.layers.v1';
  const [layerVisibility, setLayerVisibility] = useState<MonitoringLayerVisibility>(
    () => DEFAULT_LAYER_VISIBILITY
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LAYER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<MonitoringLayerVisibility>;
      setLayerVisibility((prev) => ({ ...prev, ...parsed }));
    } catch {
      /* ignore corrupt persisted value */
    }
  }, []);
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

  // Auto-scope based on role
  useEffect(() => {
    if (!user) return;
    if (user.role === 'korlap' && user.area_id) {
      setFilterState({ scope: 'area', areaId: user.area_id });
    } else if (user.role === 'kepala_rayon' && user.rayon_id) {
      setFilterState({ scope: 'rayon', rayonId: user.rayon_id });
    }
  }, [user]);

  // ---------------------------------------------------------------------------
  // Data queries
  // ---------------------------------------------------------------------------

  // v2 snapshot
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

  // Legacy live-users (still used for Phase 2D sidebar panels)
  const legacyFilters = useMemo(() => {
    const f: { rayon_id?: string; area_id?: string } = {};
    if (rayonFilter !== 'all') f.rayon_id = rayonFilter;
    if (areaFilter !== 'all') f.area_id = areaFilter;
    return f;
  }, [rayonFilter, areaFilter]);

  // Ref kept current so WS handlers always read the latest filter value
  // without needing to re-subscribe to the socket.
  const legacyFiltersRef = useRef(legacyFilters);
  useEffect(() => {
    legacyFiltersRef.current = legacyFilters;
  });

  const {
    data: liveUsersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useLiveUsers(legacyFilters);

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
  // WebSocket — both Phase 2D events and new status:v2 patches
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

    // --- Phase 2D events (legacy live-users cache patches) ---

    socket.on('user:location', (payload: Partial<LiveUser> & { user_id: string }) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(legacyFiltersRef.current),
        (old: typeof liveUsersData) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((u) => (u.id === payload.user_id ? { ...u, ...payload } : u)),
          };
        }
      );
    });

    socket.on('user:status-changed', (event: UserStatusChangedEvent) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(legacyFiltersRef.current),
        (old: typeof liveUsersData) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((u) =>
              u.id === event.user_id ? { ...u, status: event.new_status } : u
            ),
          };
        }
      );
      if (event.new_status === 'missing') {
        toast.warning(`${event.user_name} tidak terdeteksi`, {
          description: event.area_name ? `Area: ${event.area_name}` : undefined,
        });
      }
    });

    socket.on('user:left-area', (event: UserAreaEvent) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(legacyFiltersRef.current),
        (old: typeof liveUsersData) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((u) =>
              u.id === event.user_id
                ? { ...u, is_within_area: false, status: 'outside_area' as const }
                : u
            ),
          };
        }
      );
      toast.info(`${event.user_name} keluar dari ${event.area_name}`);
    });

    socket.on('user:entered-area', (event: UserAreaEvent) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(legacyFiltersRef.current),
        (old: typeof liveUsersData) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((u) =>
              u.id === event.user_id
                ? { ...u, is_within_area: true, status: 'active' as const }
                : u
            ),
          };
        }
      );
      toast.success(`${event.user_name} masuk ke ${event.area_name}`);
    });

    // --- Phase 3 incremental patch: status:v2 ---

    socket.on('status:v2', (event: StatusV2Event) => {
      // Patch the snapshot cache for all active scope keys
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

      // Show toast for missing status
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, snapshotScope, snapshotId]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const users = liveUsersData?.users ?? [];
  const snapshotWorkers = snapshotData?.data?.workers ?? [];
  const snapshotAreaSummaries = snapshotData?.data?.area_summaries ?? [];

  // Stats from snapshot (prefer v2 snapshot; fallback to legacy)
  const totalActive =
    snapshotData?.data?.total_active ?? liveUsersData?.total_active ?? 0;
  const totalWorkers =
    (snapshotData?.data?.total_active ?? 0) +
    (snapshotData?.data?.total_inactive ?? 0) +
    (snapshotData?.data?.total_outside_area ?? 0) +
    (snapshotData?.data?.total_missing ?? 0) +
    (snapshotData?.data?.total_offline ?? 0);

  const generatedAt = snapshotData?.data?.generated_at ?? liveUsersData?.generated_at;

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

  // Filter workers for the selected area drawer by area_id (unique) not area_name (non-unique across rayons)
  const areaDrawerWorkers = useMemo<WorkerListItem[]>(() => {
    if (!selectedAreaSummary) return [];
    return workerListItems.filter((w) => w.area_id === selectedAreaSummary.area_id);
  }, [workerListItems, selectedAreaSummary]);

  // Map filter props for auto-focus
  const mapFilters = useMemo(
    () => ({
      rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined,
      area_id: areaFilter !== 'all' ? areaFilter : undefined,
      user_id: selectedUser?.id,
    }),
    [rayonFilter, areaFilter, selectedUser]
  );

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
      const liveUser = users.find((u) => u.id === userId);
      if (liveUser) {
        handleUserSelect(liveUser);
      }
    },
    [users, handleUserSelect]
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
        // Open area detail drawer using snapshot area summary
        const summary = snapshotAreaSummaries.find((s) => s.area_id === id);
        if (summary) {
          setSelectedAreaSummary(summary);
        }
        // Also update filter to area scope
        setFilterState((prev) => ({ scope: 'area', rayonId: prev.rayonId, areaId: id }));
      }
    },
    [snapshotAreaSummaries]
  );

  const handleFilterChange = useCallback((next: HierarchyFilterState) => {
    setFilterState(next);
    // Close area drawer when filter changes away
    if (next.scope !== 'area') {
      setSelectedAreaSummary(null);
    }
  }, []);

  const handleAreaDrawerClose = useCallback(() => {
    setSelectedAreaSummary(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchSnapshot();
    refetchUsers();
  }, [refetchSnapshot, refetchUsers]);

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

  const isLoading = snapshotLoading || usersLoading;

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6">
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-nb-black bg-white flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-nb-h3 text-nb-black leading-tight">
            Monitoring Real-Time
          </h1>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isLoading ? 'bg-nb-warning' : 'bg-nb-success animate-pulse'
              )}
              aria-hidden="true"
            />
            <span className="text-xs text-nb-gray-500" aria-live="polite">
              {totalActive} / {totalWorkers} aktif
            </span>
            {generatedAt && (
              <span className="text-xs text-nb-gray-400">
                · {formatTime(generatedAt)}
              </span>
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          aria-label="Segarkan data monitoring"
        >
          Segarkan
        </Button>
      </div>

      {/* ── Hierarchy filter panel ────────────────────────────────────────── */}
      <HierarchyFilterPanel
        value={filterState}
        onChange={handleFilterChange}
        activeWorkerCount={totalActive}
      />

      {/* ── Main split layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Map — 65% on desktop, 40 vh on mobile */}
        <div className={cn('relative h-[40vh] lg:h-auto', 'lg:flex-[65]')}>
          <MonitoringMap
            users={users}
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
          <MonitoringTogglePanel
            value={layerVisibility}
            onChange={handleLayerVisibilityChange}
          />
        </div>

        {/* Side panel — 35% on desktop, remaining height on mobile */}
        <div
          className={cn(
            'lg:flex-[35] border-t-2 lg:border-t-0 lg:border-l-2 border-nb-black',
            'flex flex-col overflow-hidden bg-white',
            'h-[calc(100vh-40vh-48px-40px)] lg:h-auto'
          )}
        >
          {panelView === 'list' && (
            <>
              <StaffingSummaryCard
                filters={{
                  rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined,
                  area_id: areaFilter !== 'all' ? areaFilter : undefined,
                }}
                boundaries={boundariesData}
                onReassign={handleReassign}
              />

              {/* v2 virtualized worker list */}
              <div className="px-3 py-2 border-b border-nb-gray-200 flex-shrink-0">
                <p className="text-nb-caption font-bold text-nb-gray-600 uppercase tracking-wide">
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

              {/* Legacy side panel for compatibility */}
              <details className="border-t border-nb-gray-200">
                <summary className="px-3 py-2 text-nb-caption font-bold text-nb-gray-500 cursor-pointer hover:bg-nb-gray-50 select-none">
                  Tampilan panel lama
                </summary>
                <MonitoringSidePanel
                  data={liveUsersData}
                  isLoading={usersLoading}
                  selectedUserId={selectedUser?.id ?? null}
                  onUserSelect={handleUserSelect}
                />
              </details>
            </>
          )}

          {panelView === 'detail' && (
            <UserDetailPanel
              summary={userDaySummary}
              isLoading={summaryLoading}
              onBack={handleBackToList}
              onViewLocationHistory={handleViewLocationHistory}
            />
          )}

          {panelView === 'timeline' && (
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
          )}
        </div>
      </div>

      {/* ── Area Detail Drawer ────────────────────────────────────────────── */}
      <AreaDetailDrawer
        area={selectedAreaSummary}
        workers={areaDrawerWorkers}
        onClose={handleAreaDrawerClose}
        onWorkerSelect={handleWorkerListSelect}
        selectedUserId={selectedUser?.id}
      />

      {/* ── Reassign Worker Modal (Phase 2D-10) ──────────────────────────── */}
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
