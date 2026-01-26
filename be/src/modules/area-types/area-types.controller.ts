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
import { AreaTypesService } from './area-types.service';
import { AreaType } from './entities/area-type.entity';
import { CreateAreaTypeDto } from './dto/create-area-type.dto';
import { UpdateAreaTypeDto } from './dto/update-area-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Controller for area type operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete area types
 * - All authenticated users can view area types
 */
@ApiTags('area-types')
@ApiBearerAuth('JWT-auth')
@Controller('area-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AreaTypesController {
  constructor(private readonly areaTypesService: AreaTypesService) {}

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
    description: 'Area types retrieved successfully',
    type: [AreaType],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(): Promise<AreaType[]> {
    return this.areaTypesService.findAll();
  }

  /**
   * Get a single area type by ID
   *
   * @param id - Area type ID (UUID)
   * @returns The area type
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get area type by ID',
    description: 'Returns a single area type by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Area type UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Area type retrieved successfully',
    type: AreaType,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Area type not found',
  })
  findOne(@Param('id') id: string): Promise<AreaType> {
    return this.areaTypesService.findOne(id);
  }

  /**
   * Create a new area type
   *
   * Admin only. Creates a new area type with unique code.
   *
   * @param createAreaTypeDto - Area type creation data
   * @returns The created area type
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new area type',
    description: 'Create a new area type with unique code. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Area type created successfully',
    type: AreaType,
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
    description: 'Conflict - Area type code already exists',
  })
  create(@Body() createAreaTypeDto: CreateAreaTypeDto): Promise<AreaType> {
    return this.areaTypesService.create(createAreaTypeDto);
  }

  /**
   * Update an existing area type
   *
   * Admin only. Updates area type fields.
   *
   * @param id - Area type ID (UUID)
   * @param updateAreaTypeDto - Area type update data
   * @returns The updated area type
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update area type',
    description: 'Update an existing area type. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Area type UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Area type updated successfully',
    type: AreaType,
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
    description: 'Area type not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Area type code already exists',
  })
  update(@Param('id') id: string, @Body() updateAreaTypeDto: UpdateAreaTypeDto): Promise<AreaType> {
    return this.areaTypesService.update(id, updateAreaTypeDto);
  }

  /**
   * Soft delete an area type
   *
   * Admin only. Prevents deletion if areas reference this type.
   *
   * @param id - Area type ID (UUID)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete area type',
    description:
      'Soft delete an area type. Admin only. Cannot delete if areas reference this type.',
  })
  @ApiParam({
    name: 'id',
    description: 'Area type UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Area type deleted successfully',
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
    description: 'Area type not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.areaTypesService.remove(id);
  }
}
