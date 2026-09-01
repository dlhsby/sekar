import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Location } from '../../locations/entities/location.entity';
import { STAFFING_COUNTED_ROLES } from '../../users/constants/role-groups';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import {
  AttendanceLocationDto,
  AttendanceQueryDto,
  ClockedInWorkerDto,
  MonitoringAttendanceDto,
  NotClockedInWorkerDto,
  UserAttendanceDetailDto,
  UserShiftDetailDto,
} from '../dto/attendance.dto';

/**
 * Attendance-by-date for the monitoring module.
 *
 * Replaces `/supervisor/attendance`, which monitoring supersedes. It is a
 * REIMPLEMENTATION rather than a move, because the original had four defects
 * that would have been carried across verbatim:
 *
 *  1. **Roster was `satgas` only.** `linmas` is scheduled and counted too
 *     (ADR-044), so every linmas worker was invisible to attendance.
 *  2. **Day bounds were server-local.** `new Date('YYYY-MM-DD')` parses to UTC
 *     midnight and `setHours(0,0,0,0)` then moves it to the SERVER's midnight.
 *     Containers run UTC while the business day is WIB, so between 00:00 and
 *     07:00 WIB it reported the previous day.
 *  3. **Sessions were matched on `clock_in_time`.** The session key is
 *     `service_day` (ADR-055) and the two differ precisely for night shifts: a
 *     00:30 clock-in belongs to the PREVIOUS day's crossing shift.
 *  4. **One row per SHIFT, not per worker.** A worker who clocked in twice
 *     (break, area change) was counted twice, so `clocked_in_count` could
 *     exceed the roster.
 *
 * It also drops the per-row `findOne` for locations, which was one query per
 * worker per page.
 */
@Injectable()
export class MonitoringAttendanceService {
  private readonly logger = new Logger(MonitoringAttendanceService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Shift) private readonly shiftsRepository: Repository<Shift>,
    @InjectRepository(Location) private readonly locationsRepository: Repository<Location>,
  ) {}

  /**
   * Every shift belonging to a WIB service-day.
   *
   * `service_day` is nullable on rows backfilled before the column existed, so
   * those fall back to a clock-in inside the day's UTC range. Without the
   * fallback, historical dates would report an empty roster.
   */
  private async findShiftsForDay(dateStr: string, start: Date, end: Date): Promise<Shift[]> {
    return (
      this.shiftsRepository
        .createQueryBuilder('shift')
        .leftJoinAndSelect('shift.user', 'user')
        // `shift.area`, NOT `shift.location`: the Area→Location rename moved the
        // COLUMN to `location_id` but left the entity property as `area`. TypeORM
        // resolves join paths by property name, so 'shift.location' throws
        // "Relation with property path location in entity was not found" — a 500
        // on every call, which unit tests could not see because they mock
        // createQueryBuilder and the ORM never validates the string.
        .leftJoinAndSelect('shift.area', 'area')
        .where(
          '(shift.service_day = :dateStr OR (shift.service_day IS NULL AND shift.clock_in_time >= :start AND shift.clock_in_time < :end))',
          { dateStr, start, end },
        )
        .orderBy('shift.clock_in_time', 'ASC')
        .getMany()
    );
  }

  /** Resolve many locations in one query — the old code did one per worker. */
  private async loadLocations(ids: string[]): Promise<Map<string, AttendanceLocationDto>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await this.locationsRepository.find({ where: { id: In(unique) } });
    return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name }]));
  }

  async getAttendance(query: AttendanceQueryDto): Promise<MonitoringAttendanceDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { dateStr, start, end } = TimezoneUtil.jakartaDayRange(query.date);

    this.logger.log(`Attendance for WIB day ${dateStr}`);

    const roster = await this.usersRepository.find({
      where: {
        role: In(STAFFING_COUNTED_ROLES),
        is_active: true,
        deleted_at: IsNull(),
      },
    });

    const shifts = await this.findShiftsForDay(dateStr, start, end);

    // Collapse a worker's several sessions into one attendance row: earliest
    // clock-in, and a clock-out only once every session is closed (an open
    // session means they are still out there).
    const byWorker = new Map<string, { shifts: Shift[] }>();
    for (const shift of shifts) {
      if (!shift.user) continue;
      const entry = byWorker.get(shift.user.id) ?? { shifts: [] };
      entry.shifts.push(shift);
      byWorker.set(shift.user.id, entry);
    }

    // Attendance describes the counted roster, so a clock-in by someone outside
    // it (korlap covering a shift) must not inflate the numerator past the
    // denominator — the ratio bug that reached the client once already.
    const rosterIds = new Set(roster.map((r) => r.id));
    const clockedInIds = [...byWorker.keys()].filter((id) => rosterIds.has(id));

    const notClockedInWorkers = roster.filter((w) => !byWorker.has(w.id));

    const clockedInPage = clockedInIds.slice((page - 1) * limit, page * limit);
    const notClockedInPage = notClockedInWorkers.slice((page - 1) * limit, page * limit);

    const locations = await this.loadLocations([
      ...clockedInPage.map((id) => byWorker.get(id)!.shifts[0]?.location_id ?? ''),
      ...clockedInPage.map((id) => byWorker.get(id)!.shifts[0]?.user?.location_id ?? ''),
      ...notClockedInPage.map((w) => w.location_id ?? ''),
    ]);

    const clockedIn: ClockedInWorkerDto[] = clockedInPage.map((id) => {
      const entry = byWorker.get(id)!;
      const first = entry.shifts[0];
      const allClosed = entry.shifts.every((s) => s.clock_out_time);
      const lastOut = allClosed
        ? entry.shifts
            .map((s) => s.clock_out_time!)
            .reduce((a, b) => (a > b ? a : b))
            .toISOString()
        : null;
      // The session's own location wins; the worker's assignment is the
      // fallback for a session recorded without one.
      const locationId = first.location_id ?? first.user?.location_id ?? '';
      return {
        id: first.user.id,
        username: first.user.username,
        full_name: first.user.full_name,
        role: first.user.role,
        area: locations.get(locationId) ?? null,
        clock_in_time: first.clock_in_time.toISOString(),
        clock_out_time: lastOut,
      };
    });

    const notClockedIn: NotClockedInWorkerDto[] = notClockedInPage.map((w) => ({
      id: w.id,
      username: w.username,
      full_name: w.full_name,
      role: w.role,
      area: locations.get(w.location_id ?? '') ?? null,
    }));

    return {
      date: dateStr,
      total_workers: roster.length,
      clocked_in_count: clockedInIds.length,
      clocked_in: new PaginatedResponseDto(clockedIn, clockedInIds.length, page, limit),
      not_clocked_in: new PaginatedResponseDto(
        notClockedIn,
        notClockedInWorkers.length,
        page,
        limit,
      ),
    };
  }

  async getUserAttendanceDetail(userId: string, date?: string): Promise<UserAttendanceDetailDto> {
    const { dateStr, start, end } = TimezoneUtil.jakartaDayRange(date);

    const user = await this.usersRepository.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const dayShifts = (await this.findShiftsForDay(dateStr, start, end)).filter(
      (s) => s.user?.id === userId,
    );

    const locations = await this.loadLocations([user.location_id ?? '']);

    const shifts: UserShiftDetailDto[] = dayShifts.map((s) => ({
      id: s.id,
      clock_in_time: s.clock_in_time.toISOString(),
      clock_out_time: s.clock_out_time ? s.clock_out_time.toISOString() : null,
      // Left null while the session is open rather than measured against "now",
      // which would make the same historical day read differently on each call.
      duration_minutes: s.clock_out_time
        ? Math.round((s.clock_out_time.getTime() - s.clock_in_time.getTime()) / 60000)
        : null,
      clock_in_outside_boundary: s.clock_in_outside_boundary,
      clock_out_outside_boundary: s.clock_out_outside_boundary,
    }));

    return {
      date: dateStr,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        area: locations.get(user.location_id ?? '') ?? null,
      },
      clocked_in: shifts.length > 0,
      shifts,
    };
  }
}
