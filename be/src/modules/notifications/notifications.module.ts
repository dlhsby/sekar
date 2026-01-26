import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationToken } from './entities/notification-token.entity';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';

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
  imports: [TypeOrmModule.forFeature([NotificationToken, Notification]), UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
