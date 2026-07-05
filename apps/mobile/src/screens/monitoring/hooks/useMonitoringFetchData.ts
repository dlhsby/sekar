/**
 * useMonitoringFetchData Hook
 * Manages data fetching for live users, attendance, and boundaries.
 * Consolidated from MapDashboardScreen lines 241–284.
 */

import { useState, useCallback } from 'react';
import { AppDispatch } from '../../../store/store';
import { getLiveUsers, getAttendance } from '../../../services/api/monitoringApi';
import { setLiveUsers, fetchBoundaries } from '../../../store/slices/monitoringSlice';
import type { MonitoringFilters, AttendanceResponse } from '../../../types/api.types';
import { formatDate } from '../../../utils/dateUtils';

interface UseMonitoringFetchDataReturn {
  attendance: AttendanceResponse | null;
  fetchLiveUsersWithFilters: (filters: MonitoringFilters) => Promise<void>;
  fetchAttendanceData: () => Promise<void>;
  handleRefresh: (setBoundaryKey: (fn: (k: number) => number) => void) => void;
}

export function useMonitoringFetchData(
  dispatch: AppDispatch,
  filters: MonitoringFilters,
): UseMonitoringFetchDataReturn {
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);

  const fetchLiveUsersWithFilters = useCallback(
    async (currentFilters: MonitoringFilters) => {
      try {
        const res = await getLiveUsers(currentFilters);
        if (res.data?.users) {
          dispatch(setLiveUsers(res.data.users));
        }
      } catch {
        // handled via slice error state
      }
    },
    [dispatch],
  );

  const fetchAttendanceData = useCallback(async () => {
    try {
      const res = await getAttendance({ date: formatDate(new Date()) });
      setAttendance(res.data ?? null);
    } catch {
      setAttendance(null);
    }
  }, []);

  const handleRefresh = useCallback(
    (setBoundaryKey: (fn: (k: number) => number) => void) => {
      dispatch(fetchBoundaries());
      void fetchLiveUsersWithFilters(filters);
      void fetchAttendanceData();
      setBoundaryKey(k => k + 1);
    },
    [dispatch, fetchLiveUsersWithFilters, fetchAttendanceData, filters],
  );

  return {
    attendance,
    fetchLiveUsersWithFilters,
    fetchAttendanceData,
    handleRefresh,
  };
}
