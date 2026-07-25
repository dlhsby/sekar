import { Injectable, Logger, HttpStatus, Optional, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository, IsNull } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { AttendancePunch } from './entities/attendance-punch.entity';
import { PunchLabel } from './enums/punch-label.enum';
import { AttendanceDerivationService } from './services/attendance-derivation.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { LocationsService } from '../locations/locations.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { BoundaryCheckService } from '../../shared/services/boundary-check.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import { AttendanceDaySummaryDto } from './dto/attendance-day.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { getMinimumShiftDurationMinutes } from '../../common/constants/shift.constants';
import { SystemConfigService } from '../settings/services/system-config.service';
import { Location } from '../locations/entities/location.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { User } from '../users/entities/user.entity';
import { StatusCalculatorService } from '../monitoring/services/status-calculator.service';
import { AuditLogService } from '../audit/audit.service';
import { UserLocationsService } from '../user-locations/user-locations.service';
import { SchedulesService } from '../schedules/schedules.service';
import { GpsUtil } from '../../common/utils/gps.util';

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
    @InjectRepository(AttendancePunch)
    private readonly punchRepository: Repository<AttendancePunch>,
    private readonly derivation: AttendanceDerivationService,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepo: Repository<ShiftDefinition>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userAreasService: UserLocationsService,
    private readonly locationsService: LocationsService,
    @Optional()
    @Inject(forwardRef(() => StatusCalculatorService))
    private readonly statusCalculator: StatusCalculatorService | undefined,
    private readonly auditLogService: AuditLogService,
    // Daily roster (ADR-013). Optional → legacy specs without the provider keep
    // the pre-roster behavior (user_areas + schedules + primary area).
    @Optional()
    private readonly dailySchedulesService?: SchedulesService,
    // Phase 4-7 (H1): boundary math extracted to the shared service. Optional →
    // legacy specs without the provider fall back to a local instance.
    @Optional()
    private readonly boundaryCheckService?: BoundaryCheckService,
    // ADR-049: runtime min-shift-duration via SystemConfigService (DB → env →
    // default). Optional → specs without the provider fall back to the env helper.
    @Optional()
    private readonly systemConfig?: SystemConfigService,
  ) {}

  private get boundaryCheck(): BoundaryCheckService {
    return (this.boundaryCheckFallback ??= this.boundaryCheckService ?? new BoundaryCheckService());
  }
  private boundaryCheckFallback?: BoundaryCheckService;

  /**
   * Resolve the area a worker is clocking into.
   *
   * A worker may have several assigned areas (permanent `user_areas` +
   * task_based + active explicit schedules) and a single shift. With GPS we
   * pick the assigned area whose geofence CONTAINS the point; if several/none
   * contain it we pick the CLOSEST centre. Without GPS we prefer the primary
   * (`users.location_id`) then the first candidate. Returns null when the worker
   * has no assigned area (ad-hoc) — clock-in still proceeds.
   *
   * @param userId User UUID
   * @param lat optional clock-in latitude
   * @param lng optional clock-in longitude
   */
  async getActiveArea(userId: string, lat?: number, lng?: number): Promise<Location | null> {
    // Prefer today's roster areas (ADR-013); fall back to the standing
    // assignment (user_areas + active schedules) when there is no roster row.
    let candidates: Location[] = [];
    if (this.dailySchedulesService) {
      // "Now", not "today": a Shift 3 worker clocking out at 03:00 is still on
      // yesterday's roster row.
      candidates = await this.dailySchedulesService.getActiveAreasNow(userId);
    }
    if (candidates.length === 0) {
      candidates = await this.getCandidateAreas(userId);
    }

    if (candidates.length === 0) {
      // No assignment rows — fall back to the legacy primary area, else ad-hoc.
      const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['area'] });
      return user?.area ?? null;
    }

    if (typeof lat === 'number' && typeof lng === 'number') {
      const containing = candidates.filter((a) =>
        this.boundaryCheck.isWithinAreaBoundary(lat, lng, a),
      );
      const pool = containing.length ? containing : candidates;
      return this.closestArea(pool, lat, lng);
    }

    // No GPS: prefer the designated primary, else the first candidate.
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return candidates.find((a) => a.id === user?.location_id) ?? candidates[0];
  }

  /**
   * Distinct assigned areas from the worker's standing assignment: permanent +
   * task_based (`user_areas`). The roster (today's areas) is preferred upstream
   * in `getActiveArea`; this is the fallback when there is no roster row.
   */
  private async getCandidateAreas(userId: string): Promise<Location[]> {
    const effective = await this.userAreasService.getEffectiveLocations(userId);
    const byId = new Map<string, Location>();
    for (const area of effective) if (area) byId.set(area.id, area);
    return [...byId.values()];
  }

  /** Pick the area whose centre is nearest the point. */
  private closestArea(areas: Location[], lat: number, lng: number): Location {
    let best = areas[0];
    let bestDist = Infinity;
    for (const area of areas) {
      const dist = GpsUtil.calculateDistance(lat, lng, area.gps_lat, area.gps_lng);
      if (dist < bestDist) {
        bestDist = dist;
        best = area;
      }
    }
    return best;
  }

  /**
   * The shift baseline for lateness: today's roster shift (ADR-013), else the
   * worker's configured shift, else the time-of-day match.
   */
  private async getUserShiftOrCurrent(userId: string): Promise<ShiftDefinition | null> {
    if (this.dailySchedulesService) {
      const today = TimezoneUtil.jakartaDateString();
      const rosterShift = await this.dailySchedulesService.getShiftForDay(userId, today);
      if (rosterShift) return rosterShift;
    }
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['shift_definition'],
    });
    if (user?.shift_definition) return user.shift_definition;
    return this.findCurrentShiftDefinition();
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
   * @param dto Clock-in data (optional location_id, GPS, selfie photo)
   * @returns Created shift entity
   * @throws BadRequestException if already clocked in
   */
  async clockIn(userId: string, dto: ClockInDto, isOvertime: boolean = false): Promise<Shift> {
    this.logger.log(`User ${userId} attempting to clock in`);

    // ADR-055: clock-in is NEVER blocked. There is no SHIFT_ALREADY_ACTIVE guard
    // any more — a repeat clock-in simply appends a punch; the derivation collapses
    // redundant/re-entry clock-ins into one session (first-in / last-out).

    // 1. Get area: from DTO or auto-detect (GPS-aware among assigned areas).
    let area: Location | null = null;
    if (dto.location_id) {
      area = await this.locationsService.findOne(dto.location_id);
    } else {
      area = await this.getActiveArea(userId, dto.gps_lat, dto.gps_lng);
    }
    // area may be null — ad-hoc clock-in still proceeds (GPS still recorded).

    // 2. Selfie stored as a base64 data-URI directly (Phase 2E), same as before.
    const photoUrl: string | null = dto.selfie_photo ?? null;

    // 3. Soft geofencing — advisory only, never blocks (ADR-005→010).
    let outsideBoundary = false;
    if (area) {
      outsideBoundary = !this.boundaryCheck.isWithinAreaBoundary(dto.gps_lat, dto.gps_lng, area);
      if (outsideBoundary) {
        this.logger.warn(`User ${userId} clocking in outside area boundary: ${area.name}`);
      }
    }

    // 4. Session key. If a session is already OPEN, this clock-in CONTINUES it
    //    (a redundant tap or a re-entry) — reuse its service_day + definition so
    //    the punch lands on the same key even across midnight. Without this a
    //    post-midnight re-clock-in would compute *today's* service_day and spawn
    //    a SECOND open row (ADR-055 review finding #1). Only when nothing is open
    //    do we start a fresh session (today's date + the worker's shift).
    const openSession = await this.findOpenSessionRow(userId, isOvertime);
    const shiftDefId = openSession
      ? openSession.shift_definition_id
      : isOvertime
        ? null
        : ((await this.getUserShiftOrCurrent(userId))?.id ?? null);
    const serviceDay = openSession
      ? TimezoneUtil.jakartaDateOf(openSession.clock_in_time)
      : TimezoneUtil.jakartaDateString();

    // 5. Append the immutable clock-in punch (idempotent on the client uuid).
    await this.insertPunch({
      id: dto.client_uuid ?? randomUUID(),
      user_id: userId,
      punched_at: new Date(),
      label: PunchLabel.CLOCK_IN,
      service_day: serviceDay,
      shift_definition_id: shiftDefId,
      location_id: area?.id ?? null,
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      accuracy_m: dto.accuracy_m ?? null,
      outside_boundary: outsideBoundary,
      photo_url: photoUrl,
      is_overtime: isOvertime,
    });

    // 6. Rebuild the maintained session-projection row from that key's punches.
    const session = await this.projectSession(userId, serviceDay, shiftDefId, isOvertime);
    this.logger.log(
      `User ${userId} clocked in. Session ${session.id}, Location: ${area?.name || 'None'}`,
    );

    // 7. Live path: emit based on the DERIVED state (session is open after a clock-in).
    if (this.statusCalculator) {
      await this.statusCalculator
        .onClockIn(
          userId,
          session.id,
          session.location_id,
          session.shift_definition_id ?? null,
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
        entity_id: session.id,
        action: 'clock_in',
        actor_id: userId,
        new_value: {
          location_id: session.location_id,
          is_overtime: isOvertime,
          clock_in_outside_boundary: outsideBoundary,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return session;
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

    // ADR-055: clock-out requires an OPEN session (a prior unmatched clock-in).
    // The open session-projection row is the anchor; it also carries the shift's
    // service-day + definition so a cross-midnight Shift-3 clock-out at 03:00
    // pairs with its 21:00 clock-in (same service_day) instead of starting anew.
    const shift = await this.shiftRepository.findOne({
      where: { user_id: userId, clock_out_time: IsNull() },
      relations: ['area'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_NOT_ACTIVE,
        'No active shift found',
      );
    }

    const serviceDay = TimezoneUtil.jakartaDateOf(shift.clock_in_time);
    const isOvertime = shift.is_overtime;
    const shiftDefId = shift.shift_definition_id;

    // Minimum shift duration — DB override → env → default (ADR-049). Measured
    // from the EARLIEST still-open clock-in (the segment this clock-out closes),
    // so a re-entry's short segment is guarded, not the whole day.
    const priorPunches = await this.sessionPunches(userId, serviceDay, shiftDefId, isOvertime);
    const openSince = this.derivation.earliestOpenClockIn(priorPunches) ?? shift.clock_in_time;
    const minMinutes = this.systemConfig
      ? this.systemConfig.getNumber('schedule.min_shift_duration_min', 5)
      : getMinimumShiftDurationMinutes();
    const minMs = minMinutes * 60 * 1000;
    const segmentMs = Date.now() - openSince.getTime();
    // 0 (or any non-positive) disables the guard entirely — configurable via
    // `schedule.min_shift_duration_min` in settings.
    if (minMinutes > 0 && segmentMs < minMs) {
      const minutesWorked = Math.floor(segmentMs / (60 * 1000));
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_DURATION_TOO_SHORT,
        `Shift duration too short. Minimum ${minMinutes} minutes required. Current duration: ${minutesWorked} minutes`,
        {
          minutesWorked,
          minimumRequired: minMinutes,
          clockInTime: openSince.toISOString(),
        },
      );
    }

    const clockOutPhotoUrl: string | null = dto.selfie_photo ?? null;

    // Soft geofencing — advisory only, never blocks (ADR-005→010).
    let outsideBoundary = false;
    if (shift.area) {
      outsideBoundary = !this.boundaryCheck.isWithinAreaBoundary(
        dto.gps_lat,
        dto.gps_lng,
        shift.area,
      );
      if (outsideBoundary) {
        this.logger.warn(`User ${userId} clocking out outside area boundary: ${shift.area.name}`);
      }
    }

    // Append the immutable clock-out punch (inherits the session's service_day /
    // definition / area), then re-project the row from the full punch stream.
    await this.insertPunch({
      id: dto.client_uuid ?? randomUUID(),
      user_id: userId,
      punched_at: new Date(),
      label: PunchLabel.CLOCK_OUT,
      service_day: serviceDay,
      shift_definition_id: shiftDefId,
      location_id: shift.location_id,
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      accuracy_m: dto.accuracy_m ?? null,
      outside_boundary: outsideBoundary,
      photo_url: clockOutPhotoUrl,
      is_overtime: isOvertime,
    });

    const session = await this.projectSession(userId, serviceDay, shiftDefId, isOvertime);
    const hoursWorked = this.calculateHoursWorked(session.clock_in_time, session.clock_out_time);
    this.logger.log(
      `User ${userId} clocked out. Session ${session.id}, hours worked: ${hoursWorked}`,
    );

    // Live path: emit based on the DERIVED state. A clock-out closes the session,
    // so it goes inactive; a still-open session (shouldn't happen post-clock-out)
    // would keep the worker active — hence we branch on the projection, not the label.
    if (this.statusCalculator) {
      const emit = session.clock_out_time
        ? this.statusCalculator.onClockOut(userId)
        : this.statusCalculator.onClockIn(
            userId,
            session.id,
            session.location_id,
            session.shift_definition_id ?? null,
            dto.gps_lat,
            dto.gps_lng,
          );
      await emit.catch((err) =>
        this.logger.error(
          `StatusCalculator emit failed for user ${userId}: ${err.message}`,
          err.stack,
        ),
      );
    }

    this.auditLogService
      .log({
        entity_type: 'shift',
        entity_id: session.id,
        action: 'clock_out',
        actor_id: userId,
        new_value: {
          hours_worked: hoursWorked,
          clock_out_outside_boundary: outsideBoundary,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return session;
  }

  /**
   * All punches for one session key `(user, service_day, shift_definition, overtime)`,
   * ordered by `punched_at`. `shift_definition_id` null is matched with `IS NULL`
   * (ad-hoc / overtime) so those punches group into their own session.
   */
  private async sessionPunches(
    userId: string,
    serviceDay: string,
    shiftDefId: string | null,
    isOvertime: boolean,
  ): Promise<AttendancePunch[]> {
    const qb = this.punchRepository
      .createQueryBuilder('p')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.service_day = :serviceDay', { serviceDay })
      .andWhere('p.is_overtime = :isOvertime', { isOvertime });
    if (shiftDefId === null) {
      qb.andWhere('p.shift_definition_id IS NULL');
    } else {
      qb.andWhere('p.shift_definition_id = :shiftDefId', { shiftDefId });
    }
    return qb.orderBy('p.punched_at', 'ASC').getMany();
  }

  /** Insert a punch idempotently — a retried offline punch (same PK) is a no-op. */
  private async insertPunch(punch: Partial<AttendancePunch>): Promise<void> {
    await this.punchRepository
      .createQueryBuilder()
      .insert()
      .into(AttendancePunch)
      .values(punch)
      .orIgnore() // ON CONFLICT (id) DO NOTHING
      .execute();
  }

  /**
   * Rebuild the maintained `shifts` session-projection row for a session key from
   * its punches (ADR-055). One row per `(user, service_day, shift_definition,
   * overtime)`; its `id` is stable across re-entry so the FKs that point at it
   * (activities / location_logs / overtime / user_tracking_status) never break.
   * `clock_out_time` follows the last-punch rule: set when closed, NULL when the
   * last punch reopened the session.
   */
  private async projectSession(
    userId: string,
    serviceDay: string,
    shiftDefId: string | null,
    isOvertime: boolean,
  ): Promise<Shift> {
    const punches = await this.sessionPunches(userId, serviceDay, shiftDefId, isOvertime);
    const s = this.derivation.deriveSession(punches);

    // Find the existing session row for this key (WIB day of its clock-in), if any.
    const existing = await this.findSessionRow(userId, serviceDay, shiftDefId, isOvertime);
    const row = existing ?? this.shiftRepository.create({ user_id: userId });

    row.user_id = userId;
    row.shift_definition_id = shiftDefId;
    row.is_overtime = isOvertime;
    row.location_id = s.firstIn?.location_id ?? row.location_id ?? null;

    // Clock-in facet = the first-in punch.
    row.clock_in_time = s.clockInTime ?? row.clock_in_time;
    row.clock_in_gps_lat = s.firstIn?.gps_lat ?? null;
    row.clock_in_gps_lng = s.firstIn?.gps_lng ?? null;
    row.clock_in_photo_url = s.firstIn?.photo_url ?? null;
    row.clock_in_outside_boundary = s.firstIn?.outside_boundary ?? false;

    // Clock-out facet = the last closing punch. Cleared with `null` (never
    // `undefined`) while the session is open — TypeORM omits `undefined` on an
    // UPDATE, which would leave a stale clock-out on a reopened session; `null`
    // is emitted as `SET ... = NULL`.
    if (s.clockOutTime) {
      row.clock_out_time = s.clockOutTime;
      row.clock_out_gps_lat = s.lastOut?.gps_lat ?? null;
      row.clock_out_gps_lng = s.lastOut?.gps_lng ?? null;
      row.clock_out_photo_url = s.lastOut?.photo_url ?? null;
      row.clock_out_outside_boundary = s.lastOut?.outside_boundary ?? false;
    } else {
      row.clock_out_time = null;
      row.clock_out_gps_lat = null;
      row.clock_out_gps_lng = null;
      row.clock_out_photo_url = null;
      row.clock_out_outside_boundary = false;
    }

    return this.shiftRepository.save(row);
  }

  /**
   * The worker's currently-open session-projection row (clock_out_time IS NULL)
   * for the given overtime flag, newest first. Used by clock-in to CONTINUE an
   * open session (its key) rather than open a second row — the fix for a
   * post-midnight re-entry landing on a fresh service_day. Null when none is open.
   */
  private async findOpenSessionRow(userId: string, isOvertime: boolean): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: { user_id: userId, clock_out_time: IsNull(), is_overtime: isOvertime },
      order: { clock_in_time: 'DESC' },
    });
  }

  /**
   * The session-projection row for a key, matched by the WIB day of its clock-in.
   * Prefers a currently-OPEN row (clock_out_time IS NULL), then newest, so both a
   * re-entry clock-in and a clock-out target the live session — never a stale
   * closed duplicate that could linger on cutover day (a pre-cutover `shifts` row
   * and a new punch-session sharing the key). Returns null for a brand-new session.
   */
  private async findSessionRow(
    userId: string,
    serviceDay: string,
    shiftDefId: string | null,
    isOvertime: boolean,
  ): Promise<Shift | null> {
    const qb = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.user_id = :userId', { userId })
      .andWhere('shift.is_overtime = :isOvertime', { isOvertime })
      .andWhere('shift.deleted_at IS NULL')
      .andWhere("DATE(shift.clock_in_time AT TIME ZONE 'Asia/Jakarta') = :serviceDay", {
        serviceDay,
      });
    if (shiftDefId === null) {
      qb.andWhere('shift.shift_definition_id IS NULL');
    } else {
      qb.andWhere('shift.shift_definition_id = :shiftDefId', { shiftDefId });
    }
    return qb
      .orderBy('CASE WHEN shift.clock_out_time IS NULL THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('shift.clock_in_time', 'DESC')
      .getOne();
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
      relations: ['area', 'area.locationType', 'user', 'shift_definition'],
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
      relations: ['area', 'area.locationType', 'user'],
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
      relations: ['area', 'area.locationType', 'shift_definition'],
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
      relations: ['area', 'area.locationType', 'shift_definition'],
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
      .leftJoinAndSelect('area.locationType', 'locationType')
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
   * @param areaId Location UUID
   * @param limit Maximum number of results (default: 100)
   * @returns Array of shifts ordered by clock-in time descending
   */
  async findByAreaId(areaId: string, limit = 100): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { location_id: areaId },
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
      relations: ['user', 'area', 'area.locationType'],
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
      relations: ['user', 'area', 'area.locationType'],
      order: { clock_in_time: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
