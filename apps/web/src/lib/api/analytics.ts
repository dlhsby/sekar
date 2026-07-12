/**
 * Analytics API Client (Phase 5-2)
 * Interfaces, query hooks, and mutation hooks for analytics data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from './client';
import type { PaginatedResponse } from '@/types/models';

/**
 * Dashboard Summary — KPIs and trends for analytics overview
 */
export interface TodayMetrics {
  attendanceRate: number;
  activeWorkers: number;
  tasksCompleted: number;
  activitiesSubmitted: number;
  openTasks: number;
  overtimeHours: number;
}

export interface TrendMetrics {
  attendance: number[];
  taskCompletion: number[];
  activities: number[];
}

export interface AlertItem {
  areaId: string;
  areaName: string;
  deficit: number;
}

export interface Alerts {
  understaffedAreas: AlertItem[];
  overdueMaintenances: number;
  missingWorkers: number;
  overdueTasks: number;
}

export interface DashboardSummary {
  today: TodayMetrics;
  trends: TrendMetrics;
  alerts: Alerts;
}

/**
 * Worker Analytics — individual worker performance metrics
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface WorkerAnalytics extends Record<string, unknown> {
  id: string;
  full_name: string;
  date: string;
  attended: number;
  late_minutes: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  total_activities: number;
  approved_activities: number;
  activity_submission_rate: number;
  activity_approval_rate: number;
  within_area_pings: number;
  total_pings: number;
  area_compliance: number;
  overtime_hours: number;
  performance_score: number;
  grade: Grade;
  last_updated?: string;
}

/**
 * Area Analytics — area-level performance metrics
 */
export interface AreaAnalytics extends Record<string, unknown> {
  id: string;
  area_name: string;
  date: string;
  attended_workers: number;
  required_workers: number;
  staffing_coverage: number;
  open_tasks: number;
  maintenance_count: number;
  incident_rate: number;
  avg_worker_performance: number;
  last_updated?: string;
}

/**
 * Operational Analytics — system-wide metrics
 */
export interface OperationalAnalytics {
  date: string;
  system_attendance: number;
  task_throughput: number;
  avg_response_hours: number;
  overtime_ratio: number;
  worker_utilization: number;
  geofence_compliance: number;
  last_updated?: string;
}

/**
 * Query filters for worker analytics
 */
export interface WorkerAnalyticsFilters {
  date_from?: string;
  date_to?: string;
  area_id?: string;
  rayon_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Query filters for area analytics
 */
export interface AreaAnalyticsFilters {
  date_from?: string;
  date_to?: string;
  rayon_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Query filters for operational analytics
 */
export interface OperationalFilters {
  date_from?: string;
  date_to?: string;
}

/**
 * Query key factory for analytics
 */
const analyticsQueryKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsQueryKeys.all, 'dashboard'] as const,
  workers: () => [...analyticsQueryKeys.all, 'workers'] as const,
  workersWithFilters: (filters: WorkerAnalyticsFilters) =>
    [...analyticsQueryKeys.workers(), filters] as const,
  worker: (id: string) => [...analyticsQueryKeys.all, 'worker', id] as const,
  areas: () => [...analyticsQueryKeys.all, 'areas'] as const,
  areasWithFilters: (filters: AreaAnalyticsFilters) =>
    [...analyticsQueryKeys.areas(), filters] as const,
  area: (id: string) => [...analyticsQueryKeys.all, 'area', id] as const,
  operational: () => [...analyticsQueryKeys.all, 'operational'] as const,
  operationalWithFilters: (filters: OperationalFilters) =>
    [...analyticsQueryKeys.operational(), filters] as const,
  operationalTrends: () => [...analyticsQueryKeys.all, 'operational', 'trends'] as const,
  operationalTrendsWithFilters: (filters: OperationalFilters) =>
    [...analyticsQueryKeys.operationalTrends(), filters] as const,
};

/**
 * Fetch dashboard summary
 */
async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/analytics/dashboard');
  return data;
}

/**
 * Hook to fetch dashboard summary
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: analyticsQueryKeys.dashboard(),
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch paginated worker analytics
 */
async function fetchWorkerAnalytics(
  filters: WorkerAnalyticsFilters
): Promise<PaginatedResponse<WorkerAnalytics>> {
  const params = new URLSearchParams();
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.area_id) params.append('area_id', filters.area_id);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const { data } = await apiClient.get<PaginatedResponse<WorkerAnalytics>>(
    `/analytics/workers?${params}`
  );
  return data;
}

/**
 * Hook to fetch worker analytics (paginated, filtered)
 */
export function useWorkerAnalytics(filters: WorkerAnalyticsFilters = {}) {
  return useQuery({
    queryKey: analyticsQueryKeys.workersWithFilters(filters),
    queryFn: () => fetchWorkerAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}

/**
 * Fetch single worker analytics
 */
async function fetchWorker(
  id: string,
  filters?: Omit<WorkerAnalyticsFilters, 'page' | 'limit'>
): Promise<WorkerAnalytics> {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const { data } = await apiClient.get<WorkerAnalytics>(
    `/analytics/workers/${id}${params.toString() ? `?${params}` : ''}`
  );
  return data;
}

/**
 * Hook to fetch single worker analytics
 */
export function useWorker(id: string, filters?: Omit<WorkerAnalyticsFilters, 'page' | 'limit'>) {
  return useQuery({
    queryKey: [analyticsQueryKeys.worker(id), filters],
    queryFn: () => fetchWorker(id, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Fetch paginated area analytics
 */
async function fetchAreaAnalytics(
  filters: AreaAnalyticsFilters
): Promise<PaginatedResponse<AreaAnalytics>> {
  const params = new URLSearchParams();
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const { data } = await apiClient.get<PaginatedResponse<AreaAnalytics>>(
    `/analytics/areas?${params}`
  );
  return data;
}

/**
 * Hook to fetch area analytics (paginated, filtered)
 */
export function useLocationAnalytics(filters: AreaAnalyticsFilters = {}) {
  return useQuery({
    queryKey: analyticsQueryKeys.areasWithFilters(filters),
    queryFn: () => fetchAreaAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}

/**
 * Fetch single area analytics
 */
async function fetchArea(
  id: string,
  filters?: Omit<AreaAnalyticsFilters, 'page' | 'limit'>
): Promise<AreaAnalytics> {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);

  const { data } = await apiClient.get<AreaAnalytics>(
    `/analytics/locations/${id}${params.toString() ? `?${params}` : ''}`
  );
  return data;
}

/**
 * Hook to fetch single area analytics
 */
export function useLocation(id: string, filters?: Omit<AreaAnalyticsFilters, 'page' | 'limit'>) {
  return useQuery({
    queryKey: [analyticsQueryKeys.area(id), filters],
    queryFn: () => fetchArea(id, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Fetch operational analytics
 */
async function fetchOperational(filters: OperationalFilters): Promise<OperationalAnalytics> {
  const params = new URLSearchParams();
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);

  const { data } = await apiClient.get<OperationalAnalytics>(
    `/analytics/operational?${params}`
  );
  return data;
}

/**
 * Hook to fetch operational analytics
 */
export function useOperational(filters: OperationalFilters = {}) {
  return useQuery({
    queryKey: analyticsQueryKeys.operationalWithFilters(filters),
    queryFn: () => fetchOperational(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch operational analytics trends
 */
async function fetchOperationalTrends(
  filters: OperationalFilters
): Promise<OperationalAnalytics[]> {
  const params = new URLSearchParams();
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);

  const { data } = await apiClient.get<OperationalAnalytics[]>(
    `/analytics/operational/trends?${params}`
  );
  return data;
}

/**
 * Hook to fetch operational analytics trends
 */
export function useOperationalTrends(filters: OperationalFilters = {}) {
  return useQuery({
    queryKey: analyticsQueryKeys.operationalTrendsWithFilters(filters),
    queryFn: () => fetchOperationalTrends(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to refresh analytics materialized views (admin only)
 */
export function useRefreshAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ status: string }>('/analytics/refresh');
      return data;
    },
    onSuccess: () => {
      // Invalidate all analytics queries
      queryClient.invalidateQueries({ queryKey: analyticsQueryKeys.all });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      console.error('Failed to refresh analytics:', message);
    },
  });
}
