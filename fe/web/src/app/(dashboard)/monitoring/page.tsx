/**
 * Monitoring (Phase 4-R)
 *
 * Real-time worker monitoring, mobile-aligned. Full-bleed map with floating
 * overlays: a search bar pinned over the top, a dismissible filter panel, and a
 * dismissible worker/area sheet — so the map is always fully viewable.
 * Rayon + area boundaries render from `/monitoring/boundaries` regardless of
 * live workers; worker pins come from the role-scoped `/monitoring/snapshot`.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, RefreshCw, X, List, ChevronDown } from 'lucide-react';

import { useAuth } from '@/lib/auth/hooks';
import { useMonitoringSnapshot } from '@/lib/api/monitoring-v2';
import { useBoundaries } from '@/lib/api/monitoring';
import {
  MonitoringFilters,
  type MonitoringFilterState,
  type RayonOption,
} from '@/components/monitoring/MonitoringFilters';
import { MonitoringSidebar } from '@/components/monitoring/MonitoringSidebar';
import { BulkReassignModal } from '@/components/monitoring/BulkReassignModal';
import {
  SimpleMonitoringMap,
  type SimpleWorker,
} from '@/components/monitoring/SimpleMonitoringMap';
import type { SnapshotAreaSummary } from '@/lib/api/monitoring-v2';
import { MONITORING_ROLES, REASSIGN_ROLES, hasRole } from '@/lib/constants/roles';
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

const STATUS_PILLS: { key: TrackingStatus; label: string; color: string }[] = [
  { key: 'active', label: 'Aktif', color: 'var(--color-status-active)' },
  { key: 'inactive', label: 'Idle', color: 'var(--color-status-idle)' },
  { key: 'outside_area', label: 'Luar', color: 'var(--color-status-outside)' },
  { key: 'missing', label: 'Hilang', color: 'var(--color-status-missing)' },
  { key: 'offline', label: 'Offline', color: 'var(--color-status-offline)' },
];

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<SnapshotAreaSummary | null>(null);

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

  const canMonitor = !!user && hasRole(user.role as UserRole, MONITORING_ROLES);
  const canReassign = !!user && hasRole(user.role as UserRole, REASSIGN_ROLES);
  const { data, isLoading, refetch } = useMonitoringSnapshot(scope, scopeId);
  const { data: boundaries } = useBoundaries(canMonitor);

  useEffect(() => {
    if (!authLoading && user && !canMonitor) router.push('/');
  }, [user, authLoading, canMonitor, router]);

  // Selecting a worker (from the map or the list) also reveals the sheet.
  const selectWorker = (id: string | null) => {
    setSelectedId(id);
    if (id) setListOpen(true);
  };

  const allWorkers = useMemo(() => data?.data?.workers ?? [], [data]);
  const areaSummaries = useMemo(() => data?.data?.area_summaries ?? [], [data]);

  const statusCounts = useMemo(() => {
    const counts = { ...EMPTY_STATUS_COUNTS };
    for (const w of allWorkers) {
      const s = w.status as TrackingStatus;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [allWorkers]);

  const rayonOptions = useMemo<RayonOption[]>(() => {
    const map = new Map<string, string>();
    for (const w of allWorkers) {
      if (w.rayon_id && w.rayon_name && !map.has(w.rayon_id)) map.set(w.rayon_id, w.rayon_name);
    }
    // Fall back to boundary rayons when no live workers yet.
    if (map.size === 0 && boundaries?.rayons) {
      for (const r of boundaries.rayons) if (!map.has(r.id)) map.set(r.id, r.name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allWorkers, boundaries]);

  const roleOptions = useMemo<UserRole[]>(() => {
    const set = new Set<string>();
    for (const w of allWorkers) set.add(w.role);
    return [...set] as UserRole[];
  }, [allWorkers]);

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

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-nb-gray-600">Memuat...</div>
    );
  }

  if (!canMonitor) return null;

  const updatedLabel = isLoading
    ? 'Memuat…'
    : data?.data?.generated_at
      ? `Diperbarui ${formatTime(data.data.generated_at)}`
      : 'Tidak ada data';

  return (
    <div className="relative h-[calc(100dvh_-_7rem)] min-h-[28rem] w-full overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-gray-100">
      {/* Map (base layer) */}
      <SimpleMonitoringMap
        workers={mapWorkers}
        boundaries={boundaries ?? null}
        selectedId={selectedId}
        onSelect={selectWorker}
      />

      {/* Top overlay: search + filter + refresh + status pills */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nb-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Cari petugas…"
              aria-label="Cari petugas"
              className="h-11 w-full rounded-nb-base border-2 border-nb-black bg-nb-white pl-9 pr-3 text-sm font-medium text-nb-black shadow-nb-sm placeholder:text-nb-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
            />
          </div>
          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label="Filter"
            className={cn(
              'flex h-11 items-center gap-1.5 rounded-nb-base border-2 border-nb-black px-3 text-sm font-bold shadow-nb-sm transition-colors',
              filtersOpen ? 'bg-nb-primary text-nb-black' : 'bg-nb-white text-nb-black hover:bg-nb-gray-50'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          {/* Refresh */}
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Segarkan"
            className="flex h-11 w-11 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-sm transition-colors hover:bg-nb-gray-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Status pills */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5" aria-live="polite">
          {STATUS_PILLS.map((p) => (
            <span
              key={p.key}
              className="flex items-center gap-1.5 rounded-nb-base border-2 border-nb-black bg-nb-white/95 px-2 py-1 text-xs font-semibold text-nb-gray-700 shadow-nb-xs backdrop-blur-sm"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
              {p.label}
              <span className="font-mono tabular-nums text-nb-black">{statusCounts[p.key]}</span>
            </span>
          ))}
          <span className="rounded-nb-base bg-nb-white/95 px-2 py-1 text-xs text-nb-gray-500 shadow-nb-xs backdrop-blur-sm">
            {updatedLabel}
          </span>
        </div>
      </div>

      {/* Filter panel (floating, dismissible) */}
      {filtersOpen && (
        <div className="absolute left-3 right-3 top-28 z-30 max-h-[60%] w-auto overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white p-4 shadow-nb-lg sm:right-auto sm:w-80">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-nb-black">Filter Petugas</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Tutup filter"
              className="rounded-nb-sm p-1 text-nb-gray-500 hover:bg-nb-gray-100 hover:text-nb-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <MonitoringFilters
            filters={filters}
            onChange={setFilters}
            statusCounts={statusCounts}
            rayonOptions={rayonOptions}
            roleOptions={roleOptions}
            total={allWorkers.length}
            matched={filteredWorkers.length}
            showSearch={false}
          />
        </div>
      )}

      {/* Worker/area sheet (floating, dismissible) */}
      {listOpen ? (
        <div className="absolute inset-x-3 bottom-3 z-20 flex h-[45vh] max-h-[60%] flex-col sm:inset-x-auto sm:left-3 sm:w-96">
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-1 text-xs font-bold text-nb-black shadow-nb-xs">
              Daftar Petugas
            </span>
            <button
              type="button"
              onClick={() => {
                setListOpen(false);
                setSelectedId(null);
              }}
              aria-label="Tutup daftar"
              className="flex h-8 w-8 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white text-nb-black shadow-nb-xs hover:bg-nb-gray-50"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <MonitoringSidebar
            workers={filteredWorkers}
            areaSummaries={filteredAreaSummaries}
            selectedId={selectedId}
            onSelect={selectWorker}
            onBulkReassign={canReassign ? setBulkTarget : undefined}
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
          Daftar Petugas
          <span className="rounded-full bg-nb-black px-1.5 font-mono text-xs text-nb-primary">
            {filteredWorkers.length}
          </span>
        </button>
      )}

      {/* Bulk reassign modal (Phase 4-4) */}
      {canReassign && bulkTarget && (
        <BulkReassignModal
          open={!!bulkTarget}
          onOpenChange={(open) => {
            if (!open) setBulkTarget(null);
          }}
          targetAreaId={bulkTarget.area_id}
          targetAreaName={bulkTarget.area_name}
          boundaries={boundaries}
        />
      )}
    </div>
  );
}
