import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerSchedulesController } from './worker-schedules.controller';
import { WorkerSchedulesService } from './worker-schedules.service';
import { WorkerSchedule } from './entities/worker-schedule.entity';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';
import { ShiftDefinitionsModule } from '../shift-definitions/shift-definitions.module';

/**
 * Module for managing worker schedules
 *
 * Provides CRUD operations for worker schedules.
 * Admin and KoordinatorLapangan can manage schedules.
 * Exports WorkerSchedulesService for use in other modules.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WorkerSchedule]),
    forwardRef(() => UsersModule),
    forwardRef(() => AreasModule),
    ShiftDefinitionsModule,
  ],
  controllers: [WorkerSchedulesController],
  providers: [WorkerSchedulesService],
  exports: [WorkerSchedulesService],
})
export class WorkerSchedulesModule {}
