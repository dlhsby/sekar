import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationToken, DevicePlatform } from './entities/notification-token.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UnregisterTokenDto } from './dto/unregister-token.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    username: 'testuser',
    role: UserRole.WORKER,
    is_active: true,
  };

  const mockToken: Partial<NotificationToken> = {
    id: 'token-uuid',
    user_id: 'user-uuid',
    fcm_token: 'fcm-token-123',
    platform: DevicePlatform.ANDROID,
    device_name: 'Test Device',
    is_active: true,
  };

  const mockNotification: Partial<Notification> = {
    id: 'notification-uuid',
    user_id: 'user-uuid',
    title: 'Test Notification',
    body: 'Test body',
    type: NotificationType.SYSTEM,
    is_read: false,
    is_sent: true,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            registerToken: jest.fn(),
            unregisterToken: jest.fn(),
            sendToUser: jest.fn(),
            broadcast: jest.fn(),
            getUserNotifications: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    it('should register a new FCM token', async () => {
      const dto: RegisterTokenDto = {
        fcm_token: 'new-fcm-token',
        platform: DevicePlatform.ANDROID,
        device_name: 'Test Device',
      };
      notificationsService.registerToken.mockResolvedValue(mockToken as NotificationToken);

      const result = await controller.registerToken(dto, mockUser as User);

      expect(notificationsService.registerToken).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toEqual(mockToken);
    });
  });

  describe('unregisterToken', () => {
    it('should unregister FCM token', async () => {
      const dto: UnregisterTokenDto = {
        fcm_token: 'fcm-token-123',
      };
      notificationsService.unregisterToken.mockResolvedValue(undefined);

      await controller.unregisterToken(dto, mockUser as User);

      expect(notificationsService.unregisterToken).toHaveBeenCalledWith(dto.fcm_token, mockUser.id);
    });
  });

  describe('send', () => {
    it('should send notification to specific user', async () => {
      const dto: SendNotificationDto = {
        user_id: 'target-user-uuid',
        title: 'Task Assigned',
        body: 'You have a new task',
        type: NotificationType.TASK_ASSIGNED,
        data: { task_id: 'task-uuid' },
      };
      notificationsService.sendToUser.mockResolvedValue(mockNotification as Notification);

      const result = await controller.send(dto);

      expect(notificationsService.sendToUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockNotification);
    });

    it('should send notification with minimal data', async () => {
      const dto: SendNotificationDto = {
        user_id: 'target-user-uuid',
        title: 'Alert',
        body: 'Important message',
      };
      notificationsService.sendToUser.mockResolvedValue(mockNotification as Notification);

      const result = await controller.send(dto);

      expect(notificationsService.sendToUser).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      const dto: SendNotificationDto = {
        user_id: 'nonexistent-user-uuid',
        title: 'Test',
        body: 'Test body',
      };
      notificationsService.sendToUser.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.send(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('broadcast', () => {
    it('should broadcast notification', async () => {
      const dto: BroadcastNotificationDto = {
        title: 'Announcement',
        body: 'Test broadcast message',
        type: NotificationType.ANNOUNCEMENT,
        target_roles: [UserRole.WORKER],
      };
      notificationsService.broadcast.mockResolvedValue({ sent: 10, failed: 0 });

      const result = await controller.broadcast(dto);

      expect(notificationsService.broadcast).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ sent: 10, failed: 0 });
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const notifications = [mockNotification];
      notificationsService.getUserNotifications.mockResolvedValue(notifications as Notification[]);

      const result = await controller.getUserNotifications(mockUser as User, {});

      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(mockUser.id, {});
      expect(result).toEqual(notifications);
    });

    it('should apply filters', async () => {
      const filters: NotificationFilterDto = {
        is_read: false,
        type: NotificationType.TASK_ASSIGNED,
      };
      const notifications = [mockNotification];
      notificationsService.getUserNotifications.mockResolvedValue(notifications as Notification[]);

      const result = await controller.getUserNotifications(mockUser as User, filters);

      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(mockUser.id, filters);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notificationsService.getUnreadCount.mockResolvedValue({ count: 5 });

      const result = await controller.getUnreadCount(mockUser as User);

      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const readNotification = { ...mockNotification, is_read: true };
      notificationsService.markAsRead.mockResolvedValue(readNotification as Notification);

      const result = await controller.markAsRead('notification-uuid', mockUser as User);

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'notification-uuid',
        mockUser.id,
      );
      expect(result.is_read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      notificationsService.markAllAsRead.mockResolvedValue({ marked: 10 });

      const result = await controller.markAllAsRead(mockUser as User);

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ marked: 10 });
    });
  });
});
