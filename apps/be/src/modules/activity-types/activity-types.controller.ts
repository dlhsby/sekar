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
import { ActivityTypesService } from './activity-types.service';
import { ActivityType } from './entities/activity-type.entity';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { User } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Controller for activity type operations
 *
 * All endpoints require authentication.
 * - Admin can create, update, and delete activity types
 * - All authenticated users can view activity types
 * - Activity types can be filtered by role (Worker, Linmas)
 */
@ApiTags('activity-types')
@ApiBearerAuth('JWT-auth')
@Controller('activity-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityTypesController {
  constructor(private readonly activityTypesService: ActivityTypesService) {}

  /**
   * Get all activity types
   *
   * Returns all active activity types, optionally filtered by role.
   * Any authenticated user can access this endpoint.
   *
   * @param role - Optional role filter (Worker, Linmas)
   * @returns Array of activity types
   */
  @Get()
  @ApiOperation({
    summary: 'Get all activity types',
    description:
      'Returns all active activity types. Use the role query parameter to filter by applicable role (Worker, Linmas).',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by applicable role',
    enum: ['Worker', 'Linmas'],
    example: 'satgas',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity types retrieved successfully',
    type: [ActivityType],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(@Query('role') role?: string): Promise<ActivityType[]> {
    return this.activityTypesService.findAll(role);
  }

  /**
   * Get activity types applicable to current user's role
   *
   * Returns activity types filtered by the authenticated user's role.
   * Mobile app uses this endpoint to show only relevant activity types.
   *
   * @param user - Current authenticated user (from JWT)
   * @returns Activity types applicable to user's role
   */
  @Get('my-types')
  @ApiOperation({
    summary: 'Get activity types for current user',
    description:
      "Returns activity types applicable to the authenticated user's role (satgas, linmas, korlap, admin_data).",
  })
  @ApiResponse({
    status: 200,
    description: 'Activity types retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '33333333-3333-3333-3333-333333333301',
            name: 'Perawatan',
            code: 'perawatan',
            description: 'Perawatan tanaman dan area',
            applicable_roles: ['satgas'],
            is_active: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findMyTypes(@GetUser() user: User): Promise<{ data: ActivityType[] }> {
    return this.activityTypesService.findByUserRole(user.role);
  }

  /**
   * Get a single activity type by ID
   *
   * @param id - Activity type ID (UUID)
   * @returns The activity type
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get activity type by ID',
    description: 'Returns a single activity type by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Activity type UUID',
    example: '33333333-3333-3333-3333-333333333301',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity type retrieved successfully',
    type: ActivityType,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Activity type not found',
  })
  findOne(@Param('id') id: string): Promise<ActivityType> {
    return this.activityTypesService.findOne(id);
  }

  /**
   * Create a new activity type
   *
   * Admin only. Creates a new activity type with unique code.
   *
   * @param createActivityTypeDto - Activity type creation data
   * @returns The created activity type
   */
  @Post()
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Create new activity type',
    description: 'Create a new activity type with unique code. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Activity type created successfully',
    type: ActivityType,
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
    description: 'Conflict - Activity type code already exists',
  })
  create(@Body() createActivityTypeDto: CreateActivityTypeDto): Promise<ActivityType> {
    return this.activityTypesService.create(createActivityTypeDto);
  }

  /**
   * Update an existing activity type
   *
   * Admin only. Updates activity type fields.
   *
   * @param id - Activity type ID (UUID)
   * @param updateActivityTypeDto - Activity type update data
   * @returns The updated activity type
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update activity type',
    description: 'Update an existing activity type. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Activity type UUID',
    example: '33333333-3333-3333-3333-333333333301',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity type updated successfully',
    type: ActivityType,
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
    description: 'Activity type not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Activity type code already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateActivityTypeDto: UpdateActivityTypeDto,
  ): Promise<ActivityType> {
    return this.activityTypesService.update(id, updateActivityTypeDto);
  }

  /**
   * Soft delete an activity type
   *
   * Admin only.
   *
   * @param id - Activity type ID (UUID)
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete activity type',
    description: 'Soft delete an activity type. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Activity type UUID',
    example: '33333333-3333-3333-3333-333333333301',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Activity type deleted successfully',
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
    description: 'Activity type not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.activityTypesService.remove(id);
  }
}
