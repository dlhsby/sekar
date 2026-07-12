import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AttendanceDaySummaryDto, AttendanceDayDetailDto } from './dto/attendance-day.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { Shift } from './entities/shift.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { CLOCKABLE_ROLES, USER_MANAGERS } from '../users/constants/role-groups';

/**
 * Shifts Controller
 *
 * Handles user shift operations including clock-in, clock-out,
 * and shift status queries.
 */
@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('clock-in')
  @Roles(...CLOCKABLE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Clock in to start a shift',
    description:
      'User clocks in to start a shift. Location can be auto-detected from schedule or provided manually. ' +
      'Only one active shift allowed per user.',
  })
  @ApiBody({ type: ClockInDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully clocked in',
    type: Shift,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already clocked in or validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only users can clock in',
  })
  async clockIn(@GetUser() user: User, @Body() dto: ClockInDto): Promise<Shift> {
    return this.shiftsService.clockIn(user.id, dto);
  }

  @Post('clock-out')
  @Roles(...CLOCKABLE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clock out to end a shift',
    description:
      'User clocks out from their active shift. Records clock-out time and GPS coordinates.',
  })
  @ApiBody({ type: ClockOutDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully clocked out',
    type: Shift,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No active shift found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only users can clock out',
  })
  async clockOut(@GetUser() user: User, @Body() dto: ClockOutDto): Promise<Shift> {
    return this.shiftsService.clockOut(user.id, dto);
  }

  @Get('current')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({
    summary: 'Get current active shift',
    description: 'Returns the active shift for the authenticated user, or null if not clocked in.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active shift details or null',
    type: Shift,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only users can view their current shift',
  })
  async getCurrentShift(@GetUser() user: User): Promise<Shift | null> {
    return this.shiftsService.findActiveShift(user.id);
  }

  @Get('my-shifts')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({
    summary: 'Get my shift history',
    description:
      'Returns the last 50 shifts for the authenticated user, ordered by most recent first. ' +
      'Pass page/limit for a paginated response (Phase 4-6 C2).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Shift history',
    type: [Shift],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only authorized users can view their shift history',
  })
  async getMyShifts(
    @GetUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Shift[] | PaginatedResponseDto<Shift>> {
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
      return this.shiftsService.findByUserIdPaginated(user.id, pageNum, limitNum);
    }
    return this.shiftsService.findByUserId(user.id);
  }

  @Get('attendance')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({
    summary: 'Get my attendance history grouped by day',
    description:
      "Returns the authenticated user's regular (non-overtime) attendance, grouped by WIB " +
      'calendar day and paginated by day (newest first). Each day summarizes the first clock-in, ' +
      'last clock-out, shift count and total worked minutes.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'from_date', required: false, type: String, example: '2026-06-01' })
  @ApiQuery({ name: 'to_date', required: false, type: String, example: '2026-06-30' })
  @ApiQuery({ name: 'status', required: false, enum: ['late', 'on_time', 'active'] })
  @ApiQuery({ name: 'sort_dir', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated day summaries',
    type: AttendanceDaySummaryDto,
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Role not allowed' })
  async getMyAttendance(
    @GetUser() user: User,
    @Query() filter: AttendanceFilterDto,
  ): Promise<PaginatedResponseDto<AttendanceDaySummaryDto>> {
    return this.shiftsService.findMyAttendanceDays(user.id, filter);
  }

  @Get('attendance/:date')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({
    summary: 'Get my shifts on a given day',
    description:
      "Returns the authenticated user's regular (non-overtime) shifts on the given WIB calendar " +
      'day, newest first.',
  })
  @ApiParam({ name: 'date', description: 'WIB calendar day (YYYY-MM-DD)', example: '2026-06-22' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "That day's shifts",
    type: AttendanceDayDetailDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid date format' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Not authenticated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Role not allowed' })
  async getMyAttendanceForDate(
    @GetUser() user: User,
    @Param('date') date: string,
  ): Promise<AttendanceDayDetailDto> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const shifts = await this.shiftsService.findMyAttendanceForDate(user.id, date);
    return { date, shifts };
  }

  @Get('active')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON)
  @ApiOperation({
    summary: 'Get all active shifts with pagination',
    description:
      'Returns all currently active shifts (not yet clocked out). ' +
      'For management dashboard to monitor active users.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of active shifts',
    schema: {
      example: {
        data: [
          {
            id: 'shift-uuid',
            user_id: 'user-uuid',
            location_id: 'area-uuid',
            clock_in_time: '2026-01-16T08:00:00.000Z',
            clock_out_time: null,
            user: {
              id: 'user-uuid',
              username: 'worker1',
              full_name: 'Pekerja Satu',
            },
            area: {
              id: 'area-uuid',
              name: 'Taman A',
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
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admin and korlap can view all active shifts',
  })
  async getActiveShifts(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Shift>> {
    return this.shiftsService.findAllActiveShiftsPaginated(paginationDto.page, paginationDto.limit);
  }
}
