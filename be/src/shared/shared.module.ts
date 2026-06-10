import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './services/s3.service';
import { S3InitService } from './services/s3-init.service';
import { BoundaryCheckService } from './services/boundary-check.service';

/**
 * Shared Module
 *
 * Provides shared services that can be used across multiple modules.
 * Includes S3 services for file uploads and the GPS/polygon boundary-check
 * service (Phase 4-7 H1).
 */
@Module({
  imports: [ConfigModule],
  providers: [S3Service, S3InitService, BoundaryCheckService],
  exports: [S3Service, BoundaryCheckService],
})
export class SharedModule {}
