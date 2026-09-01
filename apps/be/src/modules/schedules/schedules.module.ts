import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleEventMember } from './entities/schedule-event-member.entity';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { Region } from '../regions/entities/region.entity';
import { District } from '../districts/entities/district.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { UserTrackingStatus } from '../monitoring/entities/user-tracking-status.entity';
import { TeamCategory } from '../teams/entities/team-category.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { ScheduleEventsService } from './services/schedule-events.service';
import { ScheduleEventsController } from './schedule-events.controller';
import { ScheduleOverlapService } from './services/schedule-overlap.service';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { RosterPresenceService } from './services/roster-presence.service';
import { ScheduleEventMaterializationCron } from './schedule-event-materialization.cron';
import { ScheduleAbsenceCron } from './schedule-absence.cron';
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
      ScheduleEvent,
      ScheduleEventMember,
      User,
      Location,
      Region,
      District,
      ShiftDefinition,
      // Read-only: SchedulesService resolves the roster row a still-open shift
      // was started from (rosterRowForOpenShift). Registering the repo here avoids
      // importing ShiftsModule, which would create a circular dependency.
      Shift,
      // Read-only: the live inside/outside axis for roster reads (ADR-050).
      // Registered here rather than importing MonitoringModule, which would make
      // schedules depend on monitoring at the Nest level.
      UserTrackingStatus,
      TeamCategory,
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
    RosterPresenceService,
    ScheduleEventMaterializationCron,
    ScheduleAbsenceCron,
  ],
  exports: [
    SchedulesService,
    ScheduleEventsService,
    ScheduleMaterializerService,
    RosterPresenceService,
  ],
})
export class SchedulesModule {}
