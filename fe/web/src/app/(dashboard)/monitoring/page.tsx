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

  // Fetch filter options
  const { data: rayonsData } = useRayons();
  const { data: areasData } = useAreas({
    rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined,
  });

  // Fetch appropriate stats based on filters and role
  const { data: cityStats, isLoading: cityLoading } = useCityStats();
  const { data: rayonStats, isLoading: rayonLoading } = useRayonMonitoring(
    rayonFilter !== 'all' ? rayonFilter : ''
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
  const displayStats =
    areaFilter && areaFilter !== 'all'
      ? areaStats
      : rayonFilter && rayonFilter !== 'all'
        ? rayonStats
        : cityStats;

  const displayLoading =
    areaFilter && areaFilter !== 'all'
      ? areaLoading
      : rayonFilter && rayonFilter !== 'all'
        ? rayonLoading
        : cityLoading;

  const users = liveUsersData?.users || [];
  const onlineUsers = users.filter((u) => u.status === 'online');
  const offlineUsers = users.filter((u) => u.status === 'offline');

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
      ) : displayStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Users Online */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">Petugas Online</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-success">
                  {areaFilter && areaFilter !== 'all'
                    ? (areaStats?.current_shift?.active_users ?? 0)
                    : rayonFilter && rayonFilter !== 'all'
                      ? (rayonStats?.summary?.users_online ?? 0)
                      : (cityStats?.summary?.users_online ?? 0)}
                </div>
                <div className="text-nb-gray-600">
                  /{' '}
                  {areaFilter && areaFilter !== 'all'
                    ? (areaStats?.current_shift?.assigned_users ?? 0)
                    : rayonFilter && rayonFilter !== 'all'
                      ? (rayonStats?.summary?.total_users ?? 0)
                      : (cityStats?.summary?.total_users ?? 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linmas Online */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">Linmas Online</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-primary">
                  {areaFilter && areaFilter !== 'all'
                    ? (areaStats?.current_shift?.active_linmas ?? 0)
                    : rayonFilter && rayonFilter !== 'all'
                      ? (rayonStats?.summary?.linmas_online ?? 0)
                      : (cityStats?.summary?.linmas_online ?? 0)}
                </div>
                <div className="text-nb-gray-600">
                  /{' '}
                  {areaFilter && areaFilter !== 'all'
                    ? (areaStats?.current_shift?.assigned_linmas ?? 0)
                    : rayonFilter && rayonFilter !== 'all'
                      ? (rayonStats?.summary?.total_linmas ?? 0)
                      : (cityStats?.summary?.total_linmas ?? 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Shifts */}
          {(!areaFilter || areaFilter === 'all') && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">Shift Aktif</div>
                <div className="text-3xl font-black text-nb-warning">
                  {rayonFilter && rayonFilter !== 'all'
                    ? (rayonStats?.summary?.active_shifts ?? 0)
                    : (cityStats?.summary?.active_shifts ?? 0)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activities Today */}
          {(!areaFilter || areaFilter === 'all') && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                  Aktivitas Hari Ini
                </div>
                <div className="text-3xl font-black text-nb-black">
                  {rayonFilter && rayonFilter !== 'all'
                    ? (rayonStats?.summary?.activities_today ?? 0)
                    : (cityStats?.summary?.activities_today ?? 0)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Area-specific: Shift Info */}
          {areaFilter && areaFilter !== 'all' && areaStats && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">Shift Saat Ini</div>
                <div className="font-black text-nb-black">
                  {areaStats.current_shift.definition.name}
                </div>
                <div className="text-sm text-nb-gray-600">
                  {areaStats.current_shift.definition.start_time} -{' '}
                  {areaStats.current_shift.definition.end_time}
                </div>
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
                {users.length} petugas terdeteksi ({onlineUsers.length} online,{' '}
                {offlineUsers.length} offline)
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
                  key={liveUser.user_id || `user-${index}`}
                  className="flex items-center justify-between p-4 border-2 border-nb-black bg-white hover:bg-nb-gray-50 transition-colors"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        liveUser.status === 'online' ? 'bg-nb-success' : 'bg-nb-gray-400'
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
                    <Badge
                      variant={liveUser.status === 'online' ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {liveUser.status === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                    {liveUser.battery_level < 20 && (
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
          Terakhir diperbarui: {new Date(liveUsersData.timestamp).toLocaleString('id-ID')}
        </div>
      )}
    </div>
  );
}
