/**
 * Reports API Client
 * Work reports management and review
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * Report Type Enum
 */
export type ReportType = 'task_completion' | 'incident' | 'maintenance_request';

/**
 * Work Report Interface
 */
export interface WorkReport extends Record<string, unknown> {
  id: string;
  worker_id: string;
  shift_id: string;
  area_id: string;
  report_type: ReportType;
  description: string;
  gps_lat: string;
  gps_lng: string;
  photo_url?: string;
  is_reviewed: boolean;
  created_at: string;
  updated_at: string;
  worker: {
    id: string;
    username: string;
    full_name: string;
    role: string;
  };
  area: {
    id: string;
    name: string;
    areaType: {
      code: string;
      name: string;
    };
  };
  shift: {
    id: string;
    clock_in_time: string;
    area: {
      id: string;
      name: string;
      areaType: {
        code: string;
        name: string;
      };
    };
    worker: {
      id: string;
      username: string;
      full_name: string;
      role: string;
    };
  };
}

/**
 * Report Filters
 */
export interface ReportFilters {
  worker_id?: string;
  shift_id?: string;
  report_type?: ReportType;
  from_date?: string; // YYYY-MM-DD
  to_date?: string;   // YYYY-MM-DD
  page?: number;
  limit?: number;
}

/**
 * Paginated Reports Response
 */
export interface PaginatedReportsResponse {
  data: WorkReport[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Query Key Factory
 */
export const reportsKeys = {
  all: ['reports'] as const,
  lists: () => [...reportsKeys.all, 'list'] as const,
  list: (filters?: ReportFilters) => [...reportsKeys.lists(), filters] as const,
  details: () => [...reportsKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportsKeys.details(), id] as const,
  my: () => [...reportsKeys.all, 'my'] as const,
};

/**
 * Fetch All Reports (Admin + Supervisor)
 */
export function useReports(filters?: ReportFilters) {
  return useQuery({
    queryKey: reportsKeys.list(filters),
    queryFn: async () => {
      // API returns paginated response: { data: WorkReport[], meta: { total, page, limit } }
      const response = await apiClient.get<{
        data: WorkReport[];
        meta: { total: number; page: number; limit: number };
      }>('/reports', {
        params: filters,
      });

      // Parse response: backend should return { data: [], meta: {} }
      // If array is returned directly, wrap it in expected structure
      if (Array.isArray(response.data)) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Reports API returned array instead of { data, meta } structure');
        }
        return {
          data: response.data,
          meta: {
            total: response.data.length,
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            totalPages: 1,
          },
        };
      }

      // Expected structure
      const data = response.data.data || [];
      const meta = response.data.meta || {
        total: 0,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
      };

      return {
        data,
        meta: {
          ...meta,
          totalPages: Math.ceil(meta.total / meta.limit),
        },
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch Single Report
 */
export function useReport(id: string) {
  return useQuery({
    queryKey: reportsKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<WorkReport>(`/reports/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Fetch My Reports (Worker only)
 */
export function useMyReports() {
  return useQuery({
    queryKey: reportsKeys.my(),
    queryFn: async () => {
      const response = await apiClient.get<WorkReport[]>('/reports/my-reports');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Mark Report as Reviewed
 */
export function useReviewReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiClient.patch<WorkReport>(
        `/reports/${reportId}/review`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reportsKeys.details() });
    },
  });
}

/**
 * Delete Report (Admin only)
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      await apiClient.delete(`/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
    },
  });
}
