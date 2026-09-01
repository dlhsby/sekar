/**
 * Service Capacity API Service
 * Phase 3 sub-phase 3-10: admin task conversion capacity checking
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';

/**
 * Capacity row from service_capacity table
 */
export interface CapacityRow {
  id: string;
  district_id: string;
  year: number;
  week: number;
  service_type: 'pruning' | 'other';
  capacity_units: number;
  booked_units: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get capacity calendar for a district
 * Returns array of capacity rows for the specified date range
 */
export async function getCapacityCalendar(
  districtId: string,
  filters?: {
    year?: number;
    fromWeek?: number;
    toWeek?: number;
    serviceType?: 'pruning' | 'other';
  },
): Promise<ApiResponse<CapacityRow[]>> {
  return get<CapacityRow[]>(`/districts/${districtId}/capacity`, filters);
}

export default {
  getCapacityCalendar,
};
