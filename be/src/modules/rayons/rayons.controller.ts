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
import { RayonsService } from './rayons.service';
import { Rayon } from './entities/rayon.entity';
import { Area } from '../areas/entities/area.entity';
import { CreateRayonDto } from './dto/create-rayon.dto';
import { UpdateRayonDto } from './dto/update-rayon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Controller for rayon operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete rayons
 * - All authenticated users can view rayons
 */
@ApiTags('rayons')
@ApiBearerAuth('JWT-auth')
@Controller('rayons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RayonsController {
  constructor(private readonly rayonsService: RayonsService) {}

  /**
   * Get all rayons
   *
   * Returns all available rayons for organizing work areas.
   * Any authenticated user can access this endpoint.
   *
   * @returns Array of rayons
   */
  @Get()
  @ApiOperation({
    summary: 'Get all rayons',
    description: 'Returns all rayons (geographic sectors). Any authenticated user can access this.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rayons retrieved successfully',
    type: [Rayon],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(): Promise<Rayon[]> {
    return this.rayonsService.findAll();
  }

  /**
   * Get a single rayon by ID
   *
   * @param id - Rayon ID (UUID)
   * @returns The rayon
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get rayon by ID',
    description: 'Returns a single rayon by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Rayon UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Rayon retrieved successfully',
    type: Rayon,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Rayon not found',
  })
  findOne(@Param('id') id: string): Promise<Rayon> {
    return this.rayonsService.findOne(id);
  }

  /**
   * Get all areas in a rayon
   *
   * @param id - Rayon ID (UUID)
   * @returns Array of areas in the rayon
   */
  @Get(':id/areas')
  @ApiOperation({
    summary: 'Get areas in rayon',
    description: 'Returns all active areas belonging to a rayon',
  })
  @ApiParam({
    name: 'id',
    description: 'Rayon UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
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
  @ApiResponse({
    status: 404,
    description: 'Rayon not found',
  })
  findAreas(@Param('id') id: string): Promise<Area[]> {
    return this.rayonsService.findAreasByRayonId(id);
  }

  /**
   * Get rayon statistics
   *
   * @param id - Rayon ID (UUID)
   * @returns Rayon statistics including area counts
   */
  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get rayon statistics',
    description: 'Returns statistics for a rayon including area counts',
  })
  @ApiParam({
    name: 'id',
    description: 'Rayon UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Rayon statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Rayon not found',
  })
  getStats(@Param('id') id: string): Promise<{
    rayon: Rayon;
    areaCount: number;
    activeAreaCount: number;
  }> {
    return this.rayonsService.getStats(id);
  }

  /**
   * Create a new rayon
   *
   * Admin only. Creates a new rayon with unique code and name.
   *
   * @param createRayonDto - Rayon creation data
   * @returns The created rayon
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new rayon',
    description: 'Create a new rayon with unique code and name. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Rayon created successfully',
    type: Rayon,
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
    description: 'Conflict - Rayon code or name already exists',
  })
  create(@Body() createRayonDto: CreateRayonDto): Promise<Rayon> {
    return this.rayonsService.create(createRayonDto);
  }

  /**
   * Update an existing rayon
   *
   * Admin only. Updates rayon fields.
   *
   * @param id - Rayon ID (UUID)
   * @param updateRayonDto - Rayon update data
   * @returns The updated rayon
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update rayon',
    description: 'Update an existing rayon. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Rayon UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Rayon updated successfully',
    type: Rayon,
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
    description: 'Rayon not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Rayon code or name already exists',
  })
  update(@Param('id') id: string, @Body() updateRayonDto: UpdateRayonDto): Promise<Rayon> {
    return this.rayonsService.update(id, updateRayonDto);
  }

  /**
   * Soft delete a rayon
   *
   * Admin only. Prevents deletion if areas reference this rayon.
   *
   * @param id - Rayon ID (UUID)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete rayon',
    description: 'Soft delete a rayon. Admin only. Cannot delete if areas reference this rayon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Rayon UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Rayon deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Areas reference this rayon',
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
    description: 'Rayon not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.rayonsService.remove(id);
  }
}
