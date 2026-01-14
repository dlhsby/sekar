import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SupervisorService } from './supervisor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ActiveWorkersResponseDto } from './dto/active-workers-response.dto';
import { AreaStatusResponseDto } from './dto/area-status-response.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';

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
@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  /**
   * Get all active workers with real-time locations
   * Shows workers who are currently clocked in
   */
  @Get('active-workers')
  @ApiOperation({
    summary: 'Get active workers (Admin, Supervisor)',
    description: 'Returns all workers currently clocked in with their latest GPS locations',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active workers',
    type: ActiveWorkersResponseDto,
  })
  async getActiveWorkers(): Promise<ActiveWorkersResponseDto> {
    return this.supervisorService.getActiveWorkers();
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
   * Get daily attendance report
   * Shows which workers clocked in and who did not
   */
  @Get('attendance')
  @ApiOperation({
    summary: 'Get attendance report (Admin, Supervisor)',
    description: 'Returns attendance statistics for a specific date (defaults to today)',
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
    description: 'Attendance report',
    type: AttendanceResponseDto,
  })
  async getAttendance(@Query('date') date?: string): Promise<AttendanceResponseDto> {
    return this.supervisorService.getAttendance(date);
  }
}
