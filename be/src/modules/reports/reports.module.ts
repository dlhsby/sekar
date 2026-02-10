import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report } from './entities/report.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { SharedModule } from '../../shared/shared.module';

/**
 * Reports Module (Aktivitas)
 *
 * Provides functionality for work activity report (aktivitas) management including:
 * - Aktivitas creation with photo uploads (1-3 photos)
 * - Auto-detection of active shift
 * - Activity type validation against user role
 * - Aktivitas listing with scope-based filtering
 * - Aktivitas updates (with time constraints)
 * - Aktivitas deletion (admin only)
 *
 * Phase 2C: Routes changed from /reports to /aktivitas
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Report, Shift, ActivityType]),
    SharedModule, // For S3Service
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
