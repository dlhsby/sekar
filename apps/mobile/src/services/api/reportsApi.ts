/**
 * Reports API Service
 * Phase 5-1: Report generation, retrieval, and management
 */

import { get, post, del } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  ReportTemplate,
  GeneratedReport,
  ReportsListResponse,
  GenerateReportRequest,
} from '../../types/reports.types';

/**
 * GET /reporting/templates
 * Retrieve all available report templates
 */
export async function getTemplates(): Promise<ApiResponse<ReportTemplate[]>> {
  return get<ReportTemplate[]>('/reporting/templates');
}

/**
 * GET /reporting/templates/:slug
 * Retrieve a specific template by slug
 */
export async function getTemplate(slug: string): Promise<ApiResponse<ReportTemplate>> {
  return get<ReportTemplate>(`/reporting/templates/${slug}`);
}

/**
 * POST /reporting/generate
 * Request a report to be generated (returns 202 with status=processing)
 */
export async function generateReport(
  data: GenerateReportRequest,
): Promise<ApiResponse<GeneratedReport>> {
  return post<GeneratedReport>('/reporting/generate', data);
}

/**
 * GET /reporting/reports
 * List generated reports (paginated, user-scoped)
 */
export async function getReports(
  filters?: {
    report_type?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
): Promise<ApiResponse<ReportsListResponse>> {
  return get<ReportsListResponse>('/reporting/reports', filters);
}

/**
 * GET /reporting/reports/:id
 * Retrieve a specific generated report with presigned URL
 */
export async function getReport(id: string): Promise<ApiResponse<GeneratedReport>> {
  return get<GeneratedReport>(`/reporting/reports/${id}`);
}

/**
 * DELETE /reporting/reports/:id
 * Delete a generated report
 */
export async function deleteReport(id: string): Promise<ApiResponse<void>> {
  return del<void>(`/reporting/reports/${id}`);
}

export default {
  getTemplates,
  getTemplate,
  generateReport,
  getReports,
  getReport,
  deleteReport,
};
