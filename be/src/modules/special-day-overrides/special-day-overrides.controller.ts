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
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverride } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Controller for special day override operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete special day overrides
 * - All authenticated users can view special day overrides
 * - Supports date range filtering
 */
@ApiTags('special-day-overrides')
@ApiBearerAuth('JWT-auth')
@Controller('special-day-overrides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpecialDayOverridesController {
  constructor(private readonly specialDayOverridesService: SpecialDayOverridesService) {}

  /**
   * Get all special day overrides
   *
   * Returns all special day overrides, optionally filtered by date range.
   * Any authenticated user can access this endpoint.
   *
   * @param startDate - Optional start date filter (ISO 8601)
   * @param endDate - Optional end date filter (ISO 8601)
   * @returns Array of special day overrides
   */
  @Get()
  @ApiOperation({
    summary: 'Get all special day overrides',
    description:
      'Returns all special day overrides. Use startDate and endDate query parameters to filter by date range.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO 8601 format)',
    example: '2026-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Special day overrides retrieved successfully',
    type: [SpecialDayOverride],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SpecialDayOverride[]> {
    return this.specialDayOverridesService.findAll(startDate, endDate);
  }

  /**
   * Get a single special day override by ID
   *
   * @param id - Special day override ID (UUID)
   * @returns The special day override
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get special day override by ID',
    description: 'Returns a single special day override by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Special day override UUID',
    example: '66666666-6666-6666-6666-666666666601',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Special day override retrieved successfully',
    type: SpecialDayOverride,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Special day override not found',
  })
  findOne(@Param('id') id: string): Promise<SpecialDayOverride> {
    return this.specialDayOverridesService.findOne(id);
  }

  /**
   * Create a new special day override
   *
   * Admin only. Creates a new special day override for a unique date.
   *
   * @param createDto - Special day override creation data
   * @returns The created special day override
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new special day override',
    description:
      'Create a new special day override for a date. Each date can only have one override. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Special day override created successfully',
    type: SpecialDayOverride,
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
    description: 'Conflict - Override for this date already exists',
  })
  create(@Body() createDto: CreateSpecialDayOverrideDto): Promise<SpecialDayOverride> {
    return this.specialDayOverridesService.create(createDto);
  }

  /**
   * Update an existing special day override
   *
   * Admin only. Updates special day override fields.
   *
   * @param id - Special day override ID (UUID)
   * @param updateDto - Special day override update data
   * @returns The updated special day override
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update special day override',
    description: 'Update an existing special day override. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Special day override UUID',
    example: '66666666-6666-6666-6666-666666666601',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Special day override updated successfully',
    type: SpecialDayOverride,
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
    description: 'Special day override not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Override for this date already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSpecialDayOverrideDto,
  ): Promise<SpecialDayOverride> {
    return this.specialDayOverridesService.update(id, updateDto);
  }

  /**
   * Delete a special day override
   *
   * Admin only.
   *
   * @param id - Special day override ID (UUID)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete special day override',
    description: 'Delete a special day override. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Special day override UUID',
    example: '66666666-6666-6666-6666-666666666601',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Special day override deleted successfully',
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
    description: 'Special day override not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.specialDayOverridesService.remove(id);
  }
}
