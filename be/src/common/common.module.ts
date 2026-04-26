import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './services/redis.service';

/**
 * CommonModule
 *
 * Global module providing shared infrastructure services to every module
 * without requiring explicit imports. Currently provides:
 * - RedisService (Redis Streams + Socket.IO adapter)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonModule {}
