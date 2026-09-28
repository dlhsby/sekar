import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/models';

/** One audit_logs row (ADR-015 + ADR-061). Names are snapshots at write time. */
export interface AuditEntry {
  id: string;
  seq: string;
  created_at: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action: string;
  outcome: 'success' | 'denied' | 'failed';
  source: 'api' | 'system';
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  /** Legacy rows (before snapshots) carry the joined actor instead. */
  actor?: { id: string; full_name: string; role: string } | null;
  changes: Record<string, [unknown, unknown]> | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  reason: string | null;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  parent_id: string | null;
  hash: string | null;
}

export interface AuditFilters {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_role?: string;
  outcome?: AuditEntry['outcome'];
  q?: string;
  from_date?: string;
  to_date?: string;
}

export interface AuditChainStatus {
  sealed: number;
  unsealed: number;
  first_broken_seq: string | null;
  last_hash: string | null;
  intact: boolean;
}

export const auditKeys = {
  all: ['audit'] as const,
  list: (filters: AuditFilters, page: number, limit: number) =>
    [...auditKeys.all, 'list', filters, page, limit] as const,
  types: () => [...auditKeys.all, 'types'] as const,
  verify: () => [...auditKeys.all, 'verify'] as const,
  entity: (type: string, id: string) => [...auditKeys.all, 'entity', type, id] as const,
};

/** Drop empty filter values so the query string stays clean. */
function params(filters: AuditFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Record<string, string>;
}

/** Server-paginated audit search (the trail can be large — never load it whole). */
export function useAuditLogs(filters: AuditFilters, page: number, limit: number) {
  return useQuery({
    queryKey: auditKeys.list(filters, page, limit),
    queryFn: async () =>
      (
        await apiClient.get<PaginatedResponse<AuditEntry>>('/audit', {
          params: { ...params(filters), page, limit },
        })
      ).data,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** Entity types captured automatically — drives the type filter. */
export function useAuditTypes() {
  return useQuery({
    queryKey: auditKeys.types(),
    queryFn: async () => (await apiClient.get<string[]>('/audit/types')).data,
    staleTime: 60 * 60_000,
  });
}

/** Hash-chain integrity (ADR-061). Walks the chain on the server — fetch on demand. */
export function useAuditVerify(enabled: boolean) {
  return useQuery({
    queryKey: auditKeys.verify(),
    queryFn: async () => (await apiClient.get<AuditChainStatus>('/audit/verify')).data,
    enabled,
    staleTime: 60_000,
  });
}

/** Timeline of one record ("Riwayat"). */
export function useEntityHistory(type: string, id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: auditKeys.entity(type, id ?? ''),
    queryFn: async () => (await apiClient.get<AuditEntry[]>(`/audit/${type}/${id}`)).data,
    enabled: enabled && !!id,
  });
}

/** Download the filtered trail as CSV (the export itself is audited server-side). */
export async function downloadAuditCsv(filters: AuditFilters): Promise<{ truncated: boolean }> {
  const response = await apiClient.get('/audit/export.csv', {
    params: params(filters),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { truncated: response.headers?.['x-export-truncated'] === 'true' };
}

/** Actor display name — snapshot first, legacy join second. */
export function actorName(entry: AuditEntry): string | null {
  return entry.actor_name ?? entry.actor?.full_name ?? null;
}
