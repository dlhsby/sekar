/**
 * Real-Time Monitoring Dashboard
 * Live worker tracking and area monitoring
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import {
  useCityStats,
  useRayonMonitoring,
  useAreaMonitoring,
  useLiveWorkers,
  type LiveWorkersFilters,
} from '@/lib/api/monitoring';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';
import { Card, CardHeader, CardContent, Badge, FormSelect, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Access control: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
const ALLOWED_ROLES = ['admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan'];

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rayonFilter, setRayonFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch filter options
  const { data: rayonsData } = useRayons();
  const { data: areasData } = useAreas({ rayon_id: rayonFilter !== 'all' ? rayonFilter : undefined });

  // Fetch appropriate stats based on filters and role
  const { data: cityStats, isLoading: cityLoading } = useCityStats();
  const { data: rayonStats, isLoading: rayonLoading } = useRayonMonitoring(rayonFilter !== 'all' ? rayonFilter : '');
  const { data: areaStats, isLoading: areaLoading } = useAreaMonitoring(areaFilter !== 'all' ? areaFilter : '');

  // Fetch live workers
  const filters: LiveWorkersFilters = {};
  if (rayonFilter && rayonFilter !== 'all') filters.rayon_id = rayonFilter;
  if (areaFilter && areaFilter !== 'all') filters.area_id = areaFilter;
  
  const { data: liveWorkersData, isLoading: workersLoading } = useLiveWorkers(filters);

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!ALLOWED_ROLES.includes(user.role)) {
    return null;
  }

  // Determine which stats to display
  const displayStats = (areaFilter && areaFilter !== 'all')
    ? areaStats
    : (rayonFilter && rayonFilter !== 'all')
    ? rayonStats
    : cityStats;

  const displayLoading = (areaFilter && areaFilter !== 'all')
    ? areaLoading
    : (rayonFilter && rayonFilter !== 'all')
    ? rayonLoading
    : cityLoading;

  const workers = liveWorkersData?.workers || [];
  const onlineWorkers = workers.filter((w) => w.status === 'online');
  const offlineWorkers = workers.filter((w) => w.status === 'offline');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-nb-black">Monitoring Real-Time</h1>
          <p className="text-gray-600 mt-1">
            Pantau posisi pekerja dan status area secara langsung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-nb-success animate-pulse"></div>
          <span className="text-sm text-gray-600">Auto-refresh setiap 15 detik</span>
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
                  setAreaFilter('all'); // Reset area when rayon changes
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
            <div
              key={i}
              className="h-32 bg-nb-gray-200 border-3 border-nb-black animate-pulse"
            />
          ))}
        </div>
      ) : displayStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workers Online */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                Pekerja Online
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-success">
                  {(areaFilter && areaFilter !== 'all')
                    ? areaStats?.current_shift.active_workers
                    : (rayonFilter && rayonFilter !== 'all')
                    ? rayonStats?.summary.workers_online
                    : cityStats?.summary.workers_online}
                </div>
                <div className="text-nb-gray-600">
                  /{' '}
                  {(areaFilter && areaFilter !== 'all')
                    ? areaStats?.current_shift.assigned_workers
                    : (rayonFilter && rayonFilter !== 'all')
                    ? rayonStats?.summary.total_workers
                    : cityStats?.summary.total_workers}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linmas Online */}
          <Card variant="elevated">
            <CardContent>
              <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                Linmas Online
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-primary">
                  {(areaFilter && areaFilter !== 'all')
                    ? areaStats?.current_shift.active_linmas
                    : (rayonFilter && rayonFilter !== 'all')
                    ? rayonStats?.summary.linmas_online
                    : cityStats?.summary.linmas_online}
                </div>
                <div className="text-nb-gray-600">
                  /{' '}
                  {(areaFilter && areaFilter !== 'all')
                    ? areaStats?.current_shift.assigned_linmas
                    : (rayonFilter && rayonFilter !== 'all')
                    ? rayonStats?.summary.total_linmas
                    : cityStats?.summary.total_linmas}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Shifts */}
          {(!areaFilter || areaFilter === 'all') && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                  Shift Aktif
                </div>
                <div className="text-3xl font-black text-nb-warning">
                  {(rayonFilter && rayonFilter !== 'all')
                    ? rayonStats?.summary.active_shifts
                    : cityStats?.summary.active_shifts}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reports Today */}
          {(!areaFilter || areaFilter === 'all') && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                  Laporan Hari Ini
                </div>
                <div className="text-3xl font-black text-nb-black">
                  {(rayonFilter && rayonFilter !== 'all')
                    ? rayonStats?.summary.reports_today
                    : cityStats?.summary.reports_today}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Area-specific: Shift Info */}
          {areaFilter && areaFilter !== 'all' && areaStats && (
            <Card variant="elevated">
              <CardContent>
                <div className="text-sm font-semibold text-nb-gray-600 mb-2">
                  Shift Saat Ini
                </div>
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
            <Badge variant="success">
              {onlineWorkers.length} Online
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-nb-gray-100 border-3 border-nb-black h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-nb-gray-600 font-semibold mb-2">
                Peta Monitoring Real-Time
              </p>
              <p className="text-sm text-nb-gray-500">
                Integrasi Mapbox akan ditambahkan di sini
              </p>
              <p className="text-xs text-nb-gray-400 mt-2">
                {workers.length} pekerja terdeteksi ({onlineWorkers.length} online,{' '}
                {offlineWorkers.length} offline)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers List */}
      <Card variant="elevated">
        <CardHeader>
          <h2 className="text-xl font-bold text-nb-black">Daftar Pekerja Aktif</h2>
        </CardHeader>
        <CardContent>
          {workersLoading ? (
            <div className="text-center py-8 text-nb-gray-600">Memuat data pekerja...</div>
          ) : workers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">👷</div>
              <p className="text-nb-gray-600 font-semibold">Tidak ada pekerja aktif</p>
              <p className="text-sm text-nb-gray-500 mt-2">
                Tidak ada pekerja yang sedang clock-in saat ini
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map((worker) => (
                <div
                  key={worker.user_id}
                  className="flex items-center justify-between p-4 border-3 border-nb-black bg-white hover:bg-nb-gray-50 transition-colors"
                >
                  {/* Worker Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        worker.status === 'online'
                          ? 'bg-nb-success'
                          : 'bg-nb-gray-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-nb-black">
                        {worker.full_name}
                      </div>
                      <div className="text-sm text-nb-gray-600">
                        {worker.area_name}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={worker.role === 'worker' ? 'default' : 'warning'}
                      size="sm"
                    >
                      {worker.role}
                    </Badge>
                    <Badge variant={worker.status === 'online' ? 'success' : 'secondary'} size="sm">
                      {worker.status === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                    {worker.battery_level < 20 && (
                      <Badge variant="destructive" size="sm">
                        🔋 {worker.battery_level}%
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
      {liveWorkersData && (
        <div className="text-center text-sm text-gray-500">
          Terakhir diperbarui:{' '}
          {new Date(liveWorkersData.timestamp).toLocaleString('id-ID')}
        </div>
      )}
    </div>
  );
}
