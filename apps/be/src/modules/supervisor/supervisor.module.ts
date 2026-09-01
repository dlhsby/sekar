import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupervisorService } from './supervisor.service';
import { SupervisorController } from './supervisor.controller';
import { Shift } from '../shifts/entities/shift.entity';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationLog } from '../location/entities/location-log.entity';

/**
 * Supervisor Module
 *
 * Provides dashboard functionality for supervisors:
 * - Active workers with real-time locations
 * - Location status overview
 * - Daily attendance reports
 */
@Module({
  imports: [TypeOrmModule.forFeature([Shift, User, Location, LocationLog])],
  controllers: [SupervisorController],
  providers: [SupervisorService],
  exports: [SupervisorService],
})
export class SupervisorModule {}
