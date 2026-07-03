'use client';

/**
 * UserAreasSheet — right-side slide-over listing a user's permanent assigned
 * areas. Opened from the Area column in the user-management grid (a summary
 * "N Area" chip). The list is lazy-loaded via `useUserAreas` when a user is set.
 *
 * Chrome (backdrop + right panel + Esc/focus) mirrors AreaDetailDrawer.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useUserAreas } from '@/lib/api/user-areas';
import { useRayons } from '@/lib/api/rayons';

export interface UserAreasSheetTarget {
  id: string;
  full_name: string;
}

interface UserAreasSheetProps {
  /** The user whose areas to show; `null` closes the sheet. */
  user: UserAreasSheetTarget | null;
  onClose: () => void;
}

export function UserAreasSheet({ user, onClose }: UserAreasSheetProps) {
  const open = !!user;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');

  const { data: areas = [], isLoading, isError } = useUserAreas(user?.id);
  const { data: rayons = [] } = useRayons();
  const rayonNameById = useMemo(() => new Map(rayons.map((r) => [r.id, r.name])), [rayons]);

  // Reset the search box when a different user is opened — adjusted during render
  // (React-recommended) rather than in an effect, to avoid a cascading re-render.
  const [lastUserId, setLastUserId] = useState<string | undefined>(user?.id);
  if (user?.id !== lastUserId) {
    setLastUserId(user?.id);
    setQuery('');
  }

  // Focus the close button on open; close on Escape.
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
    if (!q) return areas;
    return areas.filter((a) => a.name.toLowerCase().includes(q));
  }, [areas, query]);

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
        aria-label={user ? `Area yang ditugaskan ke ${user.full_name}` : 'Area ditugaskan'}
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
            <p className="text-nb-caption text-nb-gray-500 font-bold uppercase tracking-wide">Area Ditugaskan</p>
            <h2 className="text-nb-h3 font-black text-nb-black truncate">{user?.full_name ?? '—'}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup panel area"
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
            placeholder="Cari area…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari area"
          />
          <p className="mt-2 text-nb-caption text-nb-gray-600" aria-live="polite">
            {isLoading ? 'Memuat…' : `${filtered.length} area${query ? ` dari ${areas.length}` : ''}`}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : isError ? (
            <p className="text-nb-body-sm text-nb-danger-dark py-6 text-center">Gagal memuat area.</p>
          ) : filtered.length === 0 ? (
            <p className="text-nb-body-sm text-nb-gray-600 py-6 text-center">
              {areas.length === 0 ? 'Belum ada area yang ditugaskan.' : 'Tidak ada area yang cocok.'}
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
                  <p className="text-nb-caption text-nb-gray-600">
                    {[
                      area.rayon?.name ?? (area.rayon_id ? rayonNameById.get(area.rayon_id) : undefined),
                      area.areaType?.name ?? area.areaType?.code,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
