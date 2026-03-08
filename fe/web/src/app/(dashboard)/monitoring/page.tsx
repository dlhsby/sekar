/**
 * Real-Time Monitoring Dashboard (Phase 2D - Enhanced with 2D-10 Gap Fixes)
 * Full-screen split layout: map 65% + panel 35%
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import {
  useCityStats,
  useRayonMonitoring,
  useAreaMonitoring,
  useLiveUsers,
  useUserDaySummary,
  useLocationHistory,
  useBoundaries,
  type LiveUser,
  type LiveUsersFilters,
  type UserStatusChangedEvent,
  type UserAreaEvent,
} from '@/lib/api/monitoring';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { FormSelect, Button } from '@/components/ui';
import { MonitoringMap } from '@/components/monitoring/MonitoringMap';
import { MonitoringSidePanel } from '@/components/monitoring/MonitoringSidePanel';
import { UserDetailPanel } from '@/components/monitoring/UserDetailPanel';
import { LocationTimeline } from '@/components/monitoring/LocationTimeline';
import { StaffingSummaryCard } from '@/components/monitoring/StaffingSummaryCard';
import { ReassignWorkerModal } from '@/components/monitoring/ReassignWorkerModal';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MONITORING_ROLES, hasRole } from '@/lib/constants/roles';
import { monitoringKeys } from '@/lib/api/monitoring';
import { cn } from '@/lib/utils/cn';
import { formatTime } from '@/lib/utils/formatters';
import type { UserRole } from '@/types/models';
import io, { type Socket } from 'socket.io-client';
import { getCookie } from '@/lib/utils/cookies';
import { toast } from 'sonner';

type PanelView = 'list' | 'detail' | 'timeline';

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters
  const [rayonFilter, setRayonFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

  // Panel state
  const [panelView, setPanelView] = useState<PanelView>('list');
  const [selectedUser, setSelectedUser] = useState<LiveUser | null>(null);
  const [historyDate, setHistoryDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  // Trail sync state (Phase 2D-10)
  const [trailSelectedIndex, setTrailSelectedIndex] = useState<number | null>(null);
  const [showOnlyTrailUser, setShowOnlyTrailUser] = useState(false);

  // Reassign modal state (Phase 2D-10)
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTargetAreaId, setReassignTargetAreaId] = useState('');
  const [reassignTargetAreaName, setReassignTargetAreaName] = useState('');

  // Socket ref
  const socketRef = useRef<Socket | null>(null);

  // Role-based access
  const canViewCity = user
    ? ['top_management', 'admin_system', 'superadmin'].includes(user.role)
    : false;
  const canViewRayon = user
    ? ['kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'].includes(
        user.role
      )
    : false;

  // Auto-scope based on role
  useEffect(() => {
    if (!user) return;
    if (user.role === 'korlap' && user.area_id) {
      setAreaFilter(user.area_id);
    } else if (user.role === 'kepala_rayon' && user.rayon_id) {
      setRayonFilter(user.rayon_id);
    }
  }, [user]);

  // Redirect unauthorized
  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role as UserRole, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Filter options
  const { data: rayonsData } = useRayons();
  const { data: areasData } = useAreas({
    rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined,
  });

  // Boundaries (Phase 2D-10)
  const { data: boundariesData } = useBoundaries();

  // Stats queries
  const { data: cityStats } = useCityStats(canViewCity);
  const { data: rayonStats } = useRayonMonitoring(
    rayonFilter !== 'all' ? rayonFilter : '',
    canViewRayon
  );
  const { data: areaStats } = useAreaMonitoring(
    areaFilter !== 'all' ? areaFilter : ''
  );

  // Live users
  const filters: LiveUsersFilters = {};
  if (rayonFilter && rayonFilter !== 'all') filters.rayon_id = rayonFilter;
  if (areaFilter && areaFilter !== 'all') filters.area_id = areaFilter;

  const { data: liveUsersData, isLoading: usersLoading, refetch: refetchUsers } = useLiveUsers(filters);

  // User day summary (when detail panel is open)
  const { data: userDaySummary, isLoading: summaryLoading } = useUserDaySummary(
    panelView === 'detail' || panelView === 'timeline' ? (selectedUser?.id ?? null) : null
  );

  // Location history (when timeline panel is open)
  const { data: locationHistory, isLoading: historyLoading } = useLocationHistory(
    panelView === 'timeline' ? (selectedUser?.id ?? null) : null,
    historyDate
  );

  // WebSocket integration
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const token = getCookie('access_token');
    const socket = io(apiUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      auth: { token },
    });

    socketRef.current = socket;

    // User location update
    socket.on('user:location', (payload: Partial<LiveUser> & { user_id: string }) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(filters),
        (old: typeof liveUsersData) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((u) =>
              u.id === payload.user_id ? { ...u, ...payload } : u
            ),
          };
        }
      );
    });

    // Status changed
    socket.on('user:status-changed', (event: UserStatusChangedEvent) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(filters),
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

    // User left area
    socket.on('user:left-area', (event: UserAreaEvent) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(filters),
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

    // User entered area
    socket.on('user:entered-area', (event: UserAreaEvent) => {
      queryClient.setQueryData(
        monitoringKeys.liveUsers(filters),
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const handleUserSelect = useCallback((user: LiveUser) => {
    setSelectedUser(user);
    setPanelView('detail');
    setTrailSelectedIndex(null);
    setShowOnlyTrailUser(false);
  }, []);

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

  const handleReassign = useCallback((areaId: string) => {
    // Find area name from boundaries
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
  }, [boundariesData]);

  const handleBoundaryClick = useCallback((_type: 'rayon' | 'area', id: string) => {
    // When a boundary center marker is clicked, filter to that entity
    if (_type === 'rayon') {
      setRayonFilter(id);
      setAreaFilter('all');
    } else {
      setAreaFilter(id);
    }
  }, []);

  // Loading state
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

  const isAreaView = areaFilter && areaFilter !== 'all';
  const isRayonView = !isAreaView && rayonFilter && rayonFilter !== 'all';

  const statUsersOnline = isAreaView
    ? (areaStats?.users_online ?? 0)
    : isRayonView
      ? (rayonStats?.workers_online ?? 0)
      : (cityStats?.workers_online ?? 0);

  const statUsersTotal = isAreaView
    ? (areaStats?.total_users_assigned ?? 0)
    : isRayonView
      ? (rayonStats?.total_workers ?? 0)
      : (cityStats?.total_workers ?? 0);

  const users = liveUsersData?.users ?? [];
  const allAreas = areasData?.data ?? [];

  // Map filter props for auto-focus
  const mapFilters = {
    rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined,
    area_id: areaFilter !== 'all' ? areaFilter : undefined,
    user_id: selectedUser?.id,
  };

  return (
    <div className="flex flex-col h-full -m-4 lg:-m-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-nb-black bg-white flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-black text-nb-black leading-tight">Monitoring Real-Time</h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-nb-success animate-pulse" />
              <span className="text-xs text-nb-gray-500">
                {statUsersOnline} / {statUsersTotal} online
              </span>
              {liveUsersData && (
                <span className="text-xs text-nb-gray-400">
                  · {formatTime(liveUsersData.generated_at)}
                </span>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="w-36">
              <FormSelect
                label=""
                value={rayonFilter}
                onChange={(value) => {
                  setRayonFilter(value as string);
                  setAreaFilter('all');
                }}
                options={[
                  { value: 'all', label: 'Semua Rayon' },
                  ...(rayonsData || []).map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
            </div>
            <div className="w-36">
              <FormSelect
                label=""
                value={areaFilter}
                onChange={(value) => setAreaFilter(value as string)}
                options={[
                  { value: 'all', label: 'Semua Area' },
                  ...allAreas.map((a) => ({ value: a.id, label: a.name })),
                ]}
                disabled={rayonFilter === 'all'}
              />
            </div>
            {(rayonFilter !== 'all' || areaFilter !== 'all') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRayonFilter('all');
                  setAreaFilter('all');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetchUsers()}
          aria-label="Refresh data"
        >
          Refresh
        </Button>
      </div>

      {/* Main split layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Map - 65% on desktop, 40vh on mobile */}
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
            className="h-full"
          />
        </div>

        {/* Side panel - 35% on desktop, full remaining on mobile */}
        <div
          className={cn(
            'lg:flex-[35] border-t-2 lg:border-t-0 lg:border-l-2 border-nb-black',
            'flex flex-col overflow-hidden bg-white',
            'h-[calc(100vh-40vh-48px)] lg:h-auto'
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
              <MonitoringSidePanel
                data={liveUsersData}
                isLoading={usersLoading}
                selectedUserId={selectedUser?.id ?? null}
                onUserSelect={handleUserSelect}
              />
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

      {/* Reassign Worker Modal (Phase 2D-10) */}
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
