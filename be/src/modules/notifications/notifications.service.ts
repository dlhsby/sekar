import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Repository, FindOptionsWhere } from 'typeorm';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { RegisterTokenDto } from './dto/register-token.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UsersService } from '../users/users.service';
import { getMessaging, isFirebaseInitialized } from '../../config/firebase.config';
import { FCM_RETRY_QUEUE } from '../queue/queue.constants';

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
    // Optional so existing specs that don't provide the queue keep working.
    // BullMQ queue for FCM retry — populated when QueueModule wires Redis.
    @Optional()
    @InjectQueue(FCM_RETRY_QUEUE)
    private readonly fcmRetryQueue?: Queue<{ notification_id: string; attempt: number }>,
    // Phase 4-3 (§D3): per-type push preference gate. Optional so legacy specs
    // that construct NotificationsService without it keep working — when absent,
    // the gate fails open (always sends).
    @Optional()
    private readonly preferencesService?: NotificationPreferencesService,
  ) {}

  /**
   * Register a device FCM token
   *
   * @param dto - Token registration data
   * @param userId - ID of the user registering the token
   * @returns The registered token
   */
  async registerToken(
    dto: RegisterTokenDto,
    userId: string,
  ): Promise<NotificationToken & { requires_rotation?: boolean }> {
    this.logger.log(`Registering FCM token for user: ${userId}`);

    // Check if token already exists
    const existingToken = await this.tokenRepository.findOne({
      where: { fcm_token: dto.fcm_token },
    });

    if (existingToken) {
      // May 13 — if the row was previously deactivated, that means
      // Firebase rejected the token (`registration-token-not-registered`
      // path in sendPushNotification). Re-activating the same bad token
      // causes an infinite loop: backend disables, mobile re-registers,
      // backend re-enables, next push fails again. Signal the mobile to
      // rotate via deleteToken() + getToken() and DO NOT reactivate here.
      const wasDeactivated = !existingToken.is_active;
      if (wasDeactivated) {
        this.logger.warn(
          `FCM token for user ${userId} was previously deactivated; signaling mobile to rotate.`,
        );
        // Touch metadata but keep is_active=false until the mobile sends
        // a fresh token. last_used_at update is intentional so the row
        // doesn't get marked "stale" by any future GC.
        existingToken.platform = dto.platform;
        existingToken.device_id = dto.device_id || null;
        existingToken.device_name = dto.device_name || null;
        existingToken.device_model = dto.device_model || null;
        existingToken.app_version = dto.app_version || null;
        existingToken.last_used_at = new Date();
        const saved = await this.tokenRepository.save(existingToken);
        return Object.assign(saved, { requires_rotation: true });
      }

      // If token exists for same user, update it
      if (existingToken.user_id === userId) {
        existingToken.platform = dto.platform;
        existingToken.device_id = dto.device_id || null;
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
      existingToken.device_id = dto.device_id || null;
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
      device_id: dto.device_id || null,
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

    // Phase 4-3 (§D3): respect the user's per-type push preference. A disabled
    // type still records the in-app inbox row (so unread counts stay correct)
    // but the FCM push is suppressed. Absent preferences service / no row →
    // enabled (fail-open).
    const pushEnabled = this.preferencesService
      ? await this.preferencesService.isEnabled(savedNotification.user_id, savedNotification.type)
      : true;

    if (pushEnabled) {
      // Send push notification asynchronously
      this.sendPushNotification(savedNotification).catch((error) => {
        this.logger.error(`Failed to send push notification: ${error.message}`);
      });
    } else {
      this.logger.debug(
        `Push suppressed for user ${savedNotification.user_id} type ${savedNotification.type} (preference off)`,
      );
    }

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
    let suppressed = 0;

    for (const notification of savedNotifications) {
      // Phase 4-3 (§D3): honor per-type push preferences here too. Broadcasts
      // normally use ANNOUNCEMENT/SYSTEM (non-configurable → always enabled),
      // but if an admin broadcasts a configurable type, respect each user's
      // opt-out. The in-app row is still written above; only the push is gated.
      const pushEnabled = this.preferencesService
        ? await this.preferencesService.isEnabled(notification.user_id, notification.type)
        : true;
      if (!pushEnabled) {
        suppressed++;
        continue;
      }
      try {
        await this.sendPushNotification(notification);
        sent++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Broadcast complete: ${sent} sent, ${failed} failed, ${suppressed} suppressed by preference`,
    );

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
   * Sends notifications using Firebase Cloud Messaging HTTP v1 API.
   * Handles partial failures and automatically deactivates invalid tokens.
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
      // Check if Firebase is initialized
      if (!isFirebaseInitialized()) {
        this.logger.warn('Firebase not initialized. Using simulated FCM send.');
        await this.simulateFcmSend(tokens, notification);
        notification.is_sent = true;
        notification.sent_at = new Date();
        notification.error_message = null;
        await this.notificationRepository.save(notification);
        return;
      }

      // Send via Firebase Admin SDK
      const messaging = getMessaging();
      const fcmTokens = tokens.map((t) => t.fcm_token);

      // Prepare FCM message
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data ? this.sanitizeDataForFcm(notification.data) : {},
        tokens: fcmTokens,
      };

      // Send multicast message
      const response = await messaging.sendEachForMulticast(message);

      this.logger.log(`FCM send result: ${response.successCount}/${fcmTokens.length} successful`);

      // Handle partial failures
      if (response.failureCount > 0) {
        // May 13 — extended the permanent-failure set to include
        // `mismatched-sender-id` (token issued by a different Firebase
        // project — will never succeed against this backend). Other
        // codes like `internal-error` / timeouts are transient and
        // should NOT trigger deactivation. Also added .catch() so a
        // DB-side failure on the deactivation UPDATE is surfaced
        // instead of silently swallowed by an unhandled rejection.
        const permanentFailures = new Set<string>([
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
          'messaging/mismatched-sender-id',
        ]);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            this.logger.error(
              `Failed to send to token ${fcmTokens[idx].substring(0, 20)}...: ${errorCode}`,
            );

            if (errorCode && permanentFailures.has(errorCode)) {
              this.tokenRepository
                .update({ fcm_token: fcmTokens[idx] }, { is_active: false })
                .then(() =>
                  this.logger.log(
                    `Deactivated invalid token: ${fcmTokens[idx].substring(0, 20)}...`,
                  ),
                )
                .catch((err) =>
                  this.logger.error(
                    `Failed to deactivate token ${fcmTokens[idx].substring(0, 20)}...: ${err.message}`,
                  ),
                );
            }
          }
        });
      }

      // Mark notification as sent if at least one message was delivered
      notification.is_sent = response.successCount > 0;
      notification.sent_at = new Date();
      notification.fcm_message_id = response.responses[0]?.messageId || null;
      notification.error_message = null;

      await this.notificationRepository.save(notification);
      this.logger.log(`Push notification sent: ${notification.id}`);
    } catch (error) {
      notification.error_message = error.message;
      await this.notificationRepository.save(notification);

      // Phase 4-3 (M2): enqueue retry to BullMQ instead of recursing in-process.
      // Synchronous recursion blocked the HTTP response on every retry and could
      // run for minutes if FCM was flapping. The queue handles backoff per the
      // `fcm-retry` queue's exponential schedule.
      if (notification.send_attempts < this.MAX_RETRY_ATTEMPTS && this.fcmRetryQueue) {
        await this.fcmRetryQueue.add(
          'fcm-retry',
          {
            notification_id: notification.id,
            attempt: notification.send_attempts,
          },
          // Per-job retry attempts already configured in QueueModule defaults;
          // jobId guards against duplicates if the same send fails repeatedly
          // within a single request lifecycle.
          { jobId: `${notification.id}:${notification.send_attempts}` },
        );
        this.logger.warn(
          `Enqueued FCM retry for notification ${notification.id} (attempt ${notification.send_attempts})`,
        );
        return;
      }

      // No queue (single-process dev or queue uninitialized) — fall back to
      // the legacy in-process retry so dev workflows still validate retries.
      if (notification.send_attempts < this.MAX_RETRY_ATTEMPTS) {
        this.logger.warn(
          `Retrying notification ${notification.id} in-process (attempt ${notification.send_attempts + 1}) — queue unavailable`,
        );
        await this.sendPushNotification(notification);
      } else {
        this.logger.error(`Max retry attempts reached for notification ${notification.id}`);
        throw error;
      }
    }
  }

  /**
   * Replay a previously-failed FCM send. Called by FcmRetryProcessor when a
   * `fcm-retry` queue job fires. Returns once the send result is persisted;
   * throws to surface failure to BullMQ so the next backoff attempt fires.
   */
  async retrySend(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      this.logger.warn(`retrySend: notification ${notificationId} not found — dropping job`);
      return;
    }
    await this.sendPushNotification(notification);
  }

  /**
   * Sanitize data for FCM (all values must be strings)
   */
  private sanitizeDataForFcm(data: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return sanitized;
  }

  /**
   * Simulate FCM send (fallback when Firebase is not initialized)
   */
  private async simulateFcmSend(
    tokens: NotificationToken[],
    notification: Notification,
  ): Promise<void> {
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
