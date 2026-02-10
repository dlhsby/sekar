/**
 * Schedules API Client
 * TanStack Query hooks for worker schedule data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import {
  WorkerSchedule,
  ScheduleFilters,
  CreateScheduleDto,
  UpdateScheduleDto,
  PaginatedResponse,
} from '@/types/models';

/**
 * Query key factory for schedules
 */
export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (filters?: ScheduleFilters) => [...scheduleKeys.lists(), filters] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
  areaSchedules: (areaId: string, filters?: ScheduleFilters) =>
    [...scheduleKeys.all, 'area', areaId, filters] as const,
};

/**
 * Fetch schedules with filters
 * Supports pagination, search, and filtering by area/shift/date range
 */
export function useSchedules(filters?: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<WorkerSchedule>>('/schedules', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - schedules change frequently
  });
}

/**
 * Fetch single schedule by ID
 */
export function useSchedule(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<WorkerSchedule>(`/schedules/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch schedules for a specific area
 */
export function useAreaSchedules(areaId: string, filters?: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleKeys.areaSchedules(areaId, filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<WorkerSchedule>>(
        `/schedules/area/${areaId}`,
        { params: filters }
      );
      return response.data;
    },
    enabled: !!areaId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create new schedule mutation
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleDto) => {
      const response = await apiClient.post<WorkerSchedule>('/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all schedule queries
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}

/**
 * Update schedule mutation
 */
export function useUpdateSchedule(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateScheduleDto) => {
      const response = await apiClient.patch<WorkerSchedule>(`/schedules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate schedule lists and the specific schedule
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) });
    },
  });
}

/**
 * Delete schedule mutation
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/schedules/${id}`);
    },
    onSuccess: () => {
      // Invalidate all schedule queries
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}
