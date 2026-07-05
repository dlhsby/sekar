import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { FcmRetryQueueModule } from './fcm-retry/fcm-retry.module';

/**
 * QueueModule
 *
 * Owns BullMQ wiring for the backend. Uses a **separate ioredis connection**
 * from RedisService (which is configured for Streams + Socket.IO adapter with
 * `maxRetriesPerRequest: 3`). BullMQ requires `maxRetriesPerRequest: null`
 * for its blocking operations (BLPOP/BRPOPLPUSH); sharing the connection
 * would starve other Redis commands.
 *
 * Phase 4 M2: ships the `fcm-retry` queue only. Export + cron migrations
 * are M4 (sub-phases 4-5, 4-6).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          // ioredis options — BullMQ requires null retries for blocking ops.
          // URL form keeps host/port/password configurable via a single env var
          // (matches RedisService).
          url: config.get<string>('REDIS_URL', 'redis://localhost:16379'),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        prefix: config.get<string>('BULLMQ_PREFIX', 'sekar-dev'),
      }),
    }),
    FcmRetryQueueModule,
  ],
  exports: [BullModule, FcmRetryQueueModule],
})
export class QueueModule {}
