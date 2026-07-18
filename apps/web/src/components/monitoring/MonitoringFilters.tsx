'use client';

/**
 * MonitoringFilters — filter rail for the monitoring page (mobile parity).
 * Search by name, 5-status toggle chips with live counts, rayon + role selects.
 * Purely client-side over the snapshot worker list. Controlled by the page.
 */
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { getStatusLabels } from '@/lib/constants/monitoring';
import { roleLabel } from '@/lib/constants/roles';
import type { TrackingStatus } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

const STATUS_VAR: Record<TrackingStatus, string> = {
  active: 'var(--color-status-active)',
  offline: 'var(--color-status-idle)',
  absent: 'var(--color-status-missing)',
};

const STATUS_ORDER: TrackingStatus[] = [
  'active',
  'offline',
  'absent',
];

export interface MonitoringFilterState {
  search: string;
  statuses: Set<TrackingStatus>;
  rayonId: string; // 'all' or a rayon id
  areaId: string; // 'all' or a lokasi (area) id
  role: string; // 'all' or a role value
  teamId: string; // 'all' or a team id
}

export interface RayonOption {
  id: string;
  name: string;
}

/** A selectable id/name option (lokasi, team, …). */
export type FilterOption = RayonOption;

export interface MonitoringFiltersProps {
  filters: MonitoringFilterState;
  onChange: (next: MonitoringFilterState) => void;
  statusCounts: Record<TrackingStatus, number>;
  rayonOptions: RayonOption[];
  areaOptions: FilterOption[];
  roleOptions: UserRole[];
  teamOptions: FilterOption[];
  total: number;
  matched: number;
  /** Hide the built-in search field (when search lives elsewhere, e.g. a top overlay). */
  showSearch?: boolean;
  className?: string;
}

export function MonitoringFilters({
  filters,
  onChange,
  statusCounts,
  rayonOptions,
  areaOptions,
  roleOptions,
  teamOptions,
  total,
  matched,
  showSearch = true,
  className,
}: MonitoringFiltersProps) {
  const { t } = useTranslation();
  const statusLabels = getStatusLabels();

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
    filters.areaId !== 'all' ||
    filters.role !== 'all' ||
    filters.teamId !== 'all';

  const reset = () =>
    onChange({
      search: '',
      statuses: new Set(),
      rayonId: 'all',
      areaId: 'all',
      role: 'all',
      teamId: 'all',
    });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Search */}
      {showSearch && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-search">
            {t('monitoring:filters.label')}
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
              placeholder={t('monitoring:filters.placeholder')}
              className="pl-8"
            />
          </div>
        </div>
      )}

      {/* Status chips */}
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold uppercase text-nb-gray-500">{t('monitoring:filters.statusLabel')}</legend>
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
                {statusLabels[status]}
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
            {t('monitoring:filters.rayonLabel')}
          </label>
          <select
            id="mon-rayon"
            value={filters.rayonId}
            onChange={(e) => onChange({ ...filters, rayonId: e.target.value, areaId: 'all' })}
            className="w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-2 text-sm font-medium text-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
          >
            <option value="all">{t('monitoring:filters.rayonAllOption')}</option>
            {rayonOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lokasi (area) */}
      {areaOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-area">
            {t('monitoring:filters.lokasiLabel')}
          </label>
          <select
            id="mon-area"
            value={filters.areaId}
            onChange={(e) => onChange({ ...filters, areaId: e.target.value })}
            className="w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-2 text-sm font-medium text-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
          >
            <option value="all">{t('monitoring:filters.lokasiAllOption')}</option>
            {areaOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Role */}
      {roleOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-role">
            {t('monitoring:filters.roleLabel')}
          </label>
          <select
            id="mon-role"
            value={filters.role}
            onChange={(e) => onChange({ ...filters, role: e.target.value })}
            className="w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-2 text-sm font-medium text-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
          >
            <option value="all">{t('monitoring:filters.roleAllOption')}</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tim (team) */}
      {teamOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor="mon-team">
            {t('monitoring:filters.timLabel')}
          </label>
          <select
            id="mon-team"
            value={filters.teamId}
            onChange={(e) => onChange({ ...filters, teamId: e.target.value })}
            className="w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-2.5 py-2 text-sm font-medium text-nb-black focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
          >
            <option value="all">{t('monitoring:filters.timAllOption')}</option>
            {teamOptions.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Footer: match count + reset */}
      <div className="flex items-center justify-between border-t-2 border-nb-gray-200 pt-3 text-xs text-nb-gray-500">
        <span aria-live="polite">
          {t('monitoring:filters.matchSummary', { matched, total })}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 font-semibold text-nb-gray-600 hover:text-nb-black"
          >
            <X className="h-3.5 w-3.5" />
            {t('monitoring:filters.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
