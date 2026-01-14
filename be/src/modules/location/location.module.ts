import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { LocationLog } from './entities/location-log.entity';
import { Shift } from '../shifts/entities/shift.entity';

/**
 * Location Module
 *
 * Provides functionality for GPS location tracking:
 * - Batch location uploads by workers
 * - Location history queries
 * - Real-time worker location
 */
@Module({
  imports: [TypeOrmModule.forFeature([LocationLog, Shift])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
