import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import { LocationStaffRequirement, DayType } from './entities/location-staff-requirement.entity';
import { CreateLocationStaffRequirementDto } from './dto/create-location-staff-requirement.dto';
import { UpdateLocationStaffRequirementDto } from './dto/update-location-staff-requirement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Controller for area staff requirement operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete requirements
 * - Supervisor roles can view requirements
 */
@ApiTags('area-staff-requirements')
@ApiBearerAuth('JWT-auth')
@Controller('areas/:locationId/staff-requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationStaffRequirementsController {
  constructor(private readonly staffRequirementsService: LocationStaffRequirementsService) {}

  /**
   * Get all staff requirements for an area
   *
   * @param locationId - Location ID (UUID)
   * @returns Array of staff requirements
   */
  @Get()
  @ApiOperation({
    summary: 'Get staff requirements for area',
    description: 'Returns all staff requirements for a specific area',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff requirements retrieved successfully',
    type: [LocationStaffRequirement],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  findByArea(@Param('locationId') locationId: string): Promise<LocationStaffRequirement[]> {
    return this.staffRequirementsService.findByAreaId(locationId);
  }

  /**
   * Get staff requirements summary for an area
   *
   * @param locationId - Location ID (UUID)
   * @param dayType - Day type filter
   * @returns Requirements summary
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Get staff requirements summary',
    description: 'Returns aggregated staff requirements summary by shift for an area',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiQuery({
    name: 'dayType',
    required: false,
    description: 'Filter by day type',
    enum: DayType,
    example: DayType.WEEKDAY,
  })
  @ApiResponse({
    status: 200,
    description: 'Requirements summary retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  getSummary(
    @Param('locationId') locationId: string,
    @Query('dayType') dayType?: DayType,
  ): Promise<{
    locationId: string;
    dayType: DayType;
    shifts: Array<{
      shiftDefinitionId: string;
      shiftName: string;
      workerCount: number;
      linmasCount: number;
    }>;
    totalWorkers: number;
    totalLinmas: number;
  }> {
    return this.staffRequirementsService.getRequirementsSummary(locationId, dayType);
  }

  /**
   * Get a single staff requirement by ID
   *
   * @param id - Requirement ID (UUID)
   * @returns The staff requirement
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get staff requirement by ID',
    description: 'Returns a single staff requirement by its UUID',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'Staff requirement UUID',
    example: '44444444-4444-4444-4444-444444444401',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff requirement retrieved successfully',
    type: LocationStaffRequirement,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff requirement not found',
  })
  findOne(@Param('id') id: string): Promise<LocationStaffRequirement> {
    return this.staffRequirementsService.findOne(id);
  }

  /**
   * Create a new staff requirement
   *
   * Admin only.
   *
   * @param createDto - Staff requirement creation data
   * @returns The created staff requirement
   */
  @Post()
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Create staff requirement',
    description: 'Create a new staff requirement for an area. Admin only.',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff requirement created successfully',
    type: LocationStaffRequirement,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Location or shift definition not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Requirement already exists for this combination',
  })
  create(
    @Param('locationId') locationId: string,
    @Body() createDto: CreateLocationStaffRequirementDto,
  ): Promise<LocationStaffRequirement> {
    // Override location_id from URL parameter
    return this.staffRequirementsService.create({ ...createDto, location_id: locationId });
  }

  /**
   * Update an existing staff requirement
   *
   * Admin only.
   *
   * @param id - Requirement ID (UUID)
   * @param updateDto - Staff requirement update data
   * @returns The updated staff requirement
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update staff requirement',
    description: 'Update an existing staff requirement. Admin only.',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'Staff requirement UUID',
    example: '44444444-4444-4444-4444-444444444401',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff requirement updated successfully',
    type: LocationStaffRequirement,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff requirement not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Requirement already exists for this combination',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLocationStaffRequirementDto,
  ): Promise<LocationStaffRequirement> {
    return this.staffRequirementsService.update(id, updateDto);
  }

  /**
   * Delete a staff requirement
   *
   * Admin only.
   *
   * @param id - Requirement ID (UUID)
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete staff requirement',
    description: 'Soft delete a staff requirement. Admin only.',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiParam({
    name: 'id',
    description: 'Staff requirement UUID',
    example: '44444444-4444-4444-4444-444444444401',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Staff requirement deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff requirement not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.staffRequirementsService.remove(id);
  }
}
