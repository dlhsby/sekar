import { UserRole } from '../users/entities/user.entity';

/**
 * Roster edit hierarchy (target-role based). Who may edit whose daily-schedule:
 *   - admin_system / superadmin / management → anyone (management has full
 *     admin_system parity)
 *   - kepala_rayon / admin_rayon → korlap, satgas, linmas (everyone below, own rayon)
 *   - korlap                    → satgas, linmas (own assigned areas)
 * Scope (rayon / area) is enforced separately — see `isGlobalRosterEditor`.
 */
export function canEditTargetRole(editorRole: UserRole, targetRole: UserRole): boolean {
  switch (editorRole) {
    case UserRole.ADMIN_SYSTEM:
    case UserRole.SUPERADMIN:
    case UserRole.MANAGEMENT:
      return true;
    case UserRole.KEPALA_RAYON:
    case UserRole.ADMIN_RAYON:
      return (
        targetRole === UserRole.KORLAP ||
        targetRole === UserRole.SATGAS ||
        targetRole === UserRole.LINMAS
      );
    case UserRole.KORLAP:
      return targetRole === UserRole.SATGAS || targetRole === UserRole.LINMAS;
    default:
      return false;
  }
}

/** Editors who act globally (no rayon/area scope): the top of the chain. */
export function isGlobalRosterEditor(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN_SYSTEM || role === UserRole.SUPERADMIN || role === UserRole.MANAGEMENT
  );
}

/** Roles whose own roster is a fixed whole-rayon assignment (managed tier). */
export function isRayonManagerRole(role: UserRole): boolean {
  return role === UserRole.KEPALA_RAYON || role === UserRole.ADMIN_RAYON;
}

/** Roles that do NOT get a materialized roster row (top of the org / oversight). */
export function isNonRosteredRole(role: UserRole): boolean {
  return (
    role === UserRole.MANAGEMENT ||
    role === UserRole.ADMIN_SYSTEM ||
    role === UserRole.SUPERADMIN ||
    role === UserRole.STAFF_KECAMATAN
  );
}
