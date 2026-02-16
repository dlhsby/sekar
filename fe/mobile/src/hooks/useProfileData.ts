/**
 * useProfileData Hook
 * Loads role-appropriate profile statistics
 */

import { useState, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { getMe } from '../services/api/authApi';
import { get } from '../services/api/apiClient';
import { getActiveUsers } from '../services/api/monitoringApi';
import { isClockableRole } from '../constants/roles';
import type { Shift } from '../types/models.types';
import type { UserRole } from '../types/models.types';

export interface FieldStats {
  daysWorked: number;
  totalHours: number;
  activitiesCount: number;
}

export interface MonitoringStats {
  totalUsersManaged: number;
  totalAreasMonitored: number;
  activitiesReviewedThisMonth: number;
}

interface AreaStatusResponse {
  areas: Array<{
    id: string;
    name: string;
    assigned_workers_count: number;
    active_workers_count: number;
  }>;
}

const INITIAL_FIELD_STATS: FieldStats = {
  daysWorked: 0,
  totalHours: 0,
  activitiesCount: 0,
};

const INITIAL_MONITORING_STATS: MonitoringStats = {
  totalUsersManaged: 0,
  totalAreasMonitored: 0,
  activitiesReviewedThisMonth: 0,
};

function calculateMonthlyStats(shifts: Shift[]): FieldStats {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyShifts = shifts.filter((shift) => {
    const d = new Date(shift.clock_in_time);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const uniqueDates = new Set(
    monthlyShifts.map((s) => new Date(s.clock_in_time).toDateString())
  );

  const totalHours = monthlyShifts.reduce((sum, shift) => {
    if (!shift.clock_out_time) return sum;
    const hours =
      (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) /
      (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return {
    daysWorked: uniqueDates.size,
    totalHours: Math.round(totalHours * 10) / 10,
    activitiesCount: monthlyShifts.length * 3,
  };
}

function formatDateParam(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadMonitoringStats(): Promise<MonitoringStats> {
  const usersResponse = await getActiveUsers();
  const usersCount = usersResponse.data?.users?.length || 0;

  const areaStatusResponse = await get<AreaStatusResponse>('/supervisor/area-status');
  const areasCount = areaStatusResponse.data?.areas?.length || 0;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  const activitiesResponse = await get<{ data: any[]; meta: { total: number } }>(
    '/activities',
    {
      from_date: formatDateParam(startOfMonth),
      to_date: formatDateParam(endOfMonth),
      page: 1,
      limit: 1,
    }
  );
  const activitiesCount = activitiesResponse.data?.meta?.total || 0;

  return {
    totalUsersManaged: usersCount,
    totalAreasMonitored: areasCount,
    activitiesReviewedThisMonth: activitiesCount,
  };
}

async function loadFieldStats(): Promise<FieldStats> {
  const shiftsResponse = await get<Shift[]>('/shifts/my-shifts');
  if (shiftsResponse.data) {
    return calculateMonthlyStats(shiftsResponse.data);
  }
  return INITIAL_FIELD_STATS;
}

export function useProfileData() {
  const user = useAppSelector((state) => state.auth.user);
  const assignedArea = useAppSelector((state) => state.auth.assignedArea);
  const role = user?.role as UserRole | undefined;
  const isField = !!role && isClockableRole(role);

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [fieldStats, setFieldStats] = useState<FieldStats>(INITIAL_FIELD_STATS);
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats>(INITIAL_MONITORING_STATS);

  const loadData = useCallback(async () => {
    try {
      const profileResponse = await getMe();
      if (profileResponse.data) {
        setProfileData(profileResponse.data);
      }

      if (isField) {
        const stats = await loadFieldStats();
        setFieldStats(stats);
      } else {
        const stats = await loadMonitoringStats();
        setMonitoringStats(stats);
      }
    } catch (error) {
      console.error('[useProfileData] Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isField]);

  return {
    user,
    assignedArea,
    profileData,
    isField,
    isLoading,
    setIsLoading,
    fieldStats,
    monitoringStats,
    loadData,
  };
}
