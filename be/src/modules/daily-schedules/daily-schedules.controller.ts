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
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DailySchedulesService } from './daily-schedules.service';
import { DailySchedule } from './entities/daily-schedule.entity';
import {
  GenerateRosterDto,
  ReplaceWorkerDto,
  SetLeaveDto,
  UpdateRosterAreasDto,
  UpdateRosterShiftDto,
} from './dto/daily-schedule-actions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ROSTER_MANAGERS, USER_MANAGERS } from '../users/constants/role-groups';
import { TimezoneUtil } from '../../common/utils/timezone.util';

/**
 * Daily roster operations. Reads/edits are gated to ROSTER_MANAGERS; kepala_rayon
 * and admin_data are confined to their own rayon (forced on list, checked on
 * edit). Workers read their own day via `GET /daily-schedules/my`.
 */
@ApiTags('daily-schedules')
@ApiBearerAuth('JWT-auth')
@Controller('daily-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DailySchedulesController {
  constructor(private readonly service: DailySchedulesService) {}

  /** Whether the caller is rayon-scoped (kepala_rayon / admin_data). */
  private isRayonScoped(user: User): boolean {
    return user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_DATA;
  }

  private guardRayonAccess(user: User, rayonId: string | null): void {
    if (this.isRayonScoped(user) && user.rayon_id && rayonId && rayonId !== user.rayon_id) {
      throw new ForbiddenException('Access denied to a different rayon');
    }
  }

  @Get('my')
  @ApiOperation({ summary: "Get the caller's roster for a day (defaults to today, WIB)" })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'WIB day (YYYY-MM-DD); defaults to today',
  })
  @ApiResponse({ status: 200, type: DailySchedule })
  getMy(@GetUser() user: User, @Query('date') date?: string): Promise<DailySchedule | null> {
    const day = date ?? TimezoneUtil.jakartaDateString();
    return this.service.findByUserAndDate(user.id, day);
  }

  @Get('date/:date')
  @Roles(...ROSTER_MANAGERS)
  @ApiOperation({ summary: 'List the roster for a WIB day' })
  @ApiParam({ name: 'date', example: '2026-06-30' })
  @ApiQuery({ name: 'rayonId', required: false })
  @ApiResponse({ status: 200, type: [DailySchedule] })
  getByDate(
    @Param('date') date: string,
    @GetUser() user: User,
    @Query('rayonId') rayonId?: string,
  ): Promise<DailySchedule[]> {
    // Rayon-scoped roles always see only their own rayon, regardless of the
    // query. A scoped user with no rayon_id (misconfiguration) sees nothing —
    // never fall through to the unfiltered (all-rayon) query.
    if (this.isRayonScoped(user)) {
      return user.rayon_id ? this.service.findByDate(date, user.rayon_id) : Promise.resolve([]);
    }
    return this.service.findByDate(date, rayonId);
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

  @Patch(':id/leave')
  @Roles(...ROSTER_MANAGERS)
  @ApiOperation({ summary: 'Mark a roster row as sick / annual leave' })
  @ApiResponse({ status: 200, type: DailySchedule })
  async setLeave(
    @Param('id') id: string,
    @Body() dto: SetLeaveDto,
    @GetUser() user: User,
  ): Promise<DailySchedule> {
    const row = await this.service.findOne(id);
    this.guardRayonAccess(user, row.rayon_id);
    return this.service.setLeave(id, dto.leave_type, dto.notes, user.id);
  }

  @Patch(':id/replace')
  @Roles(...ROSTER_MANAGERS)
  @ApiOperation({ summary: 'Replace the rostered worker for the day' })
  @ApiResponse({ status: 200, type: DailySchedule })
  async replace(
    @Param('id') id: string,
    @Body() dto: ReplaceWorkerDto,
    @GetUser() user: User,
  ): Promise<DailySchedule> {
    const row = await this.service.findOne(id);
    this.guardRayonAccess(user, row.rayon_id);
    return this.service.replaceWorker(id, dto.replacement_user_id, dto.notes, user.id);
  }

  @Patch(':id/areas')
  @Roles(...ROSTER_MANAGERS)
  @ApiOperation({ summary: 'Set the areas for the day (0..N)' })
  @ApiResponse({ status: 200, type: DailySchedule })
  async updateAreas(
    @Param('id') id: string,
    @Body() dto: UpdateRosterAreasDto,
    @GetUser() user: User,
  ): Promise<DailySchedule> {
    const row = await this.service.findOne(id);
    this.guardRayonAccess(user, row.rayon_id);
    return this.service.updateAreas(id, dto.area_ids, user.id);
  }

  @Patch(':id/shift')
  @Roles(...ROSTER_MANAGERS)
  @ApiOperation({ summary: 'Set (or clear) the shift for the day' })
  @ApiResponse({ status: 200, type: DailySchedule })
  async updateShift(
    @Param('id') id: string,
    @Body() dto: UpdateRosterShiftDto,
    @GetUser() user: User,
  ): Promise<DailySchedule> {
    const row = await this.service.findOne(id);
    this.guardRayonAccess(user, row.rayon_id);
    return this.service.updateShift(id, dto.shift_definition_id ?? null, user.id);
  }

  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a roster row' })
  async remove(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    await this.service.remove(id, user.id);
  }
}
