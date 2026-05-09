import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
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
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequest } from './entities/pruning-request.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
import { ReviewPruningRequestDto } from './dto/review-pruning-request.dto';
import { ConvertPruningRequestDto } from './dto/convert-pruning-request.dto';
import { ReschedulePruningRequestDto } from './dto/reschedule-pruning-request.dto';
import { ListPruningRequestsQueryDto } from './dto/list-pruning-requests-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Controller for pruning request operations.
 *
 * Implements the submit half of the pruning requests workflow (Phase 3, sub-phase 3-9).
 * Review/convert/disposition endpoints are deferred to a future iteration.
 *
 * Authentication and role-based access control are required for all endpoints.
 */
@ApiTags('pruning-requests')
@ApiBearerAuth('JWT-auth')
@Controller('pruning-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PruningRequestsController {
  constructor(
    private readonly pruningRequestsService: PruningRequestsService,
  ) {}

  /**
   * Submit a new pruning request.
   *
   * Only `staff_kecamatan` users can submit pruning requests.
   * The request must include at least 3 photos, valid GPS coordinates, and a future-dated work date.
   *
   * @param dto - Pruning request creation data
   * @param user - Authenticated user (injected from JWT)
   * @returns The created pruning request
   */
  @Post()
  @Roles(UserRole.STAFF_KECAMATAN)
  @ApiOperation({
    summary: 'Submit a new pruning request',
    description:
      'Submit a pruning request with GPS location, photos, and estimated plant count. Only staff_kecamatan can submit.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pruning request created successfully',
    type: PruningRequest,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (e.g., invalid date, insufficient photos)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User role is not staff_kecamatan',
  })
  async create(
    @Body() dto: CreatePruningRequestDto,
    @GetUser() user: User,
  ): Promise<PruningRequest> {
    return this.pruningRequestsService.create(dto, user);
  }

  /**
   * Get pruning requests.
   *
   * When `mine=true`: Returns requests submitted by the authenticated user (staff_kecamatan only).
   * Otherwise: Admin-only list with filtering by status, rayon, date range, and pagination.
   *
   * @param mine - If true, return only user's own submissions
   * @param limit - Maximum results (default 20)
   * @param offset - Pagination offset (default 0)
   * @param query - Admin list query parameters
   * @param user - Authenticated user (injected from JWT)
   * @returns Array of pruning requests (mine=true) or paginated list (admin)
   */
  @Get()
  @ApiOperation({
    summary: 'Get pruning requests',
    description:
      'Retrieve pruning requests. mine=true returns your own submissions; admin=true returns filtered list with status/rayon/date filters.',
  })
  @ApiQuery({
    name: 'mine',
    description: 'If true, return only your own submissions',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum results for mine=true (default 20)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Pagination offset for mine=true (default 0)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by request status (admin only)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'rayonId',
    description: 'Filter by rayon ID (admin only; auto-forced for admin_data)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'from',
    description: 'Filter from date (ISO 8601, admin only)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'to',
    description: 'Filter to date (ISO 8601, admin only)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for admin list (default 1)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @Query('mine') mine?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query() query?: ListPruningRequestsQueryDto,
    @GetUser() user?: User,
  ): Promise<PruningRequest[] | any> {
    // Handle mine=true case (staff_kecamatan submissions)
    if (mine === 'true' && user) {
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException('Invalid limit value');
      }
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new BadRequestException('Invalid offset value');
      }

      return this.pruningRequestsService.findMine(
        user,
        parsedLimit,
        parsedOffset,
      );
    }

    // Admin list: status/rayon/date filters
    if (!mine || mine === 'false') {
      return this.pruningRequestsService.findAll(user!, {
        status: query?.status,
        rayonId: query?.rayonId,
        from: query?.from,
        to: query?.to,
        page: query?.page ?? 1,
        limit: query?.limit ?? 20,
        referenceCode: query?.referenceCode,
        requesterName: query?.requesterName,
      });
    }

    // Invalid mine value
    throw new BadRequestException('mine parameter must be true, false, or omitted');
  }

  /**
   * Get a single pruning request by ID.
   *
   * Access is allowed to:
   * - The submitter (owner)
   * - admin_data users with matching rayon
   * - kepala_rayon users with matching rayon
   * - top_management, admin_system, and superadmin users (unrestricted)
   *
   * @param id - Pruning request ID (UUID)
   * @param user - Authenticated user (injected from JWT)
   * @returns The pruning request
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get pruning request by ID',
    description:
      'Retrieve a single pruning request. Access is authorized based on ownership and role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pruning request UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Request retrieved successfully',
    type: PruningRequest,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions to access this request',
  })
  @ApiResponse({
    status: 404,
    description: 'Pruning request not found',
  })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<PruningRequest> {
    return this.pruningRequestsService.findById(id, user);
  }

  /**
   * Review a pruning request (approve or reject).
   *
   * Only admin_data (rayon-scoped), kepala_rayon, top_management, admin_system, and superadmin can review.
   * Requests must be in 'submitted' or 'under_review' status to be reviewable.
   *
   * @param id - Pruning request ID
   * @param dto - Review decision and optional notes
   * @param user - Authenticated admin user (injected from JWT)
   * @returns Updated pruning request
   */
  @Post(':id/review')
  @Roles(
    UserRole.ADMIN_DATA,
    UserRole.KEPALA_RAYON,
    UserRole.TOP_MANAGEMENT,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @ApiOperation({
    summary: 'Review a pruning request',
    description:
      'Approve or reject a pruning request. Only admin_data (rayon-scoped), kepala_rayon, top_management, admin_system, and superadmin can perform this action.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pruning request UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Pruning request reviewed successfully',
    type: PruningRequest,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (invalid decision)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Pruning request not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Request is not reviewable (wrong status)',
  })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewPruningRequestDto,
    @GetUser() user: User,
  ): Promise<PruningRequest> {
    return this.pruningRequestsService.review(id, dto, user);
  }

  /**
   * Convert an approved pruning request to a task.
   *
   * Only admin_data (rayon-scoped), kepala_rayon, top_management, admin_system, and superadmin can convert.
   * Request must be 'approved' to be converted. Idempotent: returns existing task if already converted.
   *
   * @param id - Pruning request ID
   * @param dto - Task conversion parameters
   * @param user - Authenticated admin user (injected from JWT)
   * @returns Object with updated request and created task
   */
  @Post(':id/convert-to-task')
  @Roles(
    UserRole.ADMIN_DATA,
    UserRole.KEPALA_RAYON,
    UserRole.TOP_MANAGEMENT,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @HttpCode(200)
  @ApiOperation({
    summary: 'Convert pruning request to task',
    description:
      'Convert an approved pruning request into a task for field execution. Idempotent: returns existing task if already converted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pruning request UUID',
    example: '11111111-1111-1111-1111-111111111101',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Pruning request converted to task successfully',
    schema: {
      properties: {
        request: { $ref: '#/components/schemas/PruningRequest' },
        task: { type: 'object', description: 'Created or existing task' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (invalid dates, missing required fields)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Pruning request not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Request is not approved, or capacity booking failed',
  })
  async convertToTask(
    @Param('id') id: string,
    @Body() dto: ConvertPruningRequestDto,
    @GetUser() user: User,
  ): Promise<{ request: PruningRequest; task: any }> {
    return this.pruningRequestsService.convertToTask(id, dto, user);
  }

  /**
   * Reschedule the expected date of a pruning request.
   *
   * Round 4 (Apr 28): admin_data (rayon-scoped), kepala_rayon, top_management,
   * admin_system, and superadmin can adjust `expected_date` independent of the
   * convert-to-task flow. Only requests in 'submitted', 'under_review', or
   * 'approved' status can be rescheduled.
   */
  @Patch(':id/expected-date')
  @Roles(
    UserRole.ADMIN_DATA,
    UserRole.KEPALA_RAYON,
    UserRole.TOP_MANAGEMENT,
    UserRole.ADMIN_SYSTEM,
    UserRole.SUPERADMIN,
  )
  @ApiOperation({
    summary: 'Reschedule a pruning request',
    description:
      'Update expected_date for a pruning request without converting it to a task.',
  })
  @ApiParam({ name: 'id', description: 'Pruning request UUID', type: 'string' })
  @ApiResponse({ status: 200, type: PruningRequest })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409 })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: ReschedulePruningRequestDto,
    @GetUser() user: User,
  ): Promise<PruningRequest> {
    return this.pruningRequestsService.reschedule(id, dto, user);
  }
}
