'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { parse, isValid, format, type Locale } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { useUsers } from '@/lib/api/users';
import { useDistricts } from '@/lib/api/districts';
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
  lockDistrict?: boolean;
}

type Hit =
  | {
      kind: 'user' | 'location' | 'region' | 'district' | 'shift' | 'team';
      id: string;
      label: string;
      meta?: string;
    }
  | { kind: 'date'; iso: string; label: string; meta?: string };

const MAX_PER_GROUP = 5;

/** Each hit kind sets exactly one criterion; several criteria AND together. */
const FILTER_KEY: Record<Exclude<Hit['kind'], 'date'>, keyof ScheduleRangeFilters> = {
  user: 'userId',
  location: 'locationId',
  region: 'regionId',
  district: 'districtId',
  shift: 'shiftDefinitionId',
  team: 'teamCategoryId',
};

/** Group render order — people first, then geography narrowing outward. */
const GROUP_ORDER: Hit['kind'][] = ['user', 'location', 'region', 'district', 'shift', 'team', 'date'];

/** Try to read a date out of the query (ISO or a few day-month formats). */
function parseQueryDate(query: string, locale: Locale): string | null {
  const q = query.trim();
  if (!q) return null;
  const year = new Date().getFullYear();
  const base = new Date(year, 0, 1);
  const formats = [
    'yyyy-MM-dd',
    'd/M/yyyy',
    'd-M-yyyy',
    'd MMMM yyyy',
    'd MMM yyyy',
    'd MMMM',
    'd MMM',
    'd/M',
  ];
  for (const fmt of formats) {
    const d = parse(q, fmt, base, { locale });
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

/**
 * Search: a collapsed icon that expands into a bar with grouped autocomplete.
 * Picking a hit adds one criterion; several AND together and render as removable
 * chips below the toolbar (`ScheduleFilterChips`) — the chips ARE the
 * multi-criteria UI, which is why the old "Lanjutan" panel is gone: it was a
 * second control surface for the same six filters, duplicating the cascade state
 * and hiding the shift/team filters behind a chevron. They're groups here now.
 */
export function ScheduleSearch({
  filters,
  onChange,
  onNavigateDate,
  lockDistrict,
}: ScheduleSearchProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: usersResp } = useUsers({ limit: 1000 });
  const { data: districts = [] } = useDistricts();
  const { data: regions = [] } = useRegions();
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: teamCategories = [] } = useTeamCategories();

  const users = useMemo(() => usersResp?.data ?? [], [usersResp]);
  const locations = useMemo(() => locationsResp?.data ?? [], [locationsResp]);
  const locale = dateFnsLocale();

  const collapse = () => {
    setExpanded(false);
    setQuery('');
  };

  // Focus the input when the bar opens.
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Collapse on an outside click.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) collapse();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded]);

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
    if (!lockDistrict) {
      districts
        .filter((r) => match(r.name))
        .slice(0, MAX_PER_GROUP)
        .forEach((r) => out.push({ kind: 'district', id: r.id, label: r.name }));
    }
    shifts
      .filter((s) => match(s.name))
      .slice(0, MAX_PER_GROUP)
      .forEach((s) => out.push({ kind: 'shift', id: s.id, label: s.name }));
    teamCategories
      .filter((c) => match(c.name))
      .slice(0, MAX_PER_GROUP)
      .forEach((c) => out.push({ kind: 'team', id: c.id, label: c.name }));
    const iso = parseQueryDate(query, locale);
    if (iso) {
      out.push({
        kind: 'date',
        iso,
        label: format(new Date(`${iso}T00:00:00`), 'EEEE, d MMMM yyyy', { locale }),
      });
    }
    return out;
  }, [q, query, users, locations, regions, districts, shifts, teamCategories, locale, lockDistrict]);

  const grouped = useMemo(() => {
    const g: Record<string, Hit[]> = {};
    for (const h of hits) (g[h.kind] ??= []).push(h);
    return GROUP_ORDER.filter((k) => g[k]?.length).map((k) => [k, g[k]] as const);
  }, [hits]);

  const pick = (hit: Hit) => {
    collapse();
    if (hit.kind === 'date') return onNavigateDate(hit.iso);
    onChange({ ...filters, [FILTER_KEY[hit.kind]]: hit.id });
  };

  const groupLabel: Record<string, string> = {
    user: t('schedules:filters.userLabel'),
    location: t('schedules:filters.locationLabel'),
    region: t('schedules:filters.regionLabel'),
    district: t('schedules:filters.districtLabel'),
    shift: t('schedules:filters.shiftLabel'),
    team: t('schedules:filters.teamCategoryLabel'),
    date: t('schedules:search.groupDate'),
  };

  const placeholder = t('schedules:search.placeholder');

  return (
    <div ref={rootRef} className="flex items-center">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={placeholder}
          className="grid size-10 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm hover:bg-nb-gray-50"
        >
          <Search className="size-4" />
        </button>
      ) : (
        // Active search covers the whole toolbar row (parent is relative),
        // hiding the other actions — Google-Calendar style.
        <div className="absolute inset-0 z-30 flex items-center bg-nb-background">
          <div className="relative w-full">
            <div className="flex items-center gap-2 rounded-nb-base border-2 border-nb-black bg-nb-white px-3 shadow-nb-sm focus-within:outline focus-within:outline-[3px] focus-within:outline-nb-primary">
              <Search className="size-4 shrink-0 text-nb-gray-500" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && collapse()}
                placeholder={placeholder}
                className="min-h-touch w-full bg-transparent py-2 text-nb-body-sm font-medium outline-none placeholder:text-nb-gray-500"
                aria-label={placeholder}
              />
              <button
                type="button"
                onClick={() => (query ? setQuery('') : collapse())}
                className="shrink-0 text-nb-gray-500 hover:text-nb-black"
                aria-label={t('common:actions.clear')}
              >
                <X className="size-4" />
              </button>
            </div>

            {q.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-lg">
                {hits.length === 0 ? (
                  <p className="px-3 py-4 text-center text-nb-body-sm text-nb-gray-500">
                    {t('schedules:search.noResults', { q: query })}
                  </p>
                ) : (
                  grouped.map(([kind, list]) => (
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
        </div>
      )}
    </div>
  );
}
