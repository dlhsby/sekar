'use client';

/**
 * UserAreasSheet — right-side slide-over listing a user's permanent assigned
 * areas. Opened from the Area column in the user-management grid (a summary
 * "N Area" chip). The list is lazy-loaded via `useUserAreas` when a user is set,
 * then rendered by the shared presentational {@link LocationListSheet}.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationListSheet, type LocationListSheetItem } from '@/components/locations/LocationListSheet';
import { useUserAreas } from '@/lib/api/user-locations';
import { useDistricts } from '@/lib/api/districts';

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
  const { t } = useTranslation();
  const { data: areas = [], isLoading, isError } = useUserAreas(user?.id);
  // Resolves the district name for a user's existing locations — a deactivated
  // district must still resolve.
  const { data: districts = [] } = useDistricts(true);
  const districtNameById = useMemo(() => new Map(districts.map((r) => [r.id, r.name])), [districts]);

  const items: LocationListSheetItem[] = useMemo(
    () =>
      areas.map((area) => ({
        id: area.id,
        name: area.name,
        meta:
          [
            area.district?.name ?? (area.district_id ? districtNameById.get(area.district_id) : undefined),
            area.locationType?.name ?? area.locationType?.code,
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
      })),
    [areas, districtNameById],
  );

  return (
    <LocationListSheet
      open={!!user}
      title={t('admin:users.areasTitle')}
      subtitle={user?.full_name ?? '—'}
      items={items}
      resetKey={user?.id}
      isLoading={isLoading}
      isError={isError}
      emptyText={t('admin:users.noAreasAssigned')}
      onClose={onClose}
    />
  );
}
