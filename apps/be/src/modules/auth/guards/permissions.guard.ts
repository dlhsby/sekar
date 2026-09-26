import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RolePermissionsService } from '../../rbac/services/role-permissions.service';
import { hasAllPermissions, hasAnyPermission } from '../../rbac/permission-matcher';
import { DeniedAccessRecorder } from '../../audit/denied-access.recorder';

/**
 * PermissionsGuard — enforces `@RequirePermissions` / `@RequireAnyPermission`
 * (ADR-044). Apply per-controller AFTER `JwtAuthGuard` so `request.user` is set:
 *   `@UseGuards(JwtAuthGuard, PermissionsGuard)`
 * No permission metadata on a handler ⇒ the guard is a no-op (allows), so it can
 * coexist with controllers still gated only by `@Roles` + `RolesGuard`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissions: RolePermissionsService,
    @Optional() private readonly denied?: DeniedAccessRecorder,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!required || required.length === 0) && (!requiredAny || requiredAny.length === 0)) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const { user } = req;
    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }
    if (!user.role) {
      throw new ForbiddenException('Authenticated user has no role assigned');
    }

    const granted = await this.rolePermissions.getRolePermissionKeys(user.role);

    if (required && required.length > 0 && !hasAllPermissions(granted, required)) {
      this.denied?.record(req, required);
      throw new ForbiddenException(`Requires permission(s): ${required.join(', ')}`);
    }
    if (requiredAny && requiredAny.length > 0 && !hasAnyPermission(granted, requiredAny)) {
      this.denied?.record(req, requiredAny);
      throw new ForbiddenException(`Requires any of: ${requiredAny.join(', ')}`);
    }

    return true;
  }
}
