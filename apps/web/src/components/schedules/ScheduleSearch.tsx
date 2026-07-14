'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, X } from 'lucide-react';
import { parse, isValid, format, type Locale } from 'date-fns';
import { dateFnsLocale } from '@/lib/i18n/date-locale';
import { Button, DatePicker } from '@/components/ui';
import { CalendarFilters } from '@/components/schedules/CalendarFilters';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import type { ScheduleRangeFilters } from '@/lib/api/schedule-events';

interface ScheduleSearchProps {
  filters: ScheduleRangeFilters;
  onChange: (next: ScheduleRangeFilters) => void;
  /** Jump the board to a specific WIB day (from a date search). */
  onNavigateDate: (isoDate: string) => void;
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
 * Google-Calendar-style search: a collapsed icon that expands into a full bar
 * with grouped autocomplete and a chevron that opens the Advanced (Lanjutan)
 * panel. Sits in the toolbar row; active-filter chips render separately below.
 */
export function ScheduleSearch({
  filters,
  onChange,
  onNavigateDate,
  lockRayon,
}: ScheduleSearchProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: usersResp } = useUsers({ limit: 1000 });
  const { data: rayons = [] } = useRayons();
  const { data: regions = [] } = useRegions();
  const { data: locationsResp } = useLocations({ limit: 1000 });

  const users = useMemo(() => usersResp?.data ?? [], [usersResp]);
  const locations = useMemo(() => locationsResp?.data ?? [], [locationsResp]);
  const locale = dateFnsLocale();

  const collapse = () => {
    setExpanded(false);
    setAdvanced(false);
    setQuery('');
  };

  // Focus the input when the bar opens.
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Collapse on an outside click (filters set in Advanced are already applied).
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
    collapse();
    if (hit.kind === 'date') return onNavigateDate(hit.iso);
    const key = { user: 'userId', location: 'locationId', region: 'regionId', rayon: 'rayonId' }[
      hit.kind
    ] as keyof ScheduleRangeFilters;
    onChange({ ...filters, [key]: hit.id });
  };

  const groupLabel: Record<string, string> = {
    user: t('schedules:filters.userLabel'),
    location: t('schedules:filters.locationLabel'),
    region: t('schedules:filters.regionLabel'),
    rayon: t('schedules:filters.rayonLabel'),
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
                aria-label={t('common:actions.clear', 'Clear')}
              >
                <X className="size-4" />
              </button>
              <span className="h-6 w-px shrink-0 bg-nb-black" />
              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                aria-expanded={advanced}
                aria-label={t('schedules:search.advanced')}
                title={t('schedules:search.advanced')}
                className="shrink-0 text-nb-gray-600 hover:text-nb-black"
              >
                <ChevronDown
                  className={`size-4 transition-transform ${advanced ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {advanced ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-[min(34rem,90vw)] rounded-nb-base border-2 border-nb-black bg-nb-white p-3 shadow-nb-lg">
                <p className="mb-2 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                  {t('schedules:search.advanced')}
                </p>
                <CalendarFilters value={filters} onChange={onChange} lockRayon={lockRayon} />
                <div className="mt-3">
                  <span className="mb-1 block text-nb-caption font-bold uppercase tracking-wide text-nb-gray-500">
                    {t('schedules:search.dateRangeLabel')}
                  </span>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[9rem] flex-1">
                      <span className="mb-1 block text-nb-caption text-nb-gray-500">
                        {t('schedules:search.dateFrom')}
                      </span>
                      <DatePicker value={fromDate} onValueChange={setFromDate} />
                    </div>
                    <div className="min-w-[9rem] flex-1">
                      <span className="mb-1 block text-nb-caption text-nb-gray-500">
                        {t('schedules:search.dateTo')}
                      </span>
                      <DatePicker value={toDate} onValueChange={setToDate} />
                    </div>
                    <Button
                      variant="outline"
                      disabled={!fromDate}
                      onClick={() => {
                        if (fromDate) {
                          onNavigateDate(fromDate);
                          collapse();
                        }
                      }}
                    >
                      {t('common:actions.apply', 'Apply')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              q.length > 0 && (
                <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-lg">
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
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
