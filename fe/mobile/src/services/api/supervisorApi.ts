/**
 * Supervisor API Service
 * Supervisor-specific API calls
 */

import { get, put } from './apiClient';
import type {
  ActiveWorkersResponse,
  ReportsFilter,
  ReportsListResponse,
  ReviewReportRequest,
  ReviewReportResponse,
  AttendanceFilter,
  AttendanceResponse,
  ApiResponse,
} from '../../types/api.types';
import type { WorkReport } from '../../types/models.types';

/**
 * Get all currently active workers
 * @returns List of active workers with their locations
 */
export async function getActiveWorkers(): Promise<
  ApiResponse<ActiveWorkersResponse>
> {
  return get<ActiveWorkersResponse>('/api/supervisor/active-workers');
}

/**
 * Get reports with filters
 * @param filters - Filter parameters
 * @returns List of reports
 */
export async function getReports(
  filters: ReportsFilter = {},
): Promise<ApiResponse<ReportsListResponse[]>> {
  return get<ReportsListResponse[]>('/api/supervisor/reports', filters);
}

/**
 * Get report details
 * @param reportId - Report ID
 * @returns Report details
 */
export async function getReportDetails(
  reportId: number,
): Promise<ApiResponse<WorkReport>> {
  return get<WorkReport>(`/api/reports/${reportId}`);
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
  return put<ReviewReportResponse>(`/api/reports/${reportId}/review`, payload);
}

/**
 * Get attendance records
 * @param filters - Filter parameters
 * @returns List of attendance records
 */
export async function getAttendance(
  filters: AttendanceFilter = {},
): Promise<ApiResponse<AttendanceResponse>> {
  return get<AttendanceResponse>('/api/supervisor/attendance', filters);
}

