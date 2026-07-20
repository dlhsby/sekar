/**
 * Pruning Requests API Client (Phase 3 — admin disposition on web)
 *
 * Mirrors the mobile pruningRequestsApi but emits TanStack Query hooks for
 * the dashboard pages. Admin / kepala_rayon / admin_rayon use these to review
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
  districtId: string | null;
  district?: { id: string; name: string } | null;
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
  district_id?: string;
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
 * phase), and timing preference is expressed as an ISO week pair — admin_rayon
 * picks the concrete day at assign-to-task. `kecamatan_name`/`district_id` are
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
  district_id?: string;
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

/**
 * DTO for updating a pruning request (admin use).
 * Only editable fields: address, notes, tree details, contact information.
 */
export interface UpdatePruningRequestPayload {
  address?: string;
  notes?: string;
  treeCount?: number;
  treeHeightEstimate?: string;
  treeDiameterEstimate?: string;
  requesterName?: string;
  requesterPhone?: string;
  rtLeaderName?: string;
  rtLeaderPhone?: string;
}

/**
 * Update editable fields on a pruning request (admin_rayon / kepala_rayon / admin_system / superadmin).
 * Cannot modify status, GPS, photos, or workflow timestamps.
 */
export function useUpdatePruningRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdatePruningRequestPayload): Promise<PruningRequest> => {
      const response = await apiClient.patch<PruningRequest>(
        `/pruning-requests/${id}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}

/**
 * Cancel a pruning request (admin_rayon / kepala_rayon / admin_system / superadmin).
 * Sets status to 'cancelled'. Optional reason for audit trail.
 */
export function useCancelPruningRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string): Promise<PruningRequest> => {
      const response = await apiClient.post<PruningRequest>(
        `/pruning-requests/${id}/cancel`,
        reason ? { reason } : {},
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}

/**
 * Create a pruning request (admin use).
 * For admin-side creation: address, tree details, and contacts.
 * GPS coordinates and photos are optional for admin-created records — the form
 * exposes lat/lng inputs so an admin can supply a real fix; only when left
 * blank does this fall back to an approximate Surabaya-center coordinate
 * (not a real GPS location — downstream consumers of `lat`/`lng` on
 * admin-created records should not treat it as field-verified).
 */
export function useCreatePruningRequestAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SubmitPruningRequestPayload>): Promise<PruningRequest> => {
      // Admin-created records may omit photos; provide empty array if not supplied
      const body = {
        ...payload,
        photo_keys: payload.photo_keys ?? [],
        lat: payload.lat ?? -7.254883, // Surabaya center — fallback only, see doc comment above
        lng: payload.lng ?? 112.748899,
      };
      const response = await apiClient.post<PruningRequest>('/pruning-requests', body);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() });
      qc.invalidateQueries({ queryKey: ['pruning-requests', 'mine'] });
    },
  });
}
