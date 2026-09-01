/**
 * useMonitoringFetchData Hook
 * Manages data fetching for live workers, attendance, and boundaries.
 *
 * Workers are sourced from `/monitoring/snapshot` (adapted to `LiveUser`) rather
 * than `/live-users`, because the snapshot carries `display_scope`/`display_scope_id`
 * — the axis the map uses to render each worker at their own drill tier
 * (city/district/region/location) via `scopeMatches`. The snapshot scope enum is
 * `city|district|location` (no `region`), so a region drill fetches its DISTRICT
 * snapshot and the map filters the region's workers client-side by `display_scope`.
 */

import { useState, useCallback } from 'react';
import { AppDispatch } from '../../../store/store';
import { getSnapshotWorkers } from '../../../services/api/monitoringApi';
import { setLiveUsers, fetchBoundaries } from '../../../store/slices/monitoringSlice';
import type { AttendanceResponse } from '../../../types/api.types';
import type { MonitoringView } from '../../../store/slices/monitoringV2Slice';
import { getAttendance } from '../../../services/api/monitoringApi';
import { formatDate } from '../../../utils/dateUtils';

interface UseMonitoringFetchDataReturn {
  attendance: AttendanceResponse | null;
  fetchWorkers: () => Promise<void>;
  fetchAttendanceData: () => Promise<void>;
  handleRefresh: (setBoundaryKey: (fn: (k: number) => number) => void) => void;
}

/** Map a drill view to the snapshot endpoint's scope + id (no `region` scope — a
 *  region drill reads its district snapshot and filters by display_scope). */
function snapshotParamsFor(view: MonitoringView): {
  scope: 'city' | 'district' | 'location';
  id?: string;
} {
  switch (view.scope) {
    case 'city':
      return { scope: 'city' };
    case 'district':
      return { scope: 'district', id: view.id ?? undefined };
    case 'region':
      return { scope: 'district', id: view.districtId ?? undefined };
    case 'location':
      return { scope: 'location', id: view.id ?? undefined };
    default:
      return { scope: 'city' };
  }
}

export function useMonitoringFetchData(
  dispatch: AppDispatch,
  view: MonitoringView,
): UseMonitoringFetchDataReturn {
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      const { scope, id } = snapshotParamsFor(view);
      const res = await getSnapshotWorkers(scope, id);
      if (res.data) {
        dispatch(setLiveUsers(res.data));
      }
    } catch {
      // handled via slice error state; the map degrades to the cached snapshot.
    }
  }, [dispatch, view]);

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
      void fetchWorkers();
      void fetchAttendanceData();
      setBoundaryKey(k => k + 1);
    },
    [dispatch, fetchWorkers, fetchAttendanceData],
  );

  return {
    attendance,
    fetchWorkers,
    fetchAttendanceData,
    handleRefresh,
  };
}
