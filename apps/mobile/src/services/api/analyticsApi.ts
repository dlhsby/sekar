/**
 * Analytics API Service
 * Typed functions for analytics endpoints
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  WorkerAnalytics,
  AreaAnalytics,
  DashboardSummary,
  WorkersListResponse,
  OperationalAnalytics,
} from '../../types/analytics.types';

/**
 * Get dashboard summary with KPIs and trends
 * GET /analytics/dashboard
 */
export async function getDashboard(): Promise<ApiResponse<DashboardSummary>> {
  return get<DashboardSummary>('/analytics/dashboard');
}

/**
 * Get a worker's own analytics by ID
 * GET /analytics/workers/:id
 */
export async function getWorker(
  id: string,
  params?: { date_from?: string; date_to?: string },
): Promise<ApiResponse<WorkerAnalytics>> {
  return get<WorkerAnalytics>(`/analytics/workers/${id}`, params);
}

/**
 * Get paginated worker analytics (team list)
 * GET /analytics/workers
 */
export async function getWorkers(params?: {
  page?: number;
  limit?: number;
  district_id?: string;
  location_id?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
}): Promise<ApiResponse<WorkersListResponse>> {
  return get<WorkersListResponse>('/analytics/workers', params);
}

/**
 * Get area analytics
 * GET /analytics/areas
 */
export async function getAreaAnalytics(params?: {
  page?: number;
  limit?: number;
  district_id?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}): Promise<ApiResponse<{ data: AreaAnalytics[]; total: number; page: number; limit: number }>> {
  return get<{ data: AreaAnalytics[]; total: number; page: number; limit: number }>('/analytics/areas', params);
}

/**
 * Get system-wide operational analytics
 * GET /analytics/operational
 */
export async function getOperational(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<ApiResponse<OperationalAnalytics>> {
  return get<OperationalAnalytics>('/analytics/operational', params);
}

/**
 * Get operational analytics trends
 * GET /analytics/operational/trends
 */
export async function getOperationalTrends(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<ApiResponse<OperationalAnalytics[]>> {
  return get<OperationalAnalytics[]>('/analytics/operational/trends', params);
}

export default {
  getDashboard,
  getWorker,
  getWorkers,
  getAreaAnalytics,
  getOperational,
  getOperationalTrends,
};
