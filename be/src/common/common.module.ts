import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './services/redis.service';
import { AuditContextInterceptor } from './interceptors/audit-context.interceptor';
import { AuditSubscriber } from './subscribers/audit.subscriber';

/**
 * CommonModule
 *
 * Global module providing shared infrastructure services to every module
 * without requiring explicit imports. Currently provides:
 * - RedisService (Redis Streams + Socket.IO adapter)
 * - Actor-audit: a global interceptor seeds the per-request audit context and a
 *   TypeORM subscriber stamps created_by/updated_by/deleted_by.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    AuditSubscriber,
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
  ],
  exports: [RedisService],
})
export class CommonModule {}
