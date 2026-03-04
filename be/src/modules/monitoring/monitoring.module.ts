import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
import { MonitoringConfig } from './entities/monitoring-config.entity';
import { UserTrackingStatus } from './entities/user-tracking-status.entity';
import { MonitoringCacheService } from './services/monitoring-cache.service';
import { MonitoringConfigService } from './services/monitoring-config.service';
import { StatusCalculatorService } from './services/status-calculator.service';
import { MonitoringSchedulerService } from './services/monitoring-scheduler.service';
import { EventsModule } from '../../gateways/events.module';

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
      MonitoringConfig,
      UserTrackingStatus,
    ]),
    forwardRef(() => EventsModule),
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MonitoringCacheService,
    MonitoringConfigService,
    StatusCalculatorService,
    MonitoringSchedulerService,
  ],
  exports: [
    MonitoringService,
    MonitoringCacheService,
    MonitoringConfigService,
    StatusCalculatorService,
  ],
})
export class MonitoringModule {}
