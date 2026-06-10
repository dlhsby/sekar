'use client';

/**
 * HierarchyFilterPanel — scope-aware filter panel replacing flat dropdowns.
 * Emits (scope, id?) pairs; consumer holds state.
 *
 * Phase 3 sub-phase 3-4 (ADR-029)
 */

import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui';
import { FormSelect } from '@/components/ui';
import { useRayons } from '@/lib/api/rayons';
import { useAreas } from '@/lib/api/areas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterScope = 'city' | 'rayon' | 'area';

export interface HierarchyFilterState {
  scope: FilterScope;
  rayonId?: string;
  areaId?: string;
}

export interface HierarchyFilterPanelProps {
  value: HierarchyFilterState;
  onChange: (next: HierarchyFilterState) => void;
  activeWorkerCount: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HierarchyFilterPanel({
  value,
  onChange,
  activeWorkerCount,
  className,
}: HierarchyFilterPanelProps) {
  const { data: rayons } = useRayons();
  const { data: areasData } = useAreas({
    rayon_id: value.rayonId,
  });
  const areas = areasData?.data ?? [];

  const handleScopeChange = useCallback(
    (scope: FilterScope) => {
      onChange({ scope });
    },
    [onChange]
  );

  const handleRayonChange = useCallback(
    (rayonId: string) => {
      const id = rayonId === 'none' ? undefined : rayonId;
      onChange({ scope: 'rayon', rayonId: id, areaId: undefined });
    },
    [onChange]
  );

  const handleAreaChange = useCallback(
    (areaId: string) => {
      const id = areaId === 'none' ? undefined : areaId;
      onChange({ scope: 'area', rayonId: value.rayonId, areaId: id });
    },
    [onChange, value.rayonId]
  );

  const handleReset = useCallback(() => {
    onChange({ scope: 'city' });
  }, [onChange]);

  const isDirty = value.scope !== 'city';

  return (
    <div
      className={cn(
        'flex items-center flex-wrap gap-2 px-4 py-2',
        'bg-nb-white border-b-2 border-nb-black',
        className
      )}
      role="search"
      aria-label="Filter monitoring"
    >
      {/* Scope selector */}
      <div
        role="group"
        aria-label="Cakupan filter"
        className="flex items-center border-2 border-nb-black rounded-nb-base overflow-hidden shadow-nb-xs"
      >
        {(['city', 'rayon', 'area'] as FilterScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleScopeChange(s)}
            aria-pressed={value.scope === s}
            className={cn(
              'px-3 py-1.5 text-nb-caption font-bold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nb-primary',
              value.scope === s
                ? 'bg-nb-black text-nb-white'
                : 'bg-nb-white text-nb-black hover:bg-nb-gray-100'
            )}
          >
            {s === 'city' ? 'Kota' : s === 'rayon' ? 'Rayon' : 'Area'}
          </button>
        ))}
      </div>

      {/* Rayon dropdown — shown for rayon/area scope */}
      {(value.scope === 'rayon' || value.scope === 'area') && (
        <div className="w-40">
          <FormSelect
            label=""
            value={value.rayonId ?? 'none'}
            onChange={(v) => handleRayonChange(v as string)}
            options={[
              { value: 'none', label: 'Pilih Rayon' },
              ...(rayons ?? []).map((r) => ({ value: r.id, label: r.name })),
            ]}
          />
        </div>
      )}

      {/* Area dropdown — shown for area scope */}
      {value.scope === 'area' && (
        <div className="w-44">
          <FormSelect
            label=""
            value={value.areaId ?? 'none'}
            onChange={(v) => handleAreaChange(v as string)}
            disabled={!value.rayonId}
            options={[
              { value: 'none', label: value.rayonId ? 'Pilih Area' : 'Pilih rayon dulu' },
              ...areas.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
      )}

      {/* Active count badge */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1',
          'border-2 border-nb-black rounded-nb-sm bg-nb-success-light shadow-nb-xs',
          'text-nb-caption font-bold text-nb-success-dark'
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="w-2 h-2 rounded-full bg-nb-success animate-pulse" aria-hidden="true" />
        {activeWorkerCount} aktif
      </div>

      {/* Reset button */}
      {isDirty && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          aria-label="Reset semua filter"
        >
          Reset
        </Button>
      )}
    </div>
  );
}
