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
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Area } from './entities/area.entity';
import { AreaBoundaryResponseDto, UpdateAreaBoundaryDto } from '../monitoring/dto/area-boundary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS, MONITORING_AREA } from '../users/constants/role-groups';

/**
 * Controller for area management
 *
 * Provides CRUD operations for work areas.
 * - Admin can create, update, and delete areas
 * - All authenticated users can view areas
 */
@ApiTags('areas')
@ApiBearerAuth('JWT-auth')
@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  /**
   * Create a new area
   *
   * Admin only. Validates GPS coordinates and area type.
   *
   * @param createAreaDto - Area creation data
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
    description: 'Area created successfully',
    type: Area,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (bad GPS coordinates or area_type_id)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  create(@Body() createAreaDto: CreateAreaDto): Promise<Area> {
    return this.areasService.create(createAreaDto);
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
  @ApiResponse({
    status: 200,
    description: 'Areas retrieved successfully',
    type: [Area],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(@Query('area_type') areaType?: string): Promise<Area[]> {
    return this.areasService.findAll(areaType);
  }

  /**
   * Get a single area by ID
   *
   * Any authenticated user.
   *
   * @param id - Area UUID
   * @returns The area
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get area by ID',
    description: 'Returns a single area with area type details',
  })
  @ApiParam({
    name: 'id',
    description: 'Area UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Area retrieved successfully',
    type: Area,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found',
  })
  findOne(@Param('id') id: string): Promise<Area> {
    return this.areasService.findOne(id);
  }

  /**
   * Update an area
   *
   * Admin only. Cannot update area_type_id (must delete and recreate).
   *
   * @param id - Area UUID
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
    description: 'Area UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Area updated successfully',
    type: Area,
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
    description: 'Area not found',
  })
  update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto): Promise<Area> {
    return this.areasService.update(id, updateAreaDto);
  }

  /**
   * Soft delete an area
   *
   * Admin only. Cannot delete if workers are assigned to this area.
   *
   * @param id - Area UUID
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Delete area',
    description:
      'Soft delete an area (sets is_active to false). Admin only. Cannot delete if workers are assigned to this area.',
  })
  @ApiParam({
    name: 'id',
    description: 'Area UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Area deleted successfully',
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
    description: 'Area not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.areasService.remove(id);
  }

  @Get(':id/boundary')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get area boundary polygon' })
  @ApiParam({ name: 'id', description: 'Area UUID' })
  @ApiResponse({ status: 200, type: AreaBoundaryResponseDto })
  @ApiResponse({ status: 404, description: 'Area not found' })
  getBoundary(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AreaBoundaryResponseDto> {
    return this.areasService.getBoundary(id);
  }

  @Put(':id/boundary')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Update area boundary polygon' })
  @ApiParam({ name: 'id', description: 'Area UUID' })
  @ApiResponse({ status: 200, type: AreaBoundaryResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid GeoJSON polygon' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  updateBoundary(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAreaBoundaryDto,
  ): Promise<AreaBoundaryResponseDto> {
    return this.areasService.updateBoundary(id, dto);
  }
}
