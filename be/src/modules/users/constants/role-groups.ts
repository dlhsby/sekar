import { UserRole } from '../entities/user.entity';

export const CLOCKABLE_ROLES = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
  UserRole.KEPALA_RAYON,
];

export const ACTIVITY_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
  UserRole.KEPALA_RAYON,
];

// May 11, 2026 — `admin_data` joined both lists. They create tasks via
// the pruning-request Tugaskan flow (which lands in TASK_CREATORS access
// on `/tasks/:id` and friends), and they may take pruning tasks
// themselves for the centralized-recap pattern where admin_data owns
// the report and tags satgas afterwards (TASK_RECEIVERS access).
export const TASK_CREATORS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_DATA,
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const TASK_RECEIVERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_DATA,
];

export const OVERTIME_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
  UserRole.KEPALA_RAYON,
];

export const OVERTIME_APPROVERS = [UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.TOP_MANAGEMENT];

export const ACTIVITY_APPROVERS = [UserRole.KORLAP, UserRole.KEPALA_RAYON];

export const MONITORING_CITY = [
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const MONITORING_RAYON = [UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA, ...MONITORING_CITY];

export const MONITORING_AREA = [UserRole.KORLAP, ...MONITORING_RAYON];

export const USER_MANAGERS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];

export const VALID_TASK_ASSIGNMENTS: Record<string, string[]> = {
  [UserRole.TOP_MANAGEMENT]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.KEPALA_RAYON]: [UserRole.KORLAP],
  [UserRole.KORLAP]: [UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.ADMIN_SYSTEM]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.SUPERADMIN]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
};

export const TASK_VERIFIERS = [UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.TOP_MANAGEMENT];

export const VERIFY_MAP: Record<string, string[]> = {
  [UserRole.KORLAP]: [UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.KEPALA_RAYON]: [UserRole.KORLAP],
  [UserRole.TOP_MANAGEMENT]: [UserRole.KEPALA_RAYON],
};

export const PRUNING_REQUEST_REVIEWERS = [
  UserRole.ADMIN_DATA,
  UserRole.KEPALA_RAYON,
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];
