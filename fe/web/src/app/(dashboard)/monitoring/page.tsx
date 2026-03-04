/**
 * Real-Time Monitoring Dashboard (Phase 2D - Enhanced)
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
  type LiveUser,
  type LiveUsersFilters,
  type UserStatusChangedEvent,
} from '@/lib/api/monitoring';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { FormSelect, Button } from '@/components/ui';
import { MonitoringMap } from '@/components/monitoring/MonitoringMap';
import { MonitoringSidePanel } from '@/components/monitoring/MonitoringSidePanel';
import { UserDetailPanel } from '@/components/monitoring/UserDetailPanel';
import { LocationTimeline } from '@/components/monitoring/LocationTimeline';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MONITORING_ROLES, hasRole } from '@/lib/constants/roles';
import { monitoringKeys } from '@/lib/api/monitoring';
import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types/models';
import io, { type Socket } from 'socket.io-client';

type PanelView = 'list' | 'detail' | 'timeline';

function formatTimeShort(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
    const socket = io(apiUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
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
    });

    // User left area
    socket.on('user:left-area', (event: { user_id: string }) => {
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
    });

    // User entered area
    socket.on('user:entered-area', (event: { user_id: string }) => {
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
  }, []);

  const handleBackToList = useCallback(() => {
    setPanelView('list');
    setSelectedUser(null);
  }, []);

  const handleViewLocationHistory = useCallback(() => {
    setPanelView('timeline');
  }, []);

  const handleBackToDetail = useCallback(() => {
    setPanelView('detail');
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
                  · {formatTimeShort(liveUsersData.generated_at)}
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
            areas={allAreas}
            selectedUserId={selectedUser?.id ?? null}
            onUserSelect={handleUserSelect}
            className="h-full"
          />
        </div>

        {/* Side panel - 35% on desktop, full remaining on mobile */}
        <div
          className={cn(
            'lg:flex-[35] border-t-2 lg:border-t-0 lg:border-l-2 border-nb-black',
            'flex flex-col overflow-hidden bg-white',
            'h-[calc(100vh-40vh-48px)] lg:h-auto' // mobile: remaining height
          )}
        >
          {panelView === 'list' && (
            <MonitoringSidePanel
              data={liveUsersData}
              isLoading={usersLoading}
              selectedUserId={selectedUser?.id ?? null}
              onUserSelect={handleUserSelect}
            />
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
