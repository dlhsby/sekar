'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AssignmentScope, CreateTaskDto } from '@/lib/api/tasks';

interface ScopeOption {
  value: AssignmentScope | 'auto';
  label: string;
}

interface ScopeFieldParams {
  districtId?: string;
  regionId?: string;
  areaId?: string;
}

type ScopePayload = Pick<CreateTaskDto, 'scope' | 'district_id' | 'region_id' | 'location_id'>;

/**
 * Extracts task scope selection logic: options, validation, and payload building.
 */
export function useTaskScopeField() {
  const { t } = useTranslation('tasks');

  // Localized scope options.
  const scopeOptions: ScopeOption[] = useMemo(
    () => [
      { value: 'auto', label: t('newPage.scopeAuto') },
      { value: 'city', label: t('newPage.scopeCity') },
      { value: 'district', label: t('newPage.scopeDistrict') },
      { value: 'region', label: t('newPage.scopeRegion') },
      { value: 'location', label: t('newPage.scopeLocation') },
      { value: 'none', label: t('newPage.scopeNone') },
    ],
    [t]
  );

  /**
   * Validates scope-specific id fields. Returns error string or empty.
   */
  const validate = (scope: AssignmentScope | 'auto', params: ScopeFieldParams): string => {
    if (scope === 'district' && params.districtId === 'none') {
      return t('newPage.scopeIdRequired');
    }
    if (scope === 'region' && params.regionId === 'none') {
      return t('newPage.scopeIdRequired');
    }
    if (scope === 'location' && params.areaId === 'none') {
      return t('newPage.scopeIdRequired');
    }
    return '';
  };

  /**
   * Builds scope payload: auto → {}, city/none → {scope}, district/region/location → {scope, id}.
   */
  const buildScopePayload = (scope: AssignmentScope | 'auto', params: ScopeFieldParams): Partial<ScopePayload> => {
    if (scope === 'auto') {
      return {};
    }

    const payload: Partial<ScopePayload> = { scope };
    if (scope === 'district' && params.districtId && params.districtId !== 'none') {
      payload.district_id = params.districtId;
    } else if (scope === 'region' && params.regionId && params.regionId !== 'none') {
      payload.region_id = params.regionId;
    } else if (scope === 'location' && params.areaId && params.areaId !== 'none') {
      payload.location_id = params.areaId;
    }
    return payload;
  };

  return { scopeOptions, validate, buildScopePayload };
}
