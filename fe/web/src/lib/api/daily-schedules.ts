/**
 * Daily Schedules API Client
 * Operational daily roster management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

import type { UserRole } from '@/types/models';

/**
 * Daily Schedule Type (mirrors backend DailySchedule entity)
 */
export interface DailySchedule {
  id: string;
  user_id: string;
  schedule_date: string; // YYYY-MM-DD
  rayon_id: string;
  shift_definition_id: string | null;
  status: 'planned' | 'present' | 'absent' | 'leave_sick' | 'leave_annual' | 'replaced' | 'off';
  replacement_user_id: string | null;
  original_user_id: string | null;
  source: 'template' | 'manual';
  is_overtime: boolean;
  notes: string | null;
  user: {
    id: string;
    full_name: string;
    username: string;
    role: UserRole;
  };
  shift_definition: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  } | null;
  replacement_user?: {
    id: string;
    full_name: string;
    username: string;
  } | null;
  daily_schedule_areas: Array<{
    id: string;
    area_id: string;
    area: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

/**
 * Query key factory for daily schedules
 */
export const dailyScheduleKeys = {
  all: ['daily-schedules'] as const,
  lists: () => [...dailyScheduleKeys.all, 'list'] as const,
  byDate: (date: string, rayonId?: string) =>
    [...dailyScheduleKeys.lists(), { date, rayonId }] as const,
  myRoster: (date?: string) => [...dailyScheduleKeys.all, 'my', date] as const,
};

/**
 * Fetch daily schedules for a given date (optionally filtered by rayon)
 */
async function fetchDailySchedules(
  date: string,
  rayonId?: string,
): Promise<DailySchedule[]> {
  const params = new URLSearchParams();
  params.append('rayonId', rayonId || '');
  const response = await apiClient.get<DailySchedule[]>(
    `/daily-schedules/date/${date}?${params.toString()}`,
  );
  return response.data || [];
}

/**
 * Fetch current user's daily roster for a given date
 */
async function fetchMyRoster(date?: string): Promise<DailySchedule | null> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  const response = await apiClient.get<DailySchedule | null>(
    `/daily-schedules/my?${params.toString()}`,
  );
  return response.data ?? null;
}

/**
 * Generate daily schedules from templates for a given date
 */
async function generateRoster(date: string): Promise<{ generated: number }> {
  const response = await apiClient.post<{ generated: number }>('/daily-schedules/generate', {
    date,
  });
  return response.data;
}

/**
 * Set leave status for a daily schedule
 */
async function setLeave(
  id: string,
  leave_type: 'sick' | 'annual',
  notes?: string,
): Promise<DailySchedule> {
  const response = await apiClient.patch<DailySchedule>(
    `/daily-schedules/${id}/leave`,
    { leave_type, notes },
  );
  return response.data;
}

/**
 * Replace worker on a daily schedule
 */
async function replaceWorker(
  id: string,
  replacement_user_id: string,
  notes?: string,
): Promise<DailySchedule> {
  const response = await apiClient.patch<DailySchedule>(
    `/daily-schedules/${id}/replace`,
    { replacement_user_id, notes },
  );
  return response.data;
}

/**
 * Update areas assigned to a daily schedule
 */
async function updateAreas(id: string, area_ids: string[]): Promise<DailySchedule> {
  const response = await apiClient.patch<DailySchedule>(`/daily-schedules/${id}/areas`, {
    area_ids,
  });
  return response.data;
}

/**
 * Update shift assigned to a daily schedule
 */
async function updateShift(
  id: string,
  shift_definition_id: string | null,
): Promise<DailySchedule> {
  const response = await apiClient.patch<DailySchedule>(`/daily-schedules/${id}/shift`, {
    shift_definition_id,
  });
  return response.data;
}

/**
 * Hook to fetch daily schedules for a specific date
 */
export function useDailyRoster(date: string, rayonId?: string) {
  return useQuery({
    queryKey: dailyScheduleKeys.byDate(date, rayonId),
    queryFn: () => fetchDailySchedules(date, rayonId),
    enabled: !!date,
  });
}

/**
 * Hook to fetch current user's daily roster
 */
export function useMyRoster(date?: string) {
  return useQuery({
    queryKey: dailyScheduleKeys.myRoster(date),
    queryFn: () => fetchMyRoster(date),
  });
}

/**
 * Hook to generate daily schedules for a date
 */
export function useGenerateRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateRoster,
    onSuccess: () => {
      // Invalidate the daily roster cache
      queryClient.invalidateQueries({ queryKey: dailyScheduleKeys.lists() });
    },
  });
}

/**
 * Hook to set leave on a daily schedule
 */
export function useSetLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, leave_type, notes }: { id: string; leave_type: 'sick' | 'annual'; notes?: string }) =>
      setLeave(id, leave_type, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyScheduleKeys.lists() });
    },
  });
}

/**
 * Hook to replace a worker on a daily schedule
 */
export function useReplaceWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, replacement_user_id, notes }: { id: string; replacement_user_id: string; notes?: string }) =>
      replaceWorker(id, replacement_user_id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyScheduleKeys.lists() });
    },
  });
}

/**
 * Hook to update areas on a daily schedule
 */
export function useUpdateRosterAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, area_ids }: { id: string; area_ids: string[] }) =>
      updateAreas(id, area_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyScheduleKeys.lists() });
    },
  });
}

/**
 * Hook to update shift on a daily schedule
 */
export function useUpdateRosterShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, shift_definition_id }: { id: string; shift_definition_id: string | null }) =>
      updateShift(id, shift_definition_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyScheduleKeys.lists() });
    },
  });
}
