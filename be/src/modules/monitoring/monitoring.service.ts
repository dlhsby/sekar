import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { AreaStaffRequirement } from '../area-staff-requirements/entities/area-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from './entities/user-tracking-status.entity';
import { CityStatsDto, RayonSummaryDto } from './dto/city-stats.dto';
import { RayonStatsDto, AreaSummaryDto, ShiftSummaryDto } from './dto/rayon-stats.dto';
import {
  AreaStatsDto,
  UserStatusDto,
  TaskSummaryDto,
  StaffRequirementStatusDto,
} from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUserDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryResponseDto, LocationHistoryPointDto } from './dto/location-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import { StaffingSummaryResponseDto, StaffingSummaryItemDto, RoleStaffingDto } from './dto/staffing-summary.dto';
import { GpsUtil } from '../../common/utils/gps.util';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
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
    @InjectRepository(AreaStaffRequirement)
    private readonly staffRequirementRepository: Repository<AreaStaffRequirement>,
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
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

    const areaIds = areas.map((a) => a.id);
    const [tasksPending, tasksInProgress, tasksCompletedToday] = await Promise.all([
      this.countTasksByAreaIds(areaIds, TaskStatus.PENDING),
      this.countTasksByAreaIds(areaIds, TaskStatus.IN_PROGRESS),
      this.countTasksCompletedTodayByAreaIds(areaIds, today),
    ]);

    const activitiesSubmittedToday = await this.countActivitiesByAreaIds(areaIds, today);
    const activeShifts = await this.countActiveShiftsByAreaIds(areaIds);

    return {
      id: rayon.id,
      name: rayon.name,
      code: rayon.code,
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

  async getAreaStats(areaId: string): Promise<AreaStatsDto> {
    this.logger.log(`Generating statistics for area: ${areaId}`);

    const area = await this.areaRepository.findOne({
      where: { id: areaId },
      relations: ['areaType'],
    });
    if (!area) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    let rayonName = 'Unassigned';
    if (area.rayon_id) {
      const rayon = await this.rayonRepository.findOne({ where: { id: area.rayon_id } });
      rayonName = rayon?.name || 'Unassigned';
    }

    const today = this.getTodayRange();
    const workers = await this.getAreaWorkers(areaId);

    const workersOnline = workers.filter(
      (w) => w.status === TrackingStatus.ACTIVE || w.status === TrackingStatus.OUTSIDE_AREA,
    ).length;
    const workersOffline = workers.filter(
      (w) => w.status === TrackingStatus.OFFLINE || w.status === TrackingStatus.MISSING,
    ).length;

    const staffRequirements = await this.getAreaStaffRequirements(areaId);
    const isFullyStaffed = staffRequirements.every((r) => r.is_met);

    const tasks = await this.taskRepository.find({
      where: { area_id: areaId },
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
        area_id: areaId,
        created_at: Between(today.start, today.end),
      },
    });

    const alerts: string[] = [];
    for (const req of staffRequirements) {
      if (!req.is_met) {
        alerts.push(`Understaffed: need ${Math.abs(req.delta)} more ${req.role}`);
      }
    }

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
      generated_at: new Date(),
    };
  }

  /**
   * Get live user positions - refactored to use user_tracking_status table
   * Eliminates N+1 queries by joining all needed data in a single query
   */
  async getLiveUsers(filters?: LiveUsersFilterDto): Promise<LiveUsersResponseDto> {
    this.logger.log('Fetching live user positions');

    const qb = this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoinAndSelect('uts.user', 'user')
      .leftJoinAndSelect('uts.shift', 'shift')
      .leftJoinAndSelect('uts.shift_definition', 'sd')
      .leftJoinAndSelect('uts.area', 'area')
      .leftJoin('area.areaType', 'areaType')
      .where('uts.shift_id IS NOT NULL');

    if (filters?.area_id) {
      qb.andWhere('uts.area_id = :areaId', { areaId: filters.area_id });
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

    const trackingRecords = await qb.getMany();

    // Batch fetch rayon names and current tasks
    const areaIds = [...new Set(trackingRecords.map((r) => r.area_id).filter(Boolean))];
    const userIds = trackingRecords.map((r) => r.user_id);

    const [rayonMap, taskMap] = await Promise.all([
      this.buildRayonMap(areaIds as string[]),
      this.buildCurrentTaskMap(userIds),
    ]);

    const users: LiveUserDto[] = trackingRecords.map((uts) => {
      const rayonId = uts.area?.rayon_id || null;
      return {
        id: uts.user.id,
        full_name: uts.user.full_name,
        phone: uts.user.phone || null,
        role: uts.user.role,
        area_id: uts.area_id,
        area_name: uts.area?.name || 'Unknown',
        rayon_id: rayonId,
        rayon_name: rayonId ? rayonMap.get(rayonId) || null : null,
        latitude: uts.last_latitude || 0,
        longitude: uts.last_longitude || 0,
        accuracy: uts.last_accuracy_meters,
        battery_level: uts.last_battery_level,
        last_update: uts.last_location_at || uts.shift?.clock_in_time || new Date(),
        status: uts.status,
        is_within_area: uts.is_within_area,
        outside_boundary: uts.shift?.clock_in_outside_boundary || false,
        shift_id: uts.shift_id || '',
        shift_name: uts.shift_definition?.name || 'Active Shift',
        clock_in_time: uts.shift?.clock_in_time || new Date(),
        current_task_status: taskMap.get(uts.user_id)?.status || null,
        current_task_title: taskMap.get(uts.user_id)?.title || null,
      };
    });

    const statusCounts = this.countByStatus(trackingRecords);

    return {
      total_active: statusCounts.active,
      total_inactive: statusCounts.inactive,
      total_outside_area: statusCounts.outside_area,
      total_missing: statusCounts.missing,
      total_offline: statusCounts.offline,
      users,
      generated_at: new Date(),
    };
  }

  private countByStatus(records: UserTrackingStatus[]): Record<string, number> {
    const counts: Record<string, number> = {
      active: 0,
      inactive: 0,
      outside_area: 0,
      missing: 0,
      offline: 0,
    };
    for (const r of records) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return counts;
  }

  private async buildRayonMap(areaIds: string[]): Promise<Map<string, string>> {
    if (areaIds.length === 0) return new Map();

    const areas = await this.areaRepository
      .createQueryBuilder('area')
      .where('area.id IN (:...areaIds)', { areaIds })
      .andWhere('area.rayon_id IS NOT NULL')
      .getMany();

    const rayonIds = [...new Set(areas.map((a) => a.rayon_id).filter(Boolean))] as string[];
    if (rayonIds.length === 0) return new Map();

    const rayons = await this.rayonRepository.find({
      where: { id: In(rayonIds) },
    });

    return new Map(rayons.map((r) => [r.id, r.name]));
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

  // ---- Helper methods ----

  private getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private async getRayonSummary(rayon: Rayon): Promise<RayonSummaryDto> {
    const areas = await this.areaRepository.find({ where: { rayon_id: rayon.id } });
    const areaIds = areas.map((a) => a.id);
    const workerCount = await this.countWorkersByAreaIds(areaIds);
    const workersOnline = await this.countOnlineWorkersByAreaIds(areaIds);
    const workersRequired = await this.countRequiredWorkersByAreaIds(areaIds);

    return {
      id: rayon.id,
      name: rayon.name,
      code: rayon.code,
      area_count: areas.length,
      worker_count: workerCount,
      workers_online: workersOnline,
      workers_offline: workerCount - workersOnline,
      workers_required: workersRequired,
      is_fully_staffed: workersOnline >= workersRequired,
    };
  }

  private async getAreaSummary(area: Area): Promise<AreaSummaryDto> {
    const workersOnline = await this.countOnlineWorkersByAreaIds([area.id]);
    const workersOffline = await this.countOfflineWorkersByAreaIds([area.id]);
    const workersRequired = await this.countRequiredWorkersByAreaIds([area.id]);
    const staffingDelta = workersOnline - workersRequired;

    const tasksPending = await this.taskRepository.count({
      where: { area_id: area.id, status: TaskStatus.PENDING },
    });
    const tasksInProgress = await this.taskRepository.count({
      where: { area_id: area.id, status: TaskStatus.IN_PROGRESS },
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

  /**
   * Get workers for an area - uses user_tracking_status for real status
   */
  private async getAreaWorkers(areaId: string): Promise<UserStatusDto[]> {
    const trackingRecords = await this.trackingRepository.find({
      where: { area_id: areaId, shift_id: Not_Null_Workaround() },
      relations: ['user', 'shift'],
    });

    // Fallback: if no tracking records, check active shifts directly
    if (trackingRecords.length === 0) {
      return this.getAreaWorkersLegacy(areaId);
    }

    return trackingRecords.map((uts) => ({
      id: uts.user.id,
      full_name: uts.user.full_name,
      role: uts.user.role,
      status: uts.status,
      last_lat: uts.last_latitude,
      last_lng: uts.last_longitude,
      last_location_update: uts.last_location_at,
      is_within_area: uts.is_within_area,
      current_shift_id: uts.shift_id,
      clock_in_time: uts.shift?.clock_in_time || null,
    }));
  }

  private async getAreaWorkersLegacy(areaId: string): Promise<UserStatusDto[]> {
    const activeShifts = await this.shiftRepository.find({
      where: { area_id: areaId, clock_out_time: IsNull() },
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
    const currentTime = Date.now();

    return activeShifts.map((shift) => {
      const latestLocation = locationMap.get(shift.id);
      const isOnline = !!(
        latestLocation &&
        currentTime - latestLocation.logged_at.getTime() < this.ONLINE_THRESHOLD_MS
      );

      return {
        id: shift.user.id,
        full_name: shift.user.full_name,
        role: shift.user.role,
        status: isOnline ? TrackingStatus.ACTIVE : TrackingStatus.OFFLINE,
        last_lat: latestLocation ? parseFloat(latestLocation.gps_lat.toString()) : null,
        last_lng: latestLocation ? parseFloat(latestLocation.gps_lng.toString()) : null,
        last_location_update: latestLocation?.logged_at || null,
        is_within_area: true,
        current_shift_id: shift.id,
        clock_in_time: shift.clock_in_time,
      };
    });
  }

  /**
   * Get staff requirements for area - now counts by role
   */
  private async getAreaStaffRequirements(areaId: string): Promise<StaffRequirementStatusDto[]> {
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return [];

    const requirements = await this.staffRequirementRepository.find({
      where: { area_id: areaId, shift_definition_id: currentShift.id },
    });

    if (requirements.length === 0) return [];

    // Count active workers by role using user_tracking_status
    const roleCounts = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('uts.area_id = :areaId', { areaId })
      .andWhere('uts.shift_id IS NOT NULL')
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.ACTIVE, TrackingStatus.INACTIVE, TrackingStatus.OUTSIDE_AREA],
      })
      .groupBy('user.role')
      .getRawMany();

    const roleCountMap = new Map<string, number>(
      roleCounts.map((rc: any) => [rc.role, parseInt(rc.count)]),
    );

    return requirements.map((req) => {
      const currentCount = roleCountMap.get(req.role) || 0;
      const delta = currentCount - req.required_count;
      return {
        id: req.id,
        role: req.role,
        required_count: req.required_count,
        current_count: currentCount,
        delta,
        is_met: delta >= 0,
      };
    });
  }

  private isShiftActive(shift: ShiftDefinition, currentTime: Date): boolean {
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

  private async getCurrentShiftDefinition(): Promise<ShiftDefinition | null> {
    const shifts = await this.shiftDefinitionRepository.find({
      where: { is_active: true },
    });
    const now = new Date();
    return shifts.find((s) => this.isShiftActive(s, now)) || null;
  }

  // Count helpers
  private async countWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.area_id IN (:...areaIds)', { areaIds })
      .andWhere('shift.clock_out_time IS NULL')
      .getCount();
  }

  private async countOnlineWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    const tenMinutesAgo = new Date(Date.now() - this.ONLINE_THRESHOLD_MS);

    const result = await this.locationRepository
      .createQueryBuilder('location')
      .innerJoin('location.shift', 'shift')
      .where('shift.area_id IN (:...areaIds)', { areaIds })
      .andWhere('shift.clock_out_time IS NULL')
      .andWhere('location.logged_at >= :tenMinutesAgo', { tenMinutesAgo })
      .select('COUNT(DISTINCT shift.user_id)', 'count')
      .getRawOne();

    return parseInt(result?.count || '0');
  }

  private async countOfflineWorkersByAreaIds(areaIds: string[]): Promise<number> {
    const total = await this.countWorkersByAreaIds(areaIds);
    const online = await this.countOnlineWorkersByAreaIds(areaIds);
    return total - online;
  }

  private async countRequiredWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return 0;

    const result = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .where('req.area_id IN (:...areaIds)', { areaIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .select('SUM(req.required_count)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0');
  }

  private async countTasksByAreaIds(areaIds: string[], status: TaskStatus): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.area_id IN (:...areaIds)', { areaIds })
      .andWhere('task.status = :status', { status })
      .getCount();
  }

  private async countTasksCompletedTodayByAreaIds(
    areaIds: string[],
    today: { start: Date; end: Date },
  ): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.area_id IN (:...areaIds)', { areaIds })
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.completed_at BETWEEN :start AND :end', today)
      .getCount();
  }

  private async countActivitiesByAreaIds(
    areaIds: string[],
    today: { start: Date; end: Date },
  ): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.area_id IN (:...areaIds)', { areaIds })
      .andWhere('activity.created_at BETWEEN :start AND :end', today)
      .getCount();
  }

  private async countActiveShiftsByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.area_id IN (:...areaIds)', { areaIds })
      .andWhere('shift.clock_out_time IS NULL')
      .getCount();
  }

  // =========================================================================
  // Phase 2D-3: New Endpoint Service Methods
  // =========================================================================

  async getLocationHistory(
    userId: string,
    date: string,
    shiftId?: string,
  ): Promise<LocationHistoryResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const dayRange = this.parseDateRange(date);
    const shift = await this.findShiftForHistory(userId, dayRange, shiftId);
    const area = shift?.area_id
      ? await this.areaRepository.findOne({ where: { id: shift.area_id } })
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
      area_id: area?.id || null,
      area_name: area?.name || null,
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

    const area = tracking?.area || (user.area_id
      ? await this.areaRepository.findOne({ where: { id: user.area_id } })
      : null);

    const rayon = area?.rayon_id
      ? await this.rayonRepository.findOne({ where: { id: area.rayon_id } })
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
      phone: user.phone || null,
      status: tracking?.status || TrackingStatus.OFFLINE,
      area_id: area?.id || null,
      area_name: area?.name || null,
      rayon_id: rayon?.id || null,
      rayon_name: rayon?.name || null,
      shift: shiftInfo,
      last_location: lastLocation,
      activities_today: activitiesToday,
      tasks_today: tasksToday,
      whatsapp_links: this.buildWhatsAppLinks(user.phone),
    };
  }

  async getStaffingSummary(
    filters: { rayon_id?: string; area_id?: string },
  ): Promise<StaffingSummaryResponseDto> {
    const areas = await this.resolveAreas(filters);
    const currentShift = await this.getCurrentShiftDefinition();
    const items: StaffingSummaryItemDto[] = [];

    for (const area of areas) {
      const item = await this.buildStaffingItem(area, currentShift);
      items.push(item);
    }

    return { items, generated_at: new Date() };
  }

  // ---- Private helpers for new endpoints ----

  private parseDateRange(date: string): { start: Date; end: Date } {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
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
    area: Area | null,
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
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude,
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

    const shift = tracking.shift || await this.shiftRepository.findOne({
      where: { id: tracking.shift_id },
    });
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
    area: Area | null,
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
      .filter((t) => t.status !== TaskStatus.COMPLETED || (
        t.completed_at && t.completed_at >= today.start && t.completed_at <= today.end
      ))
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      }));
  }

  private buildWhatsAppLinks(phone: string | null | undefined): UserDaySummaryDto['whatsapp_links'] {
    if (!phone) return null;

    const cleaned = phone.replace(/\D/g, '');
    const international = cleaned.startsWith('0')
      ? `62${cleaned.substring(1)}`
      : cleaned;

    return {
      chat: `https://wa.me/${international}`,
      call: `tel:+${international}`,
    };
  }

  private async resolveAreas(
    filters: { rayon_id?: string; area_id?: string },
  ): Promise<Area[]> {
    if (filters.area_id) {
      const area = await this.areaRepository.findOne({
        where: { id: filters.area_id, is_active: true },
      });
      return area ? [area] : [];
    }

    const where: Record<string, any> = { is_active: true };
    if (filters.rayon_id) where.rayon_id = filters.rayon_id;

    return this.areaRepository.find({ where });
  }

  private async buildStaffingItem(
    area: Area,
    currentShift: ShiftDefinition | null,
  ): Promise<StaffingSummaryItemDto> {
    const roleCounts = await this.getTrackingRoleCounts(area.id);
    const requirements = currentShift
      ? await this.staffRequirementRepository.find({
          where: { area_id: area.id, shift_definition_id: currentShift.id },
        })
      : [];

    const reqMap = new Map(requirements.map((r) => [r.role, r.required_count]));
    const assignedCounts = await this.getAssignedRoleCounts(area.id);

    const roles: RoleStaffingDto[] = this.buildRoleStaffing(
      roleCounts,
      assignedCounts,
      reqMap,
    );

    const totals = this.sumRoleTotals(roles);

    return {
      id: area.id,
      name: area.name,
      type: 'area',
      roles,
      ...totals,
      is_fully_staffed: roles.every((r) =>
        (r.active + r.idle + r.outside_area) >= r.total_required,
      ),
    };
  }

  private async getTrackingRoleCounts(
    areaId: string,
  ): Promise<Map<string, Record<string, number>>> {
    const rows = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('user.role', 'role')
      .addSelect('uts.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('uts.area_id = :areaId', { areaId })
      .groupBy('user.role')
      .addGroupBy('uts.status')
      .getRawMany();

    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const existing = map.get(row.role) || {};
      existing[row.status] = parseInt(row.count);
      map.set(row.role, existing);
    }
    return map;
  }

  private async getAssignedRoleCounts(
    areaId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.area_id = :areaId', { areaId })
      .andWhere('user.deleted_at IS NULL')
      .groupBy('user.role')
      .getRawMany();

    return new Map(rows.map((r: any) => [r.role, parseInt(r.count)]));
  }

  private buildRoleStaffing(
    roleCounts: Map<string, Record<string, number>>,
    assignedCounts: Map<string, number>,
    reqMap: Map<string, number>,
  ): RoleStaffingDto[] {
    const allRoles = new Set([
      ...roleCounts.keys(),
      ...assignedCounts.keys(),
      ...reqMap.keys(),
    ]);

    return Array.from(allRoles).map((role) => {
      const statuses = roleCounts.get(role) || {};
      return {
        role,
        active: statuses[TrackingStatus.ACTIVE] || 0,
        idle: statuses[TrackingStatus.INACTIVE] || 0,
        outside_area: statuses[TrackingStatus.OUTSIDE_AREA] || 0,
        missing: statuses[TrackingStatus.MISSING] || 0,
        offline: statuses[TrackingStatus.OFFLINE] || 0,
        total_assigned: assignedCounts.get(role) || 0,
        total_required: reqMap.get(role) || 0,
      };
    });
  }

  private sumRoleTotals(roles: RoleStaffingDto[]): {
    total_active: number;
    total_idle: number;
    total_outside_area: number;
    total_missing: number;
    total_offline: number;
  } {
    return {
      total_active: roles.reduce((s, r) => s + r.active, 0),
      total_idle: roles.reduce((s, r) => s + r.idle, 0),
      total_outside_area: roles.reduce((s, r) => s + r.outside_area, 0),
      total_missing: roles.reduce((s, r) => s + r.missing, 0),
      total_offline: roles.reduce((s, r) => s + r.offline, 0),
    };
  }
}

/**
 * TypeORM workaround: find where column IS NOT NULL
 * Using raw Not(IsNull()) approach
 */
function Not_Null_Workaround(): any {
  // Import dynamically to avoid circular dependency issues at module level
  const { Not, IsNull } = require('typeorm');
  return Not(IsNull());
}
