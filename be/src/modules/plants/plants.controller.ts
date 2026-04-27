import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
  BadRequestException,
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
import { AreaPlant } from './entities/area-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { SearchSpeciesDto } from './dto/search-species.dto';
import { CreateNotablePlantDto } from './dto/create-notable-plant.dto';
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
   * @param areaId Area UUID
   * @returns Area plants with species details and aggregate counts
   */
  @Get('areas/:areaId/plants')
  @ApiOperation({
    summary: 'Get area plant inventory',
    description: 'Returns aggregate plant inventory for an area (count per species)',
  })
  @ApiParam({
    name: 'areaId',
    description: 'Area UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Area plants retrieved',
    type: [AreaPlant],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found',
  })
  async listAreaPlants(@Param('areaId', ParseUUIDPipe) areaId: string) {
    return this.plantsService.listAreaPlants(areaId);
  }

  /**
   * Get notable plants in an area
   *
   * Returns heritage trees and significant specimens (read-only for satgas/linmas).
   *
   * @param areaId Area UUID
   * @returns Notable plants with species details
   */
  @Get('areas/:areaId/notable-plants')
  @ApiOperation({
    summary: 'Get notable plants in area',
    description: 'Returns heritage trees and significant specimens (specific tagged locations)',
  })
  @ApiParam({
    name: 'areaId',
    description: 'Area UUID',
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
    description: 'Area not found',
  })
  async listNotablePlants(@Param('areaId', ParseUUIDPipe) areaId: string) {
    return this.plantsService.listNotablePlants(areaId);
  }

  /**
   * Create a notable plant
   *
   * Only korlap and higher roles can create new heritage trees or significant specimens.
   *
   * @param areaId Area UUID
   * @param dto Create DTO
   * @param user Current authenticated user
   * @returns Created notable plant
   */
  @Post('areas/:areaId/notable-plants')
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
    name: 'areaId',
    description: 'Area UUID (must match dto.area_id)',
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
    description: 'Area or species not found',
  })
  async createNotablePlant(
    @Param('areaId', ParseUUIDPipe) areaId: string,
    @Body() dto: CreateNotablePlantDto,
    @GetUser() user: User,
  ) {
    // Validate path matches body
    if (dto.area_id !== areaId) {
      throw new BadRequestException('Area ID in path must match area_id in request body');
    }

    return this.plantsService.createNotablePlant(dto, user);
  }
}
