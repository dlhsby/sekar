import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
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
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequest } from './entities/pruning-request.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
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
   * Other filtering (by rayon, status) is deferred to the admin half.
   *
   * @param mine - If true, return only user's own submissions
   * @param limit - Maximum results (default 20)
   * @param offset - Pagination offset (default 0)
   * @param user - Authenticated user (injected from JWT)
   * @returns Array of pruning requests
   */
  @Get()
  @ApiOperation({
    summary: 'Get pruning requests',
    description:
      'Retrieve pruning requests. mine=true returns your own submissions; other filters are not yet supported.',
  })
  @ApiQuery({
    name: 'mine',
    description: 'If true, return only your own submissions',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum results (default 20)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Pagination offset (default 0)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
    type: [PruningRequest],
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
    @GetUser() user?: User,
  ): Promise<PruningRequest[]> {
    // Handle mine=true case
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

    // Other filtering (rayon_id, status) is not yet supported
    if (mine === 'false' || (mine && mine !== 'true')) {
      throw new BadRequestException(
        'Filtering by rayon_id and status is not yet supported. Use mine=true for your submissions.',
      );
    }

    // If no filter specified, assume mine=true for backward compatibility / clarity
    throw new BadRequestException(
      'Please specify mine=true to get your submissions. Other filters are not yet supported.',
    );
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
}
