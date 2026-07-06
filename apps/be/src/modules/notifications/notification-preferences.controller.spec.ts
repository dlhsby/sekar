import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationType } from './entities/notification.entity';

describe('NotificationPreferencesController', () => {
  let controller: NotificationPreferencesController;
  let service: jest.Mocked<NotificationPreferencesService>;

  const self = { id: 'user-1', role: UserRole.SATGAS } as User;
  const admin = { id: 'admin-1', role: UserRole.ADMIN_SYSTEM } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferencesController],
      providers: [
        {
          provide: NotificationPreferencesService,
          useValue: { getForUser: jest.fn(), updateForUser: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(NotificationPreferencesController);
    service = module.get(NotificationPreferencesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('get', () => {
    it('allows a user to read their own preferences', async () => {
      service.getForUser.mockResolvedValue([]);
      await controller.get('user-1', self);
      expect(service.getForUser).toHaveBeenCalledWith('user-1');
    });

    it('forbids reading another user as a non-admin', async () => {
      await expect(controller.get('other', self)).rejects.toThrow(ForbiddenException);
      expect(service.getForUser).not.toHaveBeenCalled();
    });

    it('allows an admin to read another user', async () => {
      service.getForUser.mockResolvedValue([]);
      await controller.get('user-1', admin);
      expect(service.getForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('update', () => {
    const dto = { preferences: [{ type: NotificationType.TASK_ASSIGNED, enabled: false }] };

    it('allows a user to update their own preferences', async () => {
      service.updateForUser.mockResolvedValue([]);
      await controller.update('user-1', self, dto);
      expect(service.updateForUser).toHaveBeenCalledWith('user-1', dto.preferences);
    });

    it('forbids updating another user as a non-admin', async () => {
      await expect(controller.update('other', self, dto)).rejects.toThrow(ForbiddenException);
      expect(service.updateForUser).not.toHaveBeenCalled();
    });
  });
});
