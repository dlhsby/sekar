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
};

/** Roles that can clock in/out (field roles with area assignments only) */
export const CLOCKABLE_ROLES: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
];

/** Roles that can submit activities */
export const ACTIVITY_SUBMITTERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_data',
];

/** Roles that can create tasks */
export const TASK_CREATORS: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Roles that can receive task assignments */
export const TASK_RECEIVERS: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'kepala_rayon',
];

/** Roles that can submit overtime */
export const OVERTIME_SUBMITTERS: UserRole[] = ['satgas', 'linmas', 'korlap', 'admin_data'];

/** Roles that can approve overtime */
export const OVERTIME_APPROVERS: UserRole[] = ['korlap', 'kepala_rayon', 'admin_system', 'superadmin'];

/** Monitoring access by scope */
export const MONITORING_ROLES: Record<'city' | 'rayon' | 'area', UserRole[]> = {
  city: ['top_management', 'admin_system', 'superadmin'],
  rayon: ['kepala_rayon', 'admin_data'],
  area: ['korlap'],
};

/** Hierarchical task assignment rules (must match backend VALID_TASK_ASSIGNMENTS) */
export const VALID_TASK_ASSIGNMENTS: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['satgas', 'linmas'],
  kepala_rayon: ['korlap'],
  top_management: ['kepala_rayon', 'korlap'],
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

/**
 * Maps each role to its direct subordinate roles for filter scoping
 * (used by filter modals to show only directly managed users in lists).
 */
export const FILTER_SUBORDINATE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['satgas', 'linmas'],
  kepala_rayon: ['korlap', 'admin_data'],
  top_management: ['kepala_rayon'],
  admin_system: ['kepala_rayon', 'korlap', 'admin_data', 'satgas', 'linmas'],
  superadmin: ['kepala_rayon', 'korlap', 'admin_data', 'satgas', 'linmas', 'top_management', 'admin_system'],
  admin_data: [],
};
