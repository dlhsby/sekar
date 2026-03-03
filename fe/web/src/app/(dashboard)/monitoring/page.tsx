/**
 * Real-Time Monitoring Dashboard (Phase 2C - terminology updated)
 * Live user tracking and area monitoring
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import {
  useCityStats,
  useRayonMonitoring,
  useAreaMonitoring,
  useLiveUsers,
  type LiveUsersFilters,
} from '@/lib/api/monitoring';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { Card, CardHeader, CardContent, Badge, FormSelect, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MONITORING_ROLES, hasRole, ROLE_LABELS } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rayonFilter, setRayonFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Auto-scope based on role
  useEffect(() => {
    if (!user) return;
    if (user.role === 'korlap' && user.area_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAreaFilter(user.area_id);
    } else if (user.role === 'kepala_rayon' && user.rayon_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRayonFilter(user.rayon_id);
    }
  }, [user]);

  // Fetch filter options
  const { data: rayonsData } = useRayons();
  const { data: areasData } = useAreas({
    rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined,
  });

  // Role-based access: korlap → area only; kepala_rayon/admin_data → rayon+area; others → all
  const canViewCity = user
    ? ['top_management', 'admin_system', 'superadmin'].includes(user.role)
    : false;
  const canViewRayon = user
    ? ['kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'].includes(
        user.role
      )
    : false;

  // Fetch appropriate stats based on filters and role
  const { data: cityStats, isLoading: cityLoading } = useCityStats(canViewCity);
  const { data: rayonStats, isLoading: rayonLoading } = useRayonMonitoring(
    rayonFilter !== 'all' ? rayonFilter : '',
    canViewRayon
  );
  const { data: areaStats, isLoading: areaLoading } = useAreaMonitoring(
    areaFilter !== 'all' ? areaFilter : ''
  );

  // Fetch live users
  const filters: LiveUsersFilters = {};
  if (rayonFilter && rayonFilter !== 'all') filters.rayon_id = rayonFilter;
  if (areaFilter && areaFilter !== 'all') filters.area_id = areaFilter;

  const { data: liveUsersData, isLoading: usersLoading } = useLiveUsers(filters);

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasRole(user.role, MONITORING_ROLES)) {
    return null;
  }

  // Determine which stats to display
  const isAreaView = areaFilter && areaFilter !== 'all';
  const isRayonView = !isAreaView && rayonFilter && rayonFilter !== 'all';
  const displayLoading = isAreaView ? areaLoading : isRayonView ? rayonLoading : cityLoading;

  const users = liveUsersData?.users || [];
  const onlineUsers = users.filter((u) => u.is_within_area);
  const offlineUsers = users.filter((u) => !u.is_within_area);

  // Derive stat values from actual backend field names
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

  const statTasksPending = isAreaView
    ? (areaStats?.tasks_pending ?? 0)
    : isRayonView
      ? (rayonStats?.tasks_pending ?? 0)
      : (cityStats?.tasks_pending ?? 0);

  const statActiveShifts = isRayonView
    ? (rayonStats?.active_shifts ?? 0)
    : (cityStats?.active_shifts ?? 0);

  const statActivities = isAreaView
    ? (areaStats?.activities_submitted_today ?? 0)
    : isRayonView
      ? (rayonStats?.activities_submitted_today ?? 0)
      : (cityStats?.activities_submitted_today ?? 0);

  const hasStats = isAreaView ? !!areaStats : isRayonView ? !!rayonStats : !!cityStats;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black">Monitoring Real-Time</h1>
          <p className="text-nb-gray-600 mt-1">
            Pantau posisi petugas dan status area secara langsung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-nb-success animate-pulse"></div>
          <span className="text-sm text-nb-gray-600">Auto-refresh setiap 15 detik</span>
        </div>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardContent>
          <div className="flex gap-4">
            {/* Rayon Filter */}
            <div className="flex-1">
              <FormSelect
                label="Filter Rayon"
                value={rayonFilter}
                onChange={(value) => {
                  setRayonFilter(value as string);
                  setAreaFilter('all');
                }}
                options={[
                  { value: 'all', label: 'Semua Rayon' },
                  ...(rayonsData || []).map((rayon) => ({
                    value: rayon.id,
                    label: rayon.name,
                  })),
                ]}
              />
            </div>

            {/* Area Filter */}
            <div className="flex-1">
              <FormSelect
                label="Filter Area"
                value={areaFilter}
                onChange={(value) => setAreaFilter(value as string)}
                options={[
                  { value: 'all', label: 'Semua Area' },
                  ...(areasData?.data || []).map((area) => ({
                    value: area.id,
                    label: `${area.name} (${area.code})`,
                  })),
                ]}
                disabled={rayonFilter === 'all'}
              />
            </div>

            {/* Clear Filters */}
            {(rayonFilter !== 'all' || areaFilter !== 'all') && (
              <Button
                variant="secondary"
                onClick={() => {
                  setRayonFilter('all');
                  setAreaFilter('all');
                }}
                className="self-end"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {displayLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-nb-gray-200 border-2 border-nb-black animate-pulse" />
          ))}
        </div>
      ) : hasStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Users Online */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">Petugas Online</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-success">{statUsersOnline}</div>
                <div className="text-nb-gray-600">/ {statUsersTotal}</div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Pending */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">Tugas Pending</div>
              <div className="text-3xl font-black text-nb-primary">{statTasksPending}</div>
            </CardContent>
          </Card>

          {/* Active Shifts (city/rayon only) */}
          {!isAreaView && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">Shift Aktif</div>
                <div className="text-3xl font-black text-nb-warning">{statActiveShifts}</div>
              </CardContent>
            </Card>
          )}

          {/* Activities Today */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">Aktivitas Hari Ini</div>
              <div className="text-3xl font-black text-nb-black">{statActivities}</div>
            </CardContent>
          </Card>

          {/* Area-specific: staffing status */}
          {isAreaView && areaStats && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                  Status Kepegawaian
                </div>
                <div
                  className={`font-black text-lg ${areaStats.is_fully_staffed ? 'text-nb-success' : 'text-nb-danger'}`}
                >
                  {areaStats.is_fully_staffed ? 'Terpenuhi' : 'Kurang Petugas'}
                </div>
                <div className="text-sm text-nb-gray-600 mt-1">{areaStats.name}</div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Map Placeholder */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Peta Live</h2>
            <Badge variant="success">{onlineUsers.length} Online</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-nb-gray-100 border-2 border-nb-black h-96 flex items-center justify-center">
            <div className="text-center">
              <p className="text-nb-gray-600 font-semibold mb-2">Peta Monitoring Real-Time</p>
              <p className="text-sm text-nb-gray-500">Integrasi Mapbox akan ditambahkan di sini</p>
              <p className="text-xs text-nb-gray-400 mt-2">
                {users.length} petugas terdeteksi ({onlineUsers.length} dalam area,{' '}
                {offlineUsers.length} di luar area)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Daftar Petugas Aktif</h2>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-nb-gray-600">Memuat data petugas...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-nb-gray-600 font-semibold">Tidak ada petugas aktif</p>
              <p className="text-sm text-nb-gray-500 mt-2">
                Tidak ada petugas yang sedang clock-in saat ini
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((liveUser, index) => (
                <div
                  key={liveUser.id || `user-${index}`}
                  className="flex items-center justify-between p-4 border-2 border-nb-black bg-white hover:bg-nb-gray-50 transition-colors"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        liveUser.is_within_area ? 'bg-nb-success' : 'bg-nb-gray-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-nb-black">{liveUser.full_name}</div>
                      <div className="text-sm text-nb-gray-600">{liveUser.area_name}</div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">
                      {ROLE_LABELS[liveUser.role as UserRole] || liveUser.role}
                    </Badge>
                    <Badge variant={liveUser.is_within_area ? 'success' : 'secondary'} size="sm">
                      {liveUser.is_within_area ? 'Dalam Area' : 'Di Luar Area'}
                    </Badge>
                    {liveUser.battery_level !== null && liveUser.battery_level < 20 && (
                      <Badge variant="destructive" size="sm">
                        {liveUser.battery_level}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      {liveUsersData && (
        <div className="text-center text-sm text-nb-gray-500">
          Terakhir diperbarui: {new Date(liveUsersData.generated_at).toLocaleString('id-ID')}
        </div>
      )}
    </div>
  );
}
