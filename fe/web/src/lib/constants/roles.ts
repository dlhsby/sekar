/**
 * Role Constants for SEKAR Web Application
 * Centralized role definitions matching backend (ADR-009, ADR-010)
 */

import type { UserRole } from '@/types/models';

/** Roles that can access the web dashboard */
export const WEB_ROLES: UserRole[] = [
  'korlap',
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Admin roles with full system configuration access */
export const ADMIN_ROLES: UserRole[] = ['admin_system', 'superadmin'];

/** Roles with monitoring access (hierarchical) */
export const MONITORING_ROLES: UserRole[] = [
  'korlap',
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Roles that can manage tasks */
export const TASK_MANAGER_ROLES: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Roles that can clock in/out (field roles with area assignments only) */
export const CLOCKABLE_ROLES: UserRole[] = ['satgas', 'linmas', 'korlap'];

/** Roles that can approve overtime */
export const OVERTIME_APPROVER_ROLES: UserRole[] = ['korlap', 'kepala_rayon'];

/** Roles that can approve/reject activities */
export const ACTIVITY_APPROVER_ROLES: UserRole[] = ['korlap', 'kepala_rayon'];

/** Roles that can verify/request-revision on tasks */
export const TASK_VERIFIER_ROLES: UserRole[] = ['korlap', 'kepala_rayon', 'top_management'];

/** Indonesian labels for each role */
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

/** Badge variant for each role */
export const ROLE_BADGE_VARIANTS: Record<
  UserRole,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  satgas: 'secondary',
  linmas: 'secondary',
  korlap: 'success',
  admin_data: 'default',
  kepala_rayon: 'warning',
  top_management: 'default',
  admin_system: 'destructive',
  superadmin: 'destructive',
};

/** All 8 roles in display order */
export const ALL_ROLES: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Valid assignment targets per role (who can assign to whom) */
export const VALID_TASK_ASSIGNMENTS: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['satgas', 'linmas'],
  kepala_rayon: ['korlap'],
  top_management: ['kepala_rayon', 'korlap'],
  admin_system: ['kepala_rayon', 'korlap'],
  superadmin: ['kepala_rayon', 'korlap'],
};

/** Check if a role has access */
export const hasRole = (userRole: UserRole, allowedRoles: UserRole[]): boolean =>
  allowedRoles.includes(userRole);
