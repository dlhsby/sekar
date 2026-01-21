import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './services/s3.service';
import { S3InitService } from './services/s3-init.service';

/**
 * Shared Module
 *
 * Provides shared services that can be used across multiple modules.
 * Currently includes S3 service for file uploads and S3 initialization.
 */
@Module({
  imports: [ConfigModule],
  providers: [S3Service, S3InitService],
  exports: [S3Service],
})
export class SharedModule {}
