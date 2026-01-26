import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere } from 'typeorm';
import { NotificationToken, DevicePlatform } from './entities/notification-token.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { RegisterTokenDto } from './dto/register-token.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

/**
 * Service for managing notifications and FCM tokens
 *
 * Handles device token registration, notification creation,
 * and push notification delivery via FCM.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    @InjectRepository(NotificationToken)
    private readonly tokenRepository: Repository<NotificationToken>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Register a device FCM token
   *
   * @param dto - Token registration data
   * @param userId - ID of the user registering the token
   * @returns The registered token
   */
  async registerToken(dto: RegisterTokenDto, userId: string): Promise<NotificationToken> {
    this.logger.log(`Registering FCM token for user: ${userId}`);

    // Check if token already exists
    const existingToken = await this.tokenRepository.findOne({
      where: { fcm_token: dto.fcm_token },
    });

    if (existingToken) {
      // If token exists for same user, update it
      if (existingToken.user_id === userId) {
        existingToken.platform = dto.platform;
        existingToken.device_name = dto.device_name || null;
        existingToken.device_model = dto.device_model || null;
        existingToken.app_version = dto.app_version || null;
        existingToken.is_active = true;
        existingToken.last_used_at = new Date();

        return this.tokenRepository.save(existingToken);
      }

      // If token exists for different user, reassign it
      existingToken.user_id = userId;
      existingToken.platform = dto.platform;
      existingToken.device_name = dto.device_name || null;
      existingToken.device_model = dto.device_model || null;
      existingToken.app_version = dto.app_version || null;
      existingToken.is_active = true;
      existingToken.last_used_at = new Date();

      return this.tokenRepository.save(existingToken);
    }

    // Create new token
    const token = this.tokenRepository.create({
      user_id: userId,
      fcm_token: dto.fcm_token,
      platform: dto.platform,
      device_name: dto.device_name || null,
      device_model: dto.device_model || null,
      app_version: dto.app_version || null,
      is_active: true,
      last_used_at: new Date(),
    });

    const savedToken = await this.tokenRepository.save(token);
    this.logger.log(`FCM token registered for user: ${userId}`);

    return savedToken;
  }

  /**
   * Unregister a device FCM token
   *
   * @param fcmToken - The FCM token to unregister
   * @param userId - ID of the user unregistering the token
   */
  async unregisterToken(fcmToken: string, userId: string): Promise<void> {
    this.logger.log(`Unregistering FCM token for user: ${userId}`);

    const token = await this.tokenRepository.findOne({
      where: { fcm_token: fcmToken, user_id: userId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Soft deactivate instead of delete
    token.is_active = false;
    await this.tokenRepository.save(token);

    this.logger.log(`FCM token unregistered for user: ${userId}`);
  }

  /**
   * Get all active tokens for a user
   *
   * @param userId - User ID
   * @returns Array of active tokens
   */
  async getUserTokens(userId: string): Promise<NotificationToken[]> {
    return this.tokenRepository.find({
      where: { user_id: userId, is_active: true },
    });
  }

  /**
   * Send notification to a specific user
   *
   * @param dto - Notification data
   * @returns The created notification
   */
  async sendToUser(dto: SendNotificationDto): Promise<Notification> {
    this.logger.log(`Sending notification to user: ${dto.user_id}`);

    // Verify user exists
    await this.usersService.findOne(dto.user_id);

    // Create notification record
    const notification = this.notificationRepository.create({
      user_id: dto.user_id,
      title: dto.title,
      body: dto.body,
      type: dto.type || NotificationType.SYSTEM,
      data: dto.data || null,
      is_read: false,
      is_sent: false,
      send_attempts: 0,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send push notification asynchronously
    this.sendPushNotification(savedNotification).catch((error) => {
      this.logger.error(`Failed to send push notification: ${error.message}`);
    });

    return savedNotification;
  }

  /**
   * Broadcast notification to multiple users
   *
   * @param dto - Broadcast notification data
   * @returns Array of created notifications
   */
  async broadcast(dto: BroadcastNotificationDto): Promise<{ sent: number; failed: number }> {
    this.logger.log('Broadcasting notification');

    // Get target users based on roles
    let targetUserIds: string[] = [];

    if (dto.target_roles && dto.target_roles.length > 0) {
      // Get users with specified roles
      const users = await this.usersService.findByRoles(dto.target_roles);
      targetUserIds = users.map((u) => u.id);
    } else {
      // Get all active users
      const users = await this.usersService.findAll();
      targetUserIds = users.filter((u) => u.is_active).map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      this.logger.warn('No target users found for broadcast');
      return { sent: 0, failed: 0 };
    }

    // Create notifications for each user
    const notifications = targetUserIds.map((userId) =>
      this.notificationRepository.create({
        user_id: userId,
        title: dto.title,
        body: dto.body,
        type: dto.type || NotificationType.ANNOUNCEMENT,
        data: dto.data || null,
        is_read: false,
        is_sent: false,
        send_attempts: 0,
      }),
    );

    const savedNotifications = await this.notificationRepository.save(notifications);

    // Send push notifications asynchronously
    let sent = 0;
    let failed = 0;

    for (const notification of savedNotifications) {
      try {
        await this.sendPushNotification(notification);
        sent++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
      }
    }

    this.logger.log(`Broadcast complete: ${sent} sent, ${failed} failed`);

    return { sent, failed };
  }

  /**
   * Get notifications for a user
   *
   * @param userId - User ID
   * @param filters - Optional filters
   * @returns Array of notifications
   */
  async getUserNotifications(
    userId: string,
    filters?: NotificationFilterDto,
  ): Promise<Notification[]> {
    const where: FindOptionsWhere<Notification> = { user_id: userId };

    if (filters) {
      if (filters.is_read !== undefined) {
        where.is_read = filters.is_read;
      }
      if (filters.type) {
        where.type = filters.type;
      }
    }

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where(where);

    if (filters?.created_after) {
      queryBuilder.andWhere('notification.created_at >= :after', {
        after: new Date(filters.created_after),
      });
    }

    if (filters?.created_before) {
      queryBuilder.andWhere('notification.created_at <= :before', {
        before: new Date(filters.created_before),
      });
    }

    return queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .limit(100) // Limit to last 100 notifications
      .getMany();
  }

  /**
   * Mark a notification as read
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for verification)
   * @returns The updated notification
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.is_read) {
      return notification;
    }

    notification.is_read = true;
    notification.read_at = new Date();

    return this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read for a user
   *
   * @param userId - User ID
   * @returns Number of notifications marked as read
   */
  async markAllAsRead(userId: string): Promise<{ marked: number }> {
    const result = await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );

    return { marked: result.affected || 0 };
  }

  /**
   * Get unread notification count for a user
   *
   * @param userId - User ID
   * @returns Count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });

    return { count };
  }

  /**
   * Send push notification via FCM
   *
   * Note: This is a placeholder implementation.
   * In production, integrate with Firebase Admin SDK.
   *
   * @param notification - Notification to send
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    const tokens = await this.getUserTokens(notification.user_id);

    if (tokens.length === 0) {
      this.logger.debug(`No active tokens for user: ${notification.user_id}`);
      return;
    }

    notification.send_attempts++;

    try {
      // TODO: Implement actual FCM sending
      // For now, simulate success
      await this.simulateFcmSend(tokens, notification);

      notification.is_sent = true;
      notification.sent_at = new Date();
      notification.error_message = null;

      await this.notificationRepository.save(notification);
      this.logger.log(`Push notification sent: ${notification.id}`);
    } catch (error) {
      notification.error_message = error.message;
      await this.notificationRepository.save(notification);

      // Retry if under max attempts
      if (notification.send_attempts < this.MAX_RETRY_ATTEMPTS) {
        this.logger.warn(
          `Retrying notification ${notification.id} (attempt ${notification.send_attempts + 1})`,
        );
        await this.sendPushNotification(notification);
      } else {
        this.logger.error(`Max retry attempts reached for notification ${notification.id}`);
        throw error;
      }
    }
  }

  /**
   * Simulate FCM send (placeholder for actual implementation)
   */
  private async simulateFcmSend(
    tokens: NotificationToken[],
    notification: Notification,
  ): Promise<void> {
    // In production, use Firebase Admin SDK:
    // const messaging = admin.messaging();
    // await messaging.sendMulticast({
    //   tokens: tokens.map(t => t.fcm_token),
    //   notification: {
    //     title: notification.title,
    //     body: notification.body,
    //   },
    //   data: notification.data as Record<string, string>,
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update token last_used_at
    for (const token of tokens) {
      token.last_used_at = new Date();
      await this.tokenRepository.save(token);
    }

    this.logger.debug(
      `Simulated FCM send to ${tokens.length} devices for notification ${notification.id}`,
    );
  }
}
