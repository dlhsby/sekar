'use client';

/**
 * HierarchyFilterPanel — scope-aware filter panel replacing flat dropdowns.
 * Emits (scope, id?) pairs; consumer holds state.
 *
 * Phase 3 sub-phase 3-4 (ADR-029)
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui';
import { FormSelect } from '@/components/ui';
import { useRayons } from '@/lib/api/rayons';
import { useLocations } from '@/lib/api/locations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterScope = 'city' | 'rayon' | 'location';

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
  const { t } = useTranslation(['monitoring']);
  // Monitoring deliberately still sees deactivated rayons: hiding one here
  // would remove its live workers from the map. Revisit in the Phase-5
  // monitoring revamp.
  const { data: rayons } = useRayons(true);
  const { data: areasData } = useLocations({
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
      onChange({ scope: 'location', rayonId: value.rayonId, areaId: id });
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
      aria-label={t("monitoring:filters.ariaLabel")}
    >
      {/* Scope selector */}
      <div
        role="group"
        aria-label={t('monitoring:hierarchy.scopeLabel')}
        className="flex items-center border-2 border-nb-black rounded-nb-base overflow-hidden shadow-nb-xs"
      >
        {(['city', 'rayon', 'location'] as FilterScope[]).map((s) => (
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
            {s === 'city' ? t('monitoring:hierarchy.city') : s === 'rayon' ? t('monitoring:hierarchy.rayon') : t('monitoring:hierarchy.area')}
          </button>
        ))}
      </div>

      {/* Rayon dropdown — shown for rayon/location scope */}
      {(value.scope === 'rayon' || value.scope === 'location') && (
        <div className="w-40">
          <FormSelect
            label=""
            value={value.rayonId ?? 'none'}
            onChange={(v) => handleRayonChange(v as string)}
            options={[
              { value: 'none', label: t('monitoring:hierarchy.rayonLabel') },
              ...(rayons ?? []).map((r) => ({ value: r.id, label: r.name })),
            ]}
          />
        </div>
      )}

      {/* Location dropdown — shown for location scope */}
      {value.scope === 'location' && (
        <div className="w-44">
          <FormSelect
            label=""
            value={value.areaId ?? 'none'}
            onChange={(v) => handleAreaChange(v as string)}
            disabled={!value.rayonId}
            options={[
              { value: 'none', label: value.rayonId ? t('monitoring:hierarchy.areaLabel') : t('monitoring:hierarchy.areaDisabled') },
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
        {t('monitoring:hierarchy.activeCount', { count: activeWorkerCount })}
      </div>

      {/* Reset button */}
      {isDirty && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          aria-label={t('monitoring:hierarchy.resetLabel')}
        >
          {t('monitoring:filters.reset')}
        </Button>
      )}
    </div>
  );
}
