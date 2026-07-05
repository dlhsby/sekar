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
  | 'assigned'
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
  assignedTaskId: string | null;
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

/**
 * Payload for a kecamatan submission (KEC-1). Mirrors the mobile SubmitScreen
 * shape: photos are base64 data-URI strings (the S3 pipeline lands in a later
 * phase), and timing preference is expressed as an ISO week pair — admin_data
 * picks the concrete day at assign-to-task. `kecamatan_name`/`rayon_id` are
 * auto-derived server-side from the submitter profile when omitted.
 */
export interface SubmitPruningRequestPayload {
  address: string;
  lat: number;
  lng: number;
  photo_keys: string[];
  tree_count: number;
  target_count?: number;
  tree_height_estimate: string;
  tree_diameter_estimate: string;
  requester_name: string;
  requester_phone: string;
  rt_leader_name: string;
  rt_leader_phone: string;
  notes?: string;
  expected_year?: number;
  expected_iso_week?: number;
  kecamatan_name?: string;
  rayon_id?: string;
}

/** Submit a new pruning request (staff_kecamatan). */
export function useSubmitPruningRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitPruningRequestPayload): Promise<PruningRequest> => {
      const response = await apiClient.post<PruningRequest>('/pruning-requests', payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() });
      qc.invalidateQueries({ queryKey: ['pruning-requests', 'mine'] });
    },
  });
}

/**
 * The current user's own submissions (GET /pruning-requests?mine=true). The
 * backend returns a plain array (newest-first), unlike the admin list envelope.
 */
export function useMyPruningRequests(filters?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['pruning-requests', 'mine', filters ?? {}],
    queryFn: async (): Promise<PruningRequest[]> => {
      const response = await apiClient.get<PruningRequest[]>('/pruning-requests', {
        params: { mine: true, ...filters },
      });
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 30 * 1000,
  });
}

const keys = {
  all: ['pruning-requests'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (f?: PruningRequestsFilters) => [...keys.lists(), f] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

/** Raw admin-list shape returned by the backend (`PruningRequestsService.findAll`). */
interface PruningRequestsRaw {
  items: PruningRequest[];
  total: number;
  page: number;
  limit: number;
}

export function usePruningRequests(filters?: PruningRequestsFilters) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async (): Promise<PruningRequestsList> => {
      // Admin list (page lives under (dashboard)). Omitting `mine` selects the
      // admin branch server-side; we must NOT send extra params (e.g. `admin`)
      // because the API runs with forbidNonWhitelisted and rejects unknown query
      // fields with 400. The backend returns the raw `{ items, total, page,
      // limit }` shape — normalise it to the `{ data, meta }` envelope every
      // consumer (list page + dashboard KPI) expects.
      const response = await apiClient.get<PruningRequestsRaw>('/pruning-requests', {
        params: { ...filters },
      });
      const { items, total, page, limit } = response.data;
      return {
        data: items ?? [],
        meta: {
          total: total ?? 0,
          page: page ?? 1,
          limit: limit ?? 20,
          totalPages: limit ? Math.max(1, Math.ceil((total ?? 0) / limit)) : 1,
        },
      };
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
      }>(`/pruning-requests/${id}/assign-to-task`, dto);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}
