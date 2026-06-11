/**
 * Pruning requests — Phase 3 sub-phase 3-9/3-10.
 * Staff kecamatan submits requests for pruning work; admin_data reviews/converts to tasks.
 */
import type { Rayon, User } from './user.types';
import type { Task } from './task.types';

// Pruning Request Status
export type PruningRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'in_progress'
  | 'done'
  | 'cancelled';

// Pruning Request — Phase 3 sub-phase 3-9/3-10
export interface PruningRequest {
  id: string;
  referenceCode: string;
  submittedBy: string;
  submitter?: User;
  kecamatanName: string;
  address: string;
  gpsLat: number | null;
  gpsLng: number | null;
  // May 9, 2026 — `expected_date` is the legacy single-day preference
  // column; current flow leaves it NULL. Kecamatan submitters express
  // preference via the week pair below; admin confirms a concrete day on
  // `scheduled_date`. Kept here for the rare reads that may still surface
  // historical rows from before the schema split.
  expectedDate: string | null; // ISO date (YYYY-MM-DD), legacy
  // ADR-035 amendment 2026-05-01 — kecamatan submitter's preferred ISO week.
  expectedYear: number | null;
  expectedIsoWeek: number | null;
  // Admin-confirmed work day (set at assign-to-task or Atur Jadwal).
  scheduledDate: string | null; // ISO date (YYYY-MM-DD)
  estimatedPlantCount: number | null;
  // Phase 3 Apr 27 — staff_kecamatan redesign
  treeCount?: number | null;
  treeHeightEstimate?: string | null;
  treeDiameterEstimate?: string | null;
  requesterName?: string | null;
  requesterPhone?: string | null;
  rtLeaderName?: string | null;
  rtLeaderPhone?: string | null;
  photoUrls: string[];
  notes: string | null;
  status: PruningRequestStatus;
  rayonId: string | null;
  rayon?: Rayon;
  reviewedBy: string | null;
  reviewer?: User;
  reviewedAt: string | null;
  reviewNotes: string | null;
  assignedTaskId: string | null;
  convertedTask?: Task;
  createdAt: string;
  updatedAt: string;
}
