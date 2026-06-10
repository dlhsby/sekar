'use client';

/**
 * MonitoringFilters — filter rail for the monitoring page (mobile parity).
 * Search by name, 5-status toggle chips with live counts, rayon + role selects.
 * Purely client-side over the snapshot worker list. Controlled by the page.
 */
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { STATUS_LABELS } from '@/lib/constants/monitoring';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

const STATUS_VAR: Record<TrackingStatus, string> = {
  active: 'var(--color-status-active)',
  inactive: 'var(--color-status-idle)',
  outside_area: 'var(--color-status-outside)',
  missing: 'var(--color-status-missing)',
  offline: 'var(--color-status-offline)',
};

const STATUS_ORDER: TrackingStatus[] = [
  'active',
  'inactive',
  'outside_area',
  'missing',
  'offline',
];

export interface MonitoringFilterState {
  search: string;
  statuses: Set<TrackingStatus>;
  rayonId: string; // 'all' or a rayon id
  role: string; // 'all' or a role value
}

export interface RayonOption {
  id: string;
  name: string;
}

export interface MonitoringFiltersProps {
  filters: MonitoringFilterState;
  onChange: (next: MonitoringFilterState) => void;
  statusCounts: Record<TrackingStatus, number>;
  rayonOptions: RayonOption[];
  roleOptions: UserRole[];
  total: number;
  matched: number;
  className?: string;
}

export function MonitoringFilters({
  filters,
  onChange,
  statusCounts,
  rayonOptions,
  roleOptions,
  total,
  matched,
  className,
}: MonitoringFiltersProps) {
  const toggleStatus = (status: TrackingStatus) => {
    const next = new Set(filters.statuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    onChange({ ...filters, statuses: next });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.statuses.size > 0 ||
    filters.rayonId !== 'all' ||
    filters.role !== 'all';

  const reset = () =>
    onChange({ search: '', statuses: new Set(), rayonId: 'all', role: 'all' });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Search */}
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-search">
          Cari Petugas
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nb-gray-400"
            aria-hidden="true"
          />
          <Input
            id="mon-search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Nama petugas…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Status chips */}
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold uppercase text-nb-gray-500">Status</legend>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((status) => {
            const active = filters.statuses.has(status);
            const color = STATUS_VAR[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-1.5 rounded-nb-base border-2 px-2 py-1 text-xs font-semibold transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary',
                  active ? 'bg-nb-gray-900 text-nb-white' : 'bg-nb-white text-nb-gray-700 hover:bg-nb-gray-50'
                )}
                style={{ borderColor: color }}
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {STATUS_LABELS[status]}
                <span className="font-mono tabular-nums opacity-70">{statusCounts[status] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Rayon */}
      {rayonOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-rayon">
            Rayon
          </label>
          <select
            id="mon-rayon"
            value={filters.rayonId}
            onChange={(e) => onChange({ ...filters, rayonId: e.target.value })}
            className="w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-2 text-sm font-medium text-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
          >
            <option value="all">Semua Rayon</option>
            {rayonOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Role */}
      {roleOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-role">
            Peran
          </label>
          <select
            id="mon-role"
            value={filters.role}
            onChange={(e) => onChange({ ...filters, role: e.target.value })}
            className="w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-2 text-sm font-medium text-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
          >
            <option value="all">Semua Peran</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role] ?? role}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Footer: match count + reset */}
      <div className="flex items-center justify-between border-t-2 border-nb-gray-200 pt-3 text-xs text-nb-gray-500">
        <span aria-live="polite">
          <strong className="text-nb-black">{matched}</strong> / {total} petugas
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 font-semibold text-nb-gray-600 hover:text-nb-black"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
