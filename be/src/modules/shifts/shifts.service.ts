import { Injectable, Logger, HttpStatus, Optional, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, Or, MoreThanOrEqual } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AreasService } from '../areas/areas.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { BoundaryCheckService } from '../../shared/services/boundary-check.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import { AttendanceDaySummaryDto } from './dto/attendance-day.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { getMinimumShiftDurationMinutes } from '../../common/constants/shift.constants';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Area } from '../areas/entities/area.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { StatusCalculatorService } from '../monitoring/services/status-calculator.service';
import { AuditLogService } from '../audit/audit.service';

/**
 * Service for managing user shifts
 *
 * Handles clock-in/out operations with GPS recording and photo uploads.
 * Phase 2C: GPS boundary validation removed, area auto-detection added.
 */
@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepo: Repository<ShiftDefinition>,
    private readonly areasService: AreasService,
    @Optional()
    @Inject(forwardRef(() => StatusCalculatorService))
    private readonly statusCalculator: StatusCalculatorService | undefined,
    private readonly auditLogService: AuditLogService,
    // Phase 4-7 (H1): boundary math extracted to the shared service. Optional →
    // legacy specs without the provider fall back to a local instance.
    @Optional()
    private readonly boundaryCheckService?: BoundaryCheckService,
  ) {}

  private get boundaryCheck(): BoundaryCheckService {
    return (this.boundaryCheckFallback ??= this.boundaryCheckService ?? new BoundaryCheckService());
  }
  private boundaryCheckFallback?: BoundaryCheckService;

  /**
   * Get active area for a user
   * Checks Schedule using effective_date and end_date
   *
   * @param userId User UUID
   * @returns Area entity or null if no assignment found
   */
  async getActiveArea(userId: string): Promise<Area | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check Schedule (uses user_id, effective_date)
    const schedule = await this.scheduleRepo.findOne({
      where: {
        user_id: userId,
        effective_date: LessThanOrEqual(today),
        end_date: Or(IsNull(), MoreThanOrEqual(today)),
      },
      relations: ['area'],
      order: { effective_date: 'DESC' },
    });
    if (schedule?.area) return schedule.area;

    return null;
  }

  /**
   * Find the active shift definition matching the current time
   *
   * @returns Matching ShiftDefinition or null if none match
   */
  async findCurrentShiftDefinition(): Promise<ShiftDefinition | null> {
    const definitions = await this.shiftDefinitionRepo.find({
      where: { is_active: true },
    });

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const def of definitions) {
      const [startHour, startMin] = def.start_time.split(':').map(Number);
      const [endHour, endMin] = def.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (def.crosses_midnight) {
        if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
          return def;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
          return def;
        }
      }
    }

    return null;
  }

  /**
   * Clock in to start a shift
   * Phase 2C: GPS boundary validation removed, area auto-detection added
   *
   * @param userId User UUID
   * @param dto Clock-in data (optional area_id, GPS, selfie photo)
   * @returns Created shift entity
   * @throws BadRequestException if already clocked in
   */
  async clockIn(userId: string, dto: ClockInDto, isOvertime: boolean = false): Promise<Shift> {
    this.logger.log(`User ${userId} attempting to clock in`);

    // 1. Check if user already has an active shift
    const activeShift = await this.findActiveShift(userId);
    if (activeShift) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_ALREADY_ACTIVE,
        `Already clocked in. Active shift ID: ${activeShift.id}`,
        { activeShiftId: activeShift.id },
      );
    }

    // 2. Get area: from DTO or auto-detect
    let area: Area | null = null;
    if (dto.area_id) {
      area = await this.areasService.findOne(dto.area_id);
    } else {
      area = await this.getActiveArea(userId);
    }
    // area can be null - allow clock-in without area (GPS still recorded)

    // 3. Store selfie as base64 string directly (no S3 upload — avoids URL accessibility
    //    issues in dev/LocalStack and keeps selfie loading fast on mobile)
    const photoUrl: string | null = dto.selfie_photo ?? null;

    // 4. Check boundary (soft geofencing — never blocks clock-in)
    let clockInOutsideBoundary = false;
    if (area) {
      const isWithin = this.boundaryCheck.isWithinAreaBoundary(dto.gps_lat, dto.gps_lng, area);
      clockInOutsideBoundary = !isWithin;
      if (clockInOutsideBoundary) {
        this.logger.warn(`User ${userId} clocking in outside area boundary: ${area.name}`);
      }
    }

    // 5. Match current shift definition (not applicable for overtime — null)
    const shiftDefinition = isOvertime ? null : await this.findCurrentShiftDefinition();

    // 6. Create shift record
    const shift = this.shiftRepository.create({
      user_id: userId,
      area_id: area?.id || null,
      shift_definition_id: shiftDefinition?.id || null,
      clock_in_time: new Date(),
      clock_in_gps_lat: dto.gps_lat,
      clock_in_gps_lng: dto.gps_lng,
      clock_in_photo_url: photoUrl,
      clock_in_outside_boundary: clockInOutsideBoundary,
      is_overtime: isOvertime,
    });

    const savedShift = await this.shiftRepository.save(shift);
    this.logger.log(
      `User ${userId} clocked in successfully. Shift ID: ${savedShift.id}, Area: ${area?.name || 'None'}`,
    );

    if (this.statusCalculator) {
      await this.statusCalculator
        .onClockIn(
          userId,
          savedShift.id,
          savedShift.area_id,
          savedShift.shift_definition_id ?? null,
          dto.gps_lat,
          dto.gps_lng,
        )
        .catch((err) =>
          this.logger.error(
            `StatusCalculator.onClockIn failed for user ${userId}: ${err.message}`,
            err.stack,
          ),
        );
    }

    this.auditLogService
      .log({
        entity_type: 'shift',
        entity_id: savedShift.id,
        action: 'clock_in',
        actor_id: userId,
        new_value: {
          area_id: savedShift.area_id,
          is_overtime: isOvertime,
          clock_in_outside_boundary: clockInOutsideBoundary,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return savedShift;
  }

  /**
   * Clock out to end a shift
   *
   * @param userId User UUID
   * @param dto Clock-out data (GPS coordinates)
   * @returns Updated shift entity
   * @throws BadRequestException if no active shift found
   */
  async clockOut(userId: string, dto: ClockOutDto): Promise<Shift> {
    this.logger.log(`User ${userId} attempting to clock out`);

    // Find active shift
    const shift = await this.shiftRepository.findOne({
      where: {
        user_id: userId,
        clock_out_time: IsNull(),
      },
      relations: ['area'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_NOT_ACTIVE,
        'No active shift found',
      );
    }

    // Check minimum shift duration (configurable via MINIMUM_SHIFT_DURATION_MINUTES env)
    const minMinutes = getMinimumShiftDurationMinutes();
    const minMs = minMinutes * 60 * 1000;
    const shiftDurationMs = Date.now() - shift.clock_in_time.getTime();

    if (shiftDurationMs < minMs) {
      const minutesWorked = Math.floor(shiftDurationMs / (60 * 1000));
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_DURATION_TOO_SHORT,
        `Shift duration too short. Minimum ${minMinutes} minutes required. Current duration: ${minutesWorked} minutes`,
        {
          minutesWorked,
          minimumRequired: minMinutes,
          clockInTime: shift.clock_in_time.toISOString(),
        },
      );
    }

    // Store clock-out selfie as base64 string directly (consistent with clock-in)
    const clockOutPhotoUrl: string | null = dto.selfie_photo ?? null;

    // Check boundary (soft geofencing — never blocks clock-out)
    let clockOutOutsideBoundary = false;
    if (shift.area) {
      const isWithin = this.boundaryCheck.isWithinAreaBoundary(
        dto.gps_lat,
        dto.gps_lng,
        shift.area,
      );
      clockOutOutsideBoundary = !isWithin;
      if (clockOutOutsideBoundary) {
        this.logger.warn(`User ${userId} clocking out outside area boundary: ${shift.area.name}`);
      }
    }

    // Update shift with clock-out details
    shift.clock_out_time = new Date();
    shift.clock_out_gps_lat = dto.gps_lat;
    shift.clock_out_gps_lng = dto.gps_lng;
    shift.clock_out_outside_boundary = clockOutOutsideBoundary;
    shift.clock_out_photo_url = clockOutPhotoUrl ?? undefined;

    const updatedShift = await this.shiftRepository.save(shift);

    const hoursWorked = this.calculateHoursWorked(shift.clock_in_time, shift.clock_out_time);
    this.logger.log(`User ${userId} clocked out successfully. Hours worked: ${hoursWorked}`);

    if (this.statusCalculator) {
      await this.statusCalculator
        .onClockOut(userId)
        .catch((err) =>
          this.logger.error(
            `StatusCalculator.onClockOut failed for user ${userId}: ${err.message}`,
            err.stack,
          ),
        );
    }

    this.auditLogService
      .log({
        entity_type: 'shift',
        entity_id: updatedShift.id,
        action: 'clock_out',
        actor_id: userId,
        new_value: {
          hours_worked: hoursWorked,
          clock_out_outside_boundary: clockOutOutsideBoundary,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return updatedShift;
  }

  /**
   * Get active shift for a user
   *
   * @param userId User UUID
   * @returns Active shift or null if not clocked in
   */
  async findActiveShift(userId: string): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: {
        user_id: userId,
        clock_out_time: IsNull(),
      },
      // shift_definition carries the scheduled start_time used for the late check.
      relations: ['area', 'area.areaType', 'user', 'shift_definition'],
    });
  }

  /**
   * Get shift by ID
   *
   * @param id Shift UUID
   * @returns Shift entity
   * @throws NotFoundException if shift not found
   */
  async findOne(id: string): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: ['area', 'area.areaType', 'user'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.SHIFT_NOT_FOUND,
        `Shift with ID ${id} not found`,
      );
    }

    return shift;
  }

  /**
   * Get all shifts for a user
   *
   * @param userId User UUID
   * @param limit Maximum number of results (default: 50)
   * @returns Array of shifts ordered by clock-in time descending
   */
  async findByUserId(userId: string, limit = 50): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { user_id: userId },
      relations: ['area', 'area.areaType', 'shift_definition'],
      order: { clock_in_time: 'DESC' },
      take: limit,
    });
  }

  /**
   * Paginated shift history for a user (Phase 4-6 C2). Used when the client
   * passes page/limit query params instead of the legacy last-50 behavior.
   */
  async findByUserIdPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponseDto<Shift>> {
    const [data, total] = await this.shiftRepository.findAndCount({
      where: { user_id: userId },
      relations: ['area', 'area.areaType', 'shift_definition'],
      order: { clock_in_time: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Attendance history for a user, grouped by WIB calendar day and paginated by
   * day (newest first). Regular shifts only — overtime is excluded. Each day is
   * summarized (first clock-in, last clock-out, count, worked minutes); the
   * earliest shift's scheduled start is surfaced so the client can apply its own
   * lateness rule.
   */
  async findMyAttendanceDays(
    userId: string,
    filter: AttendanceFilterDto = {},
    now: Date = new Date(),
  ): Promise<PaginatedResponseDto<AttendanceDaySummaryDto>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const shifts = await this.shiftRepository.find({
      where: { user_id: userId, is_overtime: false },
      relations: ['shift_definition'],
      order: { clock_in_time: 'DESC' },
    });

    let days = this.summarizeShiftsByDay(shifts, now);

    // Filters (date range is inclusive; YYYY-MM-DD strings compare lexically).
    if (filter.from_date) {
      days = days.filter((d) => d.date >= filter.from_date!);
    }
    if (filter.to_date) {
      days = days.filter((d) => d.date <= filter.to_date!);
    }
    if (filter.status === 'late') {
      days = days.filter((d) => d.is_late);
    } else if (filter.status === 'on_time') {
      days = days.filter((d) => !d.is_late);
    } else if (filter.status === 'active') {
      days = days.filter((d) => d.has_active);
    }

    // summarizeShiftsByDay already returns newest-first; reverse for ascending.
    if (filter.sort_dir === 'asc') {
      days = days.reverse();
    }

    const total = days.length;
    const start = (page - 1) * limit;
    const data = days.slice(start, start + limit);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Whether a clock-in (UTC instant) is after its scheduled start, evaluated in
   * WIB. Mirrors the mobile `isClockInLate` rule, including the crosses-midnight
   * noon heuristic (an early-morning clock-in for a night shift reads as late).
   */
  private isClockInLate(
    clockIn: Date,
    scheduledStart: string | null,
    crossesMidnight: boolean,
  ): boolean {
    if (!scheduledStart) {
      return false;
    }
    const wib = TimezoneUtil.jakartaNow(clockIn);
    const clockInMinutes = wib.getUTCHours() * 60 + wib.getUTCMinutes();
    const [h, m] = scheduledStart.split(':');
    const scheduledMinutes = Number(h) * 60 + Number(m);
    if (Number.isNaN(scheduledMinutes)) {
      return false;
    }
    if (crossesMidnight) {
      return clockInMinutes > scheduledMinutes || clockInMinutes < 12 * 60;
    }
    return clockInMinutes > scheduledMinutes;
  }

  /**
   * All of a user's regular shifts on one WIB calendar day, newest first.
   * Overtime is excluded. Grouping uses `AT TIME ZONE 'Asia/Jakarta'` so the
   * day boundary matches the rest of the app.
   */
  async findMyAttendanceForDate(userId: string, date: string): Promise<Shift[]> {
    return this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.area', 'area')
      .leftJoinAndSelect('area.areaType', 'areaType')
      .leftJoinAndSelect('shift.shift_definition', 'shift_definition')
      .where('shift.user_id = :userId', { userId })
      .andWhere('shift.is_overtime = false')
      .andWhere('shift.deleted_at IS NULL')
      .andWhere("DATE(shift.clock_in_time AT TIME ZONE 'Asia/Jakarta') = :date", { date })
      .orderBy('shift.clock_in_time', 'DESC')
      .getMany();
  }

  /**
   * Bucket a clock-in-DESC list of shifts into per-WIB-day summaries (also DESC
   * by day). Pure helper — no DB access — so it is straightforward to unit test.
   */
  private summarizeShiftsByDay(shifts: Shift[], now: Date): AttendanceDaySummaryDto[] {
    const byDay = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const key = TimezoneUtil.jakartaDateOf(shift.clock_in_time);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(shift);
      } else {
        byDay.set(key, [shift]);
      }
    }

    const summaries: AttendanceDaySummaryDto[] = [];
    for (const [date, dayShifts] of byDay) {
      const earliest = dayShifts.reduce((a, b) => (a.clock_in_time <= b.clock_in_time ? a : b));
      const clockOuts = dayShifts.map((s) => s.clock_out_time).filter((t): t is Date => !!t);
      const lastClockOut = clockOuts.length ? clockOuts.reduce((a, b) => (a >= b ? a : b)) : null;
      const hasActive = dayShifts.some((s) => !s.clock_out_time);
      const totalWorkedMinutes = dayShifts.reduce((acc, s) => {
        const end = s.clock_out_time ?? now;
        return acc + Math.max(0, Math.round((end.getTime() - s.clock_in_time.getTime()) / 60000));
      }, 0);

      const scheduledStart = earliest.shift_definition?.start_time ?? null;
      const crossesMidnight = earliest.shift_definition?.crosses_midnight ?? false;
      summaries.push({
        date,
        first_clock_in: earliest.clock_in_time.toISOString(),
        last_clock_out: lastClockOut ? lastClockOut.toISOString() : null,
        shift_count: dayShifts.length,
        total_worked_minutes: totalWorkedMinutes,
        scheduled_start_time: scheduledStart,
        crosses_midnight: crossesMidnight,
        is_late: this.isClockInLate(earliest.clock_in_time, scheduledStart, crossesMidnight),
        has_active: hasActive,
      });
    }

    // Map preserves the clock-in-DESC insertion order, so days are already newest-first.
    return summaries;
  }

  /**
   * Get all shifts for an area
   *
   * @param areaId Area UUID
   * @param limit Maximum number of results (default: 100)
   * @returns Array of shifts ordered by clock-in time descending
   */
  async findByAreaId(areaId: string, limit = 100): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { area_id: areaId },
      relations: ['user'],
      order: { clock_in_time: 'DESC' },
      take: limit,
    });
  }

  /**
   * Calculate hours worked in a shift
   *
   * @param clockInTime Clock-in timestamp
   * @param clockOutTime Clock-out timestamp (if null, uses current time)
   * @returns Hours worked rounded to 2 decimal places
   */
  calculateHoursWorked(clockInTime: Date, clockOutTime: Date | null): number {
    const end = clockOutTime || new Date();
    const diffMs = end.getTime() - clockInTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100;
  }

  /**
   * Get all active shifts (for management dashboard)
   *
   * @returns Array of active shifts with user and area details
   */
  async findAllActiveShifts(): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { clock_out_time: IsNull() },
      relations: ['user', 'area', 'area.areaType'],
      order: { clock_in_time: 'ASC' },
    });
  }

  /**
   * Get all active shifts with pagination (for management dashboard)
   *
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated active shifts with user and area details
   */
  async findAllActiveShiftsPaginated(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Shift>> {
    const [data, total] = await this.shiftRepository.findAndCount({
      where: { clock_out_time: IsNull() },
      relations: ['user', 'area', 'area.areaType'],
      order: { clock_in_time: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
