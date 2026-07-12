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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { Schedule } from './entities/schedule.entity';
import {
  AddScheduleDto,
  GenerateRosterDto,
  ReplaceWorkerDto,
  SetLeaveDto,
  UpdateRosterAreasDto,
  UpdateRosterShiftDto,
} from './dto/schedule-actions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ROSTER_EDITORS, ROSTER_VIEWERS, USER_MANAGERS } from '../users/constants/role-groups';
import { TimezoneUtil } from '../../common/utils/timezone.util';

/**
 * Daily roster operations. Reads/edits are gated to ROSTER_MANAGERS; kepala_rayon
 * and admin_rayon are confined to their own rayon (forced on list, checked on
 * edit). Workers read their own day via `GET /schedules/my`.
 */
@ApiTags('schedules')
@ApiBearerAuth('JWT-auth')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  /** Whether the caller is rayon-scoped (kepala_rayon / admin_rayon). */
  private isRayonScoped(user: User): boolean {
    return user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_RAYON;
  }

  @Get('my')
  @ApiOperation({
    summary:
      "Get the caller's most relevant roster row for a day (defaults to today, WIB; with multiple shifts, the one covering/nearest to now)",
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'WIB day (YYYY-MM-DD); defaults to today',
  })
  @ApiResponse({ status: 200, type: Schedule })
  getMy(@GetUser() user: User, @Query('date') date?: string): Promise<Schedule | null> {
    const day = date ?? TimezoneUtil.jakartaDateString();
    return this.service.findByUserAndDate(user.id, day);
  }

  @Get('date/:date')
  @Roles(...ROSTER_VIEWERS)
  @ApiOperation({ summary: 'List the roster for a WIB day' })
  @ApiParam({ name: 'date', example: '2026-06-30' })
  @ApiQuery({ name: 'rayonId', required: false })
  @ApiResponse({ status: 200, type: [Schedule] })
  getByDate(
    @Param('date') date: string,
    @GetUser() user: User,
    @Query('rayonId') rayonId?: string,
  ): Promise<Schedule[]> {
    // Rayon-scoped roles always see only their own rayon, regardless of the
    // query. A scoped user with no rayon_id (misconfiguration) sees nothing —
    // never fall through to the unfiltered (all-rayon) query.
    if (this.isRayonScoped(user)) {
      return user.rayon_id ? this.service.findByDate(date, user.rayon_id) : Promise.resolve([]);
    }
    return this.service.findByDate(date, rayonId);
  }

  @Get('range')
  @Roles(...ROSTER_VIEWERS)
  @ApiOperation({ summary: 'List roster rows for a date range [from, to]' })
  @ApiQuery({ name: 'from', example: '2026-06-30' })
  @ApiQuery({ name: 'to', example: '2026-07-31' })
  @ApiQuery({ name: 'rayonId', required: false })
  @ApiResponse({ status: 200, type: [Schedule] })
  getByRange(
    @Query('from') from: string,
    @Query('to') to: string,
    @GetUser() user: User,
    @Query('rayonId') rayonId?: string,
  ): Promise<Schedule[]> {
    // Validate from <= to
    if (from > to) {
      throw new BadRequestException('from date must be <= to date');
    }

    // Validate date span (cap at 62 days)
    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T00:00:00Z');
    const days = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (days > 62) {
      throw new BadRequestException(
        `Date range exceeds 62 days (${days} requested). Reduce the span.`,
      );
    }

    // Rayon-scoped roles always see only their own rayon
    if (this.isRayonScoped(user)) {
      return user.rayon_id
        ? this.service.findByDateRange(from, to, user.rayon_id)
        : Promise.resolve([]);
    }
    return this.service.findByDateRange(from, to, rayonId);
  }

  @Post('generate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Generate/regenerate the roster for a day (idempotent)' })
  @ApiResponse({ status: 201, description: '{ generated: number }' })
  async generate(
    @Body() dto: GenerateRosterDto,
    @GetUser() user: User,
  ): Promise<{ generated: number }> {
    const generated = await this.service.generateRoster(dto.date, user.id);
    return { generated };
  }

  @Post()
  @Roles(...ROSTER_EDITORS)
  @ApiOperation({
    summary: 'Add a single worker to a day (mid-day joiner / missed by generate)',
    description:
      'Creates one roster row for the worker. Multiple non-overlapping shifts per day are allowed (ADR-047); rejects (400) only when the shift time-window overlaps an existing schedule.',
  })
  @ApiResponse({ status: 201, type: Schedule })
  async addSchedule(@Body() dto: AddScheduleDto, @GetUser() user: User): Promise<Schedule> {
    // Role hierarchy + rayon/area scope is enforced in the service.
    return this.service.addForDay(dto, user);
  }

  @Patch(':id/leave')
  @Roles(...ROSTER_EDITORS)
  @ApiOperation({ summary: 'Mark a roster row as sick / annual leave' })
  @ApiResponse({ status: 200, type: Schedule })
  async setLeave(
    @Param('id') id: string,
    @Body() dto: SetLeaveDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    // Fine-grained edit permission (role hierarchy + rayon/area scope) is
    // enforced in the service via assertCanEdit.
    return this.service.setLeave(id, dto.leave_type, dto.notes, user);
  }

  @Patch(':id/replace')
  @Roles(...ROSTER_EDITORS)
  @ApiOperation({ summary: 'Replace the rostered worker for the day' })
  @ApiResponse({ status: 200, type: Schedule })
  async replace(
    @Param('id') id: string,
    @Body() dto: ReplaceWorkerDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.service.replaceWorker(id, dto.replacement_user_id, dto.notes, user);
  }

  @Patch(':id/areas')
  @Roles(...ROSTER_EDITORS)
  @ApiOperation({ summary: 'Set the areas for the day (0..N)' })
  @ApiResponse({ status: 200, type: Schedule })
  async updateAreas(
    @Param('id') id: string,
    @Body() dto: UpdateRosterAreasDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.service.updateAreas(id, dto.area_ids, user);
  }

  @Patch(':id/shift')
  @Roles(...ROSTER_EDITORS)
  @ApiOperation({ summary: 'Set (or clear) the shift for the day' })
  @ApiResponse({ status: 200, type: Schedule })
  async updateShift(
    @Param('id') id: string,
    @Body() dto: UpdateRosterShiftDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.service.updateShift(id, dto.shift_definition_id ?? null, user);
  }

  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a roster row' })
  async remove(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    await this.service.remove(id, user.id);
  }
}
