import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationType } from './entities/notification.entity';
import { CONFIGURABLE_NOTIFICATION_TYPES } from './constants/notification-preferences.constants';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let repo: jest.Mocked<Repository<NotificationPreference>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((x) => x),
            save: jest.fn((x) => Promise.resolve(x)),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationPreferencesService);
    repo = module.get(getRepositoryToken(NotificationPreference));
  });

  afterEach(() => jest.clearAllMocks());

  describe('getForUser', () => {
    it('returns the full configurable set, defaulting absent rows to enabled', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.getForUser('user-1');

      expect(result).toHaveLength(CONFIGURABLE_NOTIFICATION_TYPES.length);
      expect(result.every((p) => p.enabled === true)).toBe(true);
      expect(result.map((p) => p.type)).toEqual([...CONFIGURABLE_NOTIFICATION_TYPES]);
    });

    it('reflects stored opt-outs', async () => {
      repo.find.mockResolvedValue([
        {
          id: 'p1',
          user_id: 'user-1',
          notification_type: NotificationType.TASK_ASSIGNED,
          enabled: false,
        } as NotificationPreference,
      ]);

      const result = await service.getForUser('user-1');
      const taskAssigned = result.find((p) => p.type === NotificationType.TASK_ASSIGNED);
      expect(taskAssigned?.enabled).toBe(false);
    });
  });

  describe('updateForUser', () => {
    it('inserts a row when none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.find.mockResolvedValue([]);

      await service.updateForUser('user-1', [
        { type: NotificationType.TASK_ASSIGNED, enabled: false },
      ]);

      expect(repo.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        notification_type: NotificationType.TASK_ASSIGNED,
        enabled: false,
      });
      expect(repo.save).toHaveBeenCalled();
    });

    it('updates an existing row only when the value changed', async () => {
      const existing = {
        id: 'p1',
        user_id: 'user-1',
        notification_type: NotificationType.TASK_ASSIGNED,
        enabled: true,
      } as NotificationPreference;
      repo.findOne.mockResolvedValue(existing);
      repo.find.mockResolvedValue([existing]);

      await service.updateForUser('user-1', [
        { type: NotificationType.TASK_ASSIGNED, enabled: false },
      ]);

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });

    it('ignores types outside the configurable set', async () => {
      repo.find.mockResolvedValue([]);

      await service.updateForUser('user-1', [{ type: NotificationType.SYSTEM, enabled: false }]);

      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('returns true when no row exists (default-on)', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.isEnabled('user-1', NotificationType.TASK_ASSIGNED)).resolves.toBe(true);
    });

    it('returns the stored value when a row exists', async () => {
      repo.findOne.mockResolvedValue({ enabled: false } as NotificationPreference);
      await expect(service.isEnabled('user-1', NotificationType.TASK_ASSIGNED)).resolves.toBe(
        false,
      );
    });

    it('fails open (true) on a lookup error', async () => {
      repo.findOne.mockRejectedValue(new Error('db down'));
      await expect(service.isEnabled('user-1', NotificationType.TASK_ASSIGNED)).resolves.toBe(true);
    });
  });
});
