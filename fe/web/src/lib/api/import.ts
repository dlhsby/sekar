/**
 * Import API client (Phase 4-5).
 *
 * CSV bulk import (validate → confirm) and KMZ area import, backed by
 * `be/src/modules/import`:
 *   GET  /import/template/:entity  → CSV template (header row)
 *   POST /import/users/csv         → { validCount, errors, sessionId? }
 *   POST /import/areas/csv         → { validCount, errors, sessionId? }
 *   POST /import/confirm/:sessionId→ { imported, skipped, skippedReasons }
 *   POST /import/kmz/upload        → parsed areas + session
 *   POST /import/kmz/confirm       → import result
 */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from './client';

export type CsvImportEntity = 'users' | 'areas';

export interface ImportValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface CsvValidationResponse {
  validCount: number;
  errors: ImportValidationError[];
  sessionId?: string;
}

export interface ImportedCredential {
  username: string;
  phone_number?: string | null;
  temp_password: string;
}

export interface CsvCommitResponse {
  imported: number;
  skipped: number;
  skippedReasons?: string[];
  credentials?: ImportedCredential[];
}

/** Build a multipart FormData body for a single file upload. */
function fileForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

/** Validate a CSV file for the given entity (no rows are inserted yet). */
export function useValidateCsv() {
  return useMutation<CsvValidationResponse, unknown, { entity: CsvImportEntity; file: File }>({
    mutationFn: async ({ entity, file }) => {
      const response = await apiClient.post<CsvValidationResponse>(
        `/import/${entity}/csv`,
        fileForm(file),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
  });
}

/** Commit a previously-validated CSV import session. */
export function useConfirmCsvImport() {
  return useMutation<CsvCommitResponse, unknown, string>({
    mutationFn: async (sessionId) => {
      const response = await apiClient.post<CsvCommitResponse>(`/import/confirm/${sessionId}`);
      return response.data;
    },
  });
}

/** Download an empty CSV template (header row only) for an entity. */
export async function downloadCsvTemplate(entity: CsvImportEntity): Promise<void> {
  const response = await apiClient.get(`/import/template/${entity}`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entity}-template.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Defer revoke so the download has a chance to start on slower connections.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── KMZ import ────────────────────────────────────────────────────────────── */

export type KmzMatchStatus = 'new' | 'update';

export interface ParsedArea {
  name: string;
  description?: string;
  center: { latitude: number; longitude: number };
  polygon?: { latitude: number; longitude: number }[];
  coverage_area?: number;
  match_status: KmzMatchStatus;
  existing_area_id?: string;
}

export interface KmzUploadResponse {
  session_id: string;
  total_areas: number;
  new_areas: number;
  update_areas: number;
  areas: ParsedArea[];
  expires_at: string;
}

export interface KmzConfirmSelection {
  index: number;
  action: 'create' | 'update' | 'skip';
  name_override?: string;
  area_type_id?: string;
  rayon_id?: string;
}

export interface KmzConfirmResponse {
  total_processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

/** Upload + parse a KMZ/KML file, returning the preview session. */
export function useUploadKmz() {
  return useMutation<KmzUploadResponse, unknown, File>({
    mutationFn: async (file) => {
      const response = await apiClient.post<KmzUploadResponse>(
        '/import/kmz/upload',
        fileForm(file),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
  });
}

/** Confirm a KMZ import session with per-area create/update/skip selections. */
export function useConfirmKmz() {
  return useMutation<
    KmzConfirmResponse,
    unknown,
    { sessionId: string; areas: KmzConfirmSelection[] }
  >({
    mutationFn: async ({ sessionId, areas }) => {
      const response = await apiClient.post<KmzConfirmResponse>('/import/kmz/confirm', {
        session_id: sessionId,
        areas,
      });
      return response.data;
    },
  });
}
