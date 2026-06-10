/**
 * Monitoring (Phase 4-R)
 *
 * Real-time worker monitoring, mobile-aligned. Three-pane responsive layout:
 *   filter rail · full-bleed map · worker/area sidebar.
 * All panels are driven by the unified `/monitoring/snapshot` endpoint
 * (role-scoped). Filtering and selection are client-side over the snapshot.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useMonitoringSnapshot } from '@/lib/api/monitoring-v2';
import { Button } from '@/components/ui';
import { MonitoringStatusBar } from '@/components/monitoring/MonitoringStatusBar';
import {
  MonitoringFilters,
  type MonitoringFilterState,
  type RayonOption,
} from '@/components/monitoring/MonitoringFilters';
import { MonitoringSidebar } from '@/components/monitoring/MonitoringSidebar';
import {
  SimpleMonitoringMap,
  type SimpleWorker,
} from '@/components/monitoring/SimpleMonitoringMap';
import { MONITORING_ROLES, hasRole } from '@/lib/constants/roles';
import { formatTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

const EMPTY_STATUS_COUNTS: Record<TrackingStatus, number> = {
  active: 0,
  inactive: 0,
  outside_area: 0,
  missing: 0,
  offline: 0,
};

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [filters, setFilters] = useState<MonitoringFilterState>({
    search: '',
    statuses: new Set(),
    rayonId: 'all',
    role: 'all',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile/tablet sheet toggle

  // Role-scoped snapshot: city for city-level roles, else the user's own
  // rayon/area (the backend forbids city scope for scoped roles).
  const { scope, scopeId } = useMemo<{
    scope: 'city' | 'rayon' | 'area';
    scopeId?: string;
  }>(() => {
    if (user?.role === 'korlap' && user.area_id) return { scope: 'area', scopeId: user.area_id };
    if ((user?.role === 'kepala_rayon' || user?.role === 'admin_data') && user.rayon_id)
      return { scope: 'rayon', scopeId: user.rayon_id };
    return { scope: 'city' };
  }, [user]);

  const { data, isLoading, refetch } = useMonitoringSnapshot(scope, scopeId);

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role as UserRole, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const allWorkers = useMemo(() => data?.data?.workers ?? [], [data]);
  const areaSummaries = useMemo(() => data?.data?.area_summaries ?? [], [data]);

  // Per-status counts over the full (unfiltered) snapshot — chips show totals.
  const statusCounts = useMemo(() => {
    const counts = { ...EMPTY_STATUS_COUNTS };
    for (const w of allWorkers) {
      const s = w.status as TrackingStatus;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [allWorkers]);

  // Derived rayon + role filter options.
  const rayonOptions = useMemo<RayonOption[]>(() => {
    const map = new Map<string, string>();
    for (const w of allWorkers) {
      if (w.rayon_id && w.rayon_name && !map.has(w.rayon_id)) map.set(w.rayon_id, w.rayon_name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allWorkers]);

  const roleOptions = useMemo<UserRole[]>(() => {
    const set = new Set<string>();
    for (const w of allWorkers) set.add(w.role);
    return [...set] as UserRole[];
  }, [allWorkers]);

  // Apply filters.
  const filteredWorkers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allWorkers.filter((w) => {
      if (filters.statuses.size > 0 && !filters.statuses.has(w.status as TrackingStatus)) return false;
      if (filters.rayonId !== 'all' && w.rayon_id !== filters.rayonId) return false;
      if (filters.role !== 'all' && w.role !== filters.role) return false;
      if (q && !w.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allWorkers, filters]);

  const filteredAreaSummaries = useMemo(() => {
    if (filters.rayonId === 'all') return areaSummaries;
    return areaSummaries.filter((a) => a.rayon_id === filters.rayonId);
  }, [areaSummaries, filters.rayonId]);

  // Map markers from the filtered set.
  const mapWorkers = useMemo<SimpleWorker[]>(
    () =>
      filteredWorkers.map((w) => ({
        user_id: w.user_id,
        full_name: w.full_name,
        lat: w.lat,
        lng: w.lng,
        status: w.status,
      })),
    [filteredWorkers]
  );

  const totals = useMemo(() => {
    const d = data?.data;
    if (!d) return null;
    return {
      total_active: d.total_active,
      total_inactive: d.total_inactive,
      total_outside_area: d.total_outside_area,
      total_missing: d.total_missing,
      total_offline: d.total_offline,
    };
  }, [data]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-nb-gray-600">Memuat...</div>
    );
  }

  if (!hasRole(user.role as UserRole, MONITORING_ROLES)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-nb-h3 leading-tight text-nb-black">Monitoring Real-Time</h1>
          <p className="mt-1 text-xs text-nb-gray-500">
            {isLoading
              ? 'Memuat…'
              : data?.data?.generated_at
                ? `Diperbarui ${formatTime(data.data.generated_at)}`
                : 'Tidak ada data'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filter
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Segarkan
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <MonitoringStatusBar totals={totals} className="rounded-nb-base border-2 border-nb-black" />

      {/* Three-pane body */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {/* Filter rail — sheet on mobile/tablet, fixed column on desktop */}
        <aside
          className={cn(
            'rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-sm lg:w-72 lg:flex-shrink-0',
            filtersOpen ? 'block' : 'hidden lg:block'
          )}
        >
          <MonitoringFilters
            filters={filters}
            onChange={setFilters}
            statusCounts={statusCounts}
            rayonOptions={rayonOptions}
            roleOptions={roleOptions}
            total={allWorkers.length}
            matched={filteredWorkers.length}
          />
        </aside>

        {/* Map */}
        <div className="relative h-[60vh] w-full overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-gray-100 lg:h-[calc(100vh_-_15rem)] lg:min-h-[28rem] lg:flex-1">
          <SimpleMonitoringMap
            workers={mapWorkers}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />
        </div>

        {/* Sidebar */}
        <MonitoringSidebar
          workers={filteredWorkers}
          areaSummaries={filteredAreaSummaries}
          selectedId={selectedId}
          onSelect={setSelectedId}
          className="h-[60vh] lg:h-[calc(100vh_-_15rem)] lg:min-h-[28rem] lg:w-80 lg:flex-shrink-0"
        />
      </div>
    </div>
  );
}
