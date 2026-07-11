/**
 * Plant Seeds API Hooks (Phase 3)
 * Inventory management for admin_rayon, kepala_rayon, management, admin_system, superadmin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types — mirror the backend entities
// ---------------------------------------------------------------------------

export interface PlantSeedRow {
  id: string;
  nameId: string;              // Seed SKU/name
  speciesId?: string | null;   // FK to plant_species
  unit: 'gram' | 'piece' | 'packet';
  stockQty: number;
  lastCountedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeedTransactionRow {
  id: string;
  seedId: string;
  transactionType: 'purchase' | 'distribution' | 'adjustment';
  qty: number;
  unitPrice?: number | null;
  supplier?: string | null;
  receiptUrl?: string | null;
  toRayonId?: string | null;
  toAreaId?: string | null;
  recipientName?: string | null;
  occurredAt: string;          // YYYY-MM-DD
  recordedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface SeedsListResponse {
  items: PlantSeedRow[];
  total: number;
}

export interface TransactionsListResponse {
  items: SeedTransactionRow[];
  total: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const seedsKeys = {
  all: ['seeds'] as const,
  list: (search?: string, page?: number, limit?: number) =>
    [...seedsKeys.all, 'list', search ?? '', page ?? 1, limit ?? 20] as const,
  detail: (id: string) => [...seedsKeys.all, 'detail', id] as const,
  transactions: (seedId: string, type?: string, from?: string, to?: string) =>
    [...seedsKeys.all, 'transactions', seedId, type ?? '', from ?? '', to ?? ''] as const,
};

// ---------------------------------------------------------------------------
// Hooks — Seeds List
// ---------------------------------------------------------------------------

export function useSeeds(options?: { search?: string; page?: number; limit?: number }) {
  const { search = '', page = 1, limit = 20 } = options ?? {};
  return useQuery({
    queryKey: seedsKeys.list(search, page, limit),
    queryFn: async (): Promise<SeedsListResponse> => {
      const { data } = await apiClient.get('/plant-seeds', {
        params: { search: search || undefined, page, limit },
      });
      return {
        items: data?.items ?? [],
        total: data?.total ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Hooks — Seed Detail
// ---------------------------------------------------------------------------

export function useSeedDetail(seedId: string | null | undefined) {
  return useQuery({
    queryKey: seedId ? seedsKeys.detail(seedId) : ['seeds', 'detail', 'null'],
    queryFn: async (): Promise<PlantSeedRow> => {
      const { data } = await apiClient.get(`/plant-seeds/${seedId}`);
      return data ?? {};
    },
    enabled: !!seedId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Hooks — Seed Transactions Ledger
// ---------------------------------------------------------------------------

export function useSeedTransactions(
  seedId: string | null | undefined,
  options?: { type?: string; from?: string; to?: string; page?: number; limit?: number }
) {
  const { type, from, to, page = 1, limit = 20 } = options ?? {};
  return useQuery({
    queryKey: seedId
      ? seedsKeys.transactions(seedId, type, from, to)
      : ['seeds', 'transactions', 'null'],
    queryFn: async (): Promise<TransactionsListResponse> => {
      const { data } = await apiClient.get(`/plant-seeds/${seedId}/transactions`, {
        params: { type: type || undefined, from: from || undefined, to: to || undefined, page, limit },
      });
      return {
        items: data?.items ?? [],
        total: data?.total ?? 0,
      };
    },
    enabled: !!seedId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations — Create/Update Seed
// ---------------------------------------------------------------------------

export interface CreateSeedInput {
  nameId: string;
  speciesId?: string | null;
  unit: 'gram' | 'piece' | 'packet';
  stockQty?: number;
}

export interface UpdateSeedInput {
  nameId?: string;
  speciesId?: string | null;
  unit?: 'gram' | 'piece' | 'packet';
}

export function useCreateSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeedInput): Promise<PlantSeedRow> => {
      const { data: response } = await apiClient.post('/plant-seeds', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seedsKeys.all });
    },
  });
}

export function useUpdateSeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSeedInput;
    }): Promise<PlantSeedRow> => {
      const { data: response } = await apiClient.patch(`/plant-seeds/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seedsKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Record Transaction
// ---------------------------------------------------------------------------

export function useRecordTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seedId,
      transactionType,
      qty,
      unitPrice,
      supplier,
      receiptUrl,
      toRayonId,
      toAreaId,
      recipientName,
      occurredAt,
      notes,
    }: {
      seedId: string;
      transactionType: 'purchase' | 'distribution' | 'adjustment';
      qty: number;
      unitPrice?: number;
      supplier?: string;
      receiptUrl?: string;
      toRayonId?: string;
      toAreaId?: string;
      recipientName?: string;
      occurredAt: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post(`/plant-seeds/${seedId}/transactions`, {
        transactionType,
        qty,
        unitPrice,
        supplier,
        receiptUrl,
        toRayonId,
        toAreaId,
        recipientName,
        occurredAt,
        notes,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both the seed list and transaction list for this seed
      queryClient.invalidateQueries({ queryKey: seedsKeys.all });
      queryClient.invalidateQueries({ queryKey: seedsKeys.transactions(variables.seedId) });
    },
  });
}
