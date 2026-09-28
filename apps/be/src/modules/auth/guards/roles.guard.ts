import { Injectable, CanActivate, ExecutionContext, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DeniedAccessRecorder } from '../../audit/denied-access.recorder';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() private readonly denied?: DeniedAccessRecorder,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const allowed = requiredRoles.some((role) => roleSatisfies(req.user?.role, role));
    if (!allowed) this.denied?.record(req, requiredRoles);
    return allowed;
  }
}

/**
 * Whether `userRole` satisfies a `requiredRole` gate.
 *
 * Product decision: `management` has full parity with `admin_system` for
 * authorization (superadmin still sits above). So any gate that allows
 * `admin_system` also admits `management`. This only ADDS access —
 * `management` still passes its own gates too. Service-level role logic that
 * bypasses this guard (e.g. the schedule-edit hierarchy) is handled separately.
 */
export function roleSatisfies(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === requiredRole) return true;
  return requiredRole === UserRole.ADMIN_SYSTEM && userRole === UserRole.MANAGEMENT;
}
