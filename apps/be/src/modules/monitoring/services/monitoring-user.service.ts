import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Not, IsNull } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { Region } from '../../regions/entities/region.entity';
import { Role } from '../../rbac/entities/role.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import {
  LiveUsersResponseDto,
  LiveUserDto,
  LiveUsersFilterDto,
  AbsentUserDto,
} from '../dto/live-users.dto';
import { SchedulesService } from '../../schedules/schedules.service';
import { ScheduleStatus } from '../../schedules/entities/schedule.entity';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { LocationHistoryResponseDto, LocationHistoryPointDto } from '../dto/location-history.dto';
import { UserDaySummaryDto } from '../dto/user-day-summary.dto';
import { GpsUtil } from '../../../common/utils/gps.util';
import { StatusCalculatorService } from './status-calculator.service';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import {
  derivePresenceState,
  resolveShiftWindow,
  type LifecycleState,
  type LifecycleFlag,
} from '../lib/presence-lifecycle';

@Injectable()
export class MonitoringUserService {
  private readonly logger = new Logger(MonitoringUserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(LocationLog)
    private readonly locationRepository: Repository<LocationLog>,
    @InjectRepository(Rayon)
    private readonly rayonRepository: Repository<Rayon>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepository: Repository<ShiftDefinition>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    private readonly statusCalculator: StatusCalculatorService,
    private readonly cacheService: MonitoringCacheService,
    // Daily roster (ADR-013). Optional → specs without it get zeroed summaries.
    @Optional()
    private readonly dailySchedulesService?: SchedulesService,
  ) {}

  async getLiveUsers(filters?: LiveUsersFilterDto): Promise<LiveUsersResponseDto> {
    this.logger.log('Fetching live user positions');

    const qb = this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoinAndSelect('uts.user', 'user')
      .leftJoinAndSelect('uts.shift', 'shift')
      .leftJoinAndSelect('uts.shift_definition', 'sd')
      .leftJoinAndSelect('uts.area', 'area')
      .leftJoin('area.locationType', 'locationType')
      .where('uts.shift_id IS NOT NULL');

    if (filters?.location_id) {
      qb.andWhere('uts.location_id = :locationId', { locationId: filters.location_id });
    }
    // Multi-area scoping (e.g. korlap with several `user_areas` rows).
    const scopedAreaIds = (filters as { area_ids?: string[] } | undefined)?.area_ids;
    if (scopedAreaIds) {
      if (scopedAreaIds.length === 0) {
        qb.andWhere('1 = 0');
      } else {
        qb.andWhere('uts.location_id IN (:...scopedAreaIds)', { scopedAreaIds });
      }
    }
    if (filters?.rayon_id) {
      qb.andWhere('area.rayon_id = :rayonId', { rayonId: filters.rayon_id });
    }
    if (filters?.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters?.status) {
      qb.andWhere('uts.status = :status', { status: filters.status });
    }

    // Server-side search (5.7a): match worker, lokasi, or TEAM name among workers
    // with a fresh (≤24h) fix. Escape LIKE metacharacters in the term so a stray
    // % / _ can't turn into a wildcard. `shift_id IS NOT NULL` above already limits
    // this to clocked-in workers, so ad-hoc (unscheduled) clock-ins surface too.
    // Team match uses an EXISTS subquery on today's roster (no row duplication).
    if (filters?.q && filters.q.trim()) {
      const term = `%${filters.q.trim().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        `(user.full_name ILIKE :q OR area.name ILIKE :q OR EXISTS (
            SELECT 1 FROM schedules s
            JOIN team_categories tc ON tc.id = s.team_category_id
            WHERE s.user_id = uts.user_id
              AND s.schedule_date = :teamDate
              AND s.deleted_at IS NULL
              AND tc.name ILIKE :q
          ))`,
        { q: term, teamDate: TimezoneUtil.jakartaDateString() },
      ).andWhere("uts.last_location_at >= NOW() - INTERVAL '24 hours'");
    }

    const trackingRecords = await qb.getMany();

    const locationIds = [...new Set(trackingRecords.map((r) => r.location_id).filter(Boolean))];
    const userIds = trackingRecords.map((r) => r.user_id);
    const regionIds = [
      ...new Set(trackingRecords.map((r) => r.area?.region_id).filter(Boolean)),
    ] as string[];

    const [rayonMap, regionMap, taskMap, thresholds, teamMap, roleMarkerMap] = await Promise.all([
      this.buildRayonMap(locationIds as string[]),
      this.buildRegionMap(regionIds),
      this.buildCurrentTaskMap(userIds),
      this.cacheService.getThresholds(),
      this.dailySchedulesService
        ? this.dailySchedulesService.getTeamMembership(userIds, TimezoneUtil.jakartaDateString())
        : Promise.resolve(new Map()),
      this.buildRoleMarkerMap(),
    ]);

    const users: LiveUserDto[] = trackingRecords.map((uts) => {
      const rayonId = uts.area?.rayon_id || null;
      const axes = this.statusCalculator.calculateAxes(
        {
          hasActiveShift: !!uts.shift_id,
          lastLocationAt: uts.last_location_at,
          isWithinArea: uts.is_within_area,
        },
        thresholds,
      );
      return {
        id: uts.user.id,
        full_name: uts.user.full_name,
        phone: uts.user.phone_number || null,
        role: uts.user.role,
        role_marker_icon: roleMarkerMap.get(uts.user.role) ?? null,
        location_id: uts.location_id,
        location_name: uts.area?.name || 'Unknown',
        rayon_id: rayonId,
        rayon_name: rayonId ? rayonMap.get(rayonId) || null : null,
        region_id: uts.area?.region_id ?? null,
        region_name: uts.area?.region_id ? (regionMap.get(uts.area.region_id) ?? null) : null,
        latitude: uts.last_latitude || 0,
        longitude: uts.last_longitude || 0,
        accuracy: uts.last_accuracy_meters,
        battery_level: uts.last_battery_level,
        last_update: uts.last_location_at || uts.shift?.clock_in_time || new Date(),
        status: uts.status,
        activity: axes.activity,
        location: axes.location,
        is_within_area: uts.is_within_area,
        ...this.computeLiveLifecycle(uts, thresholds),
        // Overridden by the callers (getLiveUsers / getSnapshot) with the
        // current-shift roster check; default false keeps the type satisfied.
        is_scheduled: false,
        outside_boundary: uts.shift?.clock_in_outside_boundary || false,
        shift_id: uts.shift_id || '',
        shift_name: uts.shift_definition?.name || 'Active Shift',
        clock_in_time: uts.shift?.clock_in_time || new Date(),
        shift_definition_id: uts.shift_definition_id ?? null,
        current_task_status: taskMap.get(uts.user_id)?.status || null,
        current_task_title: taskMap.get(uts.user_id)?.title || null,
        team_id: teamMap.get(uts.user_id)?.team_id ?? null,
        team_name: teamMap.get(uts.user_id)?.team_name ?? null,
        team_color: teamMap.get(uts.user_id)?.team_color ?? null,
      };
    });

    const statusCounts = this.countByStatus(trackingRecords);
    const rosterSummary = await this.computeRosterSummary(filters);

    return {
      total_active: statusCounts.active,
      total_offline: statusCounts.offline,
      total_absent: statusCounts.absent,
      total_outside_area: statusCounts.outside_area,
      total_online: statusCounts.active,
      users,
      ...rosterSummary,
      generated_at: new Date(),
    };
  }

  /**
   * Roster-derived "expected vs actual" for today (ADR-013): compares the
   * materialized roster to who has clocked in. Rayon-scoped when a rayon_id
   * filter is present; otherwise global. Returns zeros when the roster service
   * isn't wired (legacy specs).
   */
  private async computeRosterSummary(filters?: LiveUsersFilterDto): Promise<{
    expected_count: number;
    present_count: number;
    absent_count: number;
    on_leave_count: number;
    off_schedule_count: number;
    absent_users: AbsentUserDto[];
  }> {
    const empty = {
      expected_count: 0,
      present_count: 0,
      absent_count: 0,
      on_leave_count: 0,
      off_schedule_count: 0,
      absent_users: [] as AbsentUserDto[],
    };
    if (!this.dailySchedulesService) return empty;

    const today = TimezoneUtil.jakartaDateString();
    const rayonId = filters?.rayon_id ?? null;
    const roster = await this.dailySchedulesService.getRosterForMonitoring(today, rayonId);
    if (roster.length === 0) return empty;

    const clockedRows = await this.trackingRepository.find({
      where: { shift_id: Not(IsNull()), ...(rayonId ? { rayon_id: rayonId } : {}) },
      select: ['user_id'],
    });
    const clockedIn = new Set(clockedRows.map((r) => r.user_id));

    // Counts are DISTINCT WORKERS, not roster rows — a worker may hold two
    // non-overlapping shifts a day (ADR-047) and must not be counted twice.
    const distinctUsers = (rows: typeof roster): number => new Set(rows.map((r) => r.user_id)).size;

    const expected = roster.filter(
      (r) => r.status === ScheduleStatus.PLANNED || r.status === ScheduleStatus.PRESENT,
    );
    const expectedCount = distinctUsers(expected);
    const onLeave = distinctUsers(
      roster.filter(
        (r) =>
          r.status === ScheduleStatus.LEAVE_SICK ||
          r.status === ScheduleStatus.LEAVE_ANNUAL ||
          r.status === ScheduleStatus.LEAVE_PERMIT,
      ),
    );
    const offSchedule = distinctUsers(roster.filter((r) => r.status === ScheduleStatus.OFF));

    const absentRows = expected.filter((r) => !clockedIn.has(r.user_id));
    const seenAbsent = new Set<string>();
    const absent_users: AbsentUserDto[] = [];
    for (const r of absentRows) {
      if (seenAbsent.has(r.user_id)) continue;
      seenAbsent.add(r.user_id);
      absent_users.push({
        user_id: r.user_id,
        full_name: r.user?.full_name ?? '',
        role: r.user?.role ?? '',
        rayon_id: r.rayon_id,
        shift_definition_id: r.shift_definition_id,
        shift_name: r.shift_definition?.name ?? null,
      });
    }

    return {
      expected_count: expectedCount,
      present_count: expectedCount - absent_users.length,
      absent_count: absent_users.length,
      on_leave_count: onLeave,
      off_schedule_count: offSchedule,
      absent_users,
    };
  }

  async getLocationHistory(
    userId: string,
    date: string,
    shiftId?: string,
  ): Promise<LocationHistoryResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const dayRange = this.parseDateRange(date);
    const shift = await this.findShiftForHistory(userId, dayRange, shiftId);
    const area = shift?.location_id
      ? await this.areaRepository.findOne({ where: { id: shift.location_id } })
      : null;

    const shiftDef = shift?.shift_definition_id
      ? await this.shiftDefinitionRepository.findOne({ where: { id: shift.shift_definition_id } })
      : null;

    const logs = await this.fetchLocationLogs(userId, dayRange, shiftId);
    const points = this.buildLocationPoints(logs, area);
    const analytics = this.computeTrailAnalytics(points);

    return {
      user_id: userId,
      user_name: user.full_name,
      role: user.role,
      date,
      shift_id: shift?.id || null,
      shift_name: shiftDef?.name || null,
      location_id: area?.id || null,
      location_name: area?.name || null,
      clock_in_time: shift?.clock_in_time || null,
      clock_out_time: shift?.clock_out_time || null,
      points,
      total_points: points.length,
      total_distance_meters: analytics.totalDistance,
      time_inside_area_minutes: analytics.timeInsideMinutes,
      time_outside_area_minutes: analytics.timeOutsideMinutes,
      generated_at: new Date(),
    };
  }

  async getUserDaySummary(userId: string): Promise<UserDaySummaryDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const tracking = await this.trackingRepository.findOne({
      where: { user_id: userId },
      relations: ['shift', 'area'],
    });

    const area =
      tracking?.area ||
      (user.location_id
        ? await this.areaRepository.findOne({ where: { id: user.location_id } })
        : null);

    const effectiveRayonId = area?.rayon_id ?? user.rayon_id ?? null;
    const rayon = effectiveRayonId
      ? await this.rayonRepository.findOne({ where: { id: effectiveRayonId } })
      : null;

    const shiftInfo = await this.buildShiftInfo(tracking);
    const lastLocation = this.buildLastLocation(tracking, area);
    const today = this.getTodayRange();

    const [activitiesToday, tasksToday] = await Promise.all([
      this.fetchTodayActivities(userId, today),
      this.fetchTodayTasks(userId, today),
    ]);

    return {
      user_id: userId,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      phone: user.phone_number || null,
      status: tracking?.status || TrackingStatus.OFFLINE,
      location_id: area?.id || null,
      location_name: area?.name || null,
      rayon_id: rayon?.id || null,
      rayon_name: rayon?.name || null,
      shift: shiftInfo,
      last_location: lastLocation,
      activities_today: activitiesToday,
      tasks_today: tasksToday,
      whatsapp_links: this.buildWhatsAppLinks(user.phone_number),
    };
  }

  // ---- Private helpers ----

  /**
   * Lifecycle facets for a LIVE (bertugas) worker — every row here is clocked in
   * and not out, so the state is always `bertugas`; what varies is the flags
   * (is_late / lupa_clock_out / lembur). `ad_hoc` is NOT decided here — it needs
   * the current-shift roster check the caller owns, so the snapshot appends it.
   * Resolves the shift window on the clock-in's WIB service day, which keeps
   * shift 3 (crosses midnight) correct. Falls back to a bare `bertugas` when the
   * shift/definition rows are missing, never throwing.
   */
  private computeLiveLifecycle(
    uts: UserTrackingStatus,
    thresholds: StatusThresholds,
  ): { lifecycle_state: LifecycleState; is_late: boolean; lifecycle_flags: LifecycleFlag[] } {
    const clockIn = uts.shift?.clock_in_time ?? null;
    const sd = uts.shift_definition;
    if (!clockIn || !sd?.start_time || !sd?.end_time) {
      return { lifecycle_state: 'bertugas', is_late: false, lifecycle_flags: [] };
    }
    const serviceDate = TimezoneUtil.jakartaDateOf(clockIn);
    const window = resolveShiftWindow(
      serviceDate,
      sd.start_time,
      sd.end_time,
      sd.crosses_midnight ?? false,
    );
    const result = derivePresenceState(
      {
        scheduled: true, // placeholder — ad_hoc is appended by the snapshot caller
        clockIn,
        clockOut: null,
        shiftStart: window.start,
        shiftEnd: window.end,
        graceMs: thresholds.late_grace_seconds * 1000,
        overtimeApproved: !!uts.shift?.is_overtime,
        leave: 'none',
      },
      new Date(),
    );
    return {
      lifecycle_state: result.state,
      is_late: result.flags.includes('is_late'),
      lifecycle_flags: result.flags,
    };
  }

  /**
   * Tallies for the snapshot. The three statuses partition the workforce;
   * `outside_area` is an AXIS that overlaps them, so the four do NOT sum to a
   * headcount — a worker outside their boundary is counted under their status
   * AND under `outside_area`.
   */
  private countByStatus(records: UserTrackingStatus[]): Record<string, number> {
    const counts: Record<string, number> = {
      active: 0,
      offline: 0,
      absent: 0,
      outside_area: 0,
    };
    for (const r of records) {
      if (r.status in counts) counts[r.status] = counts[r.status] + 1;
      // Inside/outside stopped being a status, so it can no longer be read off
      // the status column — it has to come from the flag. ABSENT rows are skipped:
      // their `is_within_area` is a leftover from whenever they last reported, and
      // counting it would report people who are at home as "outside their area".
      if (r.is_within_area === false && r.status !== TrackingStatus.ABSENT) {
        counts.outside_area += 1;
      }
    }
    return counts;
  }

  private async buildRayonMap(locationIds: string[]): Promise<Map<string, string>> {
    if (locationIds.length === 0) return new Map();

    const areas = await this.areaRepository
      .createQueryBuilder('area')
      .where('area.id IN (:...locationIds)', { locationIds })
      .andWhere('area.rayon_id IS NOT NULL')
      .getMany();

    const rayonIds = [...new Set(areas.map((a) => a.rayon_id).filter(Boolean))] as string[];
    if (rayonIds.length === 0) return new Map();

    const rayons = await this.rayonRepository.find({
      where: { id: In(rayonIds) },
    });

    return new Map(rayons.map((r) => [r.id, r.name]));
  }

  private async buildRegionMap(regionIds: string[]): Promise<Map<string, string>> {
    if (regionIds.length === 0) return new Map();
    const regions = await this.regionRepository.find({ where: { id: In(regionIds) } });
    return new Map(regions.map((r) => [r.id, r.name]));
  }

  /**
   * Map each role `code` → its configured `marker_icon` (only rows that set one).
   * A worker's role glyph on the map falls back to a client-side default when the
   * role leaves this null, so custom roles / overrides still get their icon.
   */
  private async buildRoleMarkerMap(): Promise<Map<string, string>> {
    const roles = await this.roleRepository.find({ select: ['code', 'marker_icon'] });
    return new Map(
      roles.filter((r) => r.marker_icon).map((r) => [r.code, r.marker_icon as string]),
    );
  }

  private async buildCurrentTaskMap(
    userIds: string[],
  ): Promise<Map<string, { status: string; title: string }>> {
    if (userIds.length === 0) return new Map();

    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.assigned_to IN (:...userIds)', { userIds })
      .andWhere('task.status = :status', { status: TaskStatus.IN_PROGRESS })
      .getMany();

    return new Map(
      tasks
        .filter((t) => t.assigned_to !== null)
        .map((t) => [t.assigned_to as string, { status: t.status, title: t.title }]),
    );
  }

  private parseDateRange(date: string): { start: Date; end: Date } {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    return { start, end };
  }

  private getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private async findShiftForHistory(
    userId: string,
    dayRange: { start: Date; end: Date },
    shiftId?: string,
  ): Promise<Shift | null> {
    if (shiftId) {
      return this.shiftRepository.findOne({
        where: { id: shiftId, user_id: userId },
      });
    }
    return this.shiftRepository.findOne({
      where: {
        user_id: userId,
        clock_in_time: Between(dayRange.start, dayRange.end),
      },
      order: { clock_in_time: 'DESC' },
    });
  }

  private async fetchLocationLogs(
    userId: string,
    dayRange: { start: Date; end: Date },
    shiftId?: string,
  ): Promise<LocationLog[]> {
    const qb = this.locationRepository
      .createQueryBuilder('loc')
      .where('loc.user_id = :userId', { userId })
      .andWhere('loc.logged_at BETWEEN :start AND :end', dayRange)
      .orderBy('loc.logged_at', 'ASC');

    if (shiftId) {
      qb.andWhere('loc.shift_id = :shiftId', { shiftId });
    }

    return qb.getMany();
  }

  private buildLocationPoints(
    logs: LocationLog[],
    area: Location | null,
  ): LocationHistoryPointDto[] {
    return logs.map((log) => ({
      latitude: Number(log.gps_lat),
      longitude: Number(log.gps_lng),
      accuracy: log.accuracy_meters ?? null,
      battery_level: log.battery_level ?? null,
      logged_at: log.logged_at,
      is_within_area: area
        ? GpsUtil.isWithinAreaBoundary(Number(log.gps_lat), Number(log.gps_lng), area)
        : true,
    }));
  }

  private computeTrailAnalytics(points: LocationHistoryPointDto[]): {
    totalDistance: number;
    timeInsideMinutes: number;
    timeOutsideMinutes: number;
  } {
    let totalDistance = 0;
    let timeInsideMs = 0;
    let timeOutsideMs = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      totalDistance += GpsUtil.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude,
      );
      const timeDelta = curr.logged_at.getTime() - prev.logged_at.getTime();
      if (prev.is_within_area) {
        timeInsideMs += timeDelta;
      } else {
        timeOutsideMs += timeDelta;
      }
    }

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      timeInsideMinutes: Math.round(timeInsideMs / 60000),
      timeOutsideMinutes: Math.round(timeOutsideMs / 60000),
    };
  }

  private async buildShiftInfo(
    tracking: UserTrackingStatus | null,
  ): Promise<UserDaySummaryDto['shift']> {
    if (!tracking?.shift_id) return null;

    const shift =
      tracking.shift ||
      (await this.shiftRepository.findOne({
        where: { id: tracking.shift_id },
      }));
    if (!shift) return null;

    const shiftDef = tracking.shift_definition_id
      ? await this.shiftDefinitionRepository.findOne({
          where: { id: tracking.shift_definition_id },
        })
      : null;

    const now = shift.clock_out_time || new Date();
    const durationMs = now.getTime() - shift.clock_in_time.getTime();

    return {
      id: shift.id,
      name: shiftDef?.name || 'Active Shift',
      clock_in_time: shift.clock_in_time,
      clock_out_time: shift.clock_out_time || null,
      duration_minutes: Math.round(durationMs / 60000),
      outside_boundary: shift.clock_in_outside_boundary || false,
    };
  }

  private buildLastLocation(
    tracking: UserTrackingStatus | null,
    area: Location | null,
  ): UserDaySummaryDto['last_location'] {
    if (!tracking?.last_latitude || !tracking?.last_longitude) return null;

    return {
      latitude: Number(tracking.last_latitude),
      longitude: Number(tracking.last_longitude),
      accuracy: tracking.last_accuracy_meters ? Number(tracking.last_accuracy_meters) : null,
      battery_level: tracking.last_battery_level,
      logged_at: tracking.last_location_at!,
      is_within_area: tracking.is_within_area,
    };
  }

  private async fetchTodayActivities(
    userId: string,
    today: { start: Date; end: Date },
  ): Promise<UserDaySummaryDto['activities_today']> {
    const activities = await this.activityRepository.find({
      where: {
        user_id: userId,
        created_at: Between(today.start, today.end),
      },
      order: { created_at: 'DESC' },
      take: 20,
    });

    return activities.map((a) => ({
      id: a.id,
      title: a.description,
      activity_type: a.activity_type_id,
      created_at: a.created_at,
      photo_url: a.photo_urls?.[0] || null,
    }));
  }

  private async fetchTodayTasks(
    userId: string,
    today: { start: Date; end: Date },
  ): Promise<UserDaySummaryDto['tasks_today']> {
    const tasks = await this.taskRepository.find({
      where: { assigned_to: userId },
      order: { priority: 'DESC', created_at: 'DESC' },
      take: 20,
    });

    return tasks
      .filter(
        (t) =>
          t.status !== TaskStatus.COMPLETED ||
          (t.completed_at && t.completed_at >= today.start && t.completed_at <= today.end),
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      }));
  }

  private buildWhatsAppLinks(
    phone: string | null | undefined,
  ): UserDaySummaryDto['whatsapp_links'] {
    if (!phone) return null;

    const cleaned = phone.replace(/\D/g, '');
    const international = cleaned.startsWith('0') ? `62${cleaned.substring(1)}` : cleaned;

    return {
      chat: `https://wa.me/${international}`,
      call: `tel:+${international}`,
    };
  }
}
