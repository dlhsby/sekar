/**
 * Wildcard-aware permission matching — the web mirror of the backend matcher
 * (ADR-044), so client-side gating agrees exactly with server enforcement.
 * Granted keys may be concrete (`user:read`) or wildcards (`*:*`, `user:*`,
 * `*:read`); required keys are always concrete.
 */

export function permissionMatches(granted: string, required: string): boolean {
  if (granted === required) return true;
  if (granted === '*:*') return true;

  const [gRes, gAct] = granted.split(':');
  const [rRes, rAct] = required.split(':');
  if (!gRes || !gAct || !rRes || !rAct) return false;

  const resOk = gRes === '*' || gRes === rRes;
  const actOk = gAct === '*' || gAct === rAct;
  return resOk && actOk;
}

export function hasPermission(granted: readonly string[], required: string): boolean {
  return granted.some((g) => permissionMatches(g, required));
}

export function hasAllPermissions(granted: readonly string[], required: string[]): boolean {
  return required.every((req) => hasPermission(granted, req));
}

export function hasAnyPermission(granted: readonly string[], required: string[]): boolean {
  return required.some((req) => hasPermission(granted, req));
}
