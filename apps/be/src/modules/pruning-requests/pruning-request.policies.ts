import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PruningRequest, PruningRequestStatus } from './entities/pruning-request.entity';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Pure pruning-request authorization rules shared by the façade service and
 * the workflow sub-service. No I/O, no mutation — each function either
 * returns silently (or a boolean) or throws the original HTTP exception.
 */

const UNRESTRICTED_READ_ROLES: UserRole[] = [
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
  UserRole.MANAGEMENT,
];

const RAYON_SCOPED_READ_ROLES: UserRole[] = [
  UserRole.ADMIN_RAYON,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
  UserRole.MANAGEMENT,
  UserRole.KEPALA_RAYON,
];

const BROAD_CANCEL_ROLES: UserRole[] = [
  UserRole.KEPALA_RAYON,
  UserRole.MANAGEMENT,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

/**
 * Cancellation whitelist (May 10, 2026): only requests still in the
 * kecamatan-submission / admin-review window can be cancelled. Disallowed:
 * `rejected` (admin already terminated), `converted` / `in_progress`
 * (a task exists and the work is committed), `done` / `cancelled` (terminal).
 */
const CANCELLABLE_STATUSES: PruningRequestStatus[] = ['submitted', 'under_review', 'approved'];

/**
 * admin_rayon is scoped to its own rayon for write operations; every other
 * role passes through (their access is constrained by @Roles upstream).
 * `action` slots into the original per-endpoint message ('review',
 * 'convert', 'reschedule').
 */
export function assertAdminDataRayonScope(
  request: PruningRequest,
  user: User,
  action: string,
): void {
  if (user.role !== UserRole.ADMIN_RAYON) return;
  if (request.rayonId === user.rayon_id) return;
  throw new ForbiddenException(`You do not have permission to ${action} this pruning request`);
}

/**
 * Read access: the submitter (owner), unrestricted admins (read-all), and
 * rayon-scoped admins whose rayon matches a non-null request rayon.
 */
export function canReadPruningRequest(request: PruningRequest, user: User): boolean {
  if (request.submittedBy === user.id) return true;
  if (UNRESTRICTED_READ_ROLES.includes(user.role)) return true;
  return (
    RAYON_SCOPED_READ_ROLES.includes(user.role) &&
    request.rayonId !== null &&
    request.rayonId === user.rayon_id
  );
}

/**
 * Cancel actors: the original submitter, admin_rayon scoped to the request's
 * rayon, or the broad admin roles.
 */
export function assertCanCancel(request: PruningRequest, user: User): void {
  const isSubmitter = request.submittedBy === user.id;
  const isAdminScoped = user.role === UserRole.ADMIN_RAYON && request.rayonId === user.rayon_id;
  if (isSubmitter || isAdminScoped || BROAD_CANCEL_ROLES.includes(user.role)) return;
  throw new ForbiddenException('You do not have permission to cancel this pruning request');
}

export function assertCancellableStatus(request: PruningRequest): void {
  if (CANCELLABLE_STATUSES.includes(request.status)) return;
  throw new ConflictException(`Cannot cancel a permohonan that is already ${request.status}`);
}
