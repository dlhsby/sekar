/**
 * Wildcard-aware permission matching (ADR-044).
 *
 * A granted key may be concrete (`user:read`) or a wildcard: `*:*` (all),
 * `resource:*` (all actions on a resource), or `*:action` (an action across all
 * resources). Required keys are always concrete. Matching is shared by the
 * backend guard and the web `usePermissions()` hook so both agree exactly.
 */

/** Does a single granted key satisfy a concrete required key? */
export function permissionMatches(granted: string, required: string): boolean {
  if (granted === required) return true;
  if (granted === '*:*') return true;

  const [gRes, gAct] = granted.split(':');
  const [rRes, rAct] = required.split(':');
  if (gRes === undefined || gAct === undefined || rRes === undefined || rAct === undefined) {
    return false;
  }

  const resOk = gRes === '*' || gRes === rRes;
  const actOk = gAct === '*' || gAct === rAct;
  return resOk && actOk;
}

/** Does any granted key satisfy the required key? */
export function hasPermission(granted: Iterable<string>, required: string): boolean {
  for (const g of granted) {
    if (permissionMatches(g, required)) return true;
  }
  return false;
}

/** Are ALL required keys satisfied by the granted set (AND semantics)? */
export function hasAllPermissions(granted: Iterable<string>, required: string[]): boolean {
  const grantedArr = Array.from(granted);
  return required.every((req) => hasPermission(grantedArr, req));
}

/** Is ANY required key satisfied by the granted set (OR semantics)? */
export function hasAnyPermission(granted: Iterable<string>, required: string[]): boolean {
  const grantedArr = Array.from(granted);
  return required.some((req) => hasPermission(grantedArr, req));
}
