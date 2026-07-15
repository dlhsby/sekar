'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useTeamCategories } from '@/lib/api/teams';
import type { ScheduleRangeFilters } from '@/lib/api/schedule-events';

interface ScheduleFilterChipsProps {
  filters: ScheduleRangeFilters;
  onChange: (next: ScheduleRangeFilters) => void;
  lockRayon?: boolean;
}

/** Removable chips for the active filter slice (below the search toolbar). */
export function ScheduleFilterChips({ filters, onChange, lockRayon }: ScheduleFilterChipsProps) {
  const { t } = useTranslation(['schedules']);
  const hasAny = Object.values(filters).some(Boolean);

  const { data: usersResp } = useUsers({ limit: 1000 });
  // Resolves an active filter's rayon id -> name; a stale filter may point at a
  // deactivated rayon, which should still render as a chip.
  const { data: rayons = [] } = useRayons(true);
  const { data: regions = [] } = useRegions();
  const { data: locationsResp } = useLocations({ limit: 1000 });
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: teamCategories = [] } = useTeamCategories();

  const nameOf = useMemo(
    () => ({
      user: new Map((usersResp?.data ?? []).map((u) => [u.id, u.full_name])),
      rayon: new Map(rayons.map((r) => [r.id, r.name])),
      region: new Map(regions.map((r) => [r.id, r.name])),
      location: new Map((locationsResp?.data ?? []).map((l) => [l.id, l.name])),
      shift: new Map(shifts.map((s) => [s.id, s.name])),
      category: new Map(teamCategories.map((c) => [c.id, c.name])),
    }),
    [usersResp, rayons, regions, locationsResp, shifts, teamCategories]
  );

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

  if (!hasAny || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange({ ...filters, [chip.key]: undefined })}
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
  );
}
