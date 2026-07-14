import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { Location } from './entities/location.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { LocationTypesModule } from '../location-types/location-types.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

/**
 * Locations Module
 *
 * Manages work locations where workers can be assigned.
 * Provides CRUD operations with GPS boundary management.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Location, User]),
    forwardRef(() => AuthModule),
    LocationTypesModule,
    forwardRef(() => MonitoringModule),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
