import {
  Controller,
  Post,
  Get,
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
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
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
 * Handles worker shift operations including clock-in, clock-out,
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
      'Worker clocks in to their assigned area with GPS validation and selfie photo. ' +
      'GPS must be within area boundary (default ±100m). Only one active shift allowed per worker.',
  })
  @ApiBody({ type: ClockInDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully clocked in',
    type: Shift,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already clocked in, not assigned to area, or GPS outside boundary',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only workers can clock in',
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
      'Worker clocks out from their active shift. Records clock-out time and GPS coordinates.',
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
    description: 'Only workers can clock out',
  })
  async clockOut(@GetUser() user: User, @Body() dto: ClockOutDto): Promise<Shift> {
    return this.shiftsService.clockOut(user.id, dto);
  }

  @Get('current')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({
    summary: 'Get current active shift',
    description:
      'Returns the active shift for the authenticated worker, or null if not clocked in.',
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
    description: 'Only workers can view their current shift',
  })
  async getCurrentShift(@GetUser() user: User): Promise<Shift | null> {
    return this.shiftsService.findActiveShift(user.id);
  }

  @Get('my-shifts')
  @Roles(...CLOCKABLE_ROLES)
  @ApiOperation({
    summary: 'Get my shift history',
    description:
      'Returns the last 50 shifts for the authenticated worker, ordered by most recent first.',
  })
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
    description: 'Only workers can view their shift history',
  })
  async getMyShifts(@GetUser() user: User): Promise<Shift[]> {
    return this.shiftsService.findByWorkerId(user.id);
  }

  @Get('active')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON)
  @ApiOperation({
    summary: 'Get all active shifts with pagination',
    description:
      'Returns all currently active shifts (not yet clocked out). ' +
      'For supervisor/admin dashboard to monitor active workers.',
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
            worker_id: 'worker-uuid',
            area_id: 'area-uuid',
            clock_in_time: '2026-01-16T08:00:00.000Z',
            clock_out_time: null,
            worker: {
              id: 'worker-uuid',
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
    description: 'Only admin and supervisors can view all active shifts',
  })
  async getActiveShifts(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Shift>> {
    return this.shiftsService.findAllActiveShiftsPaginated(paginationDto.page, paginationDto.limit);
  }
}
