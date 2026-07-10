/**
 * Role Constants for SEKAR Web Application
 * Centralized role definitions matching backend (ADR-009, ADR-010)
 */

import type { UserRole } from '@/types/models';

/** Roles that can access the web dashboard (excludes staff_kecamatan — uses (kecamatan) layout) */
export const WEB_ROLES: UserRole[] = [
  'korlap',
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

/** Phase 3 ADR-033 — staff_kecamatan minimal nav items */
export const KECAMATAN_ROLES: UserRole[] = ['staff_kecamatan'];

/**
 * Admin roles with full system configuration + data-management access.
 * top_management has full parity with admin_system (mirrors the backend
 * RolesGuard elevation); only superadmin sits above.
 */
export const ADMIN_ROLES: UserRole[] = ['admin_system', 'superadmin', 'top_management'];

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

/** Roles that can create / edit / delete worker schedules. */
export const SCHEDULE_MANAGER_ROLES: UserRole[] = [
  'admin_system',
  'superadmin',
  'top_management',
  'korlap',
  'admin_data',
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
  staff_kecamatan: 'Staff Kecamatan',
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
  staff_kecamatan: 'secondary',
};

/** All 9 roles in display order (Phase 3 adds staff_kecamatan) */
export const ALL_ROLES: UserRole[] = [
  'satgas',
  'linmas',
  'korlap',
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
  'staff_kecamatan',
];

/**
 * Organizational hierarchy order (top → bottom) for role pickers. Roles not
 * listed here (system + external) are appended alphabetically by label — see
 * {@link sortedRoleOptions}.
 */
export const ROLE_HIERARCHY_ORDER: UserRole[] = [
  'top_management',
  'kepala_rayon',
  'admin_data',
  'korlap',
  'satgas',
  'linmas',
];

/** Role dropdown options sorted by hierarchy first, then alphabetically. */
export const sortedRoleOptions = (): { value: UserRole; label: string }[] => {
  const rest = ALL_ROLES.filter((r) => !ROLE_HIERARCHY_ORDER.includes(r)).sort((a, b) =>
    ROLE_LABELS[a].localeCompare(ROLE_LABELS[b]),
  );
  return [...ROLE_HIERARCHY_ORDER, ...rest].map((r) => ({ value: r, label: ROLE_LABELS[r] }));
};

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

/**
 * Which assignment fields the user form should show for a given role:
 *  - none: superadmin / admin_system / top_management
 *  - rayon only: kepala_rayon / admin_data / staff_kecamatan (kecamatan belongs to a rayon)
 *  - rayon + area: korlap
 *  - rayon + area + shift: satgas / linmas (shift defaults to Shift 1)
 * An unset/unknown role shows nothing (fields appear once a role is picked).
 */
/**
 * Which scope inputs the user form shows, derived from the role's monitoring
 * scope (ADR-044/045):
 *  - district (kepala_rayon / admin_data): rayon
 *  - region (korlap): rayon + region (cascade) + optional single location
 *  - none/city (satgas / linmas / staff_kecamatan / management / admin / super):
 *    nothing — satgas/linmas work area + shift come from schedules (Phase 4).
 */
export interface RoleAssignmentScope {
  rayon: boolean;
  region: boolean;
  location: boolean;
}
export const roleAssignmentScope = (role: UserRole | '' | undefined): RoleAssignmentScope => {
  switch (role) {
    case 'korlap':
      return { rayon: true, region: true, location: true };
    case 'kepala_rayon':
    case 'admin_data':
      return { rayon: true, region: false, location: false };
    default:
      // satgas / linmas / staff_kecamatan / management / admin_system /
      // superadmin / unset → no scope fields
      return { rayon: false, region: false, location: false };
  }
};
