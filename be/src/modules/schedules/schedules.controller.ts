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
import { SchedulesService } from './schedules.service';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Controller for schedule operations
 *
 * All endpoints require authentication.
 * - Admin and KoordinatorLapangan can create, update, and delete schedules
 * - Workers can view their own schedules
 * - Supervisors can view schedules for their areas
 */
@ApiTags('schedules')
@ApiBearerAuth('JWT-auth')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * Get all schedules
   *
   * Returns schedules with optional filters.
   *
   * @param areaId - Optional filter by area
   * @param userId - Optional filter by user
   * @param activeOnly - If 'true', only return active schedules
   * @returns Array of schedules
   */
  @Get()
  @ApiOperation({
    summary: 'Get all schedules',
    description: 'Returns schedules with optional filters. Admin sees all, others see filtered.',
  })
  @ApiQuery({
    name: 'areaId',
    required: false,
    description: 'Filter by area ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    description: 'Return only currently active schedules',
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedules retrieved successfully',
    type: [Schedule],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findAll(
    @GetUser() user: User,
    @Query('areaId') areaId?: string,
    @Query('userId') userId?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<Schedule[]> {
    return this.schedulesService.findAll(areaId, userId, activeOnly === 'true', user);
  }

  /**
   * Get the current user's schedule
   *
   * Returns the currently active schedule for the authenticated user.
   *
   * @param user - Current authenticated user
   * @returns The current schedule or null
   */
  @Get('my')
  @ApiOperation({
    summary: 'Get my current schedule',
    description: "Returns the authenticated user's currently active schedule",
  })
  @ApiResponse({
    status: 200,
    description: 'Current schedule retrieved successfully (or null if none)',
    type: Schedule,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  getMySchedule(@GetUser() user: User): Promise<Schedule | null> {
    return this.schedulesService.findCurrentByUserId(user.id);
  }

  /**
   * Get all schedules for an area
   *
   * @param areaId - Area ID (UUID)
   * @param activeOnly - If 'true', only return active schedules
   * @returns Array of schedules for the area
   */
  @Get('area/:areaId')
  @ApiOperation({
    summary: 'Get schedules for an area',
    description: 'Returns all schedules for a specific area',
  })
  @ApiParam({
    name: 'areaId',
    description: 'Area UUID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    type: 'string',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    description: 'Return only currently active schedules',
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedules retrieved successfully',
    type: [Schedule],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  findByArea(
    @Param('areaId') areaId: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<Schedule[]> {
    return this.schedulesService.findByAreaId(areaId, activeOnly === 'true');
  }

  /**
   * Get a single schedule by ID
   *
   * @param id - Schedule ID (UUID)
   * @returns The schedule
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get schedule by ID',
    description: 'Returns a single schedule by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule UUID',
    example: '55555555-5555-5555-5555-555555555501',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
    type: Schedule,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found',
  })
  findOne(@Param('id') id: string): Promise<Schedule> {
    return this.schedulesService.findOne(id);
  }

  /**
   * Create a new schedule
   *
   * Admin and KoordinatorLapangan only.
   *
   * @param createDto - Schedule creation data
   * @param user - Current authenticated user
   * @returns The created schedule
   */
  @Post()
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.ADMIN_DATA)
  @ApiOperation({
    summary: 'Create new schedule',
    description: 'Create a new schedule. Admin and KoordinatorLapangan only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Schedule created successfully',
    type: Schedule,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or user not a Satgas/Linmas',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or KoordinatorLapangan role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User, area, or shift definition not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Schedule overlaps with existing schedule',
  })
  create(
    @Body() createDto: CreateScheduleDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.schedulesService.create(createDto, user.id);
  }

  /**
   * Update an existing schedule
   *
   * Admin and KoordinatorLapangan only.
   *
   * @param id - Schedule ID (UUID)
   * @param updateDto - Schedule update data
   * @returns The updated schedule
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.ADMIN_DATA)
  @ApiOperation({
    summary: 'Update schedule',
    description: 'Update an existing schedule. Admin and KoordinatorLapangan only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule UUID',
    example: '55555555-5555-5555-5555-555555555501',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule updated successfully',
    type: Schedule,
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
    description: 'Forbidden - Admin or KoordinatorLapangan role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule, area, or shift definition not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Schedule overlaps with existing schedule',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateScheduleDto,
  ): Promise<Schedule> {
    return this.schedulesService.update(id, updateDto);
  }

  /**
   * Delete a schedule
   *
   * Admin and KoordinatorLapangan only.
   *
   * @param id - Schedule ID (UUID)
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.ADMIN_DATA)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete schedule',
    description: 'Soft delete a schedule. Admin and KoordinatorLapangan only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule UUID',
    example: '55555555-5555-5555-5555-555555555501',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Schedule deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or KoordinatorLapangan role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.schedulesService.remove(id);
  }
}
