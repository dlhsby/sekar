import { UserRole } from '../entities/user.entity';

export const CLOCKABLE_ROLES = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
  UserRole.KEPALA_RAYON,
];

export const AKTIVITAS_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_DATA,
];

export const TASK_CREATORS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const TASK_RECEIVERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
];

export const OVERTIME_SUBMITTERS = [UserRole.SATGAS, UserRole.LINMAS];

export const OVERTIME_APPROVERS = [UserRole.KORLAP];

export const MONITORING_CITY = [
  UserRole.TOP_MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const MONITORING_RAYON = [UserRole.KEPALA_RAYON, ...MONITORING_CITY];

export const MONITORING_AREA = [UserRole.KORLAP, ...MONITORING_RAYON];

export const USER_MANAGERS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];

export const VALID_TASK_ASSIGNMENTS: Record<string, string[]> = {
  [UserRole.TOP_MANAGEMENT]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.KEPALA_RAYON]: [UserRole.KORLAP],
  [UserRole.KORLAP]: [UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.ADMIN_SYSTEM]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.SUPERADMIN]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
};
