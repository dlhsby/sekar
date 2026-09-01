/**
 * Role Constants
 * Phase 2C: 8-role system with role group permissions (ADR-009)
 */

import type { UserRole } from '../types/models.types';

/** Indonesian display names for each role */
export const ROLE_LABELS: Record<UserRole, string> = {
  satgas: 'Satgas',
  linmas: 'Linmas',
  korlap: 'Korlap',
  admin_rayon: 'Admin Rayon',
  kepala_rayon: 'Kepala Rayon',
  management: 'Management',
  admin_system: 'Admin Sistem',
  superadmin: 'Superadmin',
  // Phase 3 — public intake (ADR-033)
  staff_kecamatan: 'Staff Kecamatan',
};

/** Roles that can clock in/out (must match backend CLOCKABLE_ROLES) */
export const CLOCKABLE_ROLES: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_rayon',
  'kepala_rayon',
];

/** Roles that can submit activities */
export const ACTIVITY_SUBMITTERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_rayon',
  'kepala_rayon',
];

/** Roles that can create tasks (mirrors backend TASK_CREATORS).
 *  May 11, 2026 — `admin_rayon` added: they create tasks via the pruning
 *  Tugaskan flow and directly via the Tugas tab. */
export const TASK_CREATORS: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'admin_rayon',
  'management',
  'admin_system',
  'superadmin',
];

/** Roles that can receive task assignments (mirrors backend TASK_RECEIVERS).
 *  May 11, 2026 — `admin_rayon` added: they may take pruning tasks
 *  themselves for the centralized-recap pattern. */
export const TASK_RECEIVERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'kepala_rayon',
  'admin_rayon',
];

/** Roles that can submit overtime */
export const OVERTIME_SUBMITTERS: UserRole[] = ['satgas', 'linmas', 'korlap', 'admin_rayon', 'kepala_rayon'];

/** Roles that can approve overtime */
export const OVERTIME_APPROVERS: UserRole[] = ['korlap', 'kepala_rayon', 'management'];

/** Monitoring access by scope (ADR-052: the leaf tier is `location`, not `area`). */
export const MONITORING_ROLES: Record<'city' | 'district' | 'location', UserRole[]> = {
  city: ['management', 'admin_system', 'superadmin'],
  district: ['kepala_rayon', 'admin_rayon'],
  location: ['korlap'],
};

/** Hierarchical task assignment rules (mirrors backend VALID_TASK_ASSIGNMENTS).
 *  May 11, 2026 — admin_rayon + kepala_rayon + management can assign
 *  across the full district roster; korlap may assign to self/satgas/linmas. */
export const VALID_TASK_ASSIGNMENTS: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['korlap', 'satgas', 'linmas'],
  kepala_rayon: ['kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas'],
  admin_rayon: ['kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas'],
  management: ['kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas'],
  admin_system: ['kepala_rayon', 'korlap'],
  superadmin: ['kepala_rayon', 'korlap'],
};

// Helper functions

export const isClockableRole = (role: UserRole): boolean =>
  CLOCKABLE_ROLES.includes(role);

export const canSubmitActivities = (role: UserRole): boolean =>
  ACTIVITY_SUBMITTERS.includes(role);

export const canCreateTasks = (role: UserRole): boolean =>
  TASK_CREATORS.includes(role);

export const canReceiveTasks = (role: UserRole): boolean =>
  TASK_RECEIVERS.includes(role);

export const canSubmitOvertime = (role: UserRole): boolean =>
  OVERTIME_SUBMITTERS.includes(role);

export const canApproveOvertime = (role: UserRole): boolean =>
  OVERTIME_APPROVERS.includes(role);

export const canMonitor = (role: UserRole): boolean =>
  [...MONITORING_ROLES.city, ...MONITORING_ROLES.district, ...MONITORING_ROLES.location].includes(role);

export const getMonitoringScope = (role: UserRole): 'city' | 'district' | 'location' | null => {
  if (MONITORING_ROLES.city.includes(role)) return 'city';
  if (MONITORING_ROLES.district.includes(role)) return 'district';
  if (MONITORING_ROLES.location.includes(role)) return 'location';
  return null;
};

/** Roles that can select district freely in monitoring filter (city-scope) */
export const ROLES_WITH_DISTRICT: UserRole[] = [...MONITORING_ROLES.city];

/** Roles with a fixed district assignment in monitoring filter (district-scope) */
export const ROLES_WITH_FIXED_DISTRICT: UserRole[] = [...MONITORING_ROLES.district];

/** Roles without district visibility in monitoring filter (area/region-scope) */
export const ROLES_WITHOUT_DISTRICT: UserRole[] = [...MONITORING_ROLES.location];

/**
 * Maps each role to its direct subordinate roles for filter scoping
 * (used by filter modals to show only directly managed users in lists).
 */
export const FILTER_SUBORDINATE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['satgas', 'linmas'],
  kepala_rayon: ['korlap', 'admin_rayon', 'satgas', 'linmas'],
  management: ['kepala_rayon', 'admin_rayon', 'korlap', 'satgas', 'linmas'],
  admin_system: ['kepala_rayon', 'korlap', 'admin_rayon', 'satgas', 'linmas'],
  superadmin: ['kepala_rayon', 'korlap', 'admin_rayon', 'satgas', 'linmas', 'management', 'admin_system'],
  // May 11, 2026 — admin_rayon has a full delegation roster (was []) so
  // the Tugaskan-Ulang picker on TaskDetailScreen shows candidates.
  admin_rayon: ['korlap', 'satgas', 'linmas'],
};
