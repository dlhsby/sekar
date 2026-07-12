import { UserRole } from '../entities/user.entity';

export const CLOCKABLE_ROLES = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_RAYON,
  UserRole.KEPALA_RAYON,
];

export const ACTIVITY_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_RAYON,
  UserRole.KEPALA_RAYON,
];

// May 11, 2026 — `admin_rayon` joined both lists. They create tasks via
// the pruning-request Tugaskan flow (which lands in TASK_CREATORS access
// on `/tasks/:id` and friends), and they may take pruning tasks
// themselves for the centralized-recap pattern where admin_rayon owns
// the report and tags satgas afterwards (TASK_RECEIVERS access).
export const TASK_CREATORS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_RAYON,
  UserRole.MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const TASK_RECEIVERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_RAYON,
];

export const OVERTIME_SUBMITTERS = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_RAYON,
  UserRole.KEPALA_RAYON,
];

export const OVERTIME_APPROVERS = [UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.MANAGEMENT];

export const ACTIVITY_APPROVERS = [UserRole.KORLAP, UserRole.KEPALA_RAYON];

export const MONITORING_CITY = [UserRole.MANAGEMENT, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];

export const MONITORING_RAYON = [UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON, ...MONITORING_CITY];

export const MONITORING_AREA = [UserRole.KORLAP, ...MONITORING_RAYON];

export const USER_MANAGERS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];

// Daily roster managers — admin_system/superadmin act globally; kepala_rayon and
// admin_rayon are scoped to their own rayon (enforced in the controller/service).
export const ROSTER_MANAGERS = [
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_RAYON,
];

// Roster viewers — the managers plus korlap (field coordinator) and
// management (oversight). All may READ the roster.
export const ROSTER_VIEWERS = [...ROSTER_MANAGERS, UserRole.KORLAP, UserRole.MANAGEMENT];

// Roster editors — roles that may edit SOME rows; the exact rows are decided by
// the target-role hierarchy + scope in SchedulesService.assertCanEdit
// (korlap→satgas/linmas in own areas; kepala_rayon/admin_rayon→below in own
// rayon; management→kepala_rayon/admin_rayon; admin_system/superadmin→all).
export const ROSTER_EDITORS = [
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
  UserRole.MANAGEMENT,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_RAYON,
  UserRole.KORLAP,
];

// Phase 4-5 — data export. admin_system/superadmin export anything; kepala_rayon
// is limited (in the service) to tasks/activities/overtime scoped to their rayon.
export const EXPORTERS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN, UserRole.KEPALA_RAYON];

// May 11, 2026 — extended per the user clarification:
//  - `admin_rayon` can assign to themselves (centralized-recap pattern),
//    to kepala_rayon (delegating up the chain isn't normal but legal for
//    the rayon-level peer), and to korlap/satgas/linmas (field workers).
//  - `management` gains admin_rayon + kepala_rayon as legal targets so
//    the top-mgmt → admin_rayon delegation chain (user point 5) works.
//  - `kepala_rayon` gains admin_rayon + satgas + linmas (they previously
//    could only assign down to korlap, which forced an artificial hop).
export const VALID_TASK_ASSIGNMENTS: Record<string, string[]> = {
  [UserRole.MANAGEMENT]: [
    UserRole.KEPALA_RAYON,
    UserRole.ADMIN_RAYON,
    UserRole.KORLAP,
    UserRole.SATGAS,
    UserRole.LINMAS,
  ],
  [UserRole.KEPALA_RAYON]: [
    UserRole.KEPALA_RAYON,
    UserRole.ADMIN_RAYON,
    UserRole.KORLAP,
    UserRole.SATGAS,
    UserRole.LINMAS,
  ],
  [UserRole.ADMIN_RAYON]: [
    UserRole.KEPALA_RAYON,
    UserRole.ADMIN_RAYON,
    UserRole.KORLAP,
    UserRole.SATGAS,
    UserRole.LINMAS,
  ],
  [UserRole.KORLAP]: [UserRole.KORLAP, UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.ADMIN_SYSTEM]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
  [UserRole.SUPERADMIN]: [UserRole.KEPALA_RAYON, UserRole.KORLAP],
};

export const TASK_VERIFIERS = [UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.MANAGEMENT];

export const VERIFY_MAP: Record<string, string[]> = {
  [UserRole.KORLAP]: [UserRole.SATGAS, UserRole.LINMAS],
  [UserRole.KEPALA_RAYON]: [UserRole.KORLAP],
  [UserRole.MANAGEMENT]: [UserRole.KEPALA_RAYON],
};

export const PRUNING_REQUEST_REVIEWERS = [
  UserRole.ADMIN_RAYON,
  UserRole.KEPALA_RAYON,
  UserRole.MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const ASSET_MANAGERS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const ASSET_USERS = [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP];

export const ASSET_VIEWERS = [...ASSET_USERS, UserRole.ADMIN_RAYON, UserRole.MANAGEMENT];

// Phase 5-1 Reporting — who may view/generate reports vs manage schedules.
export const REPORTING_VIEWERS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_RAYON,
  UserRole.MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

// management is listed explicitly (not just granted via the RolesGuard
// admin_system elevation) because REPORTING_ADMINS is also consulted inside
// reporting.service (own-reports scoping + schedule create), which the guard
// doesn't reach. Full admin_system parity — see roles.guard `roleSatisfies`.
export const REPORTING_ADMINS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN, UserRole.MANAGEMENT];

// Phase 5-2 Analytics — dashboard/lists viewers vs view-refresh admins.
export const ANALYTICS_VIEWERS = [
  UserRole.KORLAP,
  UserRole.KEPALA_RAYON,
  UserRole.ADMIN_RAYON,
  UserRole.MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

export const ANALYTICS_ADMINS = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];
