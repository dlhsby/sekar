import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { USER_MANAGERS } from '../users/constants/role-groups';
import { ActiveWorkerDto } from './dto/active-workers-response.dto';
import { AreaStatusResponseDto } from './dto/area-status-response.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
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
@Roles(...USER_MANAGERS, UserRole.KORLAP)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  /**
   * Get all active workers with real-time locations and pagination
   * Shows workers who are currently clocked in
   */
  @Get('active-workers')
  @ApiOperation({
    summary: 'Get active workers with pagination (Admin, Supervisor)',
    description:
      'Returns paginated list of workers currently clocked in with their latest GPS locations',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active workers',
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
  async getActiveWorkers(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ActiveWorkerDto>> {
    return this.supervisorService.getActiveWorkersPaginated(
      paginationDto.page,
      paginationDto.limit,
    );
  }

  /**
   * Get area status overview
   * Shows worker counts per area
   */
  @Get('area-status')
  @ApiOperation({
    summary: 'Get area status (Admin, Supervisor)',
    description: 'Returns assigned and active worker counts for each area',
  })
  @ApiResponse({
    status: 200,
    description: 'Area status overview',
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
    summary: 'Get attendance report with pagination (Admin, Supervisor)',
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
    description: 'Paginated attendance report',
    schema: {
      example: {
        date: '2026-01-16',
        total_workers: 50,
        clocked_in_count: 45,
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
  async getAttendance(@Query() filterDto: AttendanceFilterDto): Promise<any> {
    return this.supervisorService.getAttendancePaginated(
      filterDto.date,
      filterDto.page,
      filterDto.limit,
    );
  }
}
