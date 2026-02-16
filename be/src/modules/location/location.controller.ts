import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';
import { LocationLog } from './entities/location-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CLOCKABLE_ROLES, USER_MANAGERS } from '../users/constants/role-groups';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

/**
 * Location Controller
 *
 * Handles HTTP requests for GPS location tracking.
 * Workers send batch location pings, supervisors query location history.
 */
@ApiTags('location')
@ApiBearerAuth()
@Controller('location')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Batch upload location logs
   * Workers send multiple GPS pings at once
   */
  @Post('batch')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({ summary: 'Batch upload location logs (User only)' })
  @ApiResponse({
    status: 201,
    description: 'Locations uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input or shift not active' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async createBatch(
    @Body() createLocationBatchDto: CreateLocationBatchDto,
    @GetUser() user: User,
  ): Promise<{ count: number }> {
    return this.locationService.createBatch(createLocationBatchDto, user.id);
  }

  /**
   * Get location history for a user with pagination
   * Admin and Supervisor can view user location history
   */
  @Get('user/:userId')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Get user location history with pagination (Admin, Korlap)' })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    type: String,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'End date (ISO format)',
  })
  @ApiQuery({
    name: 'shift_id',
    required: false,
    type: String,
    description: 'Filter by shift UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated location history',
    schema: {
      example: {
        data: [
          {
            id: 'location-uuid',
            user_id: 'user-uuid',
            shift_id: 'shift-uuid',
            gps_lat: -7.250445,
            gps_lng: 112.768845,
            accuracy_meters: 10,
            battery_level: 85,
            logged_at: '2026-01-16T10:00:00.000Z',
          },
        ],
        meta: {
          total: 5000,
          page: 1,
          limit: 50,
          totalPages: 100,
        },
      },
    },
  })
  async getUserHistory(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('shift_id') shiftId?: string,
  ): Promise<PaginatedResponseDto<LocationLog>> {
    return this.locationService.getUserHistoryPaginated(
      userId,
      {
        from_date: fromDate,
        to_date: toDate,
        shift_id: shiftId,
      },
      paginationDto.page,
      paginationDto.limit,
    );
  }

  /**
   * Get latest location for a user
   * Admin and Supervisor can view user's most recent location
   */
  @Get('user/:userId/latest')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Get latest user location (Admin, Korlap)' })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Latest location log',
    type: LocationLog,
  })
  @ApiResponse({
    status: 404,
    description: 'No location found for user',
  })
  async getLatestLocation(@Param('userId') userId: string): Promise<LocationLog | null> {
    return this.locationService.getLatestLocation(userId);
  }
}
