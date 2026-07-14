import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import { LocationStaffRequirement } from './entities/location-staff-requirement.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROSTER_VIEWERS } from '../users/constants/role-groups';

/**
 * Bulk read of staffing requirements across all locations — the schedule board
 * needs targets for every visible location, so a per-location fetch won't do.
 */
@ApiTags('location-staff-requirements')
@ApiBearerAuth('JWT-auth')
@Controller('staff-requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffRequirementsBulkController {
  constructor(private readonly service: LocationStaffRequirementsService) {}

  @Get()
  @Roles(...ROSTER_VIEWERS)
  @ApiOperation({ summary: 'All staffing requirements (bulk; for the schedule board)' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  findAll(): Promise<LocationStaffRequirement[]> {
    return this.service.findAll();
  }
}
