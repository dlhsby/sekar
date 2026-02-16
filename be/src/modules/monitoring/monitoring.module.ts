import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { AreaStaffRequirement } from '../area-staff-requirements/entities/area-staff-requirement.entity';

/**
 * Module for real-time monitoring
 *
 * Provides:
 * - City-wide statistics (Admin/TopManagement)
 * - Rayon-level statistics (KepalaRayon+)
 * - Area-level statistics (Korlap+)
 * - Live user positions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Area,
      Shift,
      Task,
      Activity,
      LocationLog,
      Rayon,
      ShiftDefinition,
      AreaStaffRequirement,
    ]),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
