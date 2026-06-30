import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailySchedule } from './entities/daily-schedule.entity';
import { DailyScheduleArea } from './entities/daily-schedule-area.entity';
import { User } from '../users/entities/user.entity';
import { DailySchedulesService } from './daily-schedules.service';
import { DailySchedulesController } from './daily-schedules.controller';
import { DailyRosterGenerationCron } from './daily-roster-generation.cron';
import { UserAreasModule } from '../user-areas/user-areas.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Daily roster module — materializes per-worker templates into editable per-day
 * rosters, with a nightly generation cron and admin edit endpoints. See ADR-013.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DailySchedule, DailyScheduleArea, User]),
    UserAreasModule,
    AuditModule,
  ],
  controllers: [DailySchedulesController],
  providers: [DailySchedulesService, DailyRosterGenerationCron],
  exports: [DailySchedulesService],
})
export class DailySchedulesModule {}
