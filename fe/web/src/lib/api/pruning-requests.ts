/**
 * Pruning Requests API Client (Phase 3 — admin disposition on web)
 *
 * Mirrors the mobile pruningRequestsApi but emits TanStack Query hooks for
 * the dashboard pages. Admin / kepala_rayon / admin_data use these to review
 * and convert kecamatan-submitted pruning requests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type PruningRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'converted'
  | 'in_progress'
  | 'done'
  | 'cancelled';

export interface PruningRequest extends Record<string, unknown> {
  id: string;
  referenceCode: string;
  submittedBy: string;
  submitter?: { id: string; full_name: string; role: string } | null;
  kecamatanName: string | null;
  rayonId: string | null;
  rayon?: { id: string; name: string } | null;
  address: string;
  gpsLat: number | string;
  gpsLng: number | string;
  expectedDate: string | null;
  expectedYear: number | null;
  expectedIsoWeek: number | null;
  estimatedPlantCount: number | null;
  treeCount: number | null;
  treeHeightEstimate: string | null;
  treeDiameterEstimate: string | null;
  requesterName: string | null;
  requesterPhone: string | null;
  rtLeaderName: string | null;
  rtLeaderPhone: string | null;
  photoUrls: string[];
  notes: string | null;
  status: PruningRequestStatus;
  reviewedBy: string | null;
  reviewer?: { id: string; full_name: string; role: string } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  convertedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PruningRequestsFilters {
  admin?: boolean;
  status?: PruningRequestStatus;
  rayon_id?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PruningRequestsList {
  data: PruningRequest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ReviewDto {
  decision: 'approve' | 'reject';
  reviewNotes?: string;
}

export interface ConvertToTaskDto {
  areaId: string;
  assignedTo: string;
  caseType: 'GT' | 'PT' | 'PS' | 'PD' | 'PK';
  pruningAction: 'PM' | 'PB' | 'PC';
  /** Optional — when omitted, server auto-picks the first available day in the requested ISO week. */
  scheduledDate?: string;
  units?: number;
}

const keys = {
  all: ['pruning-requests'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (f?: PruningRequestsFilters) => [...keys.lists(), f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

export function usePruningRequests(filters?: PruningRequestsFilters) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      // The list endpoint returns a wrapped envelope when admin=true; this
      // hook always asks for the admin view (page lives under (dashboard)).
      const response = await apiClient.get<PruningRequestsList>(
        '/pruning-requests',
        { params: { admin: true, ...filters } },
      );
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

export function usePruningRequest(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<PruningRequest>(
        `/pruning-requests/${id}`,
      );
      return response.data;
    },
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export function useReviewPruningRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ReviewDto) => {
      const response = await apiClient.post<PruningRequest>(
        `/pruning-requests/${id}/review`,
        dto,
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}

export function useConvertPruningRequestToTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ConvertToTaskDto) => {
      const response = await apiClient.post<{
        request: PruningRequest;
        task: { id: string };
      }>(`/pruning-requests/${id}/convert-to-task`, dto);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}
