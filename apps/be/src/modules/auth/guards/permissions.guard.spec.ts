import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { RolePermissionsService } from '../../rbac/services/role-permissions.service';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let rolePermissions: { getRolePermissionKeys: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    rolePermissions = { getRolePermissionKeys: jest.fn() };
    guard = new PermissionsGuard(reflector, rolePermissions as unknown as RolePermissionsService);
  });

  const ctxFor = (user: unknown): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    }) as unknown as ExecutionContext;

  const withMeta = (required?: string[], any?: string[]) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) => {
      if (key === PERMISSIONS_KEY) return required;
      if (key === ANY_PERMISSIONS_KEY) return any;
      return undefined;
    });
  };

  it('allows when no permission metadata is present (no-op)', async () => {
    withMeta(undefined, undefined);
    await expect(guard.canActivate(ctxFor({ role: 'satgas' }))).resolves.toBe(true);
    expect(rolePermissions.getRolePermissionKeys).not.toHaveBeenCalled();
  });

  it('allows when the role has all required permissions', async () => {
    withMeta(['user:read', 'user:create']);
    rolePermissions.getRolePermissionKeys.mockResolvedValue(['user:*']);
    await expect(guard.canActivate(ctxFor({ role: 'admin_data' }))).resolves.toBe(true);
  });

  it('denies when a required permission is missing', async () => {
    withMeta(['settings:manage']);
    rolePermissions.getRolePermissionKeys.mockResolvedValue(['settings:read']);
    await expect(guard.canActivate(ctxFor({ role: 'top_management' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('honors *:* superuser grant', async () => {
    withMeta(['role:create', 'settings:manage']);
    rolePermissions.getRolePermissionKeys.mockResolvedValue(['*:*']);
    await expect(guard.canActivate(ctxFor({ role: 'superadmin' }))).resolves.toBe(true);
  });

  it('supports RequireAnyPermission (OR)', async () => {
    withMeta(undefined, ['activity:approve', 'task:verify']);
    rolePermissions.getRolePermissionKeys.mockResolvedValue(['task:verify']);
    await expect(guard.canActivate(ctxFor({ role: 'kepala_rayon' }))).resolves.toBe(true);
  });

  it('throws when no authenticated user', async () => {
    withMeta(['user:read']);
    await expect(guard.canActivate(ctxFor(undefined))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
