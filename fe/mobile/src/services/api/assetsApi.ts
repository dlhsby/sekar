/**
 * Assets API Service
 * Phase 5-3: Asset management endpoint integration
 */

import { get, post } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  Asset,
  AssetCategory,
  AssetAssignment,
  PaginatedAssetsResponse,
} from '../../types/assets.types';

export interface AssetFilters {
  status?: string;
  category_id?: string;
  area_id?: string;
  rayon_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CheckoutPayload {
  condition_at_checkout: string;
  expected_return_at?: string;
  notes?: string;
}

export interface ReturnPayload {
  condition_at_return: string;
  notes?: string;
}

/**
 * Fetch all asset categories
 */
export async function getCategories(): Promise<ApiResponse<AssetCategory[]>> {
  return get<AssetCategory[]>('/assets/categories');
}

/**
 * Fetch paginated assets list with filters
 */
export async function getAssets(
  filters?: AssetFilters,
): Promise<ApiResponse<PaginatedAssetsResponse>> {
  const params: Record<string, any> = {};
  if (filters) {
    if (filters.status) params.status = filters.status;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.area_id) params.area_id = filters.area_id;
    if (filters.rayon_id) params.rayon_id = filters.rayon_id;
    if (filters.search) params.search = filters.search;
    params.page = filters.page || 1;
    params.limit = filters.limit || 10;
  } else {
    params.page = 1;
    params.limit = 10;
  }
  return get<PaginatedAssetsResponse>('/assets', params);
}

/**
 * Fetch asset by ID
 */
export async function getAssetById(id: string): Promise<ApiResponse<Asset>> {
  return get<Asset>(`/assets/${id}`);
}

/**
 * Scan asset by QR code (asset_code or SEKAR:asset_code)
 */
export async function scanAssetByCode(code: string): Promise<ApiResponse<Asset>> {
  // Extract code from SEKAR:CODE format if present
  const cleanCode = code.startsWith('SEKAR:') ? code.substring(6) : code;
  return get<Asset>(`/assets/scan/${cleanCode}`);
}

/**
 * Fetch current user's checked-out assets
 */
export async function getMyAssets(): Promise<ApiResponse<AssetAssignment[]>> {
  return get<AssetAssignment[]>('/assets/my-assets');
}

/**
 * Checkout an asset
 */
export async function checkoutAsset(
  assetId: string,
  payload: CheckoutPayload,
): Promise<ApiResponse<AssetAssignment>> {
  return post<AssetAssignment>(`/assets/${assetId}/checkout`, payload);
}

/**
 * Return an asset
 */
export async function returnAsset(
  assetId: string,
  payload: ReturnPayload,
): Promise<ApiResponse<AssetAssignment>> {
  return post<AssetAssignment>(`/assets/${assetId}/return`, payload);
}

/**
 * Fetch assignment history for an asset
 */
export async function getAssetAssignments(
  assetId: string,
): Promise<ApiResponse<AssetAssignment[]>> {
  return get<AssetAssignment[]>(`/assets/${assetId}/assignments`);
}

export default {
  getCategories,
  getAssets,
  getAssetById,
  scanAssetByCode,
  getMyAssets,
  checkoutAsset,
  returnAsset,
  getAssetAssignments,
};
