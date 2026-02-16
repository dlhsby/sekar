/**
 * useActivityTypes Hook
 * Fetches and caches role-filtered activity types
 */

import { useState, useEffect, useCallback } from 'react';
import type { ActivityType } from '../types/models.types';
import { getMyActivityTypes } from '../services/api/activityTypesApi';

export function useActivityTypes() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyActivityTypes();
      if (response.data) {
        setActivityTypes(response.data.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('Gagal memuat jenis aktivitas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivityTypes();
  }, [fetchActivityTypes]);

  return { activityTypes, isLoading, error, refetch: fetchActivityTypes };
}
