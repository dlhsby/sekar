import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { ShiftReminderCron } from './cron/shift-reminder.cron';
import { UsersModule } from '../users/users.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { SettingsModule } from '../settings/settings.module';
import { FCM_RETRY_QUEUE } from '../queue/queue.constants';

/**
 * Module for notification management
 *
 * Provides:
 * - FCM device token registration
 * - Push notification delivery
 * - Notification history tracking
 * - Broadcast functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationToken, Notification, NotificationPreference]),
    UsersModule,
    // Phase 4-3 (§C3): the shift-reminder cron reads today's roster (ADR-013).
    SchedulesModule,
    // Phase 4-3 (M2): re-register queue by name so NotificationsService can
    // @InjectQueue('fcm-retry'). The queue's actual config lives in
    // QueueModule (already imported at app level).
    BullModule.registerQueue({ name: FCM_RETRY_QUEUE }),
    SettingsModule, // ADR-049: runtime FCM kill-switch via SystemConfigService
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [NotificationsService, NotificationPreferencesService, ShiftReminderCron],
  exports: [NotificationsService, NotificationPreferencesService],
})
export class NotificationsModule {}
