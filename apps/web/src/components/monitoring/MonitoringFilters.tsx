'use client';

/**
 * MonitoringFilters — filter rail for the monitoring page (mobile parity).
 * 3-status toggle chips with live counts, then a cascading set of type-to-search,
 * lazily-rendered comboboxes: Rayon → Kawasan → Lokasi, plus Peran + Tim, and a
 * Petugas picker that cascades from everything above. Purely client-side over the
 * snapshot worker list. Controlled by the page.
 */
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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

const STATUS_ORDER: TrackingStatus[] = ['active', 'offline', 'absent'];

export interface MonitoringFilterState {
  search: string;
  statuses: Set<TrackingStatus>;
  rayonId: string; // 'all' or a rayon id
  regionId: string; // 'all' or a kawasan (region) id
  locationId: string; // 'all' or a lokasi (location) id
  jenis: 'individu' | 'team'; // assignment type — decides role vs team sub-filter
  role: string; // 'all' or a role value (only used when jenis = individu)
  teamId: string; // 'all' or a team id (only used when jenis = team)
}

export interface RayonOption {
  id: string;
  name: string;
}

/** A selectable id/name option (kawasan, lokasi, team, worker, …). */
export type FilterOption = RayonOption;

export interface MonitoringFiltersProps {
  filters: MonitoringFilterState;
  onChange: (next: MonitoringFilterState) => void;
  rayonOptions: RayonOption[];
  regionOptions: FilterOption[];
  locationOptions: FilterOption[];
  /** Kawasan/Lokasi options are fetched on rayon change — show a loading hint
   *  instead of the "no kawasan" empty state while they resolve. */
  regionLoading?: boolean;
  locationLoading?: boolean;
  roleOptions: UserRole[];
  teamOptions: FilterOption[];
  total: number;
  matched: number;
  /** Hide the built-in search field (when search lives elsewhere, e.g. a top overlay). */
  showSearch?: boolean;
  className?: string;
}

const toComboOptions = (opts: FilterOption[]): ComboboxOption[] =>
  opts.map((o) => ({ value: o.id, label: o.name }));

/** Labelled wrapper for a filter control. */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-nb-gray-500" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function MonitoringFilters({
  filters,
  onChange,
  rayonOptions,
  regionOptions,
  locationOptions,
  regionLoading = false,
  locationLoading = false,
  roleOptions,
  teamOptions,
  total,
  matched,
  showSearch = true,
  className,
}: MonitoringFiltersProps) {
  const { t } = useTranslation();
  const statusLabels = getStatusLabels();
  const searchPh = t('common:ui.combobox.searchPlaceholder');
  const noResults = t('common:ui.combobox.noResults');

  // Cascade gating: Kawasan + Lokasi stay disabled until a rayon is chosen.
  // Kawasan is also disabled for a rayon that has none (e.g. Taman Aktif).
  const rayonPicked = filters.rayonId !== 'all';
  const regionDisabled = !rayonPicked || regionLoading || regionOptions.length === 0;
  const locationDisabled = !rayonPicked || locationLoading || locationOptions.length === 0;

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
    filters.regionId !== 'all' ||
    filters.locationId !== 'all' ||
    filters.jenis !== 'individu' ||
    filters.role !== 'all' ||
    filters.teamId !== 'all';

  const reset = () =>
    onChange({
      search: '',
      statuses: new Set(),
      rayonId: 'all',
      regionId: 'all',
      locationId: 'all',
      jenis: 'individu',
      role: 'all',
      teamId: 'all',
    });

  const regionPlaceholder = !rayonPicked
    ? t('monitoring:filters.pickRayonFirst')
    : regionLoading
      ? t('common:actions.loading')
      : regionOptions.length === 0
        ? t('monitoring:filters.noKawasan')
        : t('monitoring:filters.kawasanAllOption');
  const locationPlaceholder = !rayonPicked
    ? t('monitoring:filters.pickRayonFirst')
    : locationLoading
      ? t('common:actions.loading')
      : t('monitoring:filters.lokasiAllOption');

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Search */}
      {showSearch && (
        <Field label={t('monitoring:filters.label')} htmlFor="mon-search">
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
        </Field>
      )}

      {/* Status chips */}
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold uppercase text-nb-gray-500">
          {t('monitoring:filters.statusLabel')}
        </legend>
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
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Rayon */}
      {rayonOptions.length > 0 && (
        <Field label={t('monitoring:filters.rayonLabel')} htmlFor="mon-rayon">
          <Combobox
            id="mon-rayon"
            options={toComboOptions(rayonOptions)}
            value={filters.rayonId === 'all' ? '' : filters.rayonId}
            onValueChange={(v) => onChange({ ...filters, rayonId: v || 'all', regionId: 'all', locationId: 'all' })}
            placeholder={t('monitoring:filters.rayonAllOption')}
            searchPlaceholder={searchPh}
            emptyText={noResults}
            clearable
          />
        </Field>
      )}

      {/* Kawasan — cascades from Rayon (disabled until one is picked; a rayon
          without kawasan, e.g. Taman Aktif, keeps it disabled with a hint). */}
      {rayonOptions.length > 0 && (
        <Field label={t('monitoring:filters.kawasanLabel')} htmlFor="mon-region">
          <Combobox
            id="mon-region"
            options={toComboOptions(regionOptions)}
            value={filters.regionId === 'all' ? '' : filters.regionId}
            onValueChange={(v) => onChange({ ...filters, regionId: v || 'all', locationId: 'all' })}
            placeholder={regionPlaceholder}
            searchPlaceholder={searchPh}
            emptyText={noResults}
            disabled={regionDisabled}
            clearable
          />
        </Field>
      )}

      {/* Lokasi — cascades from Rayon (+ Kawasan when one is picked). */}
      {rayonOptions.length > 0 && (
        <Field label={t('monitoring:filters.lokasiLabel')} htmlFor="mon-location">
          <Combobox
            id="mon-location"
            options={toComboOptions(locationOptions)}
            value={filters.locationId === 'all' ? '' : filters.locationId}
            onValueChange={(v) => onChange({ ...filters, locationId: v || 'all' })}
            placeholder={locationPlaceholder}
            searchPlaceholder={searchPh}
            emptyText={noResults}
            disabled={locationDisabled}
            clearable
          />
        </Field>
      )}

      {/* Jenis — Individu vs Tim. Individu reveals the Peran (role) filter; Tim
          reveals the Jenis Tim (team) filter and scopes to team-assigned workers.
          Switching resets the other axis so they never both apply. */}
      <Field label={t('monitoring:filters.jenisLabel')} htmlFor="mon-jenis">
        <div id="mon-jenis" className="flex rounded-nb-base border-2 border-nb-black p-0.5" role="group">
          {(['individu', 'team'] as const).map((j) => (
            <button
              key={j}
              type="button"
              aria-pressed={filters.jenis === j}
              onClick={() =>
                onChange({ ...filters, jenis: j, role: 'all', teamId: 'all' })
              }
              className={cn(
                'flex-1 rounded-nb-sm px-2 py-1.5 text-sm font-bold transition-colors',
                filters.jenis === j
                  ? 'bg-nb-gray-900 text-nb-white'
                  : 'bg-nb-white text-nb-gray-700 hover:bg-nb-gray-50'
              )}
            >
              {t(`monitoring:filters.jenis.${j}`)}
            </button>
          ))}
        </div>
      </Field>

      {/* Individu → Peran (role) */}
      {filters.jenis === 'individu' && roleOptions.length > 0 && (
        <Field label={t('monitoring:filters.roleLabel')} htmlFor="mon-role">
          <Combobox
            id="mon-role"
            options={roleOptions.map((r) => ({ value: r, label: roleLabel(r) }))}
            value={filters.role === 'all' ? '' : filters.role}
            onValueChange={(v) => onChange({ ...filters, role: v || 'all' })}
            placeholder={t('monitoring:filters.roleAllOption')}
            searchPlaceholder={searchPh}
            emptyText={noResults}
            clearable
          />
        </Field>
      )}

      {/* Tim → Jenis Tim (team category) */}
      {filters.jenis === 'team' && (
        <Field label={t('monitoring:filters.timLabel')} htmlFor="mon-team">
          <Combobox
            id="mon-team"
            options={toComboOptions(teamOptions)}
            value={filters.teamId === 'all' ? '' : filters.teamId}
            onValueChange={(v) => onChange({ ...filters, teamId: v || 'all' })}
            placeholder={t('monitoring:filters.timAllOption')}
            searchPlaceholder={searchPh}
            emptyText={noResults}
            clearable
          />
        </Field>
      )}

      {/* Footer: match count + reset */}
      <div className="flex items-center justify-between border-t-2 border-nb-gray-200 pt-3 text-xs text-nb-gray-500">
        <span aria-live="polite">{t('monitoring:filters.matchSummary', { matched, total })}</span>
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
