import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AreaTypesService } from './area-types.service';
import { AreaType } from './entities/area-type.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller for area type operations
 *
 * All endpoints require authentication.
 * AreaTypes are read-only master data.
 */
@ApiTags('area-types')
@ApiBearerAuth('JWT-auth')
@Controller('area-types')
@UseGuards(JwtAuthGuard)
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
}
