import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';
import { ActiveUserDto } from './dto/active-users-response.dto';
import { AreaStatusResponseDto } from './dto/area-status-response.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { AttendanceResponseDto, UserAttendanceDetailDto } from './dto/attendance-response.dto';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

/**
 * Supervisor Controller
 *
 * Provides dashboard endpoints for supervisors and admins.
 * Real-time worker tracking, area status, and attendance reports.
 */
@ApiTags('supervisor')
@ApiBearerAuth()
@Controller('supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.ADMIN_RAYON)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  /**
   * Get all active users with real-time locations and pagination
   * Shows users who are currently clocked in
   */
  @Get('active-users')
  @ApiOperation({
    summary: 'Get active users with pagination (Admin, Korlap)',
    description:
      'Returns paginated list of workers currently clocked in with their latest GPS locations',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active users',
    schema: {
      example: {
        data: [
          {
            id: 'worker-uuid',
            username: 'worker1',
            full_name: 'Pekerja Satu',
            shift: {
              id: 'shift-uuid',
              clock_in_time: '2026-01-16T08:00:00.000Z',
              area: {
                id: 'area-uuid',
                name: 'Taman A',
              },
            },
            latest_location: {
              gps_lat: -7.250445,
              gps_lng: 112.768845,
              logged_at: '2026-01-16T10:00:00.000Z',
            },
          },
        ],
        meta: {
          total: 25,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
    },
  })
  async getActiveUsers(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ActiveUserDto>> {
    return this.supervisorService.getActiveUsersPaginated(paginationDto.page, paginationDto.limit);
  }

  /**
   * Get area status overview
   * Shows worker counts per area
   */
  @Get('area-status')
  @ApiOperation({
    summary: 'Get area status (Admin, Korlap)',
    description: 'Returns assigned and active user counts for each area',
  })
  @ApiResponse({
    status: 200,
    description: 'Location status overview',
    type: AreaStatusResponseDto,
  })
  async getAreaStatus(): Promise<AreaStatusResponseDto> {
    return this.supervisorService.getAreaStatus();
  }

  /**
   * Get daily attendance report with pagination
   * Shows which workers clocked in and who did not
   */
  @Get('attendance')
  @ApiOperation({
    summary: 'Get attendance report with pagination (Admin, Korlap)',
    description: 'Returns paginated attendance statistics for a specific date (defaults to today)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    example: '2026-01-09',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated attendance report with clocked-in and not-clocked-in lists',
    schema: {
      example: {
        date: '2026-01-16',
        total_workers: 50,
        clocked_in_count: 45,
        clocked_in: {
          data: [
            {
              id: 'worker-uuid-1',
              username: 'worker1',
              full_name: 'Pekerja Satu',
              area: {
                id: 'area-uuid',
                name: 'Taman A',
              },
              clock_in_time: '2026-01-16T08:00:00.000Z',
              clock_out_time: '2026-01-16T16:00:00.000Z',
            },
          ],
          meta: {
            total: 45,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        },
        not_clocked_in: {
          data: [
            {
              id: 'worker-uuid',
              username: 'worker5',
              full_name: 'Pekerja Lima',
              area: {
                id: 'area-uuid',
                name: 'Taman B',
              },
            },
          ],
          meta: {
            total: 5,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        },
      },
    },
  })
  async getAttendance(@Query() filterDto: AttendanceFilterDto): Promise<AttendanceResponseDto> {
    return this.supervisorService.getAttendancePaginated(
      filterDto.date,
      filterDto.page,
      filterDto.limit,
    );
  }

  /**
   * Get per-user attendance detail for a specific date
   * Shows whether a specific worker clocked in and their shift details
   */
  @Get('attendance/:userId')
  @ApiOperation({
    summary: 'Get per-user attendance detail (Admin, Korlap)',
    description:
      'Returns clock-in/out details for a specific user on a specific date (defaults to today)',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    type: String,
    description: 'User UUID',
    example: 'f634880a-7498-449a-a293-9c5204176300',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    example: '2026-01-09',
  })
  @ApiResponse({
    status: 200,
    description: 'User attendance detail for the specified date',
    schema: {
      example: {
        date: '2026-01-16',
        user: {
          id: 'f634880a-7498-449a-a293-9c5204176300',
          username: 'satgas1',
          full_name: 'Satgas One',
          role: 'satgas',
          area: {
            id: 'area-uuid',
            name: 'Taman Bungkul',
          },
        },
        clocked_in: true,
        shift: {
          id: 'shift-uuid',
          clock_in_time: '2026-01-16T08:00:00.000Z',
          clock_out_time: '2026-01-16T16:00:00.000Z',
          duration_minutes: 480,
          clock_in_outside_boundary: false,
          clock_out_outside_boundary: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or not a trackable worker',
  })
  async getUserAttendanceDetail(
    @Param('userId') userId: string,
    @Query() filterDto: AttendanceFilterDto,
  ): Promise<UserAttendanceDetailDto> {
    return this.supervisorService.getUserAttendanceDetail(userId, filterDto.date);
  }
}
