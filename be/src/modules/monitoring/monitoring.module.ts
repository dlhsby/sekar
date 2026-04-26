import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringUserService } from './services/monitoring-user.service';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { AreaStaffRequirement } from '../area-staff-requirements/entities/area-staff-requirement.entity';
import { SpecialDayOverride } from '../special-day-overrides/entities/special-day-override.entity';
import { MonitoringConfig } from './entities/monitoring-config.entity';
import { UserTrackingStatus } from './entities/user-tracking-status.entity';
import { MonitoringCacheService } from './services/monitoring-cache.service';
import { MonitoringConfigService } from './services/monitoring-config.service';
import { StatusCalculatorService } from './services/status-calculator.service';
import { MonitoringSchedulerService } from './services/monitoring-scheduler.service';
import { DayTypeService } from './services/day-type.service';
import { RayonBoundaryService } from './services/rayon-boundary.service';
import { MonitoringReassignService } from './services/monitoring-reassign.service';
import { StatusProjectorService } from './services/status-projector.service';
import { StaffingDebouncerService } from './services/staffing-debouncer.service';
import { StaleStatusSweeperService } from './services/stale-status-sweeper.service';
import { Schedule } from '../schedules/entities/schedule.entity';
import { EventsModule } from '../../gateways/events.module';
import { UserAreasModule } from '../user-areas/user-areas.module';

@Module({
  imports: [
    ScheduleModule,
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
      SpecialDayOverride,
      MonitoringConfig,
      UserTrackingStatus,
      Schedule,
    ]),
    forwardRef(() => EventsModule),
    UserAreasModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MonitoringStatsService,
    MonitoringUserService,
    MonitoringCacheService,
    MonitoringConfigService,
    StatusCalculatorService,
    MonitoringSchedulerService,
    DayTypeService,
    RayonBoundaryService,
    MonitoringReassignService,
    StatusProjectorService,
    StaffingDebouncerService,
    StaleStatusSweeperService,
  ],
  exports: [
    MonitoringService,
    MonitoringStatsService,
    MonitoringUserService,
    MonitoringCacheService,
    MonitoringConfigService,
    StatusCalculatorService,
    DayTypeService,
    RayonBoundaryService,
    StaffingDebouncerService,
  ],
})
export class MonitoringModule {}
