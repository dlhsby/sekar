import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';
import {
  AreaBoundaryResponseDto,
  UpdateAreaBoundaryDto,
} from '../monitoring/dto/area-boundary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS, MONITORING_AREA } from '../users/constants/role-groups';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

/**
 * Controller for location management
 *
 * Provides CRUD operations for work locations.
 * - Admin can create, update, and delete locations
 * - All authenticated users can view locations
 */
@ApiTags('locations')
@ApiBearerAuth('JWT-auth')
@Controller(['locations', 'areas'])
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Create a new area
   *
   * Admin only. Validates GPS coordinates and area type.
   *
   * @param createAreaDto - Location creation data
   * @returns The created area
   */
  @Post()
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Create new area',
    description:
      'Create a new work area with GPS boundaries. Admin only. Validates GPS coordinates (-90 to 90 lat, -180 to 180 lng) and area type ID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
    type: Location,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (bad GPS coordinates or location_type_id)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  create(@Body() createAreaDto: CreateLocationDto): Promise<Location> {
    return this.locationsService.create(createAreaDto);
  }

  /**
   * Get all areas
   *
   * Any authenticated user. Optional filter by area type code.
   *
   * @param areaType - Optional filter by area type code (park, pedestrian, mini_garden, street)
   * @returns Array of areas
   */
  @Get()
  @ApiOperation({
    summary: 'Get all areas',
    description:
      'Returns all active areas with their area type details. Can filter by area type code.',
  })
  @ApiQuery({
    name: 'area_type',
    required: false,
    description: 'Filter by area type code (park, pedestrian, mini_garden, street)',
    example: 'park',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based). When page/limit is passed the response is paginated.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default 20, max 100)',
  })
  @ApiQuery({
    name: 'include_inactive',
    required: false,
    description:
      'When true, also return deactivated areas — for the admin management grid, ' +
      'so a deactivated area stays visible/reactivatable. Defaults to false everywhere ' +
      'else (monitoring, worker-facing pickers), which keeps deactivated areas out of live ops.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Areas retrieved successfully. Array by default; PaginatedResponseDto when page/limit query params are present (Phase 4-6 C2).',
    type: [Location],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(
    @GetUser() user: User,
    @Query('area_type') areaType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_inactive') includeInactive?: string,
  ): Promise<Location[] | PaginatedResponseDto<Location>> {
    const includeInactiveBool = includeInactive === 'true';
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
      return this.locationsService.findAllPaginated(
        user,
        areaType,
        pageNum,
        limitNum,
        includeInactiveBool,
      );
    }
    return this.locationsService.findAll(user, areaType, includeInactiveBool);
  }

  /**
   * Get a single area by ID
   *
   * Any authenticated user.
   *
   * @param id - Location UUID
   * @returns The area
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get area by ID',
    description: 'Returns a single area with area type details',
  })
  @ApiParam({
    name: 'id',
    description: 'Location UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
    type: Location,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  findOne(@Param('id') id: string): Promise<Location> {
    return this.locationsService.findOne(id);
  }

  /**
   * Update an area
   *
   * Admin only. Cannot update location_type_id (must delete and recreate).
   *
   * @param id - Location UUID
   * @param updateAreaDto - Fields to update
   * @returns The updated area
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update area',
    description: 'Update area details. Admin only. Cannot change area type (excluded from update).',
  })
  @ApiParam({
    name: 'id',
    description: 'Location UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
    type: Location,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (bad GPS coordinates)',
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
    description: 'Location not found',
  })
  update(@Param('id') id: string, @Body() updateAreaDto: UpdateLocationDto): Promise<Location> {
    return this.locationsService.update(id, updateAreaDto);
  }

  /**
   * Soft delete an area
   *
   * Admin only. Cannot delete if workers are assigned to this area.
   *
   * @param id - Location UUID
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Delete area',
    description:
      'Soft delete an area (sets deleted_at + deleted_by). Admin only. Cannot delete if workers are assigned. Distinct from deactivation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Location UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete area with active user assignments',
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
    description: 'Location not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.locationsService.remove(id);
  }

  /**
   * Deactivate an area (is_active=false) — distinct from delete; reversible.
   * @route PATCH /api/areas/:id/deactivate
   */
  @Patch(':id/deactivate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Deactivate area',
    description: 'Set is_active=false. The area is preserved and can be reactivated.',
  })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({ status: 200, description: 'Location deactivated.' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.deactivate(id);
  }

  /**
   * Reactivate a deactivated area (is_active=true).
   * @route PATCH /api/areas/:id/activate
   */
  @Patch(':id/activate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Reactivate area', description: 'Set is_active=true.' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({ status: 200, description: 'Location reactivated.' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.activate(id);
  }

  @Get(':id/boundary')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get area boundary polygon' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({ status: 200, type: AreaBoundaryResponseDto })
  @ApiResponse({ status: 404, description: 'Location not found' })
  getBoundary(@Param('id', ParseUUIDPipe) id: string): Promise<AreaBoundaryResponseDto> {
    return this.locationsService.getBoundary(id);
  }

  @Put(':id/boundary')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Update area boundary polygon' })
  @ApiParam({ name: 'id', description: 'Location UUID' })
  @ApiResponse({ status: 200, type: AreaBoundaryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid GeoJSON polygon' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  updateBoundary(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAreaBoundaryDto,
  ): Promise<AreaBoundaryResponseDto> {
    return this.locationsService.updateBoundary(id, dto);
  }
}
