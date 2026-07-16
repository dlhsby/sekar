'use client';

/**
 * MonitoringSearch — map search matching the mobile experience: a text field
 * that opens a dropdown showing recent searches (when empty) or grouped results
 * (Petugas / Area / Rayon). Selecting a result reports it to the page, which
 * pans/drills to its location; the selection is also stored as a recent.
 *
 * Phase 5.7b: petugas search now reaches the server via useMonitoringSearchQuery,
 * so clocked-in workers not in the current snapshot appear in results (ad-hoc,
 * off-screen, or in another drill scope).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, History, MapPin, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { roleLabel } from '@/lib/constants/roles';
import {
  useMonitoringSearch,
  type MonitoringSearchResult,
  type SearchResultType,
} from '@/lib/monitoring/useMonitoringSearch';
import { useMonitoringSearchQuery } from '@/lib/api/monitoring-v2';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/monitoring/recentSearches';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { RayonBoundary } from '@/lib/api/monitoring-types';

export interface MonitoringSearchProps {
  workers: SnapshotWorker[];
  rayons: RayonBoundary[] | undefined;
  onSelect: (result: MonitoringSearchResult) => void;
  className?: string;
}

const TYPE_ICON: Record<SearchResultType, typeof MapPin> = {
  petugas: User,
  area: MapPin,
  rayon: Building2,
};

function ResultRow({
  result,
  onPick,
}: {
  result: MonitoringSearchResult;
  onPick: (r: MonitoringSearchResult) => void;
}) {
  const Icon = TYPE_ICON[result.type];
  return (
    <button
      type="button"
      onClick={() => onPick(result)}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-nb-gray-50"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-nb-sm border-2 border-nb-black bg-nb-gray-50">
        <Icon className="h-3.5 w-3.5 text-nb-black" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-nb-black">{result.name}</span>
        {result.subtitle ? (
          <span className="block truncate text-xs text-nb-gray-500">{result.subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}

export function MonitoringSearch({ workers, rayons, onSelect, className }: MonitoringSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<MonitoringSearchResult[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounce query for server search (250ms).
  const debouncedQuery = useDebounce(query, 250);

  // Server-side worker search: enabled only when dropdown is open.
  const { data: serverSearchResult = { users: [] } } = useMonitoringSearchQuery(
    debouncedQuery,
    open && debouncedQuery.trim().length >= 2
  );

  const labels = useMemo(
    () => ({
      petugas: t('monitoring:search.personnelLabel'),
      area: t('monitoring:search.areaLabel'),
      rayon: t('monitoring:search.rayonLabel'),
    }),
    [t]
  );

  // Client-side search (area + rayon) and local petugas from snapshot.
  const clientResults = useMonitoringSearch(workers, rayons, query, labels);

  // Merge server petugas with client petugas, deduped by id (server wins).
  const mergedResults = useMemo(() => {
    const seen = new Set<string>();
    const merged: MonitoringSearchResult[] = [];

    // Server petugas first (wins if duplicate).
    if (serverSearchResult?.users) {
      for (const user of serverSearchResult.users) {
        merged.push({
          id: user.id,
          type: 'petugas',
          name: user.full_name,
          subtitle: [roleLabel(user.role), user.area_name].filter(Boolean).join(' · '),
          latitude: user.latitude,
          longitude: user.longitude,
          role: user.role,
          rayonId: user.rayon_id,
        });
        seen.add(user.id);
      }
    }

    // Client petugas (skip if already in server results).
    for (const result of clientResults.petugas) {
      if (!seen.has(result.id)) {
        merged.push(result);
        seen.add(result.id);
      }
    }

    // Area and rayon sections (client-side only).
    const sections = [
      { title: labels.petugas, type: 'petugas' as const, data: merged },
      { title: labels.area, type: 'area' as const, data: clientResults.area },
      { title: labels.rayon, type: 'rayon' as const, data: clientResults.rayon },
    ].filter((s) => s.data.length > 0);

    return {
      petugas: merged,
      area: clientResults.area,
      rayon: clientResults.rayon,
      sections,
      total: merged.length + clientResults.area.length + clientResults.rayon.length,
    };
  }, [serverSearchResult, clientResults, labels]);

  // Load recents when the dropdown opens with an empty query.
  useEffect(() => {
    if (open && !query.trim()) setRecents(getRecentSearches());
  }, [open, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (r: MonitoringSearchResult) => {
    setRecents(addRecentSearch(r));
    onSelect(r);
    setOpen(false);
    setQuery('');
  };

  const showRecents = !query.trim();
  const hasResults = mergedResults.total > 0;

  return (
    <div ref={rootRef} className={cn('pointer-events-auto relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nb-gray-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t('monitoring:page.searchPlaceholder')}
        aria-label={t('monitoring:page.searchLabel')}
        className="h-11 w-full rounded-nb-base border-2 border-nb-black bg-nb-white pl-9 pr-9 text-sm font-medium text-nb-black shadow-nb-sm placeholder:text-nb-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-primary"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setOpen(true);
          }}
          aria-label={t('common:actions.clear')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-nb-sm p-1 text-nb-gray-400 hover:bg-nb-gray-100 hover:text-nb-black"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-[60vh] overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white shadow-nb-lg">
          {showRecents ? (
            recents.length > 0 ? (
              <div>
                <div className="flex items-center justify-between px-3 pb-1 pt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-nb-gray-500">
                    <History className="h-3.5 w-3.5" />
                    {t('monitoring:search.recentTitle')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecents([]);
                    }}
                    className="text-xs font-semibold text-nb-gray-500 hover:text-nb-black"
                  >
                    {t('monitoring:search.clearRecent')}
                  </button>
                </div>
                {recents.map((r) => (
                  <ResultRow key={`recent-${r.type}-${r.id}`} result={r} onPick={pick} />
                ))}
              </div>
            ) : (
              <p className="px-3 py-4 text-center text-xs text-nb-gray-500">
                {t('monitoring:search.recentEmpty')}
              </p>
            )
          ) : hasResults ? (
            mergedResults.sections.map((section) => (
              <div key={section.type}>
                <div className="bg-nb-gray-50 px-3 py-1 text-xs font-bold uppercase text-nb-gray-500">
                  {section.title} · {section.data.length}
                </div>
                {section.data.map((r) => (
                  <ResultRow key={`${r.type}-${r.id}`} result={r} onPick={pick} />
                ))}
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-xs text-nb-gray-500">
              {t('monitoring:search.noResults')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
