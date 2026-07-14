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
 * Region (Kawasan)-level staffing requirements. Grouped rayons define KEBUTUHAN
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
 * Rayon-level staffing requirements (for rayons whose `staffing_level = rayon`).
 */
@ApiTags('location-staff-requirements')
@ApiBearerAuth('JWT-auth')
@Controller('rayons/:rayonId/staff-requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RayonStaffRequirementsController {
  constructor(private readonly service: LocationStaffRequirementsService) {}

  @Get()
  @ApiOperation({ summary: "Get a rayon's staffing requirements" })
  @ApiParam({ name: 'rayonId', description: 'Rayon UUID' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  findByRayon(@Param('rayonId') rayonId: string): Promise<LocationStaffRequirement[]> {
    return this.service.findByRayonId(rayonId);
  }

  @Put()
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: "Bulk set a rayon's staffing requirements" })
  @ApiParam({ name: 'rayonId', description: 'Rayon UUID' })
  @ApiResponse({ status: 200, type: [LocationStaffRequirement] })
  bulkSet(
    @Param('rayonId') rayonId: string,
    @Body() dto: SetStaffRequirementsDto,
  ): Promise<LocationStaffRequirement[]> {
    return this.service.bulkSetForRayon(rayonId, dto.items);
  }
}
