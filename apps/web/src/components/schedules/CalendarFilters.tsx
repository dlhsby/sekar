'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button, FormCombobox, FormSelect } from '@/components/ui';
import { useUsers } from '@/lib/api/users';
import { useRayons } from '@/lib/api/rayons';
import { useRegions } from '@/lib/api/regions';
import { useLocations } from '@/lib/api/locations';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useTeamCategories } from '@/lib/api/teams';
import type { ScheduleRangeFilters } from '@/lib/api/schedule-events';

interface CalendarFiltersProps {
  value: ScheduleRangeFilters;
  onChange: (next: ScheduleRangeFilters) => void;
  /** Rayon-scoped roles can't change rayon — it's pinned server-side. */
  lockRayon?: boolean;
}

const ALL = 'all';

/**
 * Calendar filter bar (admins). Narrows the range query by user, the
 * Rayon → Kawasan → Location hierarchy (cascading), shift, and team category.
 * Controlled — emits a new ScheduleRangeFilters on every change.
 */
export function CalendarFilters({ value, onChange, lockRayon }: CalendarFiltersProps) {
  const { t } = useTranslation(['schedules', 'common']);

  const { data: usersResp } = useUsers({ limit: 1000 });
  const { data: rayons = [] } = useRayons();
  const { data: regions = [] } = useRegions(value.rayonId ?? undefined);
  const { data: locationsResp } = useLocations({ rayon_id: value.rayonId, limit: 1000 });
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: teamCategories = [] } = useTeamCategories();

  const users = usersResp?.data ?? [];
  // Locations narrow to the chosen Kawasan when one is picked.
  const locations = useMemo(() => {
    const all = locationsResp?.data ?? [];
    return value.regionId ? all.filter((l) => l.region_id === value.regionId) : all;
  }, [locationsResp, value.regionId]);

  const set = (patch: Partial<ScheduleRangeFilters>) => onChange({ ...value, ...patch });

  const hasAny = Boolean(
    value.userId ||
      value.rayonId ||
      value.regionId ||
      value.locationId ||
      value.shiftDefinitionId ||
      value.teamCategoryId,
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FormCombobox
        label={t('schedules:filters.userLabel')}
        placeholder={t('schedules:filters.allUsers')}
        value={value.userId ?? ''}
        onChange={(v) => set({ userId: v || undefined })}
        className="w-52"
        options={users.map((u) => ({ value: u.id, label: u.full_name }))}
      />

      {!lockRayon && (
        <FormCombobox
          label={t('schedules:filters.rayonLabel')}
          placeholder={t('schedules:filters.allRayons')}
          value={value.rayonId ?? ''}
          onChange={(v) => set({ rayonId: v || undefined, regionId: undefined, locationId: undefined })}
          className="w-48"
          options={rayons.map((r) => ({ value: r.id, label: r.name }))}
        />
      )}

      <FormCombobox
        label={t('schedules:filters.regionLabel')}
        placeholder={t('schedules:filters.allRegions')}
        value={value.regionId ?? ''}
        onChange={(v) => set({ regionId: v || undefined, locationId: undefined })}
        className="w-48"
        options={regions.map((r) => ({ value: r.id, label: r.name }))}
      />

      <FormCombobox
        label={t('schedules:filters.locationLabel')}
        placeholder={t('schedules:filters.allLocations')}
        value={value.locationId ?? ''}
        onChange={(v) => set({ locationId: v || undefined })}
        className="w-52"
        options={locations.map((l) => ({ value: l.id, label: l.name }))}
      />

      <FormSelect
        label={t('schedules:filters.shiftLabel')}
        value={value.shiftDefinitionId ?? ALL}
        onChange={(v) => set({ shiftDefinitionId: v === ALL ? undefined : v })}
        className="w-44"
        options={[
          { value: ALL, label: t('schedules:filters.allShifts') },
          ...shifts.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      <FormSelect
        label={t('schedules:filters.teamCategoryLabel')}
        value={value.teamCategoryId ?? ALL}
        onChange={(v) => set({ teamCategoryId: v === ALL ? undefined : v })}
        className="w-48"
        options={[
          { value: ALL, label: t('schedules:filters.allTeamCategories') },
          ...teamCategories.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />

      {hasAny && (
        <Button variant="outline" leftIcon={<X className="size-4" />} onClick={() => onChange({})}>
          {t('schedules:filters.clear')}
        </Button>
      )}
    </div>
  );
}
