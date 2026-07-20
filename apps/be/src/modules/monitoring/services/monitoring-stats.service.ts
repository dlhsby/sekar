import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not, In, type FindOptionsWhere } from 'typeorm';
import { Location } from '../../locations/entities/location.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { District } from '../../districts/entities/district.entity';
import { Region } from '../../regions/entities/region.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import {
  LocationStaffRequirement,
  DayType,
} from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { DistrictStatsDto } from '../dto/district-stats.dto';
import { CityStatsDto, DistrictSummaryDto } from '../dto/city-stats.dto';
import { AreaSummaryDto, ShiftSummaryDto } from '../dto/district-stats.dto';
import {
  AggregateResponseDto,
  AggregateNodeDto,
  AggregateStatusCountsDto,
  AggregateRosterCountsDto,
  PresenceBreakdownDto,
} from '../dto/aggregate.dto';
import {
  Schedule,
  ScheduleStatus,
  ScheduleLocation,
} from '../../schedules/entities/schedule.entity';

import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { resolveShiftWindow } from '../lib/presence-lifecycle';
import {
  AreaStatsDto,
  UserStatusDto,
  TaskSummaryDto,
  StaffRequirementStatusDto,
} from '../dto/area-stats.dto';
import {
  BoundariesResponseDto,
  DistrictBoundaryDto,
  RegionBoundaryDto,
  AreaBoundaryDto,
  RoleStaffingItemDto,
} from '../dto/boundaries.dto';
import { STAFFING_COUNTED_ROLES } from '../../users/constants/role-groups';
import { DayTypeService } from './day-type.service';
import { simplifyGeometry } from '../../../common/utils/geojson-simplify.util';
import { MonitoringCacheService } from './monitoring-cache.service';

@Injectable()
export class MonitoringStatsService {
  private readonly logger = new Logger(MonitoringStatsService.name);

  constructor(
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
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepository: Repository<ShiftDefinition>,
    @InjectRepository(LocationStaffRequirement)
    private readonly staffRequirementRepository: Repository<LocationStaffRequirement>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleLocation)
    private readonly scheduleAreaRepository: Repository<ScheduleLocation>,
    private readonly dayTypeService: DayTypeService,
    // Optional: short-TTL response cache. Absent in unit specs; present at runtime.
    @Optional()
    private readonly cacheService?: MonitoringCacheService,
  ) {}

  async getCityStats(): Promise<CityStatsDto> {
    this.logger.log('Generating city-wide statistics');

    const today = this.getTodayRange();
    const districts = await this.districtRepository.find();
    const districtSummaries = await Promise.all(
      districts.map((district) => this.getDistrictSummary(district)),
    );

    const totalWorkers = districtSummaries.reduce((sum, s) => sum + s.worker_count, 0);
    const workersOnline = districtSummaries.reduce((sum, s) => sum + s.workers_online, 0);
    const workersOffline = districtSummaries.reduce((sum, s) => sum + s.workers_offline, 0);
    const totalAreas = districtSummaries.reduce((sum, s) => sum + s.area_count, 0);

    const activeShifts = await this.shiftRepository.count({
      where: { clock_out_time: IsNull() },
    });

    const [tasksPending, tasksInProgress, tasksCompletedToday] = await Promise.all([
      this.taskRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.taskRepository.count({
        where: {
          status: TaskStatus.COMPLETED,
          completed_at: Between(today.start, today.end),
        },
      }),
    ]);

    const activitiesSubmittedToday = await this.activityRepository.count({
      where: { created_at: Between(today.start, today.end) },
    });

    return {
      total_districts: districts.length,
      total_areas: totalAreas,
      total_workers: totalWorkers,
      workers_online: workersOnline,
      workers_offline: workersOffline,
      active_shifts: activeShifts,
      tasks_pending: tasksPending,
      tasks_in_progress: tasksInProgress,
      tasks_completed_today: tasksCompletedToday,
      activities_submitted_today: activitiesSubmittedToday,
      districts: districtSummaries,
      generated_at: new Date(),
    };
  }

  async getDistrictStats(districtId: string): Promise<DistrictStatsDto> {
    this.logger.log(`Generating statistics for district: ${districtId}`);

    const district = await this.districtRepository.findOne({ where: { id: districtId } });
    if (!district) {
      throw new NotFoundException(`District with ID ${districtId} not found`);
    }

    const today = this.getTodayRange();
    const areas = await this.areaRepository.find({
      where: { district_id: districtId },
      relations: ['locationType'],
    });

    const areaSummaries = await Promise.all(areas.map((area) => this.getAreaSummary(area)));

    const totalWorkers = areaSummaries.reduce(
      (sum, s) => sum + s.workers_online + s.workers_offline,
      0,
    );
    const workersOnline = areaSummaries.reduce((sum, s) => sum + s.workers_online, 0);
    const workersOffline = areaSummaries.reduce((sum, s) => sum + s.workers_offline, 0);
    const alerts = areaSummaries
      .filter((s) => !s.is_fully_staffed)
      .map((s, idx) => `${areas[idx].name} - needs ${Math.abs(s.staffing_delta)} more workers`);

    const shiftDefinitions = await this.shiftDefinitionRepository.find({
      where: { is_active: true },
    });
    const currentTime = new Date();
    const shiftSummaries: ShiftSummaryDto[] = shiftDefinitions.map((sd) => ({
      id: sd.id,
      name: sd.name,
      start_time: sd.start_time,
      end_time: sd.end_time,
      is_current: this.isShiftActive(sd, currentTime),
      workers_required: 0,
      workers_on_shift: 0,
    }));

    const locationIds = areas.map((a) => a.id);
    const [tasksPending, tasksInProgress, tasksCompletedToday] = await Promise.all([
      this.countTasksByAreaIds(locationIds, TaskStatus.PENDING),
      this.countTasksByAreaIds(locationIds, TaskStatus.IN_PROGRESS),
      this.countTasksCompletedTodayByAreaIds(locationIds, today),
    ]);

    const activitiesSubmittedToday = await this.countActivitiesByAreaIds(locationIds, today);
    const activeShifts = await this.countActiveShiftsByAreaIds(locationIds);

    return {
      id: district.id,
      name: district.name,
      total_areas: areas.length,
      total_workers: totalWorkers,
      workers_online: workersOnline,
      workers_offline: workersOffline,
      active_shifts: activeShifts,
      tasks_pending: tasksPending,
      tasks_in_progress: tasksInProgress,
      tasks_completed_today: tasksCompletedToday,
      activities_submitted_today: activitiesSubmittedToday,
      areas: areaSummaries,
      shifts: shiftSummaries,
      alerts,
      generated_at: new Date(),
    };
  }

  async getAreaStats(locationId: string): Promise<AreaStatsDto> {
    this.logger.log(`Generating statistics for area: ${locationId}`);

    const area = await this.areaRepository.findOne({
      where: { id: locationId },
      relations: ['locationType'],
    });
    if (!area) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    let rayonName = 'Unassigned';
    if (area.district_id) {
      const district = await this.districtRepository.findOne({ where: { id: area.district_id } });
      rayonName = district?.name || 'Unassigned';
    }

    const today = this.getTodayRange();
    const workers = await this.getAreaWorkers(locationId);

    // This pair is a DISPLAY breakdown, so it must partition: online = reachable
    // now, offline = clocked in but unreachable. Note this is a NARROWER "online"
    // than staffing uses — `countableOnlineByGroup` counts offline workers too,
    // because a park is no less staffed when a phone loses signal. Same word, two
    // jobs, deliberately: one answers "can I reach them", the other "did they turn up".
    const workersOnline = workers.filter((w) => w.status === TrackingStatus.ACTIVE).length;
    const workersOffline = workers.filter((w) => w.status === TrackingStatus.OFFLINE).length;

    const staffRequirements = await this.getAreaStaffRequirements(locationId);
    const isFullyStaffed = staffRequirements.every((r) => r.is_met);

    const tasks = await this.taskRepository.find({
      where: { location_id: locationId },
      relations: ['assignee'],
      order: { priority: 'DESC', deadline: 'ASC' },
    });

    const activeTasks: TaskSummaryDto[] = tasks
      .filter((t) =>
        [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS].includes(t.status),
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigned_to: t.assigned_to,
        assignee_name: t.assignee?.full_name || null,
        deadline: t.deadline,
      }));

    const tasksPending = tasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const tasksInProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    const tasksCompletedToday = tasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED &&
        t.completed_at &&
        t.completed_at >= today.start &&
        t.completed_at <= today.end,
    ).length;

    const activitiesSubmittedToday = await this.activityRepository.count({
      where: {
        location_id: locationId,
        created_at: Between(today.start, today.end),
      },
    });

    const alerts: string[] = [];
    for (const req of staffRequirements) {
      if (!req.is_met) {
        alerts.push(`Understaffed: need ${Math.abs(req.delta)} more ${req.role}`);
      }
    }

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    return {
      id: area.id,
      name: area.name,
      area_type: area.locationType?.name || 'Unknown',
      // 'ACTIVE', not 'active': the column stores upper-case and every consumer
      // compares against it (web: `category === 'ACTIVE'`), so the lower-case
      // fallback emitted a value nothing could match — a lokasi with no type read
      // as neither ACTIVE nor PASSIVE. Harmless while the field is decorative;
      // a trap the moment anything branches on it.
      area_type_category: area.locationType?.category || 'ACTIVE',
      district_id: area.district_id || '',
      district_name: rayonName,
      latitude: parseFloat(area.gps_lat?.toString() || '0'),
      longitude: parseFloat(area.gps_lng?.toString() || '0'),
      coverage_area: area.coverage_area ? parseFloat(area.coverage_area.toString()) : null,
      total_users_assigned: workers.length,
      users_online: workersOnline,
      users_offline: workersOffline,
      is_fully_staffed: isFullyStaffed,
      staff_requirements: staffRequirements,
      users: workers,
      tasks_total: tasks.length,
      tasks_pending: tasksPending,
      tasks_in_progress: tasksInProgress,
      tasks_completed_today: tasksCompletedToday,
      active_tasks: activeTasks,
      activities_submitted_today: activitiesSubmittedToday,
      alerts,
      current_day_type: currentDayType,
      current_day_type_label: this.dayTypeService.getDayTypeLabel(currentDayType),
      generated_at: new Date(),
    };
  }

  /**
   * Lightweight aggregate for the monitoring map's "Ringkasan" mode.
   * `scope=city` → one node per district; `scope=district` → one node per area in that district;
   * `scope=region` → one node per region (kawasan) in that district.
   * Returns only centers + grouped counts (never worker coordinates), built with a
   * fixed set of grouped queries (no per-node fan-out).
   */
  async getAggregate(
    scope: 'city' | 'district' | 'region',
    districtId?: string,
  ): Promise<AggregateResponseDto> {
    const key = `aggregate:${scope}:${districtId ?? ''}`;
    if (typeof this.cacheService?.getOrCompute === 'function') {
      return this.cacheService.getOrCompute(key, () => this.computeAggregate(scope, districtId));
    }
    return this.computeAggregate(scope, districtId);
  }

  private async computeAggregate(
    scope: 'city' | 'district' | 'region',
    districtId?: string,
  ): Promise<AggregateResponseDto> {
    const currentShift = await this.getCurrentShiftDefinition();
    const currentDayType = await this.dayTypeService.getCurrentDayType();
    const today = TimezoneUtil.jakartaDateString();
    // Split not-clocked-in scheduled workers into belum_hadir (still within the
    // current shift's opening grace) vs tidak_hadir (past grace = no-show). One
    // boolean for the whole response — the aggregate is current-shift scoped.
    const beforeGrace = await this.isBeforeShiftGrace(currentShift);
    // Ad-hoc (off-schedule) workers: clocked in but not on the current shift's
    // roster. Surfaced as the "Luar jadwal" pill at every scope so they aren't
    // invisible above area scope (they're excluded from the scheduled presence).
    const scheduledIds = await this.scheduledUserIdsForCurrentShift(currentShift?.id);
    const offScheduleCount = (clockedIn: Set<string>): number => {
      let n = 0;
      for (const id of clockedIn) if (!scheduledIds.has(id)) n++;
      return n;
    };

    if (scope === 'district') {
      if (!districtId) throw new NotFoundException('district id is required for district scope');
      const clockedInSet = await this.clockedInUserSet({ districtId });
      const nodes = await this.buildLocationNodes(
        districtId,
        currentShift?.id,
        currentDayType,
        today,
        clockedInSet,
        beforeGrace,
      );
      return {
        scope,
        scope_id: districtId,
        nodes,
        totals: this.sumStatusCounts(nodes),
        // Scope-wide (not Σ nodes): a district's rostered workers assigned to
        // several areas must not be double-counted.
        roster_totals: await this.rosterTotalsForScope(
          'district',
          districtId,
          today,
          currentShift?.id,
          clockedInSet,
          beforeGrace,
        ),
        presence_totals: this.sumPresence(nodes),
        off_schedule_count: offScheduleCount(clockedInSet),
        generated_at: new Date(),
      };
    }

    if (scope === 'region') {
      if (!districtId) throw new NotFoundException('district id is required for region scope');
      const clockedInSet = await this.clockedInUserSet({ districtId });
      const nodes = await this.buildRegionNodes(
        districtId,
        currentShift?.id,
        currentDayType,
        today,
        clockedInSet,
        beforeGrace,
      );
      return {
        scope,
        scope_id: districtId,
        nodes,
        totals: this.sumStatusCounts(nodes),
        roster_totals: await this.rosterTotalsForScope(
          'district',
          districtId,
          today,
          currentShift?.id,
          clockedInSet,
          beforeGrace,
        ),
        presence_totals: this.sumPresence(nodes),
        off_schedule_count: offScheduleCount(clockedInSet),
        generated_at: new Date(),
      };
    }

    const clockedInSet = await this.clockedInUserSet({});
    const nodes = await this.buildDistrictNodes(
      currentShift?.id,
      currentDayType,
      today,
      clockedInSet,
      beforeGrace,
    );
    return {
      scope,
      scope_id: null,
      nodes,
      totals: this.sumStatusCounts(nodes),
      // Scope-wide so the Surabaya summary matches the snapshot's roster count,
      // including rostered workers not assigned to any district (Σ nodes would miss).
      roster_totals: await this.rosterTotalsForScope(
        'city',
        undefined,
        today,
        currentShift?.id,
        clockedInSet,
        beforeGrace,
      ),
      presence_totals: this.sumPresence(nodes),
      off_schedule_count: offScheduleCount(clockedInSet),
      generated_at: new Date(),
    };
  }

  /** City scope: one aggregate node per district, grouped by `area.district_id`. */
  private async buildDistrictNodes(
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    today: string,
    clockedInSet: Set<string>,
    beforeGrace: boolean,
  ): Promise<AggregateNodeDto[]> {
    const districts = await this.districtRepository.find();

    const areas = await this.areaRepository.find({
      where: { is_active: true },
      select: ['id', 'district_id'],
    });
    const areaCountByDistrict = new Map<string, number>();
    for (const a of areas) {
      if (a.district_id)
        areaCountByDistrict.set(a.district_id, (areaCountByDistrict.get(a.district_id) ?? 0) + 1);
    }

    const [statusRows, roleRows, requiredMap, scheduledByDistrict, countableOnlineByDistrict] =
      await Promise.all([
        this.trackingRepository
          .createQueryBuilder('uts')
          .innerJoin('uts.area', 'area')
          .select('area.district_id', 'group_id')
          .addSelect('uts.status', 'status')
          .addSelect('uts.is_within_area', 'is_within_area')
          .addSelect('COUNT(*)', 'count')
          .where('uts.shift_id IS NOT NULL')
          .groupBy('area.district_id')
          .addGroupBy('uts.status')
          .addGroupBy('uts.is_within_area')
          .getRawMany(),
        this.trackingRepository
          .createQueryBuilder('uts')
          .innerJoin('uts.area', 'area')
          .innerJoin('uts.user', 'user')
          .select('area.district_id', 'group_id')
          .addSelect('user.role', 'role')
          .addSelect('COUNT(*)', 'count')
          .where('uts.shift_id IS NOT NULL')
          .groupBy('area.district_id')
          .addGroupBy('user.role')
          .getRawMany(),
        this.requiredCountByGroup('district', shiftDefinitionId, dayType),
        this.scheduledUserSetsByGroup('district', today, shiftDefinitionId, {}),
        this.countableOnlineByGroup('district'),
      ]);

    const statusByGroup = this.indexStatusRows(statusRows);
    const roleByGroup = this.indexRoleRows(roleRows);
    const scheduledIds = this.flattenUserSets(scheduledByDistrict);
    const presenceByDistrict = await this.presenceByGroup('district', scheduledIds, {});

    return districts.map((district) =>
      this.assembleNode({
        id: district.id,
        name: district.name,
        type: 'district',
        center_lat: this.toNum(district.center_lat),
        center_lng: this.toNum(district.center_lng),
        marker_icon: (district as any).marker_icon ?? null,
        fill_color: (district as any).fill_color ?? null,
        fill_opacity: (district as any).fill_opacity ?? null,
        counts_by_status: statusByGroup.get(district.id),
        counts_by_role: roleByGroup.get(district.id),
        required: requiredMap.get(district.id) ?? 0,
        countable_online: this.countScheduledOnline(
          countableOnlineByDistrict.get(district.id),
          scheduledByDistrict.get(district.id),
        ),
        roster: this.rosterCountsFor(
          scheduledByDistrict.get(district.id),
          clockedInSet,
          beforeGrace,
        ),
        presence: presenceByDistrict.get(district.id) ?? this.emptyPresence(),
        area_count: areaCountByDistrict.get(district.id) ?? 0,
      }),
    );
  }

  /** District scope: one aggregate node per location in the district, grouped by `uts.location_id`. */
  private async buildLocationNodes(
    districtId: string,
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    today: string,
    clockedInSet: Set<string>,
    beforeGrace: boolean,
  ): Promise<AggregateNodeDto[]> {
    const areas = await this.areaRepository.find({
      where: { district_id: districtId, is_active: true },
    });

    // A district can legitimately have zero active areas — skip the grouped
    // queries entirely (an empty `IN ()` on the uuid column would otherwise
    // throw) and return no nodes.
    if (areas.length === 0) return [];

    const locationIds = areas.map((a) => a.id);
    const [
      statusRows,
      roleRows,
      requiredMap,
      scheduledByLocation,
      countableOnlineByLocation,
      scheduledByDistrict,
    ] = await Promise.all([
      this.trackingRepository
        .createQueryBuilder('uts')
        .select('uts.location_id', 'group_id')
        .addSelect('uts.status', 'status')
        .addSelect('uts.is_within_area', 'is_within_area')
        .addSelect('COUNT(*)', 'count')
        .where('uts.shift_id IS NOT NULL')
        .andWhere('(uts.district_id = :districtId OR uts.location_id IN (:...locationIds))', {
          districtId,
          locationIds,
        })
        .groupBy('uts.location_id')
        .addGroupBy('uts.status')
        .addGroupBy('uts.is_within_area')
        .getRawMany(),
      this.trackingRepository
        .createQueryBuilder('uts')
        .innerJoin('uts.user', 'user')
        .select('uts.location_id', 'group_id')
        .addSelect('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('uts.shift_id IS NOT NULL')
        .andWhere('uts.location_id IN (:...locationIds)', {
          locationIds,
        })
        .groupBy('uts.location_id')
        .addGroupBy('user.role')
        .getRawMany(),
      this.requiredCountByGroup('location', shiftDefinitionId, dayType, locationIds),
      this.scheduledUserSetsByGroup('location', today, shiftDefinitionId, { locationIds }),
      this.countableOnlineByGroup('location', locationIds),
      this.scheduledUserSetsByGroup('district', today, shiftDefinitionId, {}),
    ]);

    const statusByGroup = this.indexStatusRows(statusRows);
    const roleByGroup = this.indexRoleRows(roleRows);
    // Presence (live aktif/tidak-aktif) is grouped by the worker's LIVE location
    // (`uts.location_id`), so a worker rostered district-wide (no schedule_location)
    // — or filed under another district — but physically standing in a lokasi here is
    // counted there, matching the district node instead of vanishing at lokasi scope.
    // Uses the SAME scheduled set the district node does (all scheduled-today users,
    // flattened), gated to this district's lokasi by `locationIds` inside the query.
    // The per-location ROSTER (`scheduledByLocation`, driving belum/tidak-hadir) stays
    // location-based.
    const scheduledIds = Array.from(
      new Set([
        ...this.flattenUserSets(scheduledByLocation),
        ...this.flattenUserSets(scheduledByDistrict),
      ]),
    );
    const presenceByLocation = await this.presenceByGroup('location', scheduledIds, {
      locationIds,
    });

    return areas.map((area) =>
      this.assembleNode({
        id: area.id,
        name: area.name,
        type: 'location',
        center_lat: this.toNum(area.gps_lat),
        marker_icon: (area as any).marker_icon ?? null,
        fill_color: (area as any).fill_color ?? null,
        fill_opacity: (area as any).fill_opacity ?? null,
        center_lng: this.toNum(area.gps_lng),
        counts_by_status: statusByGroup.get(area.id),
        counts_by_role: roleByGroup.get(area.id),
        required: requiredMap.get(area.id) ?? 0,
        countable_online: this.countScheduledOnline(
          countableOnlineByLocation.get(area.id),
          scheduledByLocation.get(area.id),
        ),
        roster: this.rosterCountsFor(scheduledByLocation.get(area.id), clockedInSet, beforeGrace),
        presence: presenceByLocation.get(area.id) ?? this.emptyPresence(),
        district_id: districtId,
        region_id: area.region_id ?? null,
      }),
    );
  }

  /** District scope: one aggregate node per region (kawasan) in the district, grouped by `area.region_id`. */
  private async buildRegionNodes(
    districtId: string,
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    today: string,
    clockedInSet: Set<string>,
    beforeGrace: boolean,
  ): Promise<AggregateNodeDto[]> {
    const regions = await this.regionRepository.find({
      where: { district_id: districtId, is_active: true },
    });

    // A district can legitimately have zero active regions.
    if (regions.length === 0) return [];

    const regionIds = regions.map((r) => r.id);
    const [statusRows, roleRows, requiredMap, scheduledByRegion, countableOnlineByRegion] =
      await Promise.all([
        this.trackingRepository
          .createQueryBuilder('uts')
          .innerJoin('uts.area', 'area')
          .select('area.region_id', 'group_id')
          .addSelect('uts.status', 'status')
          .addSelect('uts.is_within_area', 'is_within_area')
          .addSelect('COUNT(*)', 'count')
          .where('uts.shift_id IS NOT NULL')
          .andWhere('area.region_id IS NOT NULL')
          .groupBy('area.region_id')
          .addGroupBy('uts.status')
          .addGroupBy('uts.is_within_area')
          .getRawMany(),
        this.trackingRepository
          .createQueryBuilder('uts')
          .innerJoin('uts.area', 'area')
          .innerJoin('uts.user', 'user')
          .select('area.region_id', 'group_id')
          .addSelect('user.role', 'role')
          .addSelect('COUNT(*)', 'count')
          .where('uts.shift_id IS NOT NULL')
          .andWhere('area.region_id IS NOT NULL')
          .groupBy('area.region_id')
          .addGroupBy('user.role')
          .getRawMany(),
        this.requiredCountByGroup('region', shiftDefinitionId, dayType, regionIds),
        this.scheduledUserSetsByGroup('region', today, shiftDefinitionId, { regionIds }),
        this.countableOnlineByGroup('region', regionIds),
      ]);

    const statusByGroup = this.indexStatusRows(statusRows);
    const roleByGroup = this.indexRoleRows(roleRows);
    const scheduledIds = this.flattenUserSets(scheduledByRegion);
    const presenceByRegion = await this.presenceByGroup('region', scheduledIds, { regionIds });

    // Count locations per region
    const locationsByRegion = await this.areaRepository.find({
      where: { region_id: In(regionIds), is_active: true },
      select: ['id', 'region_id'],
    });
    const locationCountByRegion = new Map<string, number>();
    for (const loc of locationsByRegion) {
      if (loc.region_id) {
        locationCountByRegion.set(
          loc.region_id,
          (locationCountByRegion.get(loc.region_id) ?? 0) + 1,
        );
      }
    }

    return regions.map((region) =>
      this.assembleNode({
        id: region.id,
        name: region.name,
        type: 'region',
        center_lat: this.toNum(region.center_lat),
        marker_icon: (region as any).marker_icon ?? null,
        fill_color: (region as any).fill_color ?? null,
        fill_opacity: (region as any).fill_opacity ?? null,
        center_lng: this.toNum(region.center_lng),
        counts_by_status: statusByGroup.get(region.id),
        counts_by_role: roleByGroup.get(region.id),
        required: requiredMap.get(region.id) ?? 0,
        countable_online: this.countScheduledOnline(
          countableOnlineByRegion.get(region.id),
          scheduledByRegion.get(region.id),
        ),
        roster: this.rosterCountsFor(scheduledByRegion.get(region.id), clockedInSet, beforeGrace),
        presence: presenceByRegion.get(region.id) ?? this.emptyPresence(),
        location_count: locationCountByRegion.get(region.id) ?? 0,
      }),
    );
  }

  /**
   * Sum required_count grouped by district or location for the current shift + day type.
   *
   * Requirements are **polymorphic** (ADR-045/Phase 4): exactly one of
   * `location_id` / `region_id` / `district_id` is set, decided by the district's
   * `staffing_level`. A district's total is therefore the sum across all three
   * tiers — its own district-level rows, its kawasan's rows, and its lokasi's rows.
   *
   * This used to `innerJoin('req.area')` and group by `area.district_id`, which
   * silently dropped every requirement whose `location_id` is NULL. Once Phase 4
   * moved the workbook targets to the **kawasan** tier, that join stopped seeing
   * 147 of 195 rows: monitoring summed **245** of the city's **1033** required
   * and reported `required: 0` for **8 of 9 districts**, so their bubbles could
   * never read understaffed.
   *
   * `location` grouping stays location-keyed on purpose: a lokasi under a
   * kawasan-scoped district genuinely has no target of its own (the kawasan owns
   * it), exactly as the day board renders it. The kawasan's own bubble is the
   * region tier (Phase 5.5).
   */
  private async requiredCountByGroup(
    groupBy: 'district' | 'location' | 'region',
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    groupIds?: string[],
  ): Promise<Map<string, number>> {
    if (!shiftDefinitionId) return new Map();

    if (groupBy === 'location') {
      if (!groupIds || groupIds.length === 0) return new Map();
      const rows = await this.staffRequirementRepository
        .createQueryBuilder('req')
        .select('req.location_id', 'group_id')
        .addSelect('SUM(req.required_count)', 'total')
        .where('req.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
        .andWhere('req.day_type = :dayType', { dayType })
        .andWhere('req.location_id IN (:...groupIds)', { groupIds })
        .groupBy('req.location_id')
        .getRawMany();
      return this.toCountMap(rows);
    }

    if (groupBy === 'region') {
      if (!groupIds || groupIds.length === 0) return new Map();
      const rows = await this.staffRequirementRepository
        .createQueryBuilder('req')
        .select('req.region_id', 'group_id')
        .addSelect('SUM(req.required_count)', 'total')
        .where('req.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
        .andWhere('req.day_type = :dayType', { dayType })
        .andWhere('req.region_id IN (:...groupIds)', { groupIds })
        .groupBy('req.region_id')
        .getRawMany();
      return this.toCountMap(rows);
    }

    // District total = its lokasi's + its kawasan's + its own rows. LEFT JOINs so a
    // row on any single tier survives; COALESCE picks whichever tier resolved.
    const rows = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .leftJoin('locations', 'loc', 'loc.id = req.location_id')
      .leftJoin('regions', 'reg', 'reg.id = req.region_id')
      .select('COALESCE(loc.district_id, reg.district_id, req.district_id)', 'group_id')
      .addSelect('SUM(req.required_count)', 'total')
      .where('req.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
      .andWhere('req.day_type = :dayType', { dayType })
      .andWhere('COALESCE(loc.district_id, reg.district_id, req.district_id) IS NOT NULL')
      .groupBy('COALESCE(loc.district_id, reg.district_id, req.district_id)')
      .getRawMany();
    return this.toCountMap(rows);
  }

  /**
   * Online **satgas+linmas** user ids per group — the only workforce staffing is
   * measured on (ADR-046). Returns SETS (not counts) so the caller can intersect
   * with the scheduled set: staffing counts only workers who are **scheduled for
   * this subject** (ADR-050 counting / Q12). A satgas who clocks in ad-hoc, with
   * no occurrence here today, is on the map but must not fill the requirement.
   *
   * Kept separate from `counts_by_status` on purpose: that stays all-roles
   * because it is what the bubble displays; this narrows only the understaffing
   * comparison. "Online" is simply clocked in (ACTIVE or OFFLINE) — `shift_id IS
   * NOT NULL` is the test; OFFLINE still counts, since a park is no less staffed
   * because a phone lost GPS. ABSENT cannot appear (it requires no shift).
   */
  private async countableOnlineByGroup(
    groupBy: 'district' | 'location' | 'region',
    groupIds?: string[],
  ): Promise<Map<string, Set<string>>> {
    const groupCol =
      groupBy === 'district'
        ? 'area.district_id'
        : groupBy === 'region'
          ? 'area.region_id'
          : 'uts.location_id';
    const qb = this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.area', 'area')
      .innerJoin('uts.user', 'user')
      .select(groupCol, 'group_id')
      .addSelect('uts.user_id', 'user_id')
      .where('uts.shift_id IS NOT NULL')
      .andWhere('user.role IN (:...countedRoles)', { countedRoles: STAFFING_COUNTED_ROLES });

    // location/region are always bounded by a caller-supplied id list; an empty list
    // means "no groups" → no counts (never an unfiltered whole-DB scan).
    if (groupBy === 'location' || groupBy === 'region') {
      if (!groupIds || groupIds.length === 0) return new Map();
      if (groupBy === 'region') {
        qb.andWhere('area.region_id IN (:...groupIds)', { groupIds });
      } else {
        qb.andWhere('uts.location_id IN (:...groupIds)', { groupIds });
      }
    }

    const rows = (await qb.getRawMany()) as Array<{ group_id: string; user_id: string }>;
    const map = new Map<string, Set<string>>();
    for (const r of rows) {
      if (r.group_id) this.addToSetMap(map, r.group_id, r.user_id);
    }
    return map;
  }

  /** How many members of `online` are also in `scheduled` — online ∩ scheduled. */
  private countScheduledOnline(online?: Set<string>, scheduled?: Set<string>): number {
    if (!online || !scheduled || online.size === 0 || scheduled.size === 0) return 0;
    const [small, big] = online.size <= scheduled.size ? [online, scheduled] : [scheduled, online];
    let n = 0;
    for (const id of small) if (big.has(id)) n += 1;
    return n;
  }

  private toCountMap(rows: Array<{ group_id: string; total: string }>): Map<string, number> {
    return new Map(rows.map((r) => [r.group_id, parseInt(r.total, 10) || 0]));
  }

  private indexStatusRows(rows: any[]): Map<string, AggregateStatusCountsDto> {
    const map = new Map<string, AggregateStatusCountsDto>();
    for (const row of rows) {
      if (!row.group_id) continue;
      const counts = map.get(row.group_id) ?? this.emptyStatusCounts();
      const n = parseInt(row.count, 10) || 0;
      const status = row.status as keyof AggregateStatusCountsDto;
      if (status in counts) counts[status] += n;

      // `outside_area` is an AXIS, not a status, so it can no longer be read off
      // the status column — the rows have to be grouped by `is_within_area` too.
      // Without this the field silently stays 0 forever: nothing type-checks it
      // and no test that only asserts the three statuses would ever notice.
      // It OVERLAPS active/offline (a worker is counted under their status AND
      // here), so these four fields must never be summed into a headcount.
      const within = row.is_within_area;
      if ((within === false || within === 'f') && status !== 'absent') {
        counts.outside_area += n;
      }
      map.set(row.group_id, counts);
    }
    return map;
  }

  private indexRoleRows(rows: any[]): Map<string, Record<string, number>> {
    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      if (!row.group_id) continue;
      const roles = map.get(row.group_id) ?? {};
      roles[row.role] = (roles[row.role] ?? 0) + (parseInt(row.count, 10) || 0);
      map.set(row.group_id, roles);
    }
    return map;
  }

  private assembleNode(input: {
    id: string;
    name: string;
    type: 'district' | 'location' | 'region';
    center_lat: number | null;
    center_lng: number | null;
    counts_by_status?: AggregateStatusCountsDto;
    counts_by_role?: Record<string, number>;
    required: number;
    /** Online satgas+linmas only — the figure understaffing is measured on. */
    countable_online?: number;
    roster: AggregateRosterCountsDto;
    presence: PresenceBreakdownDto;
    area_count?: number;
    location_count?: number;
    district_id?: string | null;
    region_id?: string | null;
    marker_icon?: string | null;
    fill_color?: string | null;
    fill_opacity?: number | null;
  }): AggregateNodeDto {
    const counts = input.counts_by_status ?? this.emptyStatusCounts();
    // active + offline = clocked in. `outside_area` is an AXIS overlapping both,
    // not a fourth bucket, so it must never be summed in here — doing so would
    // count anyone outside their boundary twice and inflate the bubble.
    const online = counts.active + counts.offline;
    const worker_count = online + counts.absent;
    // Understaffing weighs ONLY satgas+linmas against the target (ADR-046).
    // `online` counts every monitorable role, so comparing it against a
    // satgas+linmas requirement let a korlap or kepala_rayon standing in a park
    // make it look staffed. `counts_by_status` stays all-roles — that is what the
    // bubble displays; only the comparison narrows.
    const countableOnline = input.countable_online ?? online;
    return {
      id: input.id,
      name: input.name,
      type: input.type,
      center_lat: input.center_lat,
      center_lng: input.center_lng,
      counts_by_status: counts,
      counts_by_role: input.counts_by_role ?? {},
      worker_count,
      online_count: online,
      required: input.required,
      is_understaffed: countableOnline < input.required,
      roster: input.roster,
      presence: input.presence,
      marker_icon: input.marker_icon ?? null,
      fill_color: input.fill_color ?? null,
      fill_opacity: input.fill_opacity ?? null,
      ...(input.type === 'district' ? { area_count: input.area_count ?? 0 } : {}),
      ...(input.type === 'region' ? { location_count: input.location_count ?? 0 } : {}),
      ...(input.type === 'location' ? { district_id: input.district_id ?? null } : {}),
      ...(input.type === 'location' ? { region_id: input.region_id ?? null } : {}),
    };
  }

  private emptyStatusCounts(): AggregateStatusCountsDto {
    return { active: 0, offline: 0, absent: 0, outside_area: 0 };
  }

  private emptyRosterCounts(): AggregateRosterCountsDto {
    return { scheduled: 0, clocked_in: 0, belum_hadir: 0, tidak_hadir: 0 };
  }

  /** Per-entity map styling (ADR-045) — border + fill drawn separately by the map. */
  private styleOf(e: unknown): {
    border_color: string | null;
    fill_color: string | null;
    border_opacity: number | null;
    fill_opacity: number | null;
  } {
    const x = (e ?? {}) as Record<string, unknown>;
    const num = (v: unknown): number | null => (v != null ? Number(v) : null);
    return {
      border_color: (x.border_color as string | undefined) ?? null,
      fill_color: (x.fill_color as string | undefined) ?? null,
      border_opacity: num(x.border_opacity),
      fill_opacity: num(x.fill_opacity),
    };
  }

  /**
   * Is "now" still within the current shift's opening grace window? Not-clocked-in
   * scheduled workers are `belum_hadir` (not yet due) while true, `tidak_hadir`
   * (no-show) once false. Null shift (between shifts) → treat as past grace so any
   * stragglers count as no-shows, not not-yet-due.
   */
  private async isBeforeShiftGrace(shift: ShiftDefinition | null): Promise<boolean> {
    // No shift (between shifts) or a shift without a window → treat as past grace,
    // so any not-clocked-in stragglers count as no-shows, not not-yet-due.
    if (!shift || !shift.start_time || !shift.end_time) return false;
    const thresholds = this.cacheService
      ? await this.cacheService.getThresholds()
      : { late_grace_seconds: 900 };
    const today = TimezoneUtil.jakartaDateString();
    const { start } = resolveShiftWindow(
      today,
      shift.start_time,
      shift.end_time,
      this.shiftCrossesMidnight(shift),
    );
    return Date.now() < start.getTime() + thresholds.late_grace_seconds * 1000;
  }

  /** A shift whose end time is at or before its start crosses midnight. */
  private shiftCrossesMidnight(shift: ShiftDefinition): boolean {
    return shift.end_time <= shift.start_time;
  }

  private emptyPresence(): PresenceBreakdownDto {
    return { aktif: { dalam: 0, luar: 0 }, tidak_aktif: { dalam: 0, luar: 0 } };
  }

  /**
   * Distinct user ids rostered for the CURRENT shift today (planned/present).
   * Used to flag which live workers are "scheduled" (vs ad-hoc / off-schedule).
   */
  async scheduledUserIdsForCurrentShift(
    shiftDefinitionId: string | undefined,
  ): Promise<Set<string>> {
    if (!shiftDefinitionId) return new Set();
    const today = TimezoneUtil.jakartaDateString();
    const rows = await this.scheduleRepository
      .createQueryBuilder('s')
      .select('DISTINCT s.user_id', 'user_id')
      .where('s.schedule_date = :today', { today })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
      .andWhere('s.deleted_at IS NULL')
      .getRawMany();
    return new Set(rows.map((r) => r.user_id));
  }

  /**
   * The SCOPE of each user's current-shift schedule, so the map/list can show a
   * worker only at their matching drill level. A schedule scoped to a lokasi
   * (`schedule_locations`) is `location`; else `region_id` → `region`;
   * else `district_id` → `district`; else `city` (city-wide / unassigned). Most
   * specific wins if a schedule somehow carries several. Returns user_id →
   * `{ scope, scope_id }`.
   */
  async scheduleScopesForCurrentShift(
    shiftDefinitionId: string | undefined,
  ): Promise<
    Map<string, { scope: 'city' | 'district' | 'region' | 'location'; scope_id: string | null }>
  > {
    const map = new Map<
      string,
      { scope: 'city' | 'district' | 'region' | 'location'; scope_id: string | null }
    >();
    if (!shiftDefinitionId) return map;
    const today = TimezoneUtil.jakartaDateString();
    const rows = (await this.scheduleRepository
      .createQueryBuilder('s')
      .leftJoin('schedule_locations', 'sl', 'sl.schedule_id = s.id')
      .select('s.user_id', 'user_id')
      .addSelect('s.district_id', 'district_id')
      .addSelect('s.region_id', 'region_id')
      .addSelect('sl.location_id', 'location_id')
      .addSelect('sl.id', 'sl_id')
      .where('s.schedule_date = :today', { today })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
      .andWhere('s.deleted_at IS NULL')
      .orderBy('sl.id', 'ASC')
      .getRawMany()) as Array<{
      user_id: string;
      district_id: string | null;
      region_id: string | null;
      location_id: string | null;
      sl_id: string | null;
    }>;
    // Rank most-specific → least so a user with several rows keeps the deepest.
    // ORDER BY ensures deterministic output when a user has multiple locations at same depth.
    const rank = { location: 3, region: 2, district: 1, city: 0 } as const;
    for (const r of rows) {
      const resolved: {
        scope: 'city' | 'district' | 'region' | 'location';
        scope_id: string | null;
      } = r.location_id
        ? { scope: 'location', scope_id: r.location_id }
        : r.region_id
          ? { scope: 'region', scope_id: r.region_id }
          : r.district_id
            ? { scope: 'district', scope_id: r.district_id }
            : { scope: 'city', scope_id: null };
      const prev = map.get(r.user_id);
      if (!prev || rank[resolved.scope] > rank[prev.scope]) {
        if (
          prev &&
          rank[resolved.scope] === rank[prev.scope] &&
          prev.scope_id !== resolved.scope_id
        ) {
          this.logger.warn(
            `User ${r.user_id} has multiple locations at same depth (${resolved.scope}). ` +
              `Keeping first by sl.id: ${prev.scope_id}, discarding: ${resolved.scope_id}`,
          );
        }
        map.set(r.user_id, resolved);
      }
    }
    return map;
  }

  /**
   * Activity×location breakdown of HADIR workers (scheduled + clocked-in),
   * grouped by district, region, or location. Restricting to `scheduledUserIds` excludes ad-hoc
   * clock-ins from the counts. active→aktif/dalam, outside_area→aktif/luar,
   * inactive|missing→tidak_aktif (dalam/luar by is_within_area).
   */
  private async presenceByGroup(
    groupBy: 'district' | 'location' | 'region',
    scheduledUserIds: string[],
    opts: { locationIds?: string[]; regionIds?: string[] },
  ): Promise<Map<string, PresenceBreakdownDto>> {
    const map = new Map<string, PresenceBreakdownDto>();
    if (scheduledUserIds.length === 0) return map;

    const qb = this.trackingRepository.createQueryBuilder('uts');
    if (groupBy === 'district') {
      qb.innerJoin('uts.area', 'area').select('area.district_id', 'group_id');
    } else if (groupBy === 'region') {
      qb.innerJoin('uts.area', 'area').select('area.region_id', 'group_id');
    } else {
      qb.select('uts.location_id', 'group_id');
    }
    qb.addSelect('uts.status', 'status')
      .addSelect('uts.is_within_area', 'within')
      .addSelect('COUNT(*)', 'count')
      .where('uts.shift_id IS NOT NULL')
      .andWhere('uts.user_id IN (:...ids)', { ids: scheduledUserIds });
    if (groupBy === 'location' && opts.locationIds && opts.locationIds.length > 0) {
      qb.andWhere('uts.location_id IN (:...locationIds)', { locationIds: opts.locationIds });
    }
    if (groupBy === 'region' && opts.regionIds && opts.regionIds.length > 0) {
      qb.andWhere('area.region_id IN (:...regionIds)', { regionIds: opts.regionIds });
    }
    qb.groupBy('group_id').addGroupBy('uts.status').addGroupBy('uts.is_within_area');

    const rows = await qb.getRawMany();
    for (const r of rows) {
      if (!r.group_id) continue;
      const bucket = map.get(r.group_id) ?? this.emptyPresence();
      const n = parseInt(r.count, 10) || 0;
      const within = r.within === true || r.within === 'true' || r.within === 't';
      // This breakdown was already status × inside/outside; the collapse just
      // makes it uniform. `within` now decides dalam/luar for BOTH rows, where
      // before `aktif.luar` came from the outside_area status and only the
      // inactive/missing row consulted the flag.
      switch (r.status as TrackingStatus) {
        case TrackingStatus.ACTIVE:
          if (within) bucket.aktif.dalam += n;
          else bucket.aktif.luar += n;
          break;
        case TrackingStatus.OFFLINE:
          if (within) bucket.tidak_aktif.dalam += n;
          else bucket.tidak_aktif.luar += n;
          break;
        default:
          break; // ABSENT = not clocked in → no place to attribute them to
      }
      map.set(r.group_id, bucket);
    }
    return map;
  }

  private sumPresence(nodes: AggregateNodeDto[]): PresenceBreakdownDto {
    return nodes.reduce((acc, n) => {
      acc.aktif.dalam += n.presence.aktif.dalam;
      acc.aktif.luar += n.presence.aktif.luar;
      acc.tidak_aktif.dalam += n.presence.tidak_aktif.dalam;
      acc.tidak_aktif.luar += n.presence.tidak_aktif.luar;
      return acc;
    }, this.emptyPresence());
  }

  /**
   * Distinct rostered (planned/present) user ids for today, grouped by district,
   * region, or location. Location grouping goes through the schedule_areas join
   * (a worker can be assigned to several areas in a day).
   */
  private async scheduledUserSetsByGroup(
    groupBy: 'district' | 'location' | 'region',
    today: string,
    shiftDefinitionId: string | undefined,
    opts: { locationIds?: string[]; regionIds?: string[] },
  ): Promise<Map<string, Set<string>>> {
    const map = new Map<string, Set<string>>();
    // Kehadiran is scoped to the CURRENT shift: a worker rostered for another
    // shift isn't "expected" now. No active shift → nobody is expected.
    if (!shiftDefinitionId) return map;
    const statuses = [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT];

    if (groupBy === 'district') {
      const rows = await this.scheduleRepository
        .createQueryBuilder('s')
        .select('s.district_id', 'group_id')
        .addSelect('s.user_id', 'user_id')
        .where('s.schedule_date = :today', { today })
        .andWhere('s.status IN (:...statuses)', { statuses })
        .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
        .andWhere('s.district_id IS NOT NULL')
        .andWhere('s.deleted_at IS NULL')
        .getRawMany();
      for (const r of rows) this.addToSetMap(map, r.group_id, r.user_id);
      return map;
    }

    if (groupBy === 'region') {
      const regionIds = opts.regionIds ?? [];
      if (regionIds.length === 0) return map;
      const rows = await this.scheduleRepository
        .createQueryBuilder('s')
        .select('s.region_id', 'group_id')
        .addSelect('s.user_id', 'user_id')
        .where('s.schedule_date = :today', { today })
        .andWhere('s.status IN (:...statuses)', { statuses })
        .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
        .andWhere('s.region_id IN (:...regionIds)', { regionIds })
        .andWhere('s.deleted_at IS NULL')
        .getRawMany();
      for (const r of rows) this.addToSetMap(map, r.group_id, r.user_id);
      return map;
    }

    const locationIds = opts.locationIds ?? [];
    if (locationIds.length === 0) return map;
    const rows = await this.scheduleAreaRepository
      .createQueryBuilder('sa')
      .innerJoin('sa.schedule', 's')
      .select('sa.location_id', 'group_id')
      .addSelect('s.user_id', 'user_id')
      .where('s.schedule_date = :today', { today })
      .andWhere('s.status IN (:...statuses)', { statuses })
      .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
      .andWhere('sa.location_id IN (:...locationIds)', { locationIds })
      .andWhere('s.deleted_at IS NULL')
      .getRawMany();
    for (const r of rows) this.addToSetMap(map, r.group_id, r.user_id);
    return map;
  }

  /** Distinct user ids that have clocked in (active shift), optionally scoped. */
  private async clockedInUserSet(opts: {
    districtId?: string;
    locationIds?: string[];
  }): Promise<Set<string>> {
    const where: FindOptionsWhere<UserTrackingStatus> = { shift_id: Not(IsNull()) };
    if (opts.districtId) where.district_id = opts.districtId;
    else if (opts.locationIds && opts.locationIds.length > 0)
      where.location_id = In(opts.locationIds);
    const rows = await this.trackingRepository.find({
      where,
      select: ['user_id'],
    });
    return new Set(rows.map((r) => r.user_id));
  }

  /** Union of all user ids across a group→userSet map. */
  private flattenUserSets(map: Map<string, Set<string>>): string[] {
    const all = new Set<string>();
    for (const set of map.values()) for (const u of set) all.add(u);
    return [...all];
  }

  private addToSetMap(map: Map<string, Set<string>>, groupId: string, userId: string): void {
    if (!groupId || !userId) return;
    const set = map.get(groupId) ?? new Set<string>();
    set.add(userId);
    map.set(groupId, set);
  }

  /** Build a node's roster trio from its scheduled set and the clocked-in set. */
  /**
   * Roster counts for one node. The aggregate is scoped to the CURRENT shift, so
   * every not-clocked-in worker here shares that shift's window; `beforeGrace`
   * (now < shift start + late grace) decides whether they are still not-yet-due
   * (`belum_hadir`) or already a no-show (`tidak_hadir`). During an active shift
   * past its grace this collapses to all-`tidak_hadir`, which is the fix for
   * no-shows being mislabelled "Belum Hadir".
   */
  private rosterCountsFor(
    scheduled: Set<string> | undefined,
    clockedIn: Set<string>,
    beforeGrace: boolean,
  ): AggregateRosterCountsDto {
    if (!scheduled || scheduled.size === 0) return this.emptyRosterCounts();
    let clocked = 0;
    for (const u of scheduled) if (clockedIn.has(u)) clocked += 1;
    const notClockedIn = Math.max(0, scheduled.size - clocked);
    return {
      scheduled: scheduled.size,
      clocked_in: clocked,
      belum_hadir: beforeGrace ? notClockedIn : 0,
      tidak_hadir: beforeGrace ? 0 : notClockedIn,
    };
  }

  private sumStatusCounts(nodes: AggregateNodeDto[]): AggregateStatusCountsDto {
    return nodes.reduce((acc, n) => {
      acc.active += n.counts_by_status.active;
      acc.offline += n.counts_by_status.offline;
      acc.absent += n.counts_by_status.absent;
      acc.outside_area += n.counts_by_status.outside_area;
      return acc;
    }, this.emptyStatusCounts());
  }

  /**
   * Scope-wide roster trio (distinct users), independent of the per-node
   * breakdown so it matches the snapshot's expected/present/absent — including
   * rostered workers with no district (city) and never double-counting a worker
   * assigned to several areas in a district.
   */
  private async rosterTotalsForScope(
    scope: 'city' | 'district',
    districtId: string | undefined,
    today: string,
    shiftDefinitionId: string | undefined,
    clockedInSet: Set<string>,
    beforeGrace: boolean,
  ): Promise<AggregateRosterCountsDto> {
    if (!shiftDefinitionId) return this.emptyRosterCounts();
    const qb = this.scheduleRepository
      .createQueryBuilder('s')
      .select('DISTINCT s.user_id', 'user_id')
      .where('s.schedule_date = :today', { today })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
      .andWhere('s.deleted_at IS NULL');
    if (scope === 'district') qb.andWhere('s.district_id = :districtId', { districtId });
    const rows = await qb.getRawMany();
    const scheduled = new Set(rows.map((r) => r.user_id));
    return this.rosterCountsFor(scheduled, clockedInSet, beforeGrace);
  }

  private toNum(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = parseFloat(v.toString());
    return Number.isNaN(n) ? null : n;
  }

  // ---- Helper methods ----

  getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async getDistrictSummary(district: District): Promise<DistrictSummaryDto> {
    const areas = await this.areaRepository.find({ where: { district_id: district.id } });
    const locationIds = areas.map((a) => a.id);
    const workerCount = await this.countWorkersByAreaIds(locationIds);
    const workersOnline = await this.countOnlineWorkersByAreaIds(locationIds);
    const workersRequired = await this.countRequiredWorkersByAreaIds(locationIds);

    return {
      id: district.id,
      name: district.name,
      area_count: areas.length,
      worker_count: workerCount,
      workers_online: workersOnline,
      workers_offline: workerCount - workersOnline,
      workers_required: workersRequired,
      is_fully_staffed: workersOnline >= workersRequired,
    };
  }

  async getAreaSummary(area: Location): Promise<AreaSummaryDto> {
    const workersOnline = await this.countOnlineWorkersByAreaIds([area.id]);
    const workersOffline = await this.countOfflineWorkersByAreaIds([area.id]);
    const workersRequired = await this.countRequiredWorkersByAreaIds([area.id]);
    const staffingDelta = workersOnline - workersRequired;

    const tasksPending = await this.taskRepository.count({
      where: { location_id: area.id, status: TaskStatus.PENDING },
    });
    const tasksInProgress = await this.taskRepository.count({
      where: { location_id: area.id, status: TaskStatus.IN_PROGRESS },
    });

    return {
      id: area.id,
      name: area.name,
      // 'ACTIVE', not 'active': the column stores upper-case and every consumer
      // compares against it (web: `category === 'ACTIVE'`), so the lower-case
      // fallback emitted a value nothing could match — a lokasi with no type read
      // as neither ACTIVE nor PASSIVE. Harmless while the field is decorative;
      // a trap the moment anything branches on it.
      area_type_category: area.locationType?.category || 'ACTIVE',
      workers_required: workersRequired,
      workers_online: workersOnline,
      workers_offline: workersOffline,
      is_fully_staffed: staffingDelta >= 0,
      staffing_delta: staffingDelta,
      tasks_pending: tasksPending,
      tasks_in_progress: tasksInProgress,
    };
  }

  async getAreaWorkers(locationId: string): Promise<UserStatusDto[]> {
    const trackingRecords = await this.trackingRepository.find({
      where: { location_id: locationId, shift_id: Not(IsNull()) },
      relations: ['user', 'shift', 'shift_definition'],
    });

    if (trackingRecords.length === 0) {
      return this.getAreaWorkersLegacy(locationId);
    }

    return trackingRecords.map((uts) => ({
      id: uts.user.id,
      full_name: uts.user.full_name,
      role: uts.user.role,
      phone: uts.user.phone_number ?? null,
      status: uts.status,
      last_lat: uts.last_latitude,
      last_lng: uts.last_longitude,
      last_location_update: uts.last_location_at,
      is_within_area: uts.is_within_area,
      current_shift_id: uts.shift_id,
      shift_name: uts.shift_definition?.name ?? null,
      clock_in_time: uts.shift?.clock_in_time || null,
    }));
  }

  private async getAreaWorkersLegacy(locationId: string): Promise<UserStatusDto[]> {
    const activeShifts = await this.shiftRepository.find({
      where: { location_id: locationId, clock_out_time: IsNull() },
      relations: ['user'],
    });

    if (activeShifts.length === 0) return [];

    const shiftIds = activeShifts.map((s) => s.id);
    const latestLocations = await this.locationRepository
      .createQueryBuilder('location')
      .select(['location.shift_id', 'location.gps_lat', 'location.gps_lng', 'location.logged_at'])
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(loc.logged_at)')
          .from(LocationLog, 'loc')
          .where('loc.shift_id = location.shift_id')
          .getQuery();
        return 'location.logged_at = ' + subQuery;
      })
      .andWhere('location.shift_id IN (:...shiftIds)', { shiftIds })
      .getMany();

    const locationMap = new Map(latestLocations.map((loc) => [loc.shift_id, loc]));
    const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;
    const currentTime = Date.now();

    return activeShifts.map((shift) => {
      const latestLocation = locationMap.get(shift.id);
      const isOnline = !!(
        latestLocation && currentTime - latestLocation.logged_at.getTime() < ONLINE_THRESHOLD_MS
      );

      return {
        id: shift.user.id,
        full_name: shift.user.full_name,
        role: shift.user.role,
        phone: shift.user.phone_number ?? null,
        status: isOnline ? TrackingStatus.ACTIVE : TrackingStatus.OFFLINE,
        last_lat: latestLocation ? parseFloat(latestLocation.gps_lat.toString()) : null,
        last_lng: latestLocation ? parseFloat(latestLocation.gps_lng.toString()) : null,
        last_location_update: latestLocation?.logged_at || null,
        is_within_area: true,
        current_shift_id: shift.id,
        shift_name: null,
        clock_in_time: shift.clock_in_time,
      };
    });
  }

  async getAreaStaffRequirements(locationId: string): Promise<StaffRequirementStatusDto[]> {
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return [];

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const requirements = await this.staffRequirementRepository.find({
      where: {
        location_id: locationId,
        shift_definition_id: currentShift.id,
        day_type: currentDayType,
      },
    });

    if (requirements.length === 0) return [];

    const roleStatusCounts = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('user.role', 'role')
      .addSelect('uts.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('uts.location_id = :locationId', { locationId })
      .andWhere('uts.shift_id IS NOT NULL')
      .groupBy('user.role')
      .addGroupBy('uts.status')
      .getRawMany();

    const roleStatusMap = new Map<string, Record<string, number>>();
    for (const row of roleStatusCounts) {
      const existing = roleStatusMap.get(row.role) || {};
      existing[row.status] = parseInt(row.count);
      roleStatusMap.set(row.role, existing);
    }

    return requirements.map((req) => {
      const statuses = roleStatusMap.get(req.role) || {};
      const activeCount = statuses[TrackingStatus.ACTIVE] || 0;
      const offlineCount = statuses[TrackingStatus.OFFLINE] || 0;
      // Staffing counts whoever clocked in — see `countableOnlineByGroup`.
      const currentCount = activeCount + offlineCount;
      const delta = currentCount - req.required_count;
      return {
        id: req.id,
        role: req.role,
        required_count: req.required_count,
        current_count: currentCount,
        delta,
        is_met: delta >= 0,
        active_count: activeCount,
        offline_count: offlineCount,
      };
    });
  }

  isShiftActive(shift: ShiftDefinition, currentTime: Date): boolean {
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const [endHour, endMin] = shift.end_time.split(':').map(Number);
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (shift.crosses_midnight) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  async getCurrentShiftDefinition(): Promise<ShiftDefinition | null> {
    const shifts = await this.shiftDefinitionRepository.find({
      where: { is_active: true },
    });
    const now = new Date();
    return shifts.find((s) => this.isShiftActive(s, now)) || null;
  }

  // Count helpers — all use user_tracking_status for consistency
  async countWorkersByAreaIds(locationIds: string[]): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.location_id IN (:...locationIds)', { locationIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .getCount();
  }

  async countOnlineWorkersByAreaIds(locationIds: string[]): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.location_id IN (:...locationIds)', { locationIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .andWhere('uts.status = :status', { status: TrackingStatus.ACTIVE })
      .getCount();
  }

  async countOfflineWorkersByAreaIds(locationIds: string[]): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.location_id IN (:...locationIds)', { locationIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .andWhere('uts.status = :status', { status: TrackingStatus.OFFLINE })
      .getCount();
  }

  async countRequiredWorkersByAreaIds(locationIds: string[]): Promise<number> {
    if (locationIds.length === 0) return 0;
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return 0;

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const result = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .where('req.location_id IN (:...locationIds)', { locationIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .andWhere('req.day_type = :dayType', { dayType: currentDayType })
      .select('SUM(req.required_count)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0');
  }

  async countTasksByAreaIds(locationIds: string[], status: TaskStatus): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.location_id IN (:...locationIds)', { locationIds })
      .andWhere('task.status = :status', { status })
      .getCount();
  }

  async countTasksCompletedTodayByAreaIds(
    locationIds: string[],
    today: { start: Date; end: Date },
  ): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.location_id IN (:...locationIds)', { locationIds })
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.completed_at BETWEEN :start AND :end', today)
      .getCount();
  }

  async countActivitiesByAreaIds(
    locationIds: string[],
    today: { start: Date; end: Date },
  ): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.location_id IN (:...locationIds)', { locationIds })
      .andWhere('activity.created_at BETWEEN :start AND :end', today)
      .getCount();
  }

  async countActiveShiftsByAreaIds(locationIds: string[]): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.location_id IN (:...locationIds)', { locationIds })
      .andWhere('shift.clock_out_time IS NULL')
      .getCount();
  }

  async getBoundaries(filters?: {
    district_id?: string;
    area_ids?: string[];
    /**
     * `district` → district outlines only (area geometry omitted; lightest payload for
     * the city-level map). `area` (default) → full area geometry for drill-down.
     */
    level?: 'district' | 'area';
  }): Promise<BoundariesResponseDto> {
    const level = filters?.level ?? 'area';
    const districtWhere: Record<string, any> = {};
    if (filters?.district_id) {
      districtWhere.id = filters.district_id;
    }

    const districts = await this.districtRepository.find({ where: districtWhere });

    const districtBoundaries: DistrictBoundaryDto[] = await Promise.all(
      districts.map(async (district) => {
        const districtCenterLat = (district as any).center_lat
          ? parseFloat((district as any).center_lat.toString())
          : null;
        const districtCenterLng = (district as any).center_lng
          ? parseFloat((district as any).center_lng.toString())
          : null;

        // Rayon-level payload: outlines only, no area geometry. Staffing rollups
        // come from /monitoring/aggregate at the city zoom, so this path stays a
        // single cheap count per district.
        if (level === 'district') {
          const area_count = await this.areaRepository.count({
            where: { district_id: district.id, is_active: true },
          });
          return {
            id: district.id,
            name: district.name,
            ...this.styleOf(district),
            boundary_polygon: simplifyGeometry((district as any).boundary_polygon) || null,
            center_lat: districtCenterLat,
            center_lng: districtCenterLng,
            area_count,
            is_understaffed: false,
            understaffed_area_count: 0,
            regions: [],
            areas: [],
          } as DistrictBoundaryDto;
        }

        const areaWhere: Record<string, any> = {
          district_id: district.id,
          is_active: true,
        };
        // Korlap-style area scoping: when caller passes area_ids, only return
        // those areas (still grouped under their district). Empty filter list ⇒ no areas.
        if (filters?.area_ids) {
          if (filters.area_ids.length === 0) {
            return {
              id: district.id,
              name: district.name,
              ...this.styleOf(district),
              boundary_polygon: simplifyGeometry((district as any).boundary_polygon) || null,
              center_lat: districtCenterLat,
              center_lng: districtCenterLng,
              area_count: 0,
              is_understaffed: false,
              understaffed_area_count: 0,
              regions: [],
              areas: [],
            } as DistrictBoundaryDto;
          }
          areaWhere.id = In(filters.area_ids);
        }
        const areas = await this.areaRepository.find({ where: areaWhere });

        // Kawasan (region) outlines within this district — drawn tinted at district zoom.
        const regionEntities =
          (await this.regionRepository.find({ where: { district_id: district.id } })) ?? [];
        const regionBoundaries: RegionBoundaryDto[] = regionEntities.map((rg) => ({
          id: rg.id,
          name: rg.name,
          ...this.styleOf(rg),
          boundary_polygon: simplifyGeometry((rg as any).boundary_polygon) || null,
          center_lat: (rg as any).center_lat ? parseFloat((rg as any).center_lat.toString()) : null,
          center_lng: (rg as any).center_lng ? parseFloat((rg as any).center_lng.toString()) : null,
        }));

        const locationIds = areas.map((a) => a.id);
        const assignedCounts =
          locationIds.length > 0
            ? await this.trackingRepository
                .createQueryBuilder('uts')
                .select('uts.location_id', 'location_id')
                .addSelect('COUNT(*)', 'count')
                .where('uts.location_id IN (:...locationIds)', { locationIds })
                .groupBy('uts.location_id')
                .getRawMany()
            : [];

        const countMap = new Map(
          assignedCounts.map((r: any) => [r.location_id, parseInt(r.count)]),
        );

        const requiredCounts =
          locationIds.length > 0
            ? await this.countRequiredWorkersByAreaIdsMap(locationIds)
            : new Map();

        const staffingByArea =
          locationIds.length > 0 ? await this.getStaffingByArea(locationIds) : new Map();

        const areaBoundaries: AreaBoundaryDto[] = areas.map((area) => {
          const assigned = countMap.get(area.id) || 0;
          const required = requiredCounts.get(area.id) || 0;
          return {
            id: area.id,
            name: area.name,
            boundary_polygon: simplifyGeometry(area.boundary_polygon) || null,
            ...this.styleOf(area),
            center_lat: parseFloat(area.gps_lat?.toString() || '0'),
            center_lng: parseFloat(area.gps_lng?.toString() || '0'),
            district_id: district.id,
            district_name: district.name,
            assigned_count: assigned,
            is_understaffed: assigned < required,
            staffing_summary: staffingByArea.get(area.id) || [],
          };
        });

        const understaffedCount = areaBoundaries.filter((a) => a.is_understaffed).length;

        return {
          id: district.id,
          name: district.name,
          ...this.styleOf(district),
          boundary_polygon: simplifyGeometry((district as any).boundary_polygon) || null,
          center_lat: districtCenterLat,
          center_lng: districtCenterLng,
          area_count: areas.length,
          is_understaffed: understaffedCount > 0,
          understaffed_area_count: understaffedCount,
          regions: regionBoundaries,
          areas: areaBoundaries,
        };
      }),
    );

    // When the caller requested specific area_ids, suppress districts that
    // ended up with no matching areas (otherwise korlap would still see
    // empty district polygons from across the city).
    const finalDistricts =
      filters?.area_ids && level === 'area'
        ? districtBoundaries.filter((r) => r.areas.length > 0)
        : districtBoundaries;

    return {
      districts: finalDistricts,
      generated_at: new Date(),
    };
  }

  private async getStaffingByArea(
    locationIds: string[],
  ): Promise<Map<string, RoleStaffingItemDto[]>> {
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return new Map();

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const requirements = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .select(['req.location_id', 'req.role', 'req.required_count'])
      .where('req.location_id IN (:...locationIds)', { locationIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .andWhere('req.day_type = :dayType', { dayType: currentDayType })
      .getMany();

    const activeCounts = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('uts.location_id', 'location_id')
      .addSelect('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('uts.location_id IN (:...locationIds)', { locationIds })
      .andWhere('uts.status = :status', { status: TrackingStatus.ACTIVE })
      .groupBy('uts.location_id')
      .addGroupBy('user.role')
      .getRawMany();

    const activeMap = new Map<string, Map<string, number>>();
    for (const row of activeCounts) {
      if (!activeMap.has(row.location_id)) activeMap.set(row.location_id, new Map());
      activeMap.get(row.location_id)!.set(row.role, parseInt(row.count));
    }

    const result = new Map<string, RoleStaffingItemDto[]>();
    for (const req of requirements) {
      // Monitoring understaffing is location-level for now; region/district-level
      // requirements (polymorphic) are consumed by the day board + Phase-5 map.
      if (!req.location_id) continue;
      const areaStaffing = result.get(req.location_id) || [];
      areaStaffing.push({
        role: req.role,
        required: req.required_count,
        active: activeMap.get(req.location_id)?.get(req.role) || 0,
      });
      result.set(req.location_id, areaStaffing);
    }

    return result;
  }

  private async countRequiredWorkersByAreaIdsMap(
    locationIds: string[],
  ): Promise<Map<string, number>> {
    if (locationIds.length === 0) return new Map();
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return new Map();

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const rows = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .select('req.location_id', 'location_id')
      .addSelect('SUM(req.required_count)', 'total')
      .where('req.location_id IN (:...locationIds)', { locationIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .andWhere('req.day_type = :dayType', { dayType: currentDayType })
      .groupBy('req.location_id')
      .getRawMany();

    return new Map(rows.map((r: any) => [r.location_id, parseInt(r.total)]));
  }
}
