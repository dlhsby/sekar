import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../../notifications/notifications.module';
import { FcmRetryProcessor } from './fcm-retry.processor';
import { FCM_RETRY_QUEUE } from '../queue.constants';

export { FCM_RETRY_QUEUE };

/**
 * FcmRetryQueueModule
 *
 * Registers the `fcm-retry` BullMQ queue with env-driven retry policy.
 * Used by `NotificationsService` to enqueue FCM send retries instead of
 * blocking the HTTP response with recursive in-process retries.
 *
 * Job payload contract: `{ notification_id: string; attempt: number }`.
 * Processor resolves the notification row, replays the send via
 * NotificationsService, and updates `send_attempts` / `error_message`.
 */
@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: FCM_RETRY_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: Number(config.get('BULLMQ_FCM_RETRY_ATTEMPTS', '3')),
          backoff: {
            type: 'exponential',
            delay: Number(config.get('BULLMQ_FCM_RETRY_BACKOFF_MS', '5000')),
          },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600 },
        },
      }),
    }),
    forwardRef(() => NotificationsModule),
  ],
  providers: [FcmRetryProcessor],
  exports: [BullModule],
})
export class FcmRetryQueueModule {}
