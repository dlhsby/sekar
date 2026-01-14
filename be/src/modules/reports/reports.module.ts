import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report } from './entities/report.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { SharedModule } from '../../shared/shared.module';

/**
 * Reports Module
 *
 * Provides functionality for work report management including:
 * - Report creation with photo uploads
 * - Report listing with filters
 * - Report updates (with time constraints)
 * - Report deletion (admin only)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Report, Shift]),
    SharedModule, // For S3Service
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
