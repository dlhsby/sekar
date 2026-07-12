import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule, ScheduleLocation } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleEventMember } from './entities/schedule-event-member.entity';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { Region } from '../regions/entities/region.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { TeamType } from '../teams/entities/team-type.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { ScheduleEventsService } from './services/schedule-events.service';
import { ScheduleEventsController } from './schedule-events.controller';
import { ScheduleOverlapService } from './services/schedule-overlap.service';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { ScheduleEventMaterializationCron } from './schedule-event-materialization.cron';
import { UserLocationsModule } from '../user-locations/user-locations.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';

/**
 * Schedule events module (ADR-013, ADR-047).
 * - Materializes ScheduleEvents (recurring rules) into concrete occurrences.
 * - Event materialization cron (replaces template-based roster generation).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleLocation,
      ScheduleEvent,
      ScheduleEventMember,
      User,
      Location,
      Region,
      ShiftDefinition,
      TeamType,
    ]),
    UserLocationsModule,
    AuditModule,
    SettingsModule,
  ],
  controllers: [SchedulesController, ScheduleEventsController],
  providers: [
    SchedulesService,
    ScheduleEventsService,
    ScheduleOverlapService,
    ScheduleMaterializerService,
    ScheduleEventMaterializationCron,
  ],
  exports: [SchedulesService, ScheduleEventsService, ScheduleMaterializerService],
})
export class SchedulesModule {}
