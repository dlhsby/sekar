/**
 * Shift Definitions API Service
 *
 * Handles shift definition API calls for Phase 2.
 * Provides fixed shift configurations (Shift 1, 2, 3).
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  ShiftDefinition,
  ShiftDefinitionsListResponse,
  CurrentShiftDefinitionResponse,
} from '../../types/api.types';

/**
 * Get all shift definitions
 */
export async function getShiftDefinitions(): Promise<
  ApiResponse<ShiftDefinitionsListResponse>
> {
  return get<ShiftDefinitionsListResponse>('/shift-definitions');
}

/**
 * Get shift definition by ID
 */
export async function getShiftDefinitionById(
  id: string,
): Promise<ApiResponse<ShiftDefinition>> {
  return get<ShiftDefinition>(`/shift-definitions/${id}`);
}

/**
 * Get current shift definition based on current time
 */
export async function getCurrentShiftDefinition(): Promise<
  ApiResponse<CurrentShiftDefinitionResponse>
> {
  return get<CurrentShiftDefinitionResponse>('/shift-definitions/current');
}

export default {
  getShiftDefinitions,
  getShiftDefinitionById,
  getCurrentShiftDefinition,
};
