import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LocationTypesService } from './location-types.service';
import { LocationType } from './entities/location-type.entity';
import { CreateLocationTypeDto } from './dto/create-location-type.dto';
import { UpdateLocationTypeDto } from './dto/update-location-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Controller for location type operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete location types
 * - All authenticated users can view location types
 */
@ApiTags('location-types')
@ApiBearerAuth('JWT-auth')
@Controller(['location-types', 'area-types'])
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationTypesController {
  constructor(private readonly locationTypesService: LocationTypesService) {}

  /**
   * Get all area types
   *
   * Returns all available area types for categorizing work areas.
   * Any authenticated user can access this endpoint.
   *
   * @returns Array of area types
   */
  @Get()
  @ApiOperation({
    summary: 'Get all area types',
    description:
      'Returns all area types (park, pedestrian, mini_garden, street). Any authenticated user can access this.',
  })
  @ApiResponse({
    status: 200,
    description: 'Location types retrieved successfully',
    type: [LocationType],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(): Promise<LocationType[]> {
    return this.locationTypesService.findAll();
  }

  /**
   * Get a single area type by ID
   *
   * @param id - Location type ID (UUID)
   * @returns The area type
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get area type by ID',
    description: 'Returns a single area type by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Location type UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Location type retrieved successfully',
    type: LocationType,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Location type not found',
  })
  findOne(@Param('id') id: string): Promise<LocationType> {
    return this.locationTypesService.findOne(id);
  }

  /**
   * Create a new area type
   *
   * Admin only. Creates a new area type with unique code.
   *
   * @param createAreaTypeDto - Location type creation data
   * @returns The created area type
   */
  @Post()
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Create new area type',
    description: 'Create a new area type with unique code. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Location type created successfully',
    type: LocationType,
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
    status: 409,
    description: 'Conflict - Location type code already exists',
  })
  create(@Body() createAreaTypeDto: CreateLocationTypeDto): Promise<LocationType> {
    return this.locationTypesService.create(createAreaTypeDto);
  }

  /**
   * Update an existing area type
   *
   * Admin only. Updates area type fields.
   *
   * @param id - Location type ID (UUID)
   * @param updateAreaTypeDto - Location type update data
   * @returns The updated area type
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update area type',
    description: 'Update an existing area type. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Location type UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Location type updated successfully',
    type: LocationType,
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
    description: 'Location type not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Location type code already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateAreaTypeDto: UpdateLocationTypeDto,
  ): Promise<LocationType> {
    return this.locationTypesService.update(id, updateAreaTypeDto);
  }

  /**
   * Soft delete an area type
   *
   * Admin only. Prevents deletion if areas reference this type.
   *
   * @param id - Location type ID (UUID)
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete area type',
    description:
      'Soft delete an area type. Admin only. Cannot delete if areas reference this type.',
  })
  @ApiParam({
    name: 'id',
    description: 'Location type UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Location type deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Areas reference this type',
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
    description: 'Location type not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.locationTypesService.remove(id);
  }
}
