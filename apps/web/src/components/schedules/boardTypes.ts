/**
 * Shared board vocabulary.
 *
 * `DayBoard`, `BoardCards` and `BoardPrimitives` all speak these types. They
 * live here rather than in `DayBoard.tsx` so the cards can import them without
 * importing the component that renders them — which would be a cycle.
 */
import type { ScheduleOccurrence } from '@/lib/api/schedule-events';

/**
 * Where a "+ Tugaskan" was clicked — the shift/role plus the container's
 * geography, so the create modal opens pre-filled at that subject (no re-picking
 * the Rayon▸Kawasan▸Lokasi cascade).
 */
export interface AssignContext {
  shiftId: string;
  role?: string;
  district_id?: string;
  region_id?: string;
  location_id?: string;
  /** City-wide assignment (Seluruh Surabaya). */
  city?: boolean;
  /** Assigning a TEAM rather than an individual — opens the modal's team target. */
  team?: boolean;
}

/** Geography half of an AssignContext (the container it was clicked in). */
export type AssignSubject = Omit<AssignContext, 'shiftId' | 'role'>;

export interface TableProps {
  onOccurrenceClick: (occ: ScheduleOccurrence) => void;
  canAssign: boolean;
}

/** Builds a container-bound (shiftId, role) assign handler for a ShiftRoleTable. */
export type MkAssign = (
  subject: AssignSubject,
) => ((shiftId: string, role?: string) => void) | undefined;
export type MkAssignTeam = (subject: AssignSubject) => ((shiftId: string) => void) | undefined;
