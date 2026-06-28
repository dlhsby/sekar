/**
 * Assets API Client (Phase 5-3)
 * Handles asset management, QR codes, checkouts, and maintenance
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from './client';
import type { PaginatedResponse } from '@/types/models';

/**
 * Asset Status Enum
 */
export type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired' | 'lost';

/**
 * Asset Condition Enum
 */
export type AssetCondition = 'good' | 'fair' | 'poor' | 'damaged' | 'unusable';

/**
 * Maintenance Type Enum
 */
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'replacement';

/**
 * Maintenance Status Enum
 */
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

/** Conditions selectable at checkout (asset in use can't already be unusable). */
export const CHECKOUT_CONDITIONS: AssetCondition[] = ['good', 'fair', 'poor', 'damaged'];

/**
 * Asset Category
 */
export interface AssetCategory {
  id: string;
  name: string;
  slug: string;
  code_prefix: string;
  description?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Asset — extends Record<string, unknown> so it satisfies the DataTable<T>
 * generic constraint (the house convention, see models.ts `Area`).
 */
export interface Asset extends Record<string, unknown> {
  id: string;
  category_id: string;
  category: AssetCategory;
  area_id?: string;
  area?: {
    id: string;
    name: string;
  };
  rayon_id?: string;
  rayon?: {
    id: string;
    name: string;
  };
  name: string;
  asset_code: string;
  description?: string;
  status: AssetStatus;
  condition: AssetCondition;
  purchase_date?: string;
  purchase_price?: number;
  qr_code_url?: string;
  photo_url?: string;
  last_maintenance_at?: string;
  next_maintenance_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Audit trail: user IDs for create/update/delete operations
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
}

/**
 * Asset Assignment (Checkout/Return Record)
 */
export interface AssetAssignment {
  id: string;
  asset_id: string;
  asset?: Asset;
  assigned_to: string;
  assignedTo?: {
    id: string;
    full_name: string;
  };
  assigned_by: string;
  assignedBy?: {
    id: string;
    full_name: string;
  };
  checked_out_at: string;
  expected_return_at?: string;
  returned_at?: string;
  returned_to?: string;
  returnedTo?: {
    id: string;
    full_name: string;
  };
  condition_at_checkout: AssetCondition;
  condition_at_return?: AssetCondition;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Asset Maintenance Record
 */
export interface AssetMaintenance {
  id: string;
  asset_id: string;
  asset?: Asset;
  maintenance_type: MaintenanceType;
  scheduled_at: string;
  completed_at?: string;
  performed_by?: string;
  performedBy?: {
    id: string;
    full_name: string;
  };
  status: MaintenanceStatus;
  description?: string;
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Asset Filters
 */
export interface AssetFilters {
  category_id?: string;
  status?: AssetStatus;
  area_id?: string;
  rayon_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Asset DTO
 */
export interface CreateAssetDto {
  category_id: string;
  area_id?: string;
  rayon_id?: string;
  name: string;
  description?: string;
  purchase_date?: string;
  purchase_price?: number;
}

/**
 * Update Asset DTO
 */
export interface UpdateAssetDto {
  category_id?: string;
  area_id?: string;
  rayon_id?: string;
  name?: string;
  description?: string;
  purchase_date?: string;
  purchase_price?: number;
  status?: AssetStatus;
  condition?: AssetCondition;
}

/**
 * Checkout Asset DTO
 */
export interface CheckoutAssetDto {
  assigned_to?: string;
  expected_return_at?: string;
  condition_at_checkout: AssetCondition;
  notes?: string;
}

/**
 * Return Asset DTO
 */
export interface ReturnAssetDto {
  condition_at_return: AssetCondition;
  notes?: string;
}

/**
 * Create Maintenance DTO
 */
export interface CreateMaintenanceDto {
  maintenance_type: MaintenanceType;
  scheduled_at: string;
  description?: string;
  cost?: number;
}

/**
 * Update Maintenance DTO
 */
export interface UpdateMaintenanceDto {
  status?: MaintenanceStatus;
  completed_at?: string;
  performed_by?: string;
  description?: string;
  cost?: number;
  notes?: string;
}

/**
 * Bulk QR DTO
 */
export interface BulkQrDto {
  asset_ids: string[];
}

/**
 * Maintenance Calendar Response
 */
export interface MaintenanceCalendarDay {
  date: string;
  maintenances: AssetMaintenance[];
}

/**
 * Query Key Factory
 */
export const assetKeys = {
  all: ['assets'] as const,
  categories: () => [...assetKeys.all, 'categories'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters?: AssetFilters) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  myAssets: () => [...assetKeys.all, 'my-assets'] as const,
  assignments: (id: string) => [...assetKeys.all, 'assignments', id] as const,
  maintenance: () => [...assetKeys.all, 'maintenance'] as const,
  maintenanceCalendar: (month: number, year: number) =>
    [...assetKeys.maintenance(), 'calendar', month, year] as const,
  overdueeMaintenance: () => [...assetKeys.maintenance(), 'overdue'] as const,
};

/**
 * Fetch asset categories
 */
async function fetchAssetCategories(): Promise<AssetCategory[]> {
  const response = await apiClient.get<AssetCategory[]>('/assets/categories');
  return response.data;
}

/**
 * Fetch assets with filters
 */
async function fetchAssets(filters: AssetFilters = {}): Promise<PaginatedResponse<Asset>> {
  const params = new URLSearchParams();

  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.area_id) params.append('area_id', filters.area_id);
  if (filters.rayon_id) params.append('rayon_id', filters.rayon_id);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await apiClient.get<PaginatedResponse<Asset>>(
    `/assets?${params.toString()}`
  );
  return response.data;
}

/**
 * Fetch a single asset by ID
 */
async function fetchAsset(id: string): Promise<Asset> {
  const response = await apiClient.get<Asset>(`/assets/${id}`);
  return response.data;
}

/**
 * Create a new asset
 */
async function createAsset(data: CreateAssetDto): Promise<Asset> {
  const response = await apiClient.post<Asset>('/assets', data);
  return response.data;
}

/**
 * Update an existing asset
 */
async function updateAsset(id: string, data: UpdateAssetDto): Promise<Asset> {
  const response = await apiClient.patch<Asset>(`/assets/${id}`, data);
  return response.data;
}

/**
 * Delete an asset (soft delete)
 */
async function deleteAsset(id: string): Promise<void> {
  await apiClient.delete(`/assets/${id}`);
}

/**
 * Generate QR code for a single asset
 */
async function generateQr(id: string): Promise<{ url: string }> {
  const response = await apiClient.post<{ url: string }>(`/assets/${id}/qr`, {});
  return response.data;
}

/**
 * Generate QR codes for multiple assets
 */
async function generateBulkQr(
  asset_ids: string[]
): Promise<{ assetId: string; assetCode: string; qrCodeUrl: string }[]> {
  const response = await apiClient.post<
    { assetId: string; assetCode: string; qrCodeUrl: string }[]
  >('/assets/qr/bulk', { asset_ids });
  return response.data;
}

/**
 * Scan asset by code
 */
async function scanAssetByCode(code: string): Promise<Asset> {
  const response = await apiClient.get<Asset>(`/assets/scan/${code}`);
  return response.data;
}

/**
 * Checkout asset
 */
async function checkoutAsset(id: string, data: CheckoutAssetDto): Promise<AssetAssignment> {
  const response = await apiClient.post<AssetAssignment>(`/assets/${id}/checkout`, data);
  return response.data;
}

/**
 * Return asset
 */
async function returnAsset(id: string, data: ReturnAssetDto): Promise<AssetAssignment> {
  const response = await apiClient.post<AssetAssignment>(`/assets/${id}/return`, data);
  return response.data;
}

/**
 * Get asset assignments
 */
async function fetchAssetAssignments(id: string): Promise<AssetAssignment[]> {
  const response = await apiClient.get<AssetAssignment[]>(`/assets/${id}/assignments`);
  return response.data;
}

/**
 * Get current user's active assets
 */
async function fetchMyAssets(): Promise<AssetAssignment[]> {
  const response = await apiClient.get<AssetAssignment[]>('/assets/my-assets');
  return response.data;
}

/**
 * Create maintenance record
 */
async function createMaintenance(
  id: string,
  data: CreateMaintenanceDto
): Promise<AssetMaintenance> {
  const response = await apiClient.post<AssetMaintenance>(`/assets/${id}/maintenance`, data);
  return response.data;
}

/**
 * Update maintenance record
 */
async function updateMaintenance(
  id: string,
  data: UpdateMaintenanceDto
): Promise<AssetMaintenance> {
  const response = await apiClient.patch<AssetMaintenance>(`/assets/maintenance/${id}`, data);
  return response.data;
}

/**
 * Get maintenance calendar for a month
 */
async function fetchMaintenanceCalendar(month: number, year: number): Promise<AssetMaintenance[]> {
  const response = await apiClient.get<AssetMaintenance[]>(
    `/assets/maintenance/calendar?month=${month}&year=${year}`
  );
  return response.data;
}

/**
 * Get overdue maintenance
 */
async function fetchOverdueMaintenance(): Promise<AssetMaintenance[]> {
  const response = await apiClient.get<AssetMaintenance[]>('/assets/maintenance/overdue');
  return response.data;
}

/**
 * Hook to fetch asset categories
 */
export function useAssetCategories(
  options?: Omit<UseQueryOptions<AssetCategory[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.categories(),
    queryFn: () => fetchAssetCategories(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch assets with filters
 */
export function useAssets(
  filters: AssetFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Asset>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => fetchAssets(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single asset
 */
export function useAsset(
  id: string,
  options?: Omit<UseQueryOptions<Asset>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => fetchAsset(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to create an asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetDto) => createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Hook to update an asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetDto }) => updateAsset(id, data),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.setQueryData(assetKeys.detail(asset.id), asset);
    },
  });
}

/**
 * Hook to delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Hook to generate QR code
 */
export function useGenerateQr() {
  return useMutation({
    mutationFn: (id: string) => generateQr(id),
  });
}

/**
 * Hook to generate bulk QR codes
 */
export function useBulkQr() {
  return useMutation({
    mutationFn: (asset_ids: string[]) => generateBulkQr(asset_ids),
  });
}

/**
 * Hook to scan asset by code
 */
export function useScanAsset() {
  return useMutation({
    mutationFn: (code: string) => scanAssetByCode(code),
  });
}

/**
 * Hook to checkout asset
 */
export function useCheckoutAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckoutAssetDto }) =>
      checkoutAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.myAssets() });
    },
  });
}

/**
 * Hook to return asset
 */
export function useReturnAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnAssetDto }) => returnAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.myAssets() });
    },
  });
}

/**
 * Hook to fetch asset assignments
 */
export function useAssetAssignments(
  id: string,
  options?: Omit<UseQueryOptions<AssetAssignment[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.assignments(id),
    queryFn: () => fetchAssetAssignments(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to fetch current user's assets
 */
export function useMyAssets(
  options?: Omit<UseQueryOptions<AssetAssignment[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.myAssets(),
    queryFn: () => fetchMyAssets(),
    ...options,
  });
}

/**
 * Hook to create maintenance
 */
export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMaintenanceDto }) =>
      createMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.maintenance() });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Hook to update maintenance
 */
export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaintenanceDto }) =>
      updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.maintenance() });
    },
  });
}

/**
 * Hook to fetch maintenance calendar
 */
export function useMaintenanceCalendar(
  month: number,
  year: number,
  options?: Omit<UseQueryOptions<AssetMaintenance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.maintenanceCalendar(month, year),
    queryFn: () => fetchMaintenanceCalendar(month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch overdue maintenance
 */
export function useOverdueMaintenance(
  options?: Omit<UseQueryOptions<AssetMaintenance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.overdueeMaintenance(),
    queryFn: () => fetchOverdueMaintenance(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}
