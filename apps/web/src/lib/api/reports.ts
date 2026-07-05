/**
 * Reports API Client (Phase 5-1 - Reporting Module)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/models';

/**
 * Report Type Enum — matches backend
 */
export enum ReportType {
  DAILY_OPERATIONS = 'daily_operations',
  WEEKLY_PERFORMANCE = 'weekly_performance',
  MONTHLY_SUMMARY = 'monthly_summary',
  WORKER_PERFORMANCE = 'worker_performance',
  AREA_STATUS = 'area_status',
  OVERTIME_UTILIZATION = 'overtime_utilization',
}

/**
 * Report Format Enum — matches backend
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
}

/**
 * Report Generation Status Enum
 */
export enum GeneratedReportStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Report Template Interface
 */
export interface ReportTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  report_type: ReportType;
  template_config?: Record<string, any>;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Report Parameters Interface
 */
export interface ReportParameters {
  start_date?: string;
  end_date?: string;
  area_id?: string;
  rayon_id?: string;
  worker_id?: string;
  [key: string]: any;
}

/**
 * Generated Report Interface
 */
export interface GeneratedReport extends Record<string, unknown> {
  id: string;
  template_id: string;
  generated_by?: string;
  schedule_id?: string;
  title: string;
  report_type: ReportType;
  format: ReportFormat;
  status: GeneratedReportStatus;
  file_url?: string;
  file_size_bytes?: number;
  parameters?: ReportParameters;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Report Schedule Interface
 */
export interface ReportSchedule extends Record<string, unknown> {
  id: string;
  template_id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  cron_expression: string;
  timezone: string;
  parameters?: ReportParameters;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate Report DTO
 */
export interface GenerateReportDto {
  report_type: ReportType;
  slug?: string;
  format: ReportFormat;
  parameters?: ReportParameters;
}

/**
 * Create Schedule DTO
 */
export interface CreateScheduleDto {
  name: string;
  template_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  cron_expression: string;
  timezone?: string;
  parameters?: ReportParameters;
}

/**
 * Update Schedule DTO
 */
export interface UpdateScheduleDto {
  name?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  cron_expression?: string;
  timezone?: string;
  is_active?: boolean;
  parameters?: ReportParameters;
}

/**
 * Report Filters
 */
export interface ReportFilters {
  report_type?: ReportType;
  template_slug?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Query Key Factory
 */
export const reportsKeys = {
  all: ['reports'] as const,
  templates: () => [...reportsKeys.all, 'templates'] as const,
  template: (slug: string) => [...reportsKeys.templates(), slug] as const,
  lists: () => [...reportsKeys.all, 'list'] as const,
  list: (filters?: ReportFilters) => [...reportsKeys.lists(), filters] as const,
  details: () => [...reportsKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportsKeys.details(), id] as const,
  schedules: () => [...reportsKeys.all, 'schedules'] as const,
};

/**
 * Fetch all report templates
 */
export function useReportTemplates() {
  return useQuery({
    queryKey: reportsKeys.templates(),
    queryFn: async () => {
      const response = await apiClient.get<ReportTemplate[]>('/reporting/templates');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch a single report template by slug
 */
export function useReportTemplate(slug: string) {
  return useQuery({
    queryKey: reportsKeys.template(slug),
    queryFn: async () => {
      const response = await apiClient.get<ReportTemplate>(`/reporting/templates/${slug}`);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!slug,
  });
}

/**
 * Fetch generated reports (paginated)
 */
export function useReports(filters?: ReportFilters) {
  return useQuery({
    queryKey: reportsKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<GeneratedReport>>(
        '/reporting/reports',
        {
          params: filters,
        }
      );
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds (poll while processing)
  });
}

/**
 * Fetch a single generated report by ID
 */
export function useReport(id: string) {
  return useQuery({
    queryKey: reportsKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<GeneratedReport>(`/reporting/reports/${id}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds (poll while processing)
    enabled: !!id,
  });
}

/**
 * Generate a report (async)
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateReportDto) => {
      const response = await apiClient.post<GeneratedReport>('/reporting/generate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
    },
  });
}

/**
 * Delete a generated report
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      await apiClient.delete(`/reporting/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.lists() });
    },
  });
}

/**
 * Fetch all report schedules (admin only)
 */
export function useSchedules() {
  return useQuery({
    queryKey: reportsKeys.schedules(),
    queryFn: async () => {
      const response = await apiClient.get<ReportSchedule[]>('/reporting/schedules');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single schedule by ID (admin only)
 */
export function useSchedule(id: string) {
  return useQuery({
    queryKey: [...reportsKeys.schedules(), id],
    queryFn: async () => {
      const response = await apiClient.get<ReportSchedule>(`/reporting/schedules/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!id,
  });
}

/**
 * Create a new schedule (admin only)
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleDto) => {
      const response = await apiClient.post<ReportSchedule>('/reporting/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
    },
  });
}

/**
 * Update a schedule (admin only)
 */
export function useUpdateSchedule(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateScheduleDto) => {
      const response = await apiClient.patch<ReportSchedule>(`/reporting/schedules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
      queryClient.invalidateQueries({ queryKey: [...reportsKeys.schedules(), id] });
    },
  });
}

/**
 * Delete a schedule (admin only)
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiClient.delete(`/reporting/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.schedules() });
    },
  });
}
