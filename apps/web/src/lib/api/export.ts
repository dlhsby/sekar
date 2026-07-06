/**
 * Export API client (Phase 4-5).
 *
 * Backend (`apps/be/src/modules/export`):
 *   POST /export              → 200 file stream (≤5000 rows) | 202 { jobId } (async)
 *   GET  /export/jobs         → ExportJob[] (last 30 days)
 *   GET  /export/jobs/:jobId  → ExportJob + fresh 15-min downloadUrl
 *
 * Sync exports download inline; async exports return a job the caller polls.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export type ExportEntityType =
  | 'users'
  | 'areas'
  | 'rayons'
  | 'tasks'
  | 'activities'
  | 'overtime';

export type ExportFormat = 'csv' | 'xlsx' | 'kmz';

export type ExportJobStatus = 'processing' | 'completed' | 'failed';

export interface ExportRequest {
  entityType: ExportEntityType;
  format?: ExportFormat;
  startDate?: string;
  endDate?: string;
  rayonId?: string;
  areaId?: string;
}

export interface ExportJob {
  jobId: string;
  status: ExportJobStatus;
  entityType: ExportEntityType;
  format: ExportFormat;
  rowCount: number;
  downloadUrl?: string;
  errorMessage?: string | null;
  createdAt: string;
}

/** Result of a POST /export: either a completed inline download or a queued job. */
export type ExportOutcome = { kind: 'downloaded'; filename: string } | { kind: 'job'; job: ExportJob };

const exportKeys = {
  all: ['export'] as const,
  jobs: () => [...exportKeys.all, 'jobs'] as const,
  job: (id: string) => [...exportKeys.all, 'job', id] as const,
};

/** Pull the filename out of a Content-Disposition header, with a fallback. */
function parseFilename(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

/** Read a Blob to text, falling back to FileReader where `Blob.text` is absent. */
async function blobToText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Coerce a 202 export-job body (Blob | string | object) into an ExportJob. */
async function readJob(data: unknown): Promise<ExportJob> {
  if (data instanceof Blob) {
    return JSON.parse(await blobToText(data)) as ExportJob;
  }
  if (typeof data === 'string') {
    return JSON.parse(data) as ExportJob;
  }
  return data as ExportJob;
}

/** Trigger a browser download for a Blob payload. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Defer revoke so the download has a chance to start on slower connections.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Request an export. Returns `downloaded` for sync exports (file already saved)
 * or `job` for async exports the caller must poll via {@link useExportJob}.
 */
export function useExportData() {
  return useMutation<ExportOutcome, unknown, ExportRequest>({
    mutationFn: async (request) => {
      const response = await apiClient.post('/export', request, { responseType: 'blob' });

      // 202 → the body holds the job JSON. With responseType 'blob' it arrives as
      // a Blob in the browser; tolerate string/object bodies too (tests, proxies).
      if (response.status === 202) {
        return { kind: 'job', job: await readJob(response.data) };
      }

      const fallback = `${request.entityType}-export.${request.format ?? 'csv'}`;
      const filename = parseFilename(response.headers['content-disposition'], fallback);
      downloadBlob(response.data as Blob, filename);
      return { kind: 'downloaded', filename };
    },
  });
}

/** Export history (last 30 days) for the current user. */
export function useExportJobs() {
  return useQuery({
    queryKey: exportKeys.jobs(),
    queryFn: async () => {
      const response = await apiClient.get<ExportJob[]>('/export/jobs');
      return response.data;
    },
    staleTime: 15 * 1000,
  });
}

/**
 * Poll a single export job every 3s while it is processing. Polling stops once
 * the job is completed/failed or when `enabled` is false.
 */
export function useExportJob(jobId: string | null) {
  return useQuery({
    queryKey: exportKeys.job(jobId ?? 'none'),
    queryFn: async () => {
      const response = await apiClient.get<ExportJob>(`/export/jobs/${jobId}`);
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' ? 3000 : false;
    },
  });
}
