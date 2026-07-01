import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleArea } from './entities/schedule-area.entity';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { DailyRosterGenerationCron } from './daily-roster-generation.cron';
import { UserAreasModule } from '../user-areas/user-areas.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Daily roster module — materializes per-worker templates into editable per-day
 * rosters, with a nightly generation cron and admin edit endpoints. See ADR-013.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, ScheduleArea, User, Area]),
    UserAreasModule,
    AuditModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService, DailyRosterGenerationCron],
  exports: [SchedulesService],
})
export class SchedulesModule {}
