import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './services/s3.service';

/**
 * Shared Module
 *
 * Provides shared services that can be used across multiple modules.
 * Currently includes S3 service for file uploads.
 */
@Module({
  imports: [ConfigModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class SharedModule {}
