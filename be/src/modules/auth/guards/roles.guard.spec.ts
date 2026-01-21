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
      const context = mockExecutionContext({ role: UserRole.WORKER });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true if user has required role', () => {
      const context = mockExecutionContext({ role: UserRole.ADMIN });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has one of the required roles', () => {
      const context = mockExecutionContext({ role: UserRole.SUPERVISOR });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.SUPERVISOR]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      const context = mockExecutionContext({ role: UserRole.WORKER });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user role does not match any required roles', () => {
      const context = mockExecutionContext({ role: UserRole.WORKER });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.SUPERVISOR]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle admin-only access', () => {
      const adminContext = mockExecutionContext({ role: UserRole.ADMIN });
      const workerContext = mockExecutionContext({ role: UserRole.WORKER });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

      expect(guard.canActivate(adminContext)).toBe(true);
      expect(guard.canActivate(workerContext)).toBe(false);
    });

    it('should handle supervisor and admin access', () => {
      const supervisorContext = mockExecutionContext({
        role: UserRole.SUPERVISOR,
      });
      const workerContext = mockExecutionContext({ role: UserRole.WORKER });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN, UserRole.SUPERVISOR]);

      expect(guard.canActivate(supervisorContext)).toBe(true);
      expect(guard.canActivate(workerContext)).toBe(false);
    });
  });
});
