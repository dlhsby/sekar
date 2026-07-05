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
  admin_data: 'Admin Data',
  kepala_rayon: 'Kepala Rayon',
  top_management: 'Top Management',
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
  'admin_data',
  'kepala_rayon',
];

/** Roles that can submit activities */
export const ACTIVITY_SUBMITTERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_data',
  'kepala_rayon',
];

/** Roles that can create tasks (mirrors backend TASK_CREATORS).
 *  May 11, 2026 — `admin_data` added: they create tasks via the pruning
 *  Tugaskan flow and directly via the Tugas tab. */
export const TASK_CREATORS: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'admin_data',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Roles that can receive task assignments (mirrors backend TASK_RECEIVERS).
 *  May 11, 2026 — `admin_data` added: they may take pruning tasks
 *  themselves for the centralized-recap pattern. */
export const TASK_RECEIVERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'kepala_rayon',
  'admin_data',
];

/** Roles that can submit overtime */
export const OVERTIME_SUBMITTERS: UserRole[] = ['satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon'];

/** Roles that can approve overtime */
export const OVERTIME_APPROVERS: UserRole[] = ['korlap', 'kepala_rayon', 'top_management'];

/** Monitoring access by scope */
export const MONITORING_ROLES: Record<'city' | 'rayon' | 'area', UserRole[]> = {
  city: ['top_management', 'admin_system', 'superadmin'],
  rayon: ['kepala_rayon', 'admin_data'],
  area: ['korlap'],
};

/** Hierarchical task assignment rules (mirrors backend VALID_TASK_ASSIGNMENTS).
 *  May 11, 2026 — admin_data + kepala_rayon + top_management can assign
 *  across the full rayon roster; korlap may assign to self/satgas/linmas. */
export const VALID_TASK_ASSIGNMENTS: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['korlap', 'satgas', 'linmas'],
  kepala_rayon: ['kepala_rayon', 'admin_data', 'korlap', 'satgas', 'linmas'],
  admin_data: ['kepala_rayon', 'admin_data', 'korlap', 'satgas', 'linmas'],
  top_management: ['kepala_rayon', 'admin_data', 'korlap', 'satgas', 'linmas'],
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
  [...MONITORING_ROLES.city, ...MONITORING_ROLES.rayon, ...MONITORING_ROLES.area].includes(role);

export const getMonitoringScope = (role: UserRole): 'city' | 'rayon' | 'area' | null => {
  if (MONITORING_ROLES.city.includes(role)) return 'city';
  if (MONITORING_ROLES.rayon.includes(role)) return 'rayon';
  if (MONITORING_ROLES.area.includes(role)) return 'area';
  return null;
};

/** Roles that can select rayon freely in monitoring filter (city-scope) */
export const ROLES_WITH_RAYON: UserRole[] = [...MONITORING_ROLES.city];

/** Roles with a fixed rayon assignment in monitoring filter (rayon-scope) */
export const ROLES_WITH_FIXED_RAYON: UserRole[] = [...MONITORING_ROLES.rayon];

/** Roles without rayon visibility in monitoring filter (area-scope) */
export const ROLES_WITHOUT_RAYON: UserRole[] = [...MONITORING_ROLES.area];

/**
 * Maps each role to its direct subordinate roles for filter scoping
 * (used by filter modals to show only directly managed users in lists).
 */
export const FILTER_SUBORDINATE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['satgas', 'linmas'],
  kepala_rayon: ['korlap', 'admin_data', 'satgas', 'linmas'],
  top_management: ['kepala_rayon', 'admin_data', 'korlap', 'satgas', 'linmas'],
  admin_system: ['kepala_rayon', 'korlap', 'admin_data', 'satgas', 'linmas'],
  superadmin: ['kepala_rayon', 'korlap', 'admin_data', 'satgas', 'linmas', 'top_management', 'admin_system'],
  // May 11, 2026 — admin_data has a full delegation roster (was []) so
  // the Tugaskan-Ulang picker on TaskDetailScreen shows candidates.
  admin_data: ['korlap', 'satgas', 'linmas'],
};
