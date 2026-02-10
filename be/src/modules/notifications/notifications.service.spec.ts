import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationToken, DevicePlatform } from './entities/notification-token.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let tokenRepository: jest.Mocked<Repository<NotificationToken>>;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    username: 'testuser',
    role: UserRole.SATGAS,
    is_active: true,
  };

  const mockToken: Partial<NotificationToken> = {
    id: 'token-uuid',
    user_id: 'user-uuid',
    fcm_token: 'fcm-token-123',
    platform: DevicePlatform.ANDROID,
    device_id: 'test-device-id-123',
    device_name: 'Test Device',
    is_active: true,
    last_used_at: new Date(),
  };

  const mockNotification: Partial<Notification> = {
    id: 'notification-uuid',
    user_id: 'user-uuid',
    title: 'Test Notification',
    body: 'Test body',
    type: NotificationType.SYSTEM,
    is_read: false,
    is_sent: false,
    send_attempts: 0,
    created_at: new Date(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockNotification]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(NotificationToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            findByRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    tokenRepository = module.get(getRepositoryToken(NotificationToken));
    notificationRepository = module.get(getRepositoryToken(Notification));
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    const registerDto = {
      fcm_token: 'new-fcm-token',
      platform: DevicePlatform.ANDROID,
      device_name: 'Test Device',
    };

    it('should create new token if not exists', async () => {
      const newToken = { ...mockToken, fcm_token: 'new-fcm-token' };
      tokenRepository.findOne.mockResolvedValue(null);
      tokenRepository.create.mockReturnValue(newToken as NotificationToken);
      tokenRepository.save.mockResolvedValue(newToken as NotificationToken);

      const result = await service.registerToken(registerDto, 'user-uuid');

      expect(tokenRepository.findOne).toHaveBeenCalled();
      expect(tokenRepository.create).toHaveBeenCalled();
      expect(tokenRepository.save).toHaveBeenCalled();
      expect(result).toEqual(newToken);
    });

    it('should update existing token for same user', async () => {
      const existingToken = { ...mockToken, fcm_token: 'new-fcm-token' };
      tokenRepository.findOne.mockResolvedValue(existingToken as NotificationToken);
      tokenRepository.save.mockResolvedValue(existingToken as NotificationToken);

      const result = await service.registerToken(registerDto, 'user-uuid');

      expect(tokenRepository.save).toHaveBeenCalled();
      expect(result).toEqual(existingToken);
    });

    it('should reassign token to new user if exists for different user', async () => {
      const existingToken = { ...mockToken, user_id: 'other-user-uuid' };
      tokenRepository.findOne.mockResolvedValue(existingToken as NotificationToken);
      tokenRepository.save.mockResolvedValue({
        ...existingToken,
        user_id: 'user-uuid',
      } as NotificationToken);

      const result = await service.registerToken(registerDto, 'user-uuid');

      expect(result.user_id).toBe('user-uuid');
    });
  });

  describe('unregisterToken', () => {
    it('should deactivate token successfully', async () => {
      tokenRepository.findOne.mockResolvedValue(mockToken as NotificationToken);
      tokenRepository.save.mockResolvedValue({
        ...mockToken,
        is_active: false,
      } as NotificationToken);

      await service.unregisterToken('fcm-token-123', 'user-uuid');

      expect(tokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('should throw NotFoundException if token not found', async () => {
      tokenRepository.findOne.mockResolvedValue(null);

      await expect(service.unregisterToken('nonexistent-token', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserTokens', () => {
    it('should return active tokens for user', async () => {
      const tokens = [mockToken];
      tokenRepository.find.mockResolvedValue(tokens as NotificationToken[]);

      const result = await service.getUserTokens('user-uuid');

      expect(tokenRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid', is_active: true },
      });
      expect(result).toEqual(tokens);
    });
  });

  describe('sendToUser', () => {
    const sendDto = {
      user_id: 'user-uuid',
      title: 'Test',
      body: 'Test body',
      type: NotificationType.TASK_ASSIGNED,
    };

    it('should create and send notification', async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockResolvedValue([]);

      const result = await service.sendToUser(sendDto);

      expect(usersService.findOne).toHaveBeenCalledWith('user-uuid');
      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.sendToUser(sendDto)).rejects.toThrow(NotFoundException);
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    const broadcastDto = {
      title: 'Announcement',
      body: 'Test broadcast',
      type: NotificationType.ANNOUNCEMENT,
      target_roles: [UserRole.SATGAS],
    };

    it('should broadcast to users with specified roles', async () => {
      const targetUsers = [
        { id: 'user-1', is_active: true },
        { id: 'user-2', is_active: true },
      ];
      usersService.findByRoles.mockResolvedValue(targetUsers as User[]);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue([mockNotification] as any);
      tokenRepository.find.mockResolvedValue([]);

      const result = await service.broadcast(broadcastDto);

      expect(usersService.findByRoles).toHaveBeenCalledWith([UserRole.SATGAS]);
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
    });

    it('should broadcast to all active users if no roles specified', async () => {
      const allUsers = [
        { id: 'user-1', is_active: true },
        { id: 'user-2', is_active: false },
      ];
      const broadcastNoRoles = { ...broadcastDto, target_roles: undefined };
      usersService.findAll.mockResolvedValue(allUsers as User[]);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue([mockNotification] as any);
      tokenRepository.find.mockResolvedValue([]);

      await service.broadcast(broadcastNoRoles);

      expect(usersService.findAll).toHaveBeenCalled();
    });

    it('should return zero if no target users found', async () => {
      usersService.findByRoles.mockResolvedValue([]);

      const result = await service.broadcast(broadcastDto);

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications for user', async () => {
      const result = await service.getUserNotifications('user-uuid');

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('notification.created_at', 'DESC');
      expect(result).toEqual([mockNotification]);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        is_read: false,
        type: NotificationType.TASK_ASSIGNED,
        created_after: '2024-01-01',
      };

      await service.getUserNotifications('user-uuid', filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const unreadNotification = { ...mockNotification, is_read: false };
      notificationRepository.findOne.mockResolvedValue(unreadNotification as Notification);
      notificationRepository.save.mockResolvedValue({
        ...unreadNotification,
        is_read: true,
        read_at: expect.any(Date),
      } as Notification);

      const result = await service.markAsRead('notification-uuid', 'user-uuid');

      expect(notificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_read: true }),
      );
    });

    it('should return unchanged if already read', async () => {
      const readNotification = { ...mockNotification, is_read: true };
      notificationRepository.findOne.mockResolvedValue(readNotification as Notification);

      const result = await service.markAsRead('notification-uuid', 'user-uuid');

      expect(notificationRepository.save).not.toHaveBeenCalled();
      expect(result.is_read).toBe(true);
    });

    it('should throw NotFoundException if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent-uuid', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 5 } as any);

      const result = await service.markAllAsRead('user-uuid');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { user_id: 'user-uuid', is_read: false },
        expect.objectContaining({ is_read: true }),
      );
      expect(result).toEqual({ marked: 5 });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      notificationRepository.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-uuid');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid', is_read: false },
      });
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('registerToken edge cases', () => {
    it('should register token with optional fields', async () => {
      const registerDtoMinimal = {
        fcm_token: 'new-fcm-token',
        platform: DevicePlatform.IOS,
      };

      const newToken = { ...mockToken, fcm_token: 'new-fcm-token', platform: DevicePlatform.IOS };
      tokenRepository.findOne.mockResolvedValue(null);
      tokenRepository.create.mockReturnValue(newToken as NotificationToken);
      tokenRepository.save.mockResolvedValue(newToken as NotificationToken);

      const result = await service.registerToken(registerDtoMinimal, 'user-uuid');

      expect(result).toEqual(newToken);
    });

    it('should update existing token with all fields when reassigning to different user', async () => {
      const registerDto = {
        fcm_token: 'existing-token',
        platform: DevicePlatform.IOS,
        device_name: 'iPhone 15',
        device_model: 'iPhone15,2',
        app_version: '1.0.5',
      };

      const existingToken = {
        ...mockToken,
        fcm_token: 'existing-token',
        user_id: 'other-user-uuid',
      };

      tokenRepository.findOne.mockResolvedValue(existingToken as NotificationToken);
      tokenRepository.save.mockResolvedValue({
        ...existingToken,
        user_id: 'user-uuid',
        ...registerDto,
      } as NotificationToken);

      await service.registerToken(registerDto, 'user-uuid');

      expect(tokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('sendToUser edge cases', () => {
    it('should send notification with default type when not provided', async () => {
      const sendDto = {
        user_id: 'user-uuid',
        title: 'Test',
        body: 'Test body',
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockResolvedValue([]);

      await service.sendToUser(sendDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SYSTEM,
        }),
      );
    });

    it('should handle push notification sending failure silently', async () => {
      const sendDto = {
        user_id: 'user-uuid',
        title: 'Test',
        body: 'Test body',
        type: NotificationType.TASK_ASSIGNED,
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockRejectedValue(new Error('Token fetch failed'));

      // Should not throw - errors are caught
      const result = await service.sendToUser(sendDto);

      expect(result).toEqual(mockNotification);
    });

    it('should send notification with custom data', async () => {
      const sendDto = {
        user_id: 'user-uuid',
        title: 'Test',
        body: 'Test body',
        type: NotificationType.TASK_ASSIGNED,
        data: { task_id: 'task-123' },
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockResolvedValue([]);

      await service.sendToUser(sendDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { task_id: 'task-123' },
        }),
      );
    });
  });

  describe('broadcast edge cases', () => {
    it('should handle broadcast with default type', async () => {
      const broadcastDto = {
        title: 'Announcement',
        body: 'Test broadcast',
      };

      const targetUsers = [{ id: 'user-1', is_active: true }];
      usersService.findAll.mockResolvedValue(targetUsers as User[]);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue([mockNotification] as any);
      tokenRepository.find.mockResolvedValue([]);

      await service.broadcast(broadcastDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ANNOUNCEMENT,
        }),
      );
    });

    it('should handle partial failures in broadcast', async () => {
      const broadcastDto = {
        title: 'Announcement',
        body: 'Test broadcast',
        type: NotificationType.ANNOUNCEMENT,
        target_roles: [UserRole.SATGAS],
      };

      const targetUsers = [
        { id: 'user-1', is_active: true },
        { id: 'user-2', is_active: true },
      ];

      usersService.findByRoles.mockResolvedValue(targetUsers as User[]);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue([
        { ...mockNotification, user_id: 'user-1' },
        { ...mockNotification, user_id: 'user-2' },
      ] as any);

      // First call succeeds, second fails
      tokenRepository.find
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Token fetch failed'));

      const result = await service.broadcast(broadcastDto);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should broadcast with custom data', async () => {
      const broadcastDto = {
        title: 'Announcement',
        body: 'Test broadcast',
        type: NotificationType.ANNOUNCEMENT,
        target_roles: [UserRole.SATGAS],
        data: { priority: 'high' },
      };

      const targetUsers = [{ id: 'user-1', is_active: true }];
      usersService.findByRoles.mockResolvedValue(targetUsers as User[]);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue([mockNotification] as any);
      tokenRepository.find.mockResolvedValue([]);

      await service.broadcast(broadcastDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { priority: 'high' },
        }),
      );
    });
  });

  describe('getUserNotifications edge cases', () => {
    it('should filter by is_read true', async () => {
      const filters = {
        is_read: true,
      };

      await service.getUserNotifications('user-uuid', filters);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      const filters = {
        type: NotificationType.SHIFT_REMINDER,
      };

      await service.getUserNotifications('user-uuid', filters);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should apply created_before filter', async () => {
      const filters = {
        created_before: '2026-12-31',
      };

      await service.getUserNotifications('user-uuid', filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.created_at <= :before',
        expect.any(Object),
      );
    });
  });

  describe('sendPushNotification (private method)', () => {
    it('should skip sending when user has no active tokens', async () => {
      const sendDto = {
        user_id: 'user-uuid',
        title: 'Test',
        body: 'Test body',
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockResolvedValue([]); // No tokens

      await service.sendToUser(sendDto);

      // Notification should still be created even without tokens
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should handle FCM send simulation with multiple tokens', async () => {
      const sendDto = {
        user_id: 'user-uuid',
        title: 'Test',
        body: 'Test body',
      };

      const multipleTokens = [
        { ...mockToken, id: 'token-1' },
        { ...mockToken, id: 'token-2' },
      ];

      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockResolvedValue(multipleTokens as NotificationToken[]);
      tokenRepository.save.mockResolvedValue({} as any);

      await service.sendToUser(sendDto);

      // Wait for async push notification
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(tokenRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should retry on FCM send failure up to max attempts', async () => {
      const sendDto = {
        user_id: 'user-uuid',
        title: 'Test',
        body: 'Test body',
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      notificationRepository.create.mockReturnValue(mockNotification as Notification);
      notificationRepository.save.mockResolvedValue(mockNotification as Notification);
      tokenRepository.find.mockRejectedValue(new Error('Simulated FCM error'));

      await service.sendToUser(sendDto);

      // Wait for async retries
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have saved notification with error tracking
      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead edge cases', () => {
    it('should handle when no notifications are updated', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 0 } as any);

      const result = await service.markAllAsRead('user-uuid');

      expect(result).toEqual({ marked: 0 });
    });

    it('should handle undefined affected count', async () => {
      notificationRepository.update.mockResolvedValue({ affected: undefined } as any);

      const result = await service.markAllAsRead('user-uuid');

      expect(result).toEqual({ marked: 0 });
    });
  });
});
