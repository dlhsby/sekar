import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';
export const ANY_PERMISSIONS_KEY = 'required_any_permissions';

/**
 * Require ALL of the given `resource:action` permissions (AND semantics).
 * Use with `PermissionsGuard` (after `JwtAuthGuard`). Part of the incremental
 * migration off `@Roles(...)` (ADR-044).
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Require ANY of the given permissions (OR semantics). */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
