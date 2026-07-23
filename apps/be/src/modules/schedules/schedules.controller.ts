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
import { SchedulesService, SCHEDULABLE_WORKER_ROLES, type RangeFilters } from './schedules.service';
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

// Phase 4: widen roster range access to include satgas, linmas (in addition to ROSTER_VIEWERS)
const RANGE_VIEWERS = Array.from(new Set([...ROSTER_VIEWERS, UserRole.SATGAS, UserRole.LINMAS]));

/**
 * Daily roster operations. Reads/edits are gated to ROSTER_MANAGERS; kepala_rayon
 * and admin_rayon are confined to their own district (forced on list, checked on
 * edit). Workers read their own day via `GET /schedules/my`.
 */
@ApiTags('schedules')
@ApiBearerAuth('JWT-auth')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  /** Whether the caller is district-scoped (kepala_rayon / admin_rayon). */
  private isDistrictScoped(user: User): boolean {
    return user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_RAYON;
  }

  /**
   * Every roster row for a day, not just the most relevant one.
   *
   * Under ADR-053 a worker can hold several rows in one shift (lokasi A, then
   * lokasi B, then a kawasan). `GET /schedules/my` still answers "what am I on
   * right now" with a single row — the clock-in screen needs exactly one — but
   * anything that LISTS the day (the mobile Jadwal Saya card, the day view) has
   * to see all of them or it silently hides assignments.
   */
  @Get('my/day')
  @ApiOperation({ summary: "All of the caller's roster rows for a day (defaults to today, WIB)" })
  @ApiQuery({ name: 'date', required: false, description: 'WIB day (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, type: [Schedule] })
  getMyDay(@GetUser() user: User, @Query('date') date?: string): Promise<Schedule[]> {
    return this.service.findAllByUserAndDate(user.id, date ?? TimezoneUtil.jakartaDateString());
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
    // No date → "what am I on right now", which at 03:00 is still yesterday's
    // cross-midnight shift. An explicit date stays a plain calendar-day lookup.
    if (!date) return this.service.findCurrentForUser(user.id);
    return this.service.findByUserAndDate(user.id, date);
  }

  @Get('date/:date')
  @Roles(...ROSTER_VIEWERS)
  @ApiOperation({ summary: 'List the roster for a WIB day' })
  @ApiParam({ name: 'date', example: '2026-06-30' })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiResponse({ status: 200, type: [Schedule] })
  getByDate(
    @Param('date') date: string,
    @GetUser() user: User,
    @Query('districtId') districtId?: string,
  ): Promise<Schedule[]> {
    // Rayon-scoped roles always see only their own district, regardless of the
    // query. A scoped user with no district_id (misconfiguration) sees nothing —
    // never fall through to the unfiltered (all-district) query.
    if (this.isDistrictScoped(user)) {
      return user.district_id
        ? this.service.findByDate(date, user.district_id)
        : Promise.resolve([]);
    }
    return this.service.findByDate(date, districtId);
  }

  /**
   * The complement of the board: who is NOT on `date`'s roster (ADR-054).
   *
   * Read-only. Placing someone still goes through the normal create flow, so
   * this adds no write path and no new permission — the same roles that may
   * build a roster may ask what it is missing.
   */
  @Get('unscheduled')
  @Roles(...ROSTER_EDITORS)
  @ApiOperation({
    summary:
      'Workers with no occurrence on a date (ADR-054). Projected occurrences count as scheduled; ' +
      'excused rows (off/leave) are reported separately as unavailable. satgas/linmas/korlap only.',
  })
  @ApiQuery({ name: 'date', example: '2026-07-23' })
  @ApiQuery({ name: 'shiftDefinitionId', required: false, description: 'Narrow to one shift' })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'role', required: false, description: 'Repeatable: satgas|linmas|korlap' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Match on full name, username, or a team the worker is scheduled on that day',
  })
  getUnscheduled(
    @GetUser() user: User,
    @Query('date') date: string,
    @Query('shiftDefinitionId') shiftDefinitionId?: string,
    @Query('districtId') districtId?: string,
    @Query('regionId') regionId?: string,
    @Query('locationId') locationId?: string,
    @Query('role') role?: string | string[],
    @Query('q') q?: string,
  ) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    // An unknown role in the query is DROPPED, not honoured: the filter can only
    // ever narrow within the three schedulable roles (ADR-054 §4).
    const roles = (Array.isArray(role) ? role : role ? [role] : [])
      .map((r) => r as UserRole)
      .filter((r) => SCHEDULABLE_WORKER_ROLES.includes(r));
    // Rayon-scoped callers see their own district only, whatever they ask for —
    // same rule as `getByDate`. A scoped user with no district sees nothing
    // rather than falling through to every rayon.
    const scoped = this.isDistrictScoped(user);
    if (scoped && !user.district_id) {
      return Promise.resolve({
        date,
        shift_definition_id: shiftDefinitionId ?? null,
        unscheduled: [],
        unavailable: [],
        totals: { unscheduled: 0, unavailable: 0, scheduled: 0, workforce: 0 },
      });
    }
    return this.service.findUnscheduled(date, {
      shiftDefinitionId: shiftDefinitionId ?? null,
      districtId: scoped ? (user.district_id as string) : (districtId ?? null),
      regionId: regionId ?? null,
      locationId: locationId ?? null,
      roles: roles.length ? roles : null,
      q: q ?? null,
    });
  }

  @Get('range')
  @Roles(...RANGE_VIEWERS)
  @ApiOperation({
    summary:
      'List roster rows for a date range [from, to]. Phase 4: includes projected events beyond materialization horizon. Workers (satgas/linmas/korlap) see only their own schedule.',
  })
  @ApiQuery({ name: 'from', example: '2026-06-30' })
  @ApiQuery({ name: 'to', example: '2026-07-31' })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'shiftDefinitionId', required: false })
  @ApiQuery({ name: 'teamCategoryId', required: false })
  @ApiResponse({ status: 200, type: [Schedule] })
  getByRange(
    @Query('from') from: string,
    @Query('to') to: string,
    @GetUser() user: User,
    @Query('districtId') districtId?: string,
    @Query('regionId') regionId?: string,
    @Query('locationId') locationId?: string,
    @Query('userId') userId?: string,
    @Query('shiftDefinitionId') shiftDefinitionId?: string,
    @Query('teamCategoryId') teamCategoryId?: string,
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

    const filters: RangeFilters = {
      regionId,
      locationId,
      userId,
      shiftDefinitionId,
      teamCategoryId,
    };

    // Phase 4: workers (satgas/linmas/korlap) not in ROSTER_VIEWERS are self-scoped
    if (!ROSTER_VIEWERS.includes(user.role)) {
      return this.service.findByDateRangeForUser(from, to, user.id);
    }

    // Rayon-scoped roles (kepala_rayon / admin_rayon) are pinned to their own
    // district; the requested districtId is ignored, other filters still apply.
    if (this.isDistrictScoped(user)) {
      return user.district_id
        ? this.service.findByDateRange(from, to, { ...filters, districtId: user.district_id })
        : Promise.resolve([]);
    }

    return this.service.findByDateRange(from, to, { ...filters, districtId });
  }

  @Get('year-summary')
  @Roles(...RANGE_VIEWERS)
  @ApiOperation({
    summary:
      'Per-day occupancy counts for a date range (year heatmap). Lightweight aggregate — no row hydration. Workers are self-scoped; district-scoped roles pinned to their district.',
  })
  @ApiQuery({ name: 'from', example: '2026-01-01' })
  @ApiQuery({ name: 'to', example: '2026-12-31' })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'shiftDefinitionId', required: false })
  @ApiQuery({ name: 'teamCategoryId', required: false })
  @ApiResponse({ status: 200, description: '[{ date, count }]' })
  getYearSummary(
    @Query('from') from: string,
    @Query('to') to: string,
    @GetUser() user: User,
    @Query('districtId') districtId?: string,
    @Query('regionId') regionId?: string,
    @Query('locationId') locationId?: string,
    @Query('userId') userId?: string,
    @Query('shiftDefinitionId') shiftDefinitionId?: string,
    @Query('teamCategoryId') teamCategoryId?: string,
  ): Promise<Array<{ date: string; count: number }>> {
    if (!from || !to) throw new BadRequestException('from and to are required');
    if (from > to) throw new BadRequestException('from date must be <= to date');
    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T00:00:00Z');
    const days = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (days > 366) {
      throw new BadRequestException(`Date range exceeds 366 days (${days} requested).`);
    }

    const filters: RangeFilters = {
      regionId,
      locationId,
      userId,
      shiftDefinitionId,
      teamCategoryId,
    };

    if (!ROSTER_VIEWERS.includes(user.role)) {
      return this.service.getDailyCounts(from, to, { userId: user.id });
    }
    if (this.isDistrictScoped(user)) {
      return user.district_id
        ? this.service.getDailyCounts(from, to, { ...filters, districtId: user.district_id })
        : Promise.resolve([]);
    }
    return this.service.getDailyCounts(from, to, { ...filters, districtId });
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
    // Role hierarchy + district/area scope is enforced in the service.
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
    // Fine-grained edit permission (role hierarchy + district/area scope) is
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
  @ApiOperation({
    summary:
      'Set the place for the day — at most one lokasi, or one kawasan, plus the parent rayon (ADR-053)',
  })
  @ApiResponse({ status: 200, type: Schedule })
  async updateAreas(
    @Param('id') id: string,
    @Body() dto: UpdateRosterAreasDto,
    @GetUser() user: User,
  ): Promise<Schedule> {
    return this.service.updateAreas(id, dto.area_ids, user, dto.district_id, dto.region_id);
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
