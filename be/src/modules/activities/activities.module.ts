import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { User } from '../users/entities/user.entity';
import { ActivityPlantItem } from '../plants/entities/activity-plant-item.entity';
import { SharedModule } from '../../shared/shared.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

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
 * - Activity approval/rejection workflow (Phase 2C)
 *
 * Phase 2C: Routes changed from /aktivitas to /activities
 * Phase 2C: Added approval workflow (Korlap, Kepala Rayon)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityTag, Shift, ActivityType, User, ActivityPlantItem]),
    SharedModule, // For S3Service
    UsersModule,
    AuditModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
