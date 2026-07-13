'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { parse, isValid, format, type Locale } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { Button, DateRangePicker, type DateRangeValue } from '@/components/ui';
import { CalendarFilters } from '@/components/schedules/CalendarFilters';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useTeamCategories } from '@/lib/api/teams';
import type { ScheduleRangeFilters } from '@/lib/api/schedule-events';

interface ScheduleSearchProps {
  filters: ScheduleRangeFilters;
  onChange: (next: ScheduleRangeFilters) => void;
  /** Jump the board to a specific WIB day (from a date search). */
  onNavigateDate: (isoDate: string) => void;
  /** Rayon-scoped roles can't change rayon. */
  lockRayon?: boolean;
}

type Hit =
  | { kind: 'user' | 'location' | 'region' | 'rayon'; id: string; label: string; meta?: string }
  | { kind: 'date'; iso: string; label: string; meta?: string };

const MAX_PER_GROUP = 5;

/** Try to read a date out of the query (ISO or a few day-month formats). */
function parseQueryDate(query: string, locale: Locale): string | null {
  const q = query.trim();
  if (!q) return null;
  const year = new Date().getFullYear();
  const candidates: Array<{ fmt: string; base?: Date }> = [
    { fmt: 'yyyy-MM-dd' },
    { fmt: 'd/M/yyyy' },
    { fmt: 'd-M-yyyy' },
    { fmt: 'd MMMM yyyy' },
    { fmt: 'd MMM yyyy' },
    { fmt: 'd MMMM', base: new Date(year, 0, 1) },
    { fmt: 'd MMM', base: new Date(year, 0, 1) },
    { fmt: 'd/M', base: new Date(year, 0, 1) },
  ];
  for (const c of candidates) {
    const d = parse(q, c.fmt, c.base ?? new Date(year, 0, 1), { locale });
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

/**
 * Google-Calendar-style search that replaces the filter row: instant grouped
 * autocomplete (petugas / lokasi / kawasan / rayon / tanggal), an Advanced panel
 * (the structured filters), and removable chips for the active slice.
 */
export function ScheduleSearch({
  filters,
  onChange,
  onNavigateDate,
  lockRayon,
}: ScheduleSearchProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const { data: usersResp } = useUsers({ limit: 1000 });
  const { data: rayons = [] } = useRayons();
  const { data: regions = [] } = useRegions();
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: teamCategories = [] } = useTeamCategories();

  const users = useMemo(() => usersResp?.data ?? [], [usersResp]);
  const locations = useMemo(() => locationsResp?.data ?? [], [locationsResp]);
  const locale = dateFnsLocale();

  // Name lookups for chips.
  const nameOf = useMemo(() => {
    const m = {
      user: new Map(users.map((u) => [u.id, u.full_name])),
      rayon: new Map(rayons.map((r) => [r.id, r.name])),
      region: new Map(regions.map((r) => [r.id, r.name])),
      location: new Map(locations.map((l) => [l.id, l.name])),
      shift: new Map(shifts.map((s) => [s.id, s.name])),
      category: new Map(teamCategories.map((c) => [c.id, c.name])),
    };
    return m;
  }, [users, rayons, regions, locations, shifts, teamCategories]);

  const q = query.trim().toLowerCase();
  const hits = useMemo<Hit[]>(() => {
    if (!q) return [];
    const match = (s: string) => s.toLowerCase().includes(q);
    const out: Hit[] = [];
    users
      .filter((u) => match(u.full_name) || match(u.username))
      .slice(0, MAX_PER_GROUP)
      .forEach((u) => out.push({ kind: 'user', id: u.id, label: u.full_name, meta: u.role }));
    locations
      .filter((l) => match(l.name))
      .slice(0, MAX_PER_GROUP)
      .forEach((l) => out.push({ kind: 'location', id: l.id, label: l.name }));
    regions
      .filter((r) => match(r.name))
      .slice(0, MAX_PER_GROUP)
      .forEach((r) => out.push({ kind: 'region', id: r.id, label: r.name }));
    rayons
      .filter((r) => match(r.name))
      .slice(0, MAX_PER_GROUP)
      .forEach((r) => out.push({ kind: 'rayon', id: r.id, label: r.name }));
    const iso = parseQueryDate(query, locale);
    if (iso) {
      out.push({
        kind: 'date',
        iso,
        label: format(new Date(`${iso}T00:00:00`), 'EEEE, d MMMM yyyy', { locale }),
      });
    }
    return out;
  }, [q, query, users, locations, regions, rayons, locale]);

  const grouped = useMemo(() => {
    const g: Record<string, Hit[]> = {};
    for (const h of hits) (g[h.kind] ??= []).push(h);
    return g;
  }, [hits]);

  const pick = (hit: Hit) => {
    setQuery('');
    setFocused(false);
    if (hit.kind === 'date') return onNavigateDate(hit.iso);
    const key = { user: 'userId', location: 'locationId', region: 'regionId', rayon: 'rayonId' }[
      hit.kind
    ] as keyof ScheduleRangeFilters;
    onChange({ ...filters, [key]: hit.id });
  };

  // Active chips (skip rayon when locked — it's pinned server-side).
  const chips = useMemo(() => {
    const c: Array<{ key: keyof ScheduleRangeFilters; label: string }> = [];
    const add = (key: keyof ScheduleRangeFilters, prefix: string, name?: string) => {
      if (filters[key] && name) c.push({ key, label: `${prefix}: ${name}` });
    };
    add('userId', t('schedules:filters.userLabel'), nameOf.user.get(filters.userId ?? ''));
    if (!lockRayon)
      add('rayonId', t('schedules:filters.rayonLabel'), nameOf.rayon.get(filters.rayonId ?? ''));
    add('regionId', t('schedules:filters.regionLabel'), nameOf.region.get(filters.regionId ?? ''));
    add(
      'locationId',
      t('schedules:filters.locationLabel'),
      nameOf.location.get(filters.locationId ?? '')
    );
    add(
      'shiftDefinitionId',
      t('schedules:filters.shiftLabel'),
      nameOf.shift.get(filters.shiftDefinitionId ?? '')
    );
    add(
      'teamCategoryId',
      t('schedules:filters.teamCategoryLabel'),
      nameOf.category.get(filters.teamCategoryId ?? '')
    );
    return c;
  }, [filters, nameOf, lockRayon, t]);

  const removeChip = (key: keyof ScheduleRangeFilters) =>
    onChange({ ...filters, [key]: undefined });

  const groupLabel: Record<string, string> = {
    user: t('schedules:filters.userLabel'),
    location: t('schedules:filters.locationLabel'),
    region: t('schedules:filters.regionLabel'),
    rayon: t('schedules:filters.rayonLabel'),
    date: t('schedules:search.groupDate'),
  };

  const [range, setRange] = useState<DateRangeValue | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="relative min-w-[240px] flex-1">
          <div className="flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white px-3 shadow-nb-sm focus-within:outline focus-within:outline-[3px] focus-within:outline-nb-primary">
            <Search className="size-4 shrink-0 text-nb-gray-500" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder={t('schedules:search.placeholder')}
              className="min-h-touch w-full bg-transparent py-2 text-nb-body-sm font-medium outline-none placeholder:text-nb-gray-500"
              aria-label={t('schedules:search.placeholder')}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="shrink-0 text-nb-gray-500 hover:text-nb-black"
                aria-label={t('common:actions.clear', 'Clear')}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {focused && q.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-lg">
              {hits.length === 0 ? (
                <p className="px-3 py-4 text-center text-nb-body-sm text-nb-gray-500">
                  {t('schedules:search.noResults', { q: query })}
                </p>
              ) : (
                Object.entries(grouped).map(([kind, list]) => (
                  <div key={kind}>
                    <p className="bg-nb-gray-50 px-3 py-1 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                      {groupLabel[kind]}
                    </p>
                    {list.map((hit) => (
                      <button
                        key={hit.kind === 'date' ? hit.iso : hit.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(hit)}
                        className="flex w-full items-center gap-2 border-t border-nb-black px-3 py-2 text-left text-nb-body-sm hover:bg-nb-gray-50"
                      >
                        <span className="truncate font-medium">{hit.label}</span>
                        {'meta' in hit && hit.meta && (
                          <span className="ml-auto shrink-0 text-nb-caption text-nb-gray-500">
                            {hit.meta}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Button
          variant={advanced ? 'default' : 'outline'}
          leftIcon={<SlidersHorizontal className="size-4" />}
          onClick={() => setAdvanced((v) => !v)}
        >
          {t('schedules:search.advanced')}
        </Button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeChip(chip.key)}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-nb-black bg-nb-primary px-2.5 py-0.5 text-nb-caption font-bold text-white shadow-nb-sm hover:bg-nb-primary-hover"
            >
              {chip.label}
              <X className="size-3" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({})}
            className="text-nb-caption font-bold text-nb-gray-500 underline hover:text-nb-black"
          >
            {t('schedules:filters.clear')}
          </button>
        </div>
      )}

      {advanced && (
        <div className="flex flex-col gap-3 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-3">
          <CalendarFilters value={filters} onChange={onChange} lockRayon={lockRayon} />
          <div className="max-w-xs">
            <span className="mb-1 block text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
              {t('schedules:search.dateRangeLabel')}
            </span>
            <DateRangePicker
              value={range ?? { from: '', to: '' }}
              onChange={(r) => {
                setRange(r);
                if (r.from) onNavigateDate(r.from);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
