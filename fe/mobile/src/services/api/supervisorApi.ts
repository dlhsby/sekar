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
 * @param limit - Items per page (default 500 to get all workers)
 * @returns Paginated list of active workers with their locations
 */
export async function getActiveWorkers(
  page: number = 1,
  limit: number = 500,
): Promise<
  ApiResponse<{ data: ActiveWorkerData[]; meta: { total: number; page: number; limit: number; totalPages: number } }>
> {
  return get('/supervisor/active-workers', { page, limit });
}

/**
 * Get reports with filters
 * @param filters - Filter parameters
 * @returns List of reports
 */
export async function getReports(
  filters: ReportsFilter = {},
): Promise<ApiResponse<ReportsListResponse[]>> {
  return get<ReportsListResponse[]>('/supervisor/reports', filters);
}

/**
 * Get report details
 * @param reportId - Report ID
 * @returns Report details
 */
export async function getReportDetails(
  reportId: number,
): Promise<ApiResponse<WorkReport>> {
  return get<WorkReport>(`/reports/${reportId}`);
}

/**
 * Mark report as reviewed
 * @param reportId - Report ID
 * @returns Review response
 */
export async function reviewReport(
  reportId: number,
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

