import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringUserService } from './services/monitoring-user.service';
import { AreaPlantStatusService } from './services/area-plant-status.service';
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
import { Schedule } from '../schedules/entities/schedule.entity';
import { ScheduleArea } from '../schedules/entities/schedule-area.entity';
import { MonitoringCacheService } from './services/monitoring-cache.service';
import { MonitoringConfigService } from './services/monitoring-config.service';
import { StatusCalculatorService } from './services/status-calculator.service';
import { MonitoringSchedulerService } from './services/monitoring-scheduler.service';
import { DayTypeService } from './services/day-type.service';
import { MonitoringReassignService } from './services/monitoring-reassign.service';
import { StatusProjectorService } from './services/status-projector.service';
import { StaffingDebouncerService } from './services/staffing-debouncer.service';
import { StaleStatusSweeperService } from './services/stale-status-sweeper.service';
import { OfflineSweeperService } from './services/offline-sweeper.service';
import { PlantOverdueDigestCron } from './cron/plant-overdue-digest.cron';
import { AreaPlant } from '../plants/entities/area-plant.entity';
import { EventsModule } from '../../gateways/events.module';
import { UserAreasModule } from '../user-areas/user-areas.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { PlantsModule } from '../plants/plants.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { SharedModule } from '../../shared/shared.module';
import { SettingsModule } from '../settings/settings.module';

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
      AreaPlant,
      Schedule,
      ScheduleArea,
    ]),
    forwardRef(() => EventsModule),
    UserAreasModule,
    SchedulesModule,
    PlantsModule,
    NotificationsModule, // Phase 4-3 (M2): missing-worker alert FCM trigger
    AuditModule, // Phase 4-4: reassignment audit trail
    SharedModule, // Phase 4-7 (H1): BoundaryCheckService for status calculation
    SettingsModule, // ADR-049: runtime config (missing/staffing thresholds) via SystemConfigService
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MonitoringStatsService,
    MonitoringUserService,
    AreaPlantStatusService,
    MonitoringCacheService,
    MonitoringConfigService,
    StatusCalculatorService,
    MonitoringSchedulerService,
    DayTypeService,
    MonitoringReassignService,
    StatusProjectorService,
    StaffingDebouncerService,
    StaleStatusSweeperService,
    OfflineSweeperService,
    PlantOverdueDigestCron, // Phase 3-8 close-out: daily overdue digest
  ],
  exports: [
    MonitoringService,
    MonitoringStatsService,
    MonitoringUserService,
    AreaPlantStatusService,
    MonitoringCacheService,
    MonitoringConfigService,
    StatusCalculatorService,
    DayTypeService,
    StaffingDebouncerService,
  ],
})
export class MonitoringModule {}
