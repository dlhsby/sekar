import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PlantsService } from './services/plants.service';
import { PlantSpecies } from './entities/plant-species.entity';
import { LocationPlant } from './entities/location-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { SearchSpeciesDto } from './dto/search-species.dto';
import { CreateNotablePlantDto } from './dto/create-notable-plant.dto';
import { CreatePlantSpeciesDto } from './dto/create-plant-species.dto';
import { UpdatePlantSpeciesDto } from './dto/update-plant-species.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Controller for plant species, area inventories, and notable plants
 *
 * All endpoints require JWT authentication.
 * - List/search: available to any authenticated user
 * - Create notable plant: restricted to korlap and higher roles
 */
@ApiTags('plants')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  /**
   * List all plant species (paginated)
   *
   * @param limit Number of results (default 20, max 50)
   * @param offset Pagination offset (default 0)
   * @returns Paginated list of plant species
   */
  @Get('plant-species')
  @ApiOperation({
    summary: 'List plant species',
    description: 'Get paginated catalog of plant species. Any authenticated user can access.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (1-50, default 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset (default 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Plant species retrieved',
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/PlantSpecies' } },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async listSpecies(@Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.plantsService.listSpecies(limit, offset);
  }

  /**
   * Search plant species by name
   *
   * Performs case-insensitive search on both Indonesian and scientific names.
   *
   * @param q Search query (minimum 1 character)
   * @param limit Maximum results (1-50, default 20)
   * @returns Matching plant species
   */
  @Get('plant-species/search')
  @ApiOperation({
    summary: 'Search plant species',
    description: 'Case-insensitive search on name_id (Indonesian) and name_latin (scientific)',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query',
    example: 'trembesi',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (1-50, default 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [PlantSpecies],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async searchSpecies(@Query() dto: SearchSpeciesDto) {
    const limit = dto.limit ?? 20;
    return this.plantsService.searchSpecies(dto.q ?? '', limit);
  }

  /**
   * Get all plants in an area (inventory rollup)
   *
   * @param locationId Location UUID
   * @returns Location plants with species details and aggregate counts
   */
  @Get('areas/:locationId/plants')
  @ApiOperation({
    summary: 'Get area plant inventory',
    description: 'Returns aggregate plant inventory for an area (count per species)',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Location plants retrieved',
    type: [LocationPlant],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async listAreaPlants(@Param('locationId', ParseUUIDPipe) locationId: string) {
    return this.plantsService.listAreaPlants(locationId);
  }

  /**
   * Get notable plants in an area
   *
   * Returns heritage trees and significant specimens (read-only for satgas/linmas).
   *
   * @param locationId Location UUID
   * @returns Notable plants with species details
   */
  @Get('areas/:locationId/notable-plants')
  @ApiOperation({
    summary: 'Get notable plants in area',
    description: 'Returns heritage trees and significant specimens (specific tagged locations)',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Notable plants retrieved',
    type: [NotablePlant],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async listNotablePlants(@Param('locationId', ParseUUIDPipe) locationId: string) {
    return this.plantsService.listNotablePlants(locationId);
  }

  /**
   * Create a notable plant
   *
   * Only korlap and higher roles can create new heritage trees or significant specimens.
   *
   * @param locationId Location UUID
   * @param dto Create DTO
   * @param user Current authenticated user
   * @returns Created notable plant
   */
  @Post('areas/:locationId/notable-plants')
  @Roles(
    UserRole.KORLAP,
    UserRole.ADMIN_DATA,
    UserRole.KEPALA_RAYON,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @ApiOperation({
    summary: 'Create notable plant',
    description: 'Create a heritage tree or significant specimen record',
  })
  @ApiParam({
    name: 'locationId',
    description: 'Location UUID (must match dto.location_id)',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Notable plant created',
    type: NotablePlant,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Location or species not found',
  })
  async createNotablePlant(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: CreateNotablePlantDto,
    @GetUser() user: User,
  ) {
    // Validate path matches body
    if (dto.location_id !== locationId) {
      throw new BadRequestException('Location ID in path must match location_id in request body');
    }

    return this.plantsService.createNotablePlant(dto, user);
  }

  /**
   * Create a new plant species
   *
   * Only admin_data, admin_system, and superadmin can manage the plant species catalog.
   *
   * @param dto Create DTO (nameId, nameLatin, category, defaultPruningCycleDays, notes)
   * @returns Created plant species
   */
  @Post('plant-species')
  @Roles(UserRole.ADMIN_DATA, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Create plant species',
    description: 'Add a new plant species to the catalog',
  })
  @ApiResponse({
    status: 201,
    description: 'Plant species created',
    type: PlantSpecies,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (e.g., duplicate nameId)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createSpecies(@Body() dto: CreatePlantSpeciesDto): Promise<PlantSpecies> {
    return this.plantsService.createSpecies(dto);
  }

  /**
   * Update an existing plant species
   *
   * Only admin_data, admin_system, and superadmin can manage the plant species catalog.
   * All fields in the update DTO are optional.
   *
   * @param id Plant species UUID
   * @param dto Update DTO (all fields optional)
   * @returns Updated plant species
   */
  @Patch('plant-species/:id')
  @Roles(UserRole.ADMIN_DATA, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Update plant species',
    description: 'Modify an existing plant species record (all fields optional)',
  })
  @ApiParam({
    name: 'id',
    description: 'Plant species UUID',
    example: '22222222-2222-2222-2222-222222222201',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Plant species updated',
    type: PlantSpecies,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (e.g., duplicate nameId)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Plant species not found',
  })
  async updateSpecies(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlantSpeciesDto,
  ): Promise<PlantSpecies> {
    return this.plantsService.updateSpecies(id, dto);
  }

  /**
   * Delete a plant species (soft delete)
   *
   * Only admin_data, admin_system, and superadmin can manage the plant species catalog.
   * Will reject deletion if the species is referenced by area_plants or notable_plants.
   *
   * @param id Plant species UUID
   */
  @Delete('plant-species/:id')
  @Roles(UserRole.ADMIN_DATA, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete plant species',
    description:
      'Remove a plant species from the catalog (soft delete). Fails if species is in use.',
  })
  @ApiParam({
    name: 'id',
    description: 'Plant species UUID',
    example: '22222222-2222-2222-2222-222222222201',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Plant species deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Plant species not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - Plant species is referenced by area inventory or notable plants and cannot be deleted',
  })
  async deleteSpecies(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.plantsService.deleteSpecies(id);
  }
}
