/**
 * Role Constants for SEKAR Web Application
 * Centralized role definitions matching backend (ADR-009, ADR-010)
 */

import type { UserRole } from '@/types/models';

/** Roles that can access the web dashboard (excludes staff_kecamatan — uses (kecamatan) layout) */
export const WEB_ROLES: UserRole[] = [
  'korlap',
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];

/** Phase 3 ADR-033 — staff_kecamatan minimal nav items */
export const KECAMATAN_ROLES: UserRole[] = ['staff_kecamatan'];

/**
 * Admin roles with full system configuration + data-management access.
 * management has full parity with admin_system (mirrors the backend
 * RolesGuard elevation); only superadmin sits above.
 */
export const ADMIN_ROLES: UserRole[] = ['admin_system', 'superadmin', 'management'];

/** Roles with monitoring access (hierarchical) */
export const MONITORING_ROLES: UserRole[] = [
  'korlap',
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];

/** Roles that can manage tasks */
export const TASK_MANAGER_ROLES: UserRole[] = [
  'korlap',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
];

/** Roles that can create / edit / delete worker schedules. */
export const SCHEDULE_MANAGER_ROLES: UserRole[] = [
  'admin_system',
  'superadmin',
  'management',
  'korlap',
  'admin_rayon',
];

/** Roles that can reassign workers between areas (Phase 4-4, matches POST /monitoring/reassign) */
export const REASSIGN_ROLES: UserRole[] = ['superadmin', 'admin_system', 'kepala_rayon'];

/**
 * Roles that can be assigned to a schedule / area (backend rejects others with 400).
 * Mirrors SchedulesService.create which only allows satgas/linmas.
 */
export const SCHEDULABLE_WORKER_ROLES: UserRole[] = ['satgas', 'linmas'];

/** Roles that can clock in/out (field roles with area assignments only) */
export const CLOCKABLE_ROLES: UserRole[] = ['satgas', 'linmas', 'korlap'];

/** Roles that can approve overtime */
export const OVERTIME_APPROVER_ROLES: UserRole[] = ['korlap', 'kepala_rayon'];

/** Roles that can approve/reject activities */
export const ACTIVITY_APPROVER_ROLES: UserRole[] = ['korlap', 'kepala_rayon'];

/** Roles that can verify/request-revision on tasks */
export const TASK_VERIFIER_ROLES: UserRole[] = ['korlap', 'kepala_rayon', 'management'];

/** Indonesian labels for each role */
export const ROLE_LABELS: Record<UserRole, string> = {
  satgas: 'Satgas',
  linmas: 'Linmas',
  korlap: 'Korlap',
  admin_rayon: 'Admin Rayon',
  kepala_rayon: 'Kepala Rayon',
  management: 'Management',
  admin_system: 'Admin Sistem',
  superadmin: 'Superadmin',
  staff_kecamatan: 'Staff Kecamatan',
};

/**
 * Human label for ANY role code — the 9 system roles use their curated label;
 * custom/data-driven roles (ADR-044) fall back to a title-cased code so they
 * never render as a raw slug. (For the exact operator-set name, the roles
 * catalog is the source; this is the presentational fallback.)
 */
export function roleLabel(code: string): string {
  return (
    ROLE_LABELS[code as UserRole] ??
    code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Badge variant for each role */
export const ROLE_BADGE_VARIANTS: Record<
  UserRole,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  satgas: 'secondary',
  linmas: 'secondary',
  korlap: 'success',
  admin_rayon: 'default',
  kepala_rayon: 'warning',
  management: 'default',
  admin_system: 'destructive',
  superadmin: 'destructive',
  staff_kecamatan: 'secondary',
};

/** All 9 roles in display order (Phase 3 adds staff_kecamatan) */
export const ALL_ROLES: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_rayon',
  'kepala_rayon',
  'management',
  'admin_system',
  'superadmin',
  'staff_kecamatan',
];

/**
 * Organizational hierarchy order (top → bottom) for role pickers/sorting. Roles
 * not listed here sort after these, alphabetically by label.
 */
export const ROLE_HIERARCHY_ORDER: UserRole[] = [
  'superadmin',
  'admin_system',
  'management',
  'kepala_rayon',
  'admin_rayon',
  'korlap',
  'linmas',
  'satgas',
  'staff_kecamatan',
];

/** Valid assignment targets per role (who can assign to whom) */
export const VALID_TASK_ASSIGNMENTS: Partial<Record<UserRole, UserRole[]>> = {
  korlap: ['satgas', 'linmas'],
  kepala_rayon: ['korlap'],
  management: ['kepala_rayon', 'korlap'],
  admin_system: ['kepala_rayon', 'korlap'],
  superadmin: ['kepala_rayon', 'korlap'],
};

/** Check if a role has access */
export const hasRole = (userRole: UserRole, allowedRoles: UserRole[]): boolean =>
  allowedRoles.includes(userRole);

