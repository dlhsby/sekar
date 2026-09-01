import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockExecutionContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true if no roles are required', () => {
      const context = mockExecutionContext({ role: UserRole.SATGAS });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true if user has required role', () => {
      const context = mockExecutionContext({ role: UserRole.SUPERADMIN });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPERADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has one of the required roles', () => {
      const context = mockExecutionContext({ role: UserRole.KORLAP });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPERADMIN, UserRole.KORLAP]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      const context = mockExecutionContext({ role: UserRole.SATGAS });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPERADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user role does not match any required roles', () => {
      const context = mockExecutionContext({ role: UserRole.SATGAS });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPERADMIN, UserRole.KORLAP]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle admin-only access', () => {
      const adminContext = mockExecutionContext({ role: UserRole.SUPERADMIN });
      const workerContext = mockExecutionContext({ role: UserRole.SATGAS });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPERADMIN]);

      expect(guard.canActivate(adminContext)).toBe(true);
      expect(guard.canActivate(workerContext)).toBe(false);
    });

    it('should handle supervisor and admin access', () => {
      const supervisorContext = mockExecutionContext({
        role: UserRole.KORLAP,
      });
      const workerContext = mockExecutionContext({ role: UserRole.SATGAS });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPERADMIN, UserRole.KORLAP]);

      expect(guard.canActivate(supervisorContext)).toBe(true);
      expect(guard.canActivate(workerContext)).toBe(false);
    });

    describe('management admin_system parity', () => {
      it('grants management access to admin_system-gated routes', () => {
        const context = mockExecutionContext({ role: UserRole.MANAGEMENT });
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN_SYSTEM]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('grants management access when admin_system is one of several allowed roles', () => {
        const context = mockExecutionContext({ role: UserRole.MANAGEMENT });
        jest
          .spyOn(reflector, 'getAllAndOverride')
          .mockReturnValue([UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN]);

        expect(guard.canActivate(context)).toBe(true);
      });

      it('does NOT grant management access to routes that only allow other roles', () => {
        const context = mockExecutionContext({ role: UserRole.MANAGEMENT });
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.KORLAP]);

        expect(guard.canActivate(context)).toBe(false);
      });

      it('does not elevate other roles to admin_system', () => {
        const context = mockExecutionContext({ role: UserRole.ADMIN_RAYON });
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN_SYSTEM]);

        expect(guard.canActivate(context)).toBe(false);
      });
    });
  });
});
