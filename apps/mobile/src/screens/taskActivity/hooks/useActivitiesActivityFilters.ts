/**
 * useActivitiesActivityFilters — activity filter state + handlers
 */

import { useState, useCallback, useMemo } from 'react';
import type { ActivitiesFilter } from '../../../types/api.types';

export interface UseActivitiesActivityFiltersResult {
  activityFilters: ActivitiesFilter;
  setActivityFilters: (filters: ActivitiesFilter) => void;
  activeActivityFilterCount: number;
  handleApplyActivityFilters: (filters: ActivitiesFilter) => void;
  handleResetActivityFilters: () => void;
}

interface UseActivitiesActivityFiltersOptions {
  initialAreaId: string | null;
}

export function useActivitiesActivityFilters(
  options: UseActivitiesActivityFiltersOptions
): UseActivitiesActivityFiltersResult {
  const { initialAreaId } = options;
  const [activityFilters, setActivityFilters] = useState<ActivitiesFilter>({});

  const activeActivityFilterCount = useMemo(() => {
    let count = 0;
    if (activityFilters.status) count++;
    if (activityFilters.from_date || activityFilters.to_date) count++;
    if (activityFilters.activity_type_id) count++;
    if (activityFilters.location_id && activityFilters.location_id !== initialAreaId) count++;
    if (activityFilters.rayon_id) count++;
    return count;
  }, [activityFilters, initialAreaId]);

  const handleApplyActivityFilters = useCallback((filters: ActivitiesFilter) => {
    setActivityFilters(filters);
  }, []);

  const handleResetActivityFilters = useCallback(() => {
    setActivityFilters(initialAreaId ? { location_id: initialAreaId } : {});
  }, [initialAreaId]);

  return {
    activityFilters,
    setActivityFilters,
    activeActivityFilterCount,
    handleApplyActivityFilters,
    handleResetActivityFilters,
  };
}
