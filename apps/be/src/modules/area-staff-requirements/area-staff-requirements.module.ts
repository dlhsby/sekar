import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaStaffRequirementsController } from './area-staff-requirements.controller';
import { AreaStaffRequirementsService } from './area-staff-requirements.service';
import { AreaStaffRequirement } from './entities/area-staff-requirement.entity';
import { AreasModule } from '../areas/areas.module';
import { ShiftDefinitionsModule } from '../shift-definitions/shift-definitions.module';

/**
 * Module for managing area staff requirements
 *
 * Provides CRUD operations for staff requirements with Admin-only modifications.
 * Exports AreaStaffRequirementsService for use in other modules.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AreaStaffRequirement]),
    forwardRef(() => AreasModule),
    ShiftDefinitionsModule,
  ],
  controllers: [AreaStaffRequirementsController],
  providers: [AreaStaffRequirementsService],
  exports: [AreaStaffRequirementsService],
})
export class AreaStaffRequirementsModule {}
