import type { UserRole } from '@/types/models';

/**
 * Web mirror of the backend roster edit hierarchy
 * (be `schedule-edit.policy.ts`). Kept in sync so the UI only shows edit
 * actions on rows the user may actually edit — the backend remains the real gate.
 *
 *   - admin_system / superadmin / management → anyone (management has
 *     full admin_system parity)
 *   - kepala_rayon / admin_rayon → korlap, satgas, linmas (own rayon)
 *   - korlap                    → satgas, linmas (own assigned areas)
 */
export function canEditTargetRole(editorRole: UserRole, targetRole: UserRole): boolean {
  switch (editorRole) {
    case 'admin_system':
    case 'superadmin':
    case 'management':
      return true;
    case 'kepala_rayon':
    case 'admin_rayon':
      return targetRole === 'korlap' || targetRole === 'satgas' || targetRole === 'linmas';
    case 'korlap':
      return targetRole === 'satgas' || targetRole === 'linmas';
    default:
      return false;
  }
}

/** Editors who act globally (no rayon/area scope). */
export function isGlobalRosterEditor(role: UserRole): boolean {
  return role === 'admin_system' || role === 'superadmin' || role === 'management';
}
