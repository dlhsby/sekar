/**
 * Shift Definitions API Service
 *
 * Handles shift definition API calls. Shifts are configurable at runtime
 * (ADR-055) — fetched dynamically, not a fixed set.
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  ShiftDefinitionsListResponse,
  CurrentShiftDefinitionResponse,
} from '../../types/api.types';
import type { ShiftDefinition } from '../../types/models.types';

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
