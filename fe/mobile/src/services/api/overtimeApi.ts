/**
 * Overtime API Service
 * Phase 2C: Paginated overtime management with filters
 */

import { get, post, patch } from './apiClient';
import type {
  CreateOvertimeRequest,
  RejectOvertimeRequest,
  OvertimeFilter,
  OvertimeListResponse,
  ApiResponse,
} from '../../types/api.types';
import type { Overtime } from '../../types/models.types';

function buildQuery(filters?: OvertimeFilter): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);
  if (filters.area_id) params.append('area_id', filters.area_id);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.user_id) params.append('user_id', filters.user_id);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.sort_dir) params.append('sort_dir', filters.sort_dir);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function submitOvertime(
  data: CreateOvertimeRequest,
): Promise<ApiResponse<Overtime>> {
  return post<Overtime>('/overtime', data);
}

export async function getMyOvertimes(
  filters?: OvertimeFilter,
): Promise<ApiResponse<OvertimeListResponse>> {
  return get<OvertimeListResponse>(`/overtime/my${buildQuery(filters)}`);
}

export async function getOvertimes(
  filters?: OvertimeFilter,
): Promise<ApiResponse<OvertimeListResponse>> {
  return get<OvertimeListResponse>(`/overtime${buildQuery(filters)}`);
}

export async function getOvertimeById(
  id: string,
): Promise<ApiResponse<Overtime>> {
  return get<Overtime>(`/overtime/${id}`);
}

export async function approveOvertime(
  id: string,
): Promise<ApiResponse<Overtime>> {
  return patch<Overtime>(`/overtime/${id}/approve`);
}

export async function rejectOvertime(
  id: string,
  reason: string,
): Promise<ApiResponse<Overtime>> {
  const body: RejectOvertimeRequest = { reason };
  return patch<Overtime>(`/overtime/${id}/reject`, body);
}

export default {
  submitOvertime,
  getMyOvertimes,
  getOvertimes,
  getOvertimeById,
  approveOvertime,
  rejectOvertime,
};
