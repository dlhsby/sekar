import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationStaffRequirementsController } from './location-staff-requirements.controller';
import { StaffRequirementsBulkController } from './staff-requirements-bulk.controller';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import { LocationStaffRequirement } from './entities/location-staff-requirement.entity';
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
    TypeOrmModule.forFeature([LocationStaffRequirement]),
    forwardRef(() => LocationsModule),
    ShiftDefinitionsModule,
  ],
  controllers: [LocationStaffRequirementsController, StaffRequirementsBulkController],
  providers: [LocationStaffRequirementsService],
  exports: [LocationStaffRequirementsService],
})
export class LocationStaffRequirementsModule {}
