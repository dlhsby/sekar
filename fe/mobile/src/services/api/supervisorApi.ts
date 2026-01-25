/**
 * Supervisor API Service
 * Supervisor-specific API calls
 */

import { get, put } from './apiClient';
import type {
  ReportsFilter,
  ReportsListResponse,
  ReviewReportRequest,
  ReviewReportResponse,
  AttendanceFilter,
  AttendanceResponse,
  ApiResponse,
  ActiveWorkerData,
} from '../../types/api.types';
import type { WorkReport } from '../../types/models.types';

/**
 * Get all currently active workers (paginated)
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 50, max 100)
 * @returns Paginated list of active workers with their locations
 */
export async function getActiveWorkers(
  page: number = 1,
  limit: number = 50,
): Promise<
  ApiResponse<{ data: ActiveWorkerData[]; meta: { total: number; page: number; limit: number; totalPages: number } }>
> {
  // Backend max limit is 100
  const safeLimit = Math.min(limit, 100);
  return get('/supervisor/active-workers', { page, limit: safeLimit });
}

/**
 * Get reports with filters
 * Uses /reports endpoint (supervisor/reports doesn't exist)
 * @param filters - Filter parameters
 * @returns Paginated list of reports
 */
export async function getReports(
  filters: ReportsFilter = {},
): Promise<ApiResponse<{ data: ReportsListResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }>> {
  // Convert date filter to from_date/to_date format expected by backend
  const params: Record<string, any> = {};

  if (filters.date) {
    // Single date filter - get reports from start to end of that day
    params.from_date = filters.date;
    params.to_date = filters.date;
  }

  if (filters.worker_id) {
    params.worker_id = filters.worker_id;
  }

  if (filters.area_id) {
    // Note: Backend doesn't have area_id filter, but we keep it for future
    params.area_id = filters.area_id;
  }

  return get('/reports', params);
}

/**
 * Get report details
 * @param reportId - Report UUID
 * @returns Report details
 */
export async function getReportDetails(
  reportId: string,
): Promise<ApiResponse<WorkReport>> {
  return get<WorkReport>(`/reports/${reportId}`);
}

/**
 * Mark report as reviewed
 * @param reportId - Report UUID
 * @returns Review response
 */
export async function reviewReport(
  reportId: string,
): Promise<ApiResponse<ReviewReportResponse>> {
  const payload: ReviewReportRequest = { reviewed: true };
  return put<ReviewReportResponse>(`/reports/${reportId}/review`, payload);
}

/**
 * Get attendance records
 * @param filters - Filter parameters
 * @returns List of attendance records
 */
export async function getAttendance(
  filters: AttendanceFilter = {},
): Promise<ApiResponse<AttendanceResponse>> {
  return get<AttendanceResponse>('/supervisor/attendance', filters);
}

