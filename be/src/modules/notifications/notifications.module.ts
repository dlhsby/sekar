import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';
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
    TypeOrmModule.forFeature([NotificationToken, Notification]),
    UsersModule,
    // Phase 4-3 (M2): re-register queue by name so NotificationsService can
    // @InjectQueue('fcm-retry'). The queue's actual config lives in
    // QueueModule (already imported at app level).
    BullModule.registerQueue({ name: FCM_RETRY_QUEUE }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
