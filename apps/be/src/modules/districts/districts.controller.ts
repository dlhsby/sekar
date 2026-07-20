import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { DistrictsService } from './districts.service';
import { District } from './entities/district.entity';
import { Location } from '../locations/entities/location.entity';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Controller for district operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete districts
 * - All authenticated users can view districts
 */
@ApiTags('districts')
@ApiBearerAuth('JWT-auth')
@Controller('districts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DistrictsController {
  constructor(private readonly districtService: DistrictsService) {}

  /**
   * Get all districts
   *
   * Returns all available districts for organizing work areas.
   * Any authenticated user can access this endpoint.
   *
   * @returns Array of districts
   */
  @Get()
  @ApiOperation({
    summary: 'Get all districts',
    description:
      'Returns districts (geographic sectors), active-only by default. Any authenticated user can access this.',
  })
  @ApiQuery({
    name: 'include_inactive',
    required: false,
    type: Boolean,
    description:
      'When true, also return deactivated districts — for the admin management grid, so a ' +
      'deactivated district stays visible/reactivatable. Defaults to false everywhere else ' +
      '(pickers, schedule forms), keeping deactivated districts out of live ops.',
  })
  @ApiResponse({
    status: 200,
    description: 'Districts retrieved successfully',
    type: [District],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(@Query('include_inactive') includeInactive?: string): Promise<District[]> {
    return this.districtService.findAll(includeInactive === 'true');
  }

  /**
   * Deactivate a district (is_active=false) — reversible; distinct from delete.
   * @route PATCH /api/districts/:id/deactivate
   */
  @Patch(':id/deactivate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Deactivate district',
    description:
      'Set is_active=false. Reversible. Refused with 409 while the district still has active ' +
      'regions, locations or assigned users.',
  })
  @ApiParam({ name: 'id', description: 'District UUID' })
  @ApiResponse({ status: 200, description: 'District deactivated.', type: District })
  @ApiResponse({ status: 409, description: 'District still has active children or users.' })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<District> {
    return this.districtService.deactivate(id);
  }

  /**
   * Reactivate a deactivated district (is_active=true).
   * @route PATCH /api/districts/:id/activate
   */
  @Patch(':id/activate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Reactivate district', description: 'Set is_active=true.' })
  @ApiParam({ name: 'id', description: 'District UUID' })
  @ApiResponse({ status: 200, description: 'District reactivated.', type: District })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<District> {
    return this.districtService.activate(id);
  }

  /**
   * Check whether a district name is available (names are unique). Declared before
   * `@Get(':id')` so the literal path wins.
   *
   * @route GET /api/districts/check-name?name=&excludeId=
   */
  @Get('check-name')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Check whether a district name is available' })
  @ApiQuery({ name: 'name', required: true })
  @ApiQuery({ name: 'excludeId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: '{ available: boolean }' })
  async checkName(
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ): Promise<{ available: boolean }> {
    const trimmed = (name ?? '').trim();
    if (trimmed.length < 2) {
      return { available: false };
    }
    return { available: await this.districtService.isNameAvailable(trimmed, excludeId) };
  }

  /**
   * Get a single district by ID
   *
   * @param id - District ID (UUID)
   * @returns The district
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get district by ID',
    description: 'Returns a single district by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'District UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'District retrieved successfully',
    type: District,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'District not found',
  })
  findOne(@Param('id') id: string): Promise<District> {
    return this.districtService.findOne(id);
  }

  /**
   * Get all areas in a district
   *
   * @param id - District ID (UUID)
   * @returns Array of areas in the district
   */
  @Get(':id/areas')
  @ApiOperation({
    summary: 'Get locations in district',
    description: 'Returns all active locations belonging to a district',
  })
  @ApiParam({
    name: 'id',
    description: 'District UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Locations retrieved successfully',
    type: [Location],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'District not found',
  })
  findAreas(@Param('id') id: string): Promise<Location[]> {
    return this.districtService.findAreasByDistrictId(id);
  }

  /**
   * Get district statistics
   *
   * @param id - District ID (UUID)
   * @returns Rayon statistics including area counts
   */
  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get district statistics',
    description: 'Returns statistics for a district including area counts',
  })
  @ApiParam({
    name: 'id',
    description: 'District UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'District statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'District not found',
  })
  getStats(@Param('id') id: string): Promise<{
    district: District;
    areaCount: number;
    activeAreaCount: number;
  }> {
    return this.districtService.getStats(id);
  }

  /**
   * Create a new district
   *
   * Admin only. Creates a new district with unique code and name.
   *
   * @param createDistrictDto - District creation data
   * @returns The created district
   */
  @Post()
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Create new district',
    description: 'Create a new district with unique code and name. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'District created successfully',
    type: District,
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
    description: 'Conflict - District code or name already exists',
  })
  create(@Body() createDistrictDto: CreateDistrictDto): Promise<District> {
    return this.districtService.create(createDistrictDto);
  }

  /**
   * Update an existing district
   *
   * Admin only. Updates district fields.
   *
   * @param id - District ID (UUID)
   * @param updateDistrictDto - District update data
   * @returns The updated district
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update district',
    description: 'Update an existing district. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'District UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'District updated successfully',
    type: District,
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
    description: 'District not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - District code or name already exists',
  })
  update(@Param('id') id: string, @Body() updateDistrictDto: UpdateDistrictDto): Promise<District> {
    return this.districtService.update(id, updateDistrictDto);
  }

  /**
   * Soft delete a district
   *
   * Admin only. Prevents deletion if locations reference this district.
   *
   * @param id - District ID (UUID)
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete district',
    description:
      'Soft delete a district. Admin only. Cannot delete if locations reference this district.',
  })
  @ApiParam({
    name: 'id',
    description: 'District UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'District deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Locations reference this district',
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
    description: 'District not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.districtService.remove(id);
  }
}
