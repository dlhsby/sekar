import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule, ScheduleLocation } from './entities/schedule.entity';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { DailyRosterGenerationCron } from './daily-roster-generation.cron';
import { UserLocationsModule } from '../user-locations/user-locations.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Daily roster module — materializes per-worker templates into editable per-day
 * rosters, with a nightly generation cron and admin edit endpoints. See ADR-013.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, ScheduleLocation, User, Location]),
    UserLocationsModule,
    AuditModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService, DailyRosterGenerationCron],
  exports: [SchedulesService],
})
export class SchedulesModule {}
