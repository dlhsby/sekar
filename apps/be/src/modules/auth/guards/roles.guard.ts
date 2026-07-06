import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => roleSatisfies(user.role, role));
  }
}

/**
 * Whether `userRole` satisfies a `requiredRole` gate.
 *
 * Product decision: `top_management` has full parity with `admin_system` for
 * authorization (superadmin still sits above). So any gate that allows
 * `admin_system` also admits `top_management`. This only ADDS access —
 * `top_management` still passes its own gates too. Service-level role logic that
 * bypasses this guard (e.g. the schedule-edit hierarchy) is handled separately.
 */
export function roleSatisfies(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === requiredRole) return true;
  return requiredRole === UserRole.ADMIN_SYSTEM && userRole === UserRole.TOP_MANAGEMENT;
}
