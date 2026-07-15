'use client';

/**
 * LocationListSheet — presentational right-side slide-over that lists a set of
 * areas (name + optional secondary line) with a search box and a count. The
 * data is passed in (no fetching), so it's reused wherever a cell summarizes
 * several areas: the user grid (permanent assignments) and the schedule grid
 * (that day's roster areas).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import { Input, Skeleton } from '@/components/ui';

export interface LocationListSheetItem {
  id: string;
  name: string;
  /** Secondary line, e.g. "Rayon · Tipe". */
  meta?: string;
}

interface LocationListSheetProps {
  open: boolean;
  /** Caption label shown above the subtitle. */
  title?: string;
  /** Main heading — e.g. the worker's name. */
  subtitle: string;
  items: LocationListSheetItem[];
  /** Changing this resets the search box (e.g. a new row's id). */
  resetKey?: string;
  isLoading?: boolean;
  isError?: boolean;
  emptyText?: string;
  onClose: () => void;
}

export function LocationListSheet({
  open,
  title = 'Area',
  subtitle,
  items,
  resetKey,
  isLoading = false,
  isError = false,
  emptyText,
  onClose,
}: LocationListSheetProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');

  // Reset the search box when a different target is opened — adjusted during
  // render (React-recommended) rather than in an effect.
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setQuery('');
  }

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => a.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-nb-black/10"
          aria-hidden="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title}: ${subtitle}`}
        aria-hidden={!open}
        className={cn(
          'fixed top-0 right-0 h-full z-40 w-full max-w-[420px]',
          'flex flex-col bg-nb-white border-l-2 border-nb-black shadow-nb-lg',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-nb-black flex-shrink-0">
          <div className="min-w-0">
            <p className="text-nb-caption text-nb-gray-500 font-bold uppercase tracking-wide">{title}</p>
            <h2 className="text-nb-h3 font-black text-nb-black truncate">{subtitle || '—'}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('common:actions.close')}
            className={cn(
              'shrink-0 w-9 h-9 flex items-center justify-center',
              'border-2 border-nb-black rounded-nb-base bg-nb-white',
              'shadow-nb-xs hover:shadow-nb-sm active:shadow-none transition-shadow duration-100',
            )}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <Input
            leftIcon={<Search className="w-4 h-4" />}
            placeholder={t('admin:areas.listSheet.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('admin:areas.listSheet.searchLabel')}
          />
          <p className="mt-2 text-nb-caption text-nb-gray-600" aria-live="polite">
            {isLoading ? t('admin:shared.loading') : t('admin:areas.listSheet.count', { count: filtered.length, total: items.length, query })}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : isError ? (
            <p className="text-nb-body-sm text-nb-danger-dark py-6 text-center">{t('common:empty.loadError')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-nb-body-sm text-nb-gray-600 py-6 text-center">
              {items.length === 0 ? (emptyText ?? t('admin:areas.emptyShort')) : t('admin:areas.listSheet.noMatch')}
            </p>
          ) : (
            filtered.map((area) => (
              <div
                key={area.id}
                className="flex items-start gap-3 p-3 border-2 border-nb-black rounded-nb-base bg-nb-white shadow-nb-xs"
              >
                <span
                  className="shrink-0 mt-0.5 w-7 h-7 flex items-center justify-center border-2 border-nb-black rounded-nb-sm bg-nb-primary/20"
                  aria-hidden="true"
                >
                  <MapPin className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-nb-body-sm font-bold text-nb-black break-words">{area.name}</p>
                  <p className="text-nb-caption text-nb-gray-600">{area.meta || '—'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
