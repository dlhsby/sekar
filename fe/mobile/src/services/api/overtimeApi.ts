/**
 * Overtime API Service
 * Phase 2C: new module for overtime management
 */

import { get, post } from './apiClient';
import apiClient from './apiClient';
import type {
  CreateOvertimeRequest,
  RejectOvertimeRequest,
  ApiResponse,
} from '../../types/api.types';
import type { Overtime } from '../../types/models.types';

export async function submitOvertime(
  data: CreateOvertimeRequest,
): Promise<ApiResponse<Overtime>> {
  return post<Overtime>('/overtime', data);
}

export async function getMyOvertimes(): Promise<ApiResponse<Overtime[]>> {
  return get<Overtime[]>('/overtime/my');
}

export async function getPendingApprovals(): Promise<ApiResponse<Overtime[]>> {
  return get<Overtime[]>('/overtime');
}

export async function getOvertimeById(
  id: string,
): Promise<ApiResponse<Overtime>> {
  return get<Overtime>(`/overtime/${id}`);
}

export async function approveOvertime(
  id: string,
): Promise<ApiResponse<Overtime>> {
  try {
    const response = await apiClient.patch<Overtime>(`/overtime/${id}/approve`);
    return { data: response.data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Approve failed';
    return { error: message };
  }
}

export async function rejectOvertime(
  id: string,
  reason: string,
): Promise<ApiResponse<Overtime>> {
  try {
    const body: RejectOvertimeRequest = { reason };
    const response = await apiClient.patch<Overtime>(
      `/overtime/${id}/reject`,
      body,
    );
    return { data: response.data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reject failed';
    return { error: message };
  }
}

export default {
  submitOvertime,
  getMyOvertimes,
  getPendingApprovals,
  getOvertimeById,
  approveOvertime,
  rejectOvertime,
};
