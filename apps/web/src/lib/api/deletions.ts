import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

/** Record types the backend can force-delete (mirrors `DELETABLE_TYPES`, ADR-062). */
export type DeletableType =
  | 'district'
  | 'region'
  | 'location'
  | 'location_type'
  | 'team_category'
  | 'user'
  | 'role'
  | 'shift_definition';

/** Counts keyed by `common:forceDelete.impact.<key>`. */
export type DeletionImpact = Record<string, number>;

export interface DeletionImpactView {
  type: DeletableType;
  id: string;
  /** What the operator must type (users: username). */
  confirm_label: string;
  impact: DeletionImpact;
  /** Dependants that must be moved to a replacement first (0 = none). */
  replacement_required: number;
}

export interface ForceDeletePayload {
  confirm_name: string;
  reason: string;
  replacement_id?: string;
}

export const deletionKeys = {
  impact: (type: DeletableType, id: string) => ['deletions', 'impact', type, id] as const,
};

/** Dry run: what a force delete would remove or change. Always fresh. */
export function useDeletionImpact(type: DeletableType, id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: deletionKeys.impact(type, id ?? ''),
    queryFn: async () =>
      (await apiClient.get<DeletionImpactView>(`/deletions/${type}/${id}/impact`)).data,
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Force delete. A cascade can touch rosters, users and child places, so every
 * cached query is invalidated rather than guessing which lists changed.
 */
export function useForceDelete(type: DeletableType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ForceDeletePayload }) =>
      (await apiClient.post<DeletionImpactView & { audit_id: string }>(`/deletions/${type}/${id}`, payload))
        .data,
    onSuccess: () => {
      // Drop the (now meaningless) impact preview first; refetching it would 404.
      queryClient.removeQueries({ queryKey: ['deletions'] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'deletions' });
    },
  });
}
