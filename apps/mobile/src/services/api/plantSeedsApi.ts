/**
 * Plant Seeds API Service
 * Phase 3 sub-phase 3-12: seed inventory management for admin_rayon and management
 */

import { get, post } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { PlantSeed, SeedTransaction } from '../../types/models.types';

/**
 * List all plant seeds with optional search and pagination
 * Accessible to: admin_rayon, kepala_rayon, management, admin_system, superadmin
 */
export async function getSeeds(
  filters?: {
    search?: string;  // Search by nameId (ILIKE)
    page?: number;
    limit?: number;
  },
): Promise<ApiResponse<{ items: PlantSeed[]; total: number }>> {
  return get<{ items: PlantSeed[]; total: number }>('/plant-seeds', filters);
}

/**
 * Get details for a single seed
 */
export async function getSeedById(id: string): Promise<ApiResponse<PlantSeed>> {
  return get<PlantSeed>(`/plant-seeds/${id}`);
}

/**
 * Create a new seed record
 * Accessible to: admin_rayon, kepala_rayon, management, superadmin
 */
export async function createSeed(data: {
  nameId: string;          // Seed SKU/name
  speciesId?: string;      // Optional link to plant species
  unit: 'gram' | 'piece' | 'packet';
  stockQty?: number;       // Initial stock quantity (defaults to 0)
}): Promise<ApiResponse<PlantSeed>> {
  const response = await post<PlantSeed>('/plant-seeds', data);

  if (response.data && typeof response.data === 'object' && 'id' in response.data) {
    return response;
  }

  if (response.error) {
    return response;
  }

  return {
    error: 'Invalid response shape from server',
  };
}

/**
 * Record a transaction (purchase, distribution, or adjustment)
 * Accessible to: admin_rayon, kepala_rayon, management, superadmin
 *
 * For purchase: qty is added to stock
 * For distribution: qty is subtracted from stock
 * For adjustment: qty adjusts stock (can be + or -)
 */
export async function recordTransaction(
  seedId: string,
  data: {
    transactionType: 'purchase' | 'distribution' | 'adjustment';
    qty: number;
    unitPrice?: number;          // Optional for purchases
    supplier?: string;           // Optional for purchases
    receiptUrl?: string;         // S3 URL to receipt
    toDistrictId?: string;          // For distribution
    toAreaId?: string;           // For distribution
    recipientName?: string;      // For distribution
    occurredAt: string;          // YYYY-MM-DD
    notes?: string;
  },
): Promise<ApiResponse<{ transaction: SeedTransaction; seed: PlantSeed }>> {
  const response = await post<{ transaction: SeedTransaction; seed: PlantSeed }>(
    `/plant-seeds/${seedId}/transactions`,
    data,
  );

  if (
    response.data &&
    typeof response.data === 'object' &&
    'transaction' in response.data &&
    'seed' in response.data
  ) {
    return response;
  }

  if (response.error) {
    return response;
  }

  return {
    error: 'Invalid response shape from server',
  };
}

/**
 * Get transaction ledger for a seed
 * Accessible to: admin_rayon, kepala_rayon, management, admin_system, superadmin
 */
export async function getSeedTransactions(
  seedId: string,
  filters?: {
    type?: 'purchase' | 'distribution' | 'adjustment';  // Filter by transaction type
    from?: string;                                        // Start date (YYYY-MM-DD)
    to?: string;                                          // End date (YYYY-MM-DD)
    page?: number;
    limit?: number;
  },
): Promise<ApiResponse<{ items: SeedTransaction[]; total: number }>> {
  return get<{ items: SeedTransaction[]; total: number }>(
    `/plant-seeds/${seedId}/transactions`,
    filters,
  );
}

export default {
  getSeeds,
  getSeedById,
  createSeed,
  recordTransaction,
  getSeedTransactions,
};
