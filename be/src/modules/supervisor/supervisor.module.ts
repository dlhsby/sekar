import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupervisorService } from './supervisor.service';
import { SupervisorController } from './supervisor.controller';
import { Shift } from '../shifts/entities/shift.entity';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { LocationLog } from '../location/entities/location-log.entity';

/**
 * Supervisor Module
 *
 * Provides dashboard functionality for supervisors:
 * - Active workers with real-time locations
 * - Area status overview
 * - Daily attendance reports
 */
@Module({
  imports: [TypeOrmModule.forFeature([Shift, User, Area, LocationLog])],
  controllers: [SupervisorController],
  providers: [SupervisorService],
  exports: [SupervisorService],
})
export class SupervisorModule {}
