import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTypesController } from './activity-types.controller';
import { ActivityTypesService } from './activity-types.service';
import { ActivityType } from './entities/activity-type.entity';

/**
 * Module for managing activity types
 *
 * Provides CRUD operations for activity types with Admin-only modifications.
 * Supports filtering by role (Worker, Linmas).
 * Exports ActivityTypesService for use in other modules.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ActivityType])],
  controllers: [ActivityTypesController],
  providers: [ActivityTypesService],
  exports: [ActivityTypesService],
})
export class ActivityTypesModule {}
