/**
 * useActivitiesFetching — activities pagination & fetching logic
 * Handles fetch queueing, pagination, filter application.
 */

import { useState, useCallback, useRef } from 'react';
import i18n from '../../../i18n/config';
import { getMyActivities, getActivities } from '../../../services/api/activitiesApi';
import { canMonitor } from '../../../constants/roles';
import type { Activity, User } from '../../../types/models.types';
import type { ActivitiesFilter } from '../../../types/api.types';

export type ActivitySortOption = 'created_at_desc' | 'created_at_asc';

const ACTIVITIES_PAGE_LIMIT = 10;

export interface UseActivitiesFetchingResult {
  allActivities: Activity[];
  activityPage: number;
  hasMoreActivities: boolean;
  loadingActivities: boolean;
  isLoadingMoreActivities: boolean;
  activitiesError: string | null;
  fetchActivities: (page: number, reset: boolean) => Promise<void>;
  loadMoreActivities: () => void;
}

interface UseActivitiesFetchingOptions {
  activityFilters: ActivitiesFilter;
  activitySort: ActivitySortOption;
  user: User | null;
}

export function useActivitiesFetching(options: UseActivitiesFetchingOptions): UseActivitiesFetchingResult {
  const { activityFilters, activitySort, user } = options;

  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const isFetchingActivities = useRef(false);
  const pendingActivityFetch = useRef<{ page: number; reset: boolean } | null>(null);

  const fetchActivities = useCallback(async (page: number, reset: boolean) => {
    if (isFetchingActivities.current) {
      pendingActivityFetch.current = { page, reset };
      return;
    }
    isFetchingActivities.current = true;

    if (page === 1) {
      setLoadingActivities(true);
    } else {
      setIsLoadingMoreActivities(true);
    }
    setActivitiesError(null);

    try {
      const isSupervisor = user?.role ? canMonitor(user.role) : false;
      const sortDir = activitySort === 'created_at_asc' ? 'asc' : 'desc';
      const filters: ActivitiesFilter = {
        ...activityFilters,
        sort_by: 'created_at',
        sort_dir: sortDir,
        page,
        limit: ACTIVITIES_PAGE_LIMIT,
      };

      const response = isSupervisor
        ? await getActivities(filters)
        : await getMyActivities({ ...filters, involving_me: true });

      const paged = response.data;
      const fetchedActivities = paged?.data ?? [];
      const totalPages = paged?.meta?.totalPages ?? 1;

      if (reset || page === 1) {
        setAllActivities(fetchedActivities);
      } else {
        setAllActivities((prev) => [...prev, ...fetchedActivities]);
      }
      setActivityPage(page);
      setHasMoreActivities(page < totalPages);
    } catch {
      if (__DEV__) {
        console.warn('Failed to fetch activities');
      }
      setActivitiesError(i18n.t('activities:tab.loadError'));
    } finally {
      setLoadingActivities(false);
      setIsLoadingMoreActivities(false);
      isFetchingActivities.current = false;
      if (pendingActivityFetch.current) {
        const { page: p, reset: r } = pendingActivityFetch.current;
        pendingActivityFetch.current = null;
        fetchActivities(p, r);
      }
    }
  }, [activityFilters, activitySort, user?.role]);

  const loadMoreActivities = useCallback(() => {
    if (!hasMoreActivities || isLoadingMoreActivities || loadingActivities) return;
    fetchActivities(activityPage + 1, false);
  }, [hasMoreActivities, isLoadingMoreActivities, loadingActivities, activityPage, fetchActivities]);

  return {
    allActivities,
    activityPage,
    hasMoreActivities,
    loadingActivities,
    isLoadingMoreActivities,
    activitiesError,
    fetchActivities,
    loadMoreActivities,
  };
}
