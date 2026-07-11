import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RejectActivityDto } from './dto/reject-activity.dto';
import { Activity } from './entities/activity.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ActivitiesFilterDto } from './dto/activities-filter.dto';
import {
  ACTIVITY_APPROVERS,
  ACTIVITY_SUBMITTERS,
  MONITORING_AREA,
  USER_MANAGERS,
} from '../users/constants/role-groups';

/**
 * Activities Controller
 *
 * Handles HTTP requests for work activity reports (activities).
 * Workers submit activities with photos during their shifts.
 *
 * Phase 2C: Changed from 'aktivitas' to 'activities' (English terminology)
 */
@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * Create a new activity (Phase 2C)
   * Auto-detects active shift, validates activity type against user role
   */
  @Post()
  @Roles(...ACTIVITY_SUBMITTERS)
  @ApiOperation({ summary: 'Create activity (Field workers: Satgas, Linmas, Korlap, AdminData)' })
  @ApiBody({ type: CreateActivityDto })
  @ApiResponse({
    status: 201,
    description: 'Activity created successfully',
    type: Activity,
  })
  @ApiResponse({ status: 400, description: 'No active shift found. Clock in first.' })
  @ApiResponse({ status: 403, description: 'Activity type not available for your role' })
  @ApiResponse({ status: 404, description: 'Activity type not found or inactive' })
  async create(
    @Body() createActivityDto: CreateActivityDto,
    @GetUser() user: User,
  ): Promise<Activity> {
    return this.activitiesService.createActivity(user.id, user.role, createActivityDto);
  }

  /**
   * Get all activities with optional filters and pagination (Phase 2C: Scope-based access)
   * - Field workers (ACTIVITY_SUBMITTERS): Own activities only
   * - KORLAP: Activities from their area
   * - KEPALA_RAYON: Activities from their rayon
   * - MANAGEMENT, ADMIN_SYSTEM, SUPERADMIN: All activities
   */
  @Get()
  @Roles(...MONITORING_AREA, ...ACTIVITY_SUBMITTERS)
  @ApiOperation({
    summary: 'List activities with filters and pagination (Scope-based: Own/Area/Rayon/City)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'shift_id', required: false, type: String })
  @ApiQuery({ name: 'from_date', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to_date', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
    description: 'Filter by approval status',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of activities (scope-filtered)',
    schema: {
      example: {
        data: [
          {
            id: 'activity-uuid',
            user_id: 'user-uuid',
            shift_id: 'shift-uuid',
            activity_type_id: 'activity-uuid',
            description: 'Penyiraman tanaman area Taman Bungkul',
            photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
            gps_lat: -7.250445,
            gps_lng: 112.768845,
            created_at: '2026-01-16T10:00:00.000Z',
          },
        ],
        meta: {
          total: 150,
          page: 1,
          limit: 50,
          totalPages: 3,
        },
      },
    },
  })
  async findAll(
    @Query() filterDto: ActivitiesFilterDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<Activity>> {
    return this.activitiesService.findAllPaginated(
      {
        user_id: filterDto.user_id,
        shift_id: filterDto.shift_id,
        area_id: filterDto.area_id,
        rayon_id: filterDto.rayon_id,
        activity_type_id: filterDto.activity_type_id,
        from_date: filterDto.from_date,
        to_date: filterDto.to_date,
        status: filterDto.status,
        sort_by: filterDto.sort_by,
        sort_dir: filterDto.sort_dir,
        involving_me: filterDto.involving_me,
      },
      user,
      filterDto.page,
      filterDto.limit,
    );
  }

  /**
   * Get user's own activities
   * User can view their own activities
   */
  @Get('my')
  @Roles(...ACTIVITY_SUBMITTERS)
  @ApiOperation({ summary: 'Get my activities (User only)' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user activities',
    type: [Activity],
  })
  async getMyActivities(
    @Query('date') date: string | undefined,
    @GetUser() user: User,
  ): Promise<Activity[]> {
    return this.activitiesService.findMyActivities(user.id, date);
  }

  /**
   * Approve a pending activity (Phase 2C)
   * Korlap can approve Satgas/Linmas activities in their area.
   * Kepala Rayon can approve Korlap/AdminData activities in their rayon.
   *
   * IMPORTANT: Must be placed BEFORE @Get(':id') to avoid route conflict.
   */
  @Patch(':id/approve')
  @Roles(...ACTIVITY_APPROVERS)
  @ApiOperation({ summary: 'Approve a pending activity (Korlap, Kepala Rayon)' })
  @ApiResponse({ status: 200, description: 'Activity approved', type: Activity })
  @ApiResponse({ status: 400, description: 'Activity already processed' })
  @ApiResponse({ status: 403, description: 'Not authorized to approve this activity' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async approve(@Param('id') id: string, @GetUser() user: User): Promise<Activity> {
    return this.activitiesService.approveActivity(id, user.id);
  }

  /**
   * Reject a pending activity with a reason (Phase 2C)
   * Korlap can reject Satgas/Linmas activities in their area.
   * Kepala Rayon can reject Korlap/AdminData activities in their rayon.
   *
   * IMPORTANT: Must be placed BEFORE @Get(':id') to avoid route conflict.
   */
  @Patch(':id/reject')
  @Roles(...ACTIVITY_APPROVERS)
  @ApiOperation({ summary: 'Reject a pending activity (Korlap, Kepala Rayon)' })
  @ApiBody({ type: RejectActivityDto })
  @ApiResponse({ status: 200, description: 'Activity rejected', type: Activity })
  @ApiResponse({ status: 400, description: 'Activity already processed' })
  @ApiResponse({ status: 403, description: 'Not authorized to reject this activity' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectActivityDto,
    @GetUser() user: User,
  ): Promise<Activity> {
    return this.activitiesService.rejectActivity(id, user.id, dto.reason);
  }

  /**
   * Get activity by ID (Phase 2C: Scope-based access)
   * - Field workers: Own activities only
   * - KORLAP: Activities from their area
   * - KEPALA_RAYON: Activities from their rayon
   * - MANAGEMENT, ADMIN_SYSTEM, SUPERADMIN: All activities
   */
  @Get(':id')
  @Roles(...MONITORING_AREA, ...ACTIVITY_SUBMITTERS)
  @ApiOperation({ summary: 'Get activity details (Scope-based: Own/Area/Rayon/City)' })
  @ApiResponse({
    status: 200,
    description: 'Activity details',
    type: Activity,
  })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 403, description: 'Access denied (outside your scope)' })
  async findOne(@Param('id') id: string, @GetUser() user: User): Promise<Activity> {
    return this.activitiesService.findOne(id, user);
  }

  /**
   * Update activity
   * User can update own activities within 1 hour of creation
   */
  @Patch(':id')
  @Roles(...ACTIVITY_SUBMITTERS)
  @ApiOperation({ summary: 'Update activity (User, own activities, within 1 hour)' })
  @ApiBody({ type: UpdateActivityDto })
  @ApiResponse({
    status: 200,
    description: 'Activity updated successfully',
    type: Activity,
  })
  @ApiResponse({ status: 403, description: 'Access denied or time limit exceeded' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @GetUser() user: User,
  ): Promise<Activity> {
    return this.activitiesService.update(id, updateActivityDto, user.id);
  }

  /**
   * Delete activity
   * Admin only
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Delete activity (Admin only)' })
  @ApiResponse({ status: 200, description: 'Activity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.activitiesService.remove(id);
  }

  /**
   * List the users tagged on an activity (ADR-038, May 2026).
   *
   * Read scope follows the standard activity-read rules: caller must be the
   * owner, in the activity's area/rayon, or have a city-wide role.
   */
  @Get(':id/tags')
  @Roles(...MONITORING_AREA, ...ACTIVITY_SUBMITTERS)
  @ApiOperation({ summary: 'List tagged users on an activity (ADR-038)' })
  @ApiResponse({ status: 200, description: 'Array of activity_tags rows with user joined' })
  @ApiResponse({ status: 403, description: 'Access denied (outside your scope)' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async listTags(@Param('id') id: string, @GetUser() user: User) {
    // Reuses the standard scope check before the join-fetch.
    await this.activitiesService.findOne(id, user);
    return this.activitiesService.findActivityTags(id);
  }

  /**
   * Untag a user from an activity (ADR-038, May 2026).
   *
   * Owner-only. Allowed while the activity is still pending — once approved,
   * the activity becomes a sealed record and tags can no longer be removed.
   */
  @Delete(':id/tags/:userId')
  @Roles(...ACTIVITY_SUBMITTERS)
  @ApiOperation({ summary: 'Untag a user from an activity (owner-only, before approval)' })
  @ApiResponse({ status: 200, description: 'User untagged' })
  @ApiResponse({ status: 400, description: 'Activity already approved — tags are now sealed' })
  @ApiResponse({ status: 403, description: 'Only the activity owner can untag' })
  @ApiResponse({ status: 404, description: 'Activity or tag not found' })
  async untag(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @GetUser() user: User,
  ): Promise<{ ok: true }> {
    await this.activitiesService.untagUser(id, targetUserId, user.id);
    return { ok: true };
  }
}
