import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not, In, type FindOptionsWhere } from 'typeorm';
import { Location } from '../../locations/entities/location.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import {
  LocationStaffRequirement,
  DayType,
} from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { CityStatsDto, RayonSummaryDto } from '../dto/city-stats.dto';
import { RayonStatsDto, AreaSummaryDto, ShiftSummaryDto } from '../dto/rayon-stats.dto';
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
import {
  AreaStatsDto,
  UserStatusDto,
  TaskSummaryDto,
  StaffRequirementStatusDto,
} from '../dto/area-stats.dto';
import {
  BoundariesResponseDto,
  RayonBoundaryDto,
  AreaBoundaryDto,
  RoleStaffingItemDto,
} from '../dto/boundaries.dto';
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
    @InjectRepository(Rayon)
    private readonly rayonRepository: Repository<Rayon>,
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
    const rayons = await this.rayonRepository.find();
    const rayonSummaries = await Promise.all(rayons.map((rayon) => this.getRayonSummary(rayon)));

    const totalWorkers = rayonSummaries.reduce((sum, s) => sum + s.worker_count, 0);
    const workersOnline = rayonSummaries.reduce((sum, s) => sum + s.workers_online, 0);
    const workersOffline = rayonSummaries.reduce((sum, s) => sum + s.workers_offline, 0);
    const totalAreas = rayonSummaries.reduce((sum, s) => sum + s.area_count, 0);

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
      total_rayons: rayons.length,
      total_areas: totalAreas,
      total_workers: totalWorkers,
      workers_online: workersOnline,
      workers_offline: workersOffline,
      active_shifts: activeShifts,
      tasks_pending: tasksPending,
      tasks_in_progress: tasksInProgress,
      tasks_completed_today: tasksCompletedToday,
      activities_submitted_today: activitiesSubmittedToday,
      rayons: rayonSummaries,
      generated_at: new Date(),
    };
  }

  async getRayonStats(rayonId: string): Promise<RayonStatsDto> {
    this.logger.log(`Generating statistics for rayon: ${rayonId}`);

    const rayon = await this.rayonRepository.findOne({ where: { id: rayonId } });
    if (!rayon) {
      throw new NotFoundException(`Rayon with ID ${rayonId} not found`);
    }

    const today = this.getTodayRange();
    const areas = await this.areaRepository.find({
      where: { rayon_id: rayonId },
      relations: ['areaType'],
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
      id: rayon.id,
      name: rayon.name,
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
      relations: ['areaType'],
    });
    if (!area) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    let rayonName = 'Unassigned';
    if (area.rayon_id) {
      const rayon = await this.rayonRepository.findOne({ where: { id: area.rayon_id } });
      rayonName = rayon?.name || 'Unassigned';
    }

    const today = this.getTodayRange();
    const workers = await this.getAreaWorkers(locationId);

    const workersOnline = workers.filter(
      (w) => w.status === TrackingStatus.ACTIVE || w.status === TrackingStatus.OUTSIDE_AREA,
    ).length;
    const workersOffline = workers.filter(
      (w) => w.status === TrackingStatus.OFFLINE || w.status === TrackingStatus.MISSING,
    ).length;

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
      area_type: area.areaType?.name || 'Unknown',
      area_type_category: area.areaType?.category || 'active',
      rayon_id: area.rayon_id || '',
      rayon_name: rayonName,
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
   * `scope=city` → one node per rayon; `scope=rayon` → one node per area in that rayon.
   * Returns only centers + grouped counts (never worker coordinates), built with a
   * fixed set of grouped queries (no per-node fan-out).
   */
  async getAggregate(scope: 'city' | 'rayon', rayonId?: string): Promise<AggregateResponseDto> {
    const key = `aggregate:${scope}:${rayonId ?? ''}`;
    if (typeof this.cacheService?.getOrCompute === 'function') {
      return this.cacheService.getOrCompute(key, () => this.computeAggregate(scope, rayonId));
    }
    return this.computeAggregate(scope, rayonId);
  }

  private async computeAggregate(
    scope: 'city' | 'rayon',
    rayonId?: string,
  ): Promise<AggregateResponseDto> {
    const currentShift = await this.getCurrentShiftDefinition();
    const currentDayType = await this.dayTypeService.getCurrentDayType();
    const today = TimezoneUtil.jakartaDateString();

    if (scope === 'rayon') {
      if (!rayonId) throw new NotFoundException('rayon id is required for rayon scope');
      const clockedInSet = await this.clockedInUserSet({ rayonId });
      const nodes = await this.buildAreaNodes(
        rayonId,
        currentShift?.id,
        currentDayType,
        today,
        clockedInSet,
      );
      return {
        scope,
        scope_id: rayonId,
        nodes,
        totals: this.sumStatusCounts(nodes),
        // Scope-wide (not Σ nodes): a rayon's rostered workers assigned to
        // several areas must not be double-counted.
        roster_totals: await this.rosterTotalsForScope(
          'rayon',
          rayonId,
          today,
          currentShift?.id,
          clockedInSet,
        ),
        presence_totals: this.sumPresence(nodes),
        generated_at: new Date(),
      };
    }

    const clockedInSet = await this.clockedInUserSet({});
    const nodes = await this.buildRayonNodes(currentShift?.id, currentDayType, today, clockedInSet);
    return {
      scope,
      scope_id: null,
      nodes,
      totals: this.sumStatusCounts(nodes),
      // Scope-wide so the Surabaya summary matches the snapshot's roster count,
      // including rostered workers not assigned to any rayon (Σ nodes would miss).
      roster_totals: await this.rosterTotalsForScope(
        'city',
        undefined,
        today,
        currentShift?.id,
        clockedInSet,
      ),
      presence_totals: this.sumPresence(nodes),
      generated_at: new Date(),
    };
  }

  /** City scope: one aggregate node per rayon, grouped by `area.rayon_id`. */
  private async buildRayonNodes(
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    today: string,
    clockedInSet: Set<string>,
  ): Promise<AggregateNodeDto[]> {
    const rayons = await this.rayonRepository.find();

    const areas = await this.areaRepository.find({
      where: { is_active: true },
      select: ['id', 'rayon_id'],
    });
    const areaCountByRayon = new Map<string, number>();
    for (const a of areas) {
      if (a.rayon_id) areaCountByRayon.set(a.rayon_id, (areaCountByRayon.get(a.rayon_id) ?? 0) + 1);
    }

    const [statusRows, roleRows, requiredMap, scheduledByRayon] = await Promise.all([
      this.trackingRepository
        .createQueryBuilder('uts')
        .innerJoin('uts.area', 'area')
        .select('area.rayon_id', 'group_id')
        .addSelect('uts.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('uts.shift_id IS NOT NULL')
        .groupBy('area.rayon_id')
        .addGroupBy('uts.status')
        .getRawMany(),
      this.trackingRepository
        .createQueryBuilder('uts')
        .innerJoin('uts.area', 'area')
        .innerJoin('uts.user', 'user')
        .select('area.rayon_id', 'group_id')
        .addSelect('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('uts.shift_id IS NOT NULL')
        .groupBy('area.rayon_id')
        .addGroupBy('user.role')
        .getRawMany(),
      this.requiredCountByGroup('rayon', shiftDefinitionId, dayType),
      this.scheduledUserSetsByGroup('rayon', today, shiftDefinitionId, {}),
    ]);

    const statusByGroup = this.indexStatusRows(statusRows);
    const roleByGroup = this.indexRoleRows(roleRows);
    const scheduledIds = this.flattenUserSets(scheduledByRayon);
    const presenceByRayon = await this.presenceByGroup('rayon', scheduledIds, {});

    return rayons.map((rayon) =>
      this.assembleNode({
        id: rayon.id,
        name: rayon.name,
        type: 'rayon',
        center_lat: this.toNum(rayon.center_lat),
        center_lng: this.toNum(rayon.center_lng),
        counts_by_status: statusByGroup.get(rayon.id),
        counts_by_role: roleByGroup.get(rayon.id),
        required: requiredMap.get(rayon.id) ?? 0,
        roster: this.rosterCountsFor(scheduledByRayon.get(rayon.id), clockedInSet),
        presence: presenceByRayon.get(rayon.id) ?? this.emptyPresence(),
        area_count: areaCountByRayon.get(rayon.id) ?? 0,
      }),
    );
  }

  /** Rayon scope: one aggregate node per area in the rayon, grouped by `uts.location_id`. */
  private async buildAreaNodes(
    rayonId: string,
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    today: string,
    clockedInSet: Set<string>,
  ): Promise<AggregateNodeDto[]> {
    const areas = await this.areaRepository.find({
      where: { rayon_id: rayonId, is_active: true },
    });

    // A rayon can legitimately have zero active areas — skip the grouped
    // queries entirely (an empty `IN ()` on the uuid column would otherwise
    // throw) and return no nodes.
    if (areas.length === 0) return [];

    const locationIds = areas.map((a) => a.id);
    const [statusRows, roleRows, requiredMap, scheduledByArea] = await Promise.all([
      this.trackingRepository
        .createQueryBuilder('uts')
        .select('uts.location_id', 'group_id')
        .addSelect('uts.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('uts.shift_id IS NOT NULL')
        .andWhere('(uts.rayon_id = :rayonId OR uts.location_id IN (:...locationIds))', {
          rayonId,
          locationIds,
        })
        .groupBy('uts.location_id')
        .addGroupBy('uts.status')
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
      this.requiredCountByGroup('area', shiftDefinitionId, dayType, locationIds),
      this.scheduledUserSetsByGroup('area', today, shiftDefinitionId, { locationIds }),
    ]);

    const statusByGroup = this.indexStatusRows(statusRows);
    const roleByGroup = this.indexRoleRows(roleRows);
    const scheduledIds = this.flattenUserSets(scheduledByArea);
    const presenceByArea = await this.presenceByGroup('area', scheduledIds, { locationIds });

    return areas.map((area) =>
      this.assembleNode({
        id: area.id,
        name: area.name,
        type: 'area',
        center_lat: this.toNum(area.gps_lat),
        center_lng: this.toNum(area.gps_lng),
        counts_by_status: statusByGroup.get(area.id),
        counts_by_role: roleByGroup.get(area.id),
        required: requiredMap.get(area.id) ?? 0,
        roster: this.rosterCountsFor(scheduledByArea.get(area.id), clockedInSet),
        presence: presenceByArea.get(area.id) ?? this.emptyPresence(),
        rayon_id: rayonId,
      }),
    );
  }

  /** Sum required_count grouped by rayon or area for the current shift + day type. */
  private async requiredCountByGroup(
    groupBy: 'rayon' | 'area',
    shiftDefinitionId: string | undefined,
    dayType: DayType,
    locationIds?: string[],
  ): Promise<Map<string, number>> {
    if (!shiftDefinitionId) return new Map();
    const qb = this.staffRequirementRepository
      .createQueryBuilder('req')
      .addSelect('SUM(req.required_count)', 'total')
      .where('req.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
      .andWhere('req.day_type = :dayType', { dayType });

    if (groupBy === 'rayon') {
      qb.innerJoin('req.area', 'area').select('area.rayon_id', 'group_id').groupBy('area.rayon_id');
    } else {
      if (!locationIds || locationIds.length === 0) return new Map();
      qb.select('req.location_id', 'group_id')
        .andWhere('req.location_id IN (:...locationIds)', { locationIds })
        .groupBy('req.location_id');
    }

    const rows = await qb.getRawMany();
    return new Map(rows.map((r: any) => [r.group_id, parseInt(r.total, 10) || 0]));
  }

  private indexStatusRows(rows: any[]): Map<string, AggregateStatusCountsDto> {
    const map = new Map<string, AggregateStatusCountsDto>();
    for (const row of rows) {
      if (!row.group_id) continue;
      const counts = map.get(row.group_id) ?? this.emptyStatusCounts();
      const status = row.status as keyof AggregateStatusCountsDto;
      if (status in counts) counts[status] += parseInt(row.count, 10) || 0;
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
    type: 'rayon' | 'area';
    center_lat: number | null;
    center_lng: number | null;
    counts_by_status?: AggregateStatusCountsDto;
    counts_by_role?: Record<string, number>;
    required: number;
    roster: AggregateRosterCountsDto;
    presence: PresenceBreakdownDto;
    area_count?: number;
    rayon_id?: string | null;
  }): AggregateNodeDto {
    const counts = input.counts_by_status ?? this.emptyStatusCounts();
    const online = counts.active + counts.inactive + counts.outside_area;
    const worker_count = online + counts.missing + counts.offline;
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
      is_understaffed: online < input.required,
      roster: input.roster,
      presence: input.presence,
      ...(input.type === 'rayon' ? { area_count: input.area_count ?? 0 } : {}),
      ...(input.type === 'area' ? { rayon_id: input.rayon_id ?? null } : {}),
    };
  }

  private emptyStatusCounts(): AggregateStatusCountsDto {
    return { active: 0, inactive: 0, outside_area: 0, missing: 0, offline: 0 };
  }

  private emptyRosterCounts(): AggregateRosterCountsDto {
    return { scheduled: 0, clocked_in: 0, not_clocked_in: 0 };
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
   * Activity×location breakdown of HADIR workers (scheduled + clocked-in),
   * grouped by rayon or area. Restricting to `scheduledUserIds` excludes ad-hoc
   * clock-ins from the counts. active→aktif/dalam, outside_area→aktif/luar,
   * inactive|missing→tidak_aktif (dalam/luar by is_within_area).
   */
  private async presenceByGroup(
    groupBy: 'rayon' | 'area',
    scheduledUserIds: string[],
    opts: { locationIds?: string[] },
  ): Promise<Map<string, PresenceBreakdownDto>> {
    const map = new Map<string, PresenceBreakdownDto>();
    if (scheduledUserIds.length === 0) return map;

    const qb = this.trackingRepository.createQueryBuilder('uts');
    if (groupBy === 'rayon') {
      qb.innerJoin('uts.area', 'area').select('area.rayon_id', 'group_id');
    } else {
      qb.select('uts.location_id', 'group_id');
    }
    qb.addSelect('uts.status', 'status')
      .addSelect('uts.is_within_area', 'within')
      .addSelect('COUNT(*)', 'count')
      .where('uts.shift_id IS NOT NULL')
      .andWhere('uts.user_id IN (:...ids)', { ids: scheduledUserIds });
    if (groupBy === 'area' && opts.locationIds && opts.locationIds.length > 0) {
      qb.andWhere('uts.location_id IN (:...locationIds)', { locationIds: opts.locationIds });
    }
    qb.groupBy('group_id').addGroupBy('uts.status').addGroupBy('uts.is_within_area');

    const rows = await qb.getRawMany();
    for (const r of rows) {
      if (!r.group_id) continue;
      const bucket = map.get(r.group_id) ?? this.emptyPresence();
      const n = parseInt(r.count, 10) || 0;
      const within = r.within === true || r.within === 'true' || r.within === 't';
      switch (r.status as TrackingStatus) {
        case TrackingStatus.ACTIVE:
          bucket.aktif.dalam += n;
          break;
        case TrackingStatus.OUTSIDE_AREA:
          bucket.aktif.luar += n;
          break;
        case TrackingStatus.INACTIVE:
        case TrackingStatus.MISSING:
          if (within) bucket.tidak_aktif.dalam += n;
          else bucket.tidak_aktif.luar += n;
          break;
        default:
          break; // OFFLINE can't have an active shift → skip
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
   * Distinct rostered (planned/present) user ids for today, grouped by rayon or
   * area. Location grouping goes through the schedule_areas join (a worker can be
   * assigned to several areas in a day).
   */
  private async scheduledUserSetsByGroup(
    groupBy: 'rayon' | 'area',
    today: string,
    shiftDefinitionId: string | undefined,
    opts: { locationIds?: string[] },
  ): Promise<Map<string, Set<string>>> {
    const map = new Map<string, Set<string>>();
    // Kehadiran is scoped to the CURRENT shift: a worker rostered for another
    // shift isn't "expected" now. No active shift → nobody is expected.
    if (!shiftDefinitionId) return map;
    const statuses = [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT];

    if (groupBy === 'rayon') {
      const rows = await this.scheduleRepository
        .createQueryBuilder('s')
        .select('s.rayon_id', 'group_id')
        .addSelect('s.user_id', 'user_id')
        .where('s.schedule_date = :today', { today })
        .andWhere('s.status IN (:...statuses)', { statuses })
        .andWhere('s.shift_definition_id = :shiftId', { shiftId: shiftDefinitionId })
        .andWhere('s.rayon_id IS NOT NULL')
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
    rayonId?: string;
    locationIds?: string[];
  }): Promise<Set<string>> {
    const where: FindOptionsWhere<UserTrackingStatus> = { shift_id: Not(IsNull()) };
    if (opts.rayonId) where.rayon_id = opts.rayonId;
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
  private rosterCountsFor(
    scheduled: Set<string> | undefined,
    clockedIn: Set<string>,
  ): AggregateRosterCountsDto {
    if (!scheduled || scheduled.size === 0) return this.emptyRosterCounts();
    let clocked = 0;
    for (const u of scheduled) if (clockedIn.has(u)) clocked += 1;
    return {
      scheduled: scheduled.size,
      clocked_in: clocked,
      not_clocked_in: Math.max(0, scheduled.size - clocked),
    };
  }

  private sumStatusCounts(nodes: AggregateNodeDto[]): AggregateStatusCountsDto {
    return nodes.reduce((acc, n) => {
      acc.active += n.counts_by_status.active;
      acc.inactive += n.counts_by_status.inactive;
      acc.outside_area += n.counts_by_status.outside_area;
      acc.missing += n.counts_by_status.missing;
      acc.offline += n.counts_by_status.offline;
      return acc;
    }, this.emptyStatusCounts());
  }

  /**
   * Scope-wide roster trio (distinct users), independent of the per-node
   * breakdown so it matches the snapshot's expected/present/absent — including
   * rostered workers with no rayon (city) and never double-counting a worker
   * assigned to several areas in a rayon.
   */
  private async rosterTotalsForScope(
    scope: 'city' | 'rayon',
    rayonId: string | undefined,
    today: string,
    shiftDefinitionId: string | undefined,
    clockedInSet: Set<string>,
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
    if (scope === 'rayon') qb.andWhere('s.rayon_id = :rayonId', { rayonId });
    const rows = await qb.getRawMany();
    const scheduled = new Set(rows.map((r) => r.user_id));
    return this.rosterCountsFor(scheduled, clockedInSet);
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

  async getRayonSummary(rayon: Rayon): Promise<RayonSummaryDto> {
    const areas = await this.areaRepository.find({ where: { rayon_id: rayon.id } });
    const locationIds = areas.map((a) => a.id);
    const workerCount = await this.countWorkersByAreaIds(locationIds);
    const workersOnline = await this.countOnlineWorkersByAreaIds(locationIds);
    const workersRequired = await this.countRequiredWorkersByAreaIds(locationIds);

    return {
      id: rayon.id,
      name: rayon.name,
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
      area_type_category: area.areaType?.category || 'active',
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
      const inactiveCount = statuses[TrackingStatus.INACTIVE] || 0;
      const outsideAreaCount = statuses[TrackingStatus.OUTSIDE_AREA] || 0;
      const missingCount = statuses[TrackingStatus.MISSING] || 0;
      const currentCount = activeCount + inactiveCount + outsideAreaCount;
      const delta = currentCount - req.required_count;
      return {
        id: req.id,
        role: req.role,
        required_count: req.required_count,
        current_count: currentCount,
        delta,
        is_met: delta >= 0,
        active_count: activeCount,
        inactive_count: inactiveCount,
        outside_area_count: outsideAreaCount,
        missing_count: missingCount,
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
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.ACTIVE, TrackingStatus.INACTIVE, TrackingStatus.OUTSIDE_AREA],
      })
      .getCount();
  }

  async countOfflineWorkersByAreaIds(locationIds: string[]): Promise<number> {
    if (locationIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.location_id IN (:...locationIds)', { locationIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.MISSING, TrackingStatus.OFFLINE],
      })
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
    rayon_id?: string;
    area_ids?: string[];
    /**
     * `rayon` → rayon outlines only (area geometry omitted; lightest payload for
     * the city-level map). `area` (default) → full area geometry for drill-down.
     */
    level?: 'rayon' | 'area';
  }): Promise<BoundariesResponseDto> {
    const level = filters?.level ?? 'area';
    const rayonWhere: Record<string, any> = {};
    if (filters?.rayon_id) {
      rayonWhere.id = filters.rayon_id;
    }

    const rayons = await this.rayonRepository.find({ where: rayonWhere });

    const rayonBoundaries: RayonBoundaryDto[] = await Promise.all(
      rayons.map(async (rayon) => {
        const rayonCenterLat = (rayon as any).center_lat
          ? parseFloat((rayon as any).center_lat.toString())
          : null;
        const rayonCenterLng = (rayon as any).center_lng
          ? parseFloat((rayon as any).center_lng.toString())
          : null;

        // Rayon-level payload: outlines only, no area geometry. Staffing rollups
        // come from /monitoring/aggregate at the city zoom, so this path stays a
        // single cheap count per rayon.
        if (level === 'rayon') {
          const area_count = await this.areaRepository.count({
            where: { rayon_id: rayon.id, is_active: true },
          });
          return {
            id: rayon.id,
            name: rayon.name,
            color: (rayon as any).color ?? null,
            boundary_polygon: simplifyGeometry((rayon as any).boundary_polygon) || null,
            center_lat: rayonCenterLat,
            center_lng: rayonCenterLng,
            area_count,
            is_understaffed: false,
            understaffed_area_count: 0,
            areas: [],
          } as RayonBoundaryDto;
        }

        const areaWhere: Record<string, any> = {
          rayon_id: rayon.id,
          is_active: true,
        };
        // Korlap-style area scoping: when caller passes area_ids, only return
        // those areas (still grouped under their rayon). Empty filter list ⇒ no areas.
        if (filters?.area_ids) {
          if (filters.area_ids.length === 0) {
            return {
              id: rayon.id,
              name: rayon.name,
              color: (rayon as any).color ?? null,
              boundary_polygon: simplifyGeometry((rayon as any).boundary_polygon) || null,
              center_lat: rayonCenterLat,
              center_lng: rayonCenterLng,
              area_count: 0,
              is_understaffed: false,
              understaffed_area_count: 0,
              areas: [],
            } as RayonBoundaryDto;
          }
          areaWhere.id = In(filters.area_ids);
        }
        const areas = await this.areaRepository.find({ where: areaWhere });

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
            center_lat: parseFloat(area.gps_lat?.toString() || '0'),
            center_lng: parseFloat(area.gps_lng?.toString() || '0'),
            rayon_id: rayon.id,
            rayon_name: rayon.name,
            radius_meters: area.radius_meters ?? null,
            assigned_count: assigned,
            is_understaffed: assigned < required,
            staffing_summary: staffingByArea.get(area.id) || [],
          };
        });

        const understaffedCount = areaBoundaries.filter((a) => a.is_understaffed).length;

        return {
          id: rayon.id,
          name: rayon.name,
          color: (rayon as any).color ?? null,
          boundary_polygon: simplifyGeometry((rayon as any).boundary_polygon) || null,
          center_lat: rayonCenterLat,
          center_lng: rayonCenterLng,
          area_count: areas.length,
          is_understaffed: understaffedCount > 0,
          understaffed_area_count: understaffedCount,
          areas: areaBoundaries,
        };
      }),
    );

    // When the caller requested specific area_ids, suppress rayons that
    // ended up with no matching areas (otherwise korlap would still see
    // empty rayon polygons from across the city).
    const finalRayons =
      filters?.area_ids && level === 'area'
        ? rayonBoundaries.filter((r) => r.areas.length > 0)
        : rayonBoundaries;

    return {
      rayons: finalRayons,
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
