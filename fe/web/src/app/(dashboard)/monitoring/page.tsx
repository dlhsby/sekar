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
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBSelect } from '@/components/nb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rayonFilter, setRayonFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Access control: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
  const allowedRoles = ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'];

  useEffect(() => {
    if (!authLoading && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch filter options
  const { data: rayonsData } = useRayons();
  const { data: areasData } = useAreas({ rayon_id: rayonFilter });

  // Fetch appropriate stats based on filters and role
  const { data: cityStats, isLoading: cityLoading } = useCityStats();
  const { data: rayonStats, isLoading: rayonLoading } = useRayonMonitoring(rayonFilter);
  const { data: areaStats, isLoading: areaLoading } = useAreaMonitoring(areaFilter);

  // Fetch live workers
  const filters: LiveWorkersFilters = {};
  if (rayonFilter) filters.rayon_id = rayonFilter;
  if (areaFilter) filters.area_id = areaFilter;
  
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
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  // Determine which stats to display
  const displayStats = areaFilter
    ? areaStats
    : rayonFilter
    ? rayonStats
    : cityStats;

  const displayLoading = areaFilter
    ? areaLoading
    : rayonFilter
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
      <NBCard variant="elevated">
        <NBCardContent>
          <div className="flex gap-4">
            {/* Rayon Filter */}
            <div className="flex-1">
              <NBSelect
                label="Filter Rayon"
                value={rayonFilter}
                onChange={(value) => {
                  setRayonFilter(value as string);
                  setAreaFilter(''); // Reset area when rayon changes
                }}
                options={[
                  { value: '', label: 'Semua Rayon' },
                  ...(rayonsData || []).map((rayon) => ({
                    value: rayon.id,
                    label: rayon.name,
                  })),
                ]}
              />
            </div>

            {/* Area Filter */}
            <div className="flex-1">
              <NBSelect
                label="Filter Area"
                value={areaFilter}
                onChange={(value) => setAreaFilter(value as string)}
                options={[
                  { value: '', label: 'Semua Area' },
                  ...(areasData?.data || []).map((area) => ({
                    value: area.id,
                    label: `${area.name} (${area.code})`,
                  })),
                ]}
                disabled={!rayonFilter}
              />
            </div>

            {/* Clear Filters */}
            {(rayonFilter || areaFilter) && (
              <button
                onClick={() => {
                  setRayonFilter('');
                  setAreaFilter('');
                }}
                className="self-end px-4 py-2 border-3 border-black bg-white font-semibold hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        </NBCardContent>
      </NBCard>

      {/* Statistics Cards */}
      {displayLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 border-4 border-black rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : displayStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workers Online */}
          <NBCard variant="elevated">
            <NBCardContent>
              <div className="text-sm font-semibold text-gray-600 mb-2">
                Pekerja Online
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-success">
                  {areaFilter
                    ? areaStats?.current_shift.active_workers
                    : rayonFilter
                    ? rayonStats?.summary.workers_online
                    : cityStats?.summary.workers_online}
                </div>
                <div className="text-gray-600">
                  /{' '}
                  {areaFilter
                    ? areaStats?.current_shift.assigned_workers
                    : rayonFilter
                    ? rayonStats?.summary.total_workers
                    : cityStats?.summary.total_workers}
                </div>
              </div>
            </NBCardContent>
          </NBCard>

          {/* Linmas Online */}
          <NBCard variant="elevated">
            <NBCardContent>
              <div className="text-sm font-semibold text-gray-600 mb-2">
                Linmas Online
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-nb-primary">
                  {areaFilter
                    ? areaStats?.current_shift.active_linmas
                    : rayonFilter
                    ? rayonStats?.summary.linmas_online
                    : cityStats?.summary.linmas_online}
                </div>
                <div className="text-gray-600">
                  /{' '}
                  {areaFilter
                    ? areaStats?.current_shift.assigned_linmas
                    : rayonFilter
                    ? rayonStats?.summary.total_linmas
                    : cityStats?.summary.total_linmas}
                </div>
              </div>
            </NBCardContent>
          </NBCard>

          {/* Active Shifts */}
          {!areaFilter && (
            <NBCard variant="elevated">
              <NBCardContent>
                <div className="text-sm font-semibold text-gray-600 mb-2">
                  Shift Aktif
                </div>
                <div className="text-3xl font-black text-nb-warning">
                  {rayonFilter
                    ? rayonStats?.summary.active_shifts
                    : cityStats?.summary.active_shifts}
                </div>
              </NBCardContent>
            </NBCard>
          )}

          {/* Reports Today */}
          {!areaFilter && (
            <NBCard variant="elevated">
              <NBCardContent>
                <div className="text-sm font-semibold text-gray-600 mb-2">
                  Laporan Hari Ini
                </div>
                <div className="text-3xl font-black text-nb-black">
                  {rayonFilter
                    ? rayonStats?.summary.reports_today
                    : cityStats?.summary.reports_today}
                </div>
              </NBCardContent>
            </NBCard>
          )}

          {/* Area-specific: Shift Info */}
          {areaFilter && areaStats && (
            <NBCard variant="elevated">
              <NBCardContent>
                <div className="text-sm font-semibold text-gray-600 mb-2">
                  Shift Saat Ini
                </div>
                <div className="font-black text-nb-black">
                  {areaStats.current_shift.definition.name}
                </div>
                <div className="text-sm text-gray-600">
                  {areaStats.current_shift.definition.start_time} -{' '}
                  {areaStats.current_shift.definition.end_time}
                </div>
              </NBCardContent>
            </NBCard>
          )}
        </div>
      ) : null}

      {/* Map Placeholder */}
      <NBCard variant="elevated">
        <NBCardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Peta Live</h2>
            <NBBadge variant="success">
              {onlineWorkers.length} Online
            </NBBadge>
          </div>
        </NBCardHeader>
        <NBCardContent>
          <div className="bg-gray-100 border-3 border-black rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-gray-600 font-semibold mb-2">
                Peta Monitoring Real-Time
              </p>
              <p className="text-sm text-gray-500">
                Integrasi Mapbox akan ditambahkan di sini
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {workers.length} pekerja terdeteksi ({onlineWorkers.length} online,{' '}
                {offlineWorkers.length} offline)
              </p>
            </div>
          </div>
        </NBCardContent>
      </NBCard>

      {/* Workers List */}
      <NBCard variant="elevated">
        <NBCardHeader>
          <h2 className="text-xl font-bold text-nb-black">Daftar Pekerja Aktif</h2>
        </NBCardHeader>
        <NBCardContent>
          {workersLoading ? (
            <div className="text-center py-8 text-gray-600">Memuat data pekerja...</div>
          ) : workers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">👷</div>
              <p className="text-gray-600 font-semibold">Tidak ada pekerja aktif</p>
              <p className="text-sm text-gray-500 mt-2">
                Tidak ada pekerja yang sedang clock-in saat ini
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map((worker) => (
                <div
                  key={worker.user_id}
                  className="flex items-center justify-between p-4 border-3 border-black rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* Worker Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        worker.status === 'online'
                          ? 'bg-nb-success'
                          : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-nb-black">
                        {worker.full_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {worker.area_name}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    <NBBadge
                      variant={worker.role === 'Worker' ? 'primary' : 'warning'}
                      size="sm"
                    >
                      {worker.role}
                    </NBBadge>
                    <NBBadge variant={worker.status === 'online' ? 'success' : 'neutral'} size="sm">
                      {worker.status === 'online' ? 'Online' : 'Offline'}
                    </NBBadge>
                    {worker.battery_level < 20 && (
                      <NBBadge variant="danger" size="sm">
                        🔋 {worker.battery_level}%
                      </NBBadge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </NBCardContent>
      </NBCard>

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
