import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationTypesService } from './location-types.service';
import { LocationTypesController } from './location-types.controller';
import { LocationType } from './entities/location-type.entity';
import { Location } from '../locations/entities/location.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * AreaTypes Module
 *
 * Provides area type management functionality with full CRUD operations.
 * AreaTypes are master data that categorize work areas into types
 * like park, pedestrian zone, mini garden, and street.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LocationType, Location]), // Location for reference checking
    forwardRef(() => AuthModule), // For JwtAuthGuard and RolesGuard (circular dependency)
  ],
  controllers: [LocationTypesController],
  providers: [LocationTypesService],
  exports: [LocationTypesService], // Export for use in Areas module
})
export class LocationTypesModule {}
