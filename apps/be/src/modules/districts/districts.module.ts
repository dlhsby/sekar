import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';
import { District } from './entities/district.entity';
import { Location } from '../locations/entities/location.entity';
import { Region } from '../regions/entities/region.entity';
import { User } from '../users/entities/user.entity';

/**
 * Module for managing districts (geographic sectors)
 *
 * Provides CRUD operations for districts with Admin-only modifications.
 * Exports DistrictsService for use in other modules.
 */
@Module({
  imports: [TypeOrmModule.forFeature([District, Location, Region, User])],
  controllers: [DistrictsController],
  providers: [DistrictsService],
  exports: [DistrictsService],
})
export class DistrictsModule {}
