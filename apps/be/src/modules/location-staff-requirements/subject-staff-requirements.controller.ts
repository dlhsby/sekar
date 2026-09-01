import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import { LocationStaffRequirement } from './entities/location-staff-requirement.entity';
import { SetStaffRequirementsDto } from './dto/set-staff-requirements.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Region (Kawasan)-level staffing requirements. Grouped districts define KEBUTUHAN
 * per kawasan (ADR), so the day-board gear on a kawasan node edits here.
 */
@ApiTags('location-staff-requirements')
@ApiBearerAuth('JWT-auth')
@Controller('regions/:regionId/staff-requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionStaffRequirementsController {
  constructor(private readonly service: LocationStaffRequirementsService) {}

  @Get()
  @ApiOperation({ summary: "Get a region's (kawasan) staffing requirements" })
  @ApiParam({ name: 'regionId', description: 'Region UUID' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  findByRegion(@Param('regionId') regionId: string): Promise<LocationStaffRequirement[]> {
    return this.service.findByRegionId(regionId);
  }

  @Put()
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: "Bulk set a region's (kawasan) staffing requirements" })
  @ApiParam({ name: 'regionId', description: 'Region UUID' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  bulkSet(
    @Param('regionId') regionId: string,
    @Body() dto: SetStaffRequirementsDto,
  ): Promise<LocationStaffRequirement[]> {
    return this.service.bulkSetForRegion(regionId, dto.items);
  }
}

/**
 * Rayon-level staffing requirements (for districts whose `staffing_level = district`).
 */
@ApiTags('location-staff-requirements')
@ApiBearerAuth('JWT-auth')
@Controller('districts/:districtId/staff-requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DistrictStaffRequirementsController {
  constructor(private readonly service: LocationStaffRequirementsService) {}

  @Get()
  @ApiOperation({ summary: "Get a district's staffing requirements" })
  @ApiParam({ name: 'districtId', description: 'District UUID' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  findByDistrict(@Param('districtId') districtId: string): Promise<LocationStaffRequirement[]> {
    return this.service.findByDistrictId(districtId);
  }

  @Put()
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: "Bulk set a district's staffing requirements" })
  @ApiParam({ name: 'districtId', description: 'District UUID' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  bulkSet(
    @Param('districtId') districtId: string,
    @Body() dto: SetStaffRequirementsDto,
  ): Promise<LocationStaffRequirement[]> {
    return this.service.bulkSetForDistrict(districtId, dto.items);
  }
}
