import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationStaffRequirementsController } from './location-staff-requirements.controller';
import { StaffRequirementsBulkController } from './staff-requirements-bulk.controller';
import {
  RegionStaffRequirementsController,
  RayonStaffRequirementsController,
} from './subject-staff-requirements.controller';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import { LocationStaffRequirement } from './entities/location-staff-requirement.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Region } from '../regions/entities/region.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationsModule } from '../locations/locations.module';
import { ShiftDefinitionsModule } from '../shift-definitions/shift-definitions.module';

/**
 * Module for managing area staff requirements
 *
 * Provides CRUD operations for staff requirements with Admin-only modifications.
 * Exports LocationStaffRequirementsService for use in other modules.
 */
@Module({
  imports: [
    // Rayon/Region/Location are needed to resolve a subject's parent rayon and
    // enforce that a requirement is written at that rayon's staffing_level.
    TypeOrmModule.forFeature([LocationStaffRequirement, Rayon, Region, Location]),
    forwardRef(() => LocationsModule),
    ShiftDefinitionsModule,
  ],
  controllers: [
    LocationStaffRequirementsController,
    StaffRequirementsBulkController,
    RegionStaffRequirementsController,
    RayonStaffRequirementsController,
  ],
  providers: [LocationStaffRequirementsService],
  exports: [LocationStaffRequirementsService],
})
export class LocationStaffRequirementsModule {}
