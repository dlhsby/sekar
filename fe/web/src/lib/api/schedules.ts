/**
 * Schedules API Client (Phase 2C - renamed from WorkerSchedule)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Schedule,
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
 * The API serializes the shift relation as `shiftDefinition` (the TypeORM entity
 * property name), but the web reads it as `shift_definition`. Normalize so every
 * consumer (weekly grid, table, delete dialog) gets the relation under the
 * snake_case key — otherwise every cell renders "libur".
 */
function normalizeSchedules(
  body: PaginatedResponse<Schedule>,
): PaginatedResponse<Schedule> {
  const data = (body?.data ?? []).map((s) => ({
    ...s,
    shift_definition:
      s.shift_definition ??
      (s as { shiftDefinition?: Schedule['shift_definition'] }).shiftDefinition,
  }));
  return { ...body, data };
}

/**
 * Fetch schedules with filters
 */
export function useSchedules(filters?: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Schedule>>('/schedules', {
        params: filters,
      });
      return normalizeSchedules(response.data);
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch single schedule by ID
 */
export function useSchedule(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Schedule>(`/schedules/${id}`);
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
      const response = await apiClient.get<PaginatedResponse<Schedule>>(
        `/schedules/area/${areaId}`,
        { params: filters }
      );
      return normalizeSchedules(response.data);
    },
    enabled: !!areaId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create new schedule
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleDto) => {
      const response = await apiClient.post<Schedule>('/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}

/**
 * Update schedule
 */
export function useUpdateSchedule(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateScheduleDto) => {
      const response = await apiClient.patch<Schedule>(`/schedules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) });
    },
  });
}

/**
 * Delete schedule
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}
