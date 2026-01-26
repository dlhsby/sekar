/**
 * Monitoring API Service
 *
 * Handles real-time monitoring API calls for Phase 2.
 * Provides stats and live worker positions by scope (city, rayon, area).
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  CityMonitoringResponse,
  RayonMonitoringResponse,
  AreaMonitoringResponse,
  LiveWorkersResponse,
  LiveWorkersFilter,
  MonitoringFilter,
} from '../../types/api.types';

/**
 * Get city-wide monitoring stats (Admin/TopManagement)
 */
export async function getCityMonitoring(
  filters?: MonitoringFilter,
): Promise<ApiResponse<CityMonitoringResponse>> {
  return get<CityMonitoringResponse>('/monitoring/city', filters);
}

/**
 * Get rayon monitoring stats (KepalaRayon+)
 */
export async function getRayonMonitoring(
  rayonId: string,
  filters?: MonitoringFilter,
): Promise<ApiResponse<RayonMonitoringResponse>> {
  return get<RayonMonitoringResponse>(`/monitoring/rayon/${rayonId}`, filters);
}

/**
 * Get area monitoring stats (KoordinatorLapangan+)
 */
export async function getAreaMonitoring(
  areaId: string,
  filters?: MonitoringFilter,
): Promise<ApiResponse<AreaMonitoringResponse>> {
  return get<AreaMonitoringResponse>(`/monitoring/area/${areaId}`, filters);
}

/**
 * Get live worker positions
 */
export async function getLiveWorkers(
  filters?: LiveWorkersFilter,
): Promise<ApiResponse<LiveWorkersResponse>> {
  return get<LiveWorkersResponse>('/monitoring/live-workers', filters);
}

export default {
  getCityMonitoring,
  getRayonMonitoring,
  getAreaMonitoring,
  getLiveWorkers,
};
