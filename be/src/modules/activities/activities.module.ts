import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { SharedModule } from '../../shared/shared.module';

/**
 * Activities Module
 *
 * Provides functionality for work activity management including:
 * - Activity creation with photo uploads (1-3 photos)
 * - Auto-detection of active shift
 * - Activity type validation against user role
 * - Activity listing with scope-based filtering
 * - Activity updates (with time constraints)
 * - Activity deletion (admin only)
 *
 * Phase 2C: Routes changed from /aktivitas to /activities
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, Shift, ActivityType]),
    SharedModule, // For S3Service
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
