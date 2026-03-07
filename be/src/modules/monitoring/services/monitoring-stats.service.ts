import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not, In } from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { AreaStaffRequirement } from '../../area-staff-requirements/entities/area-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { CityStatsDto, RayonSummaryDto } from '../dto/city-stats.dto';
import { RayonStatsDto, AreaSummaryDto, ShiftSummaryDto } from '../dto/rayon-stats.dto';
import {
  AreaStatsDto,
  UserStatusDto,
  TaskSummaryDto,
  StaffRequirementStatusDto,
} from '../dto/area-stats.dto';
import { BoundariesResponseDto, RayonBoundaryDto, AreaBoundaryDto, RoleStaffingItemDto } from '../dto/boundaries.dto';
import { DayTypeService } from './day-type.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class MonitoringStatsService {
  private readonly logger = new Logger(MonitoringStatsService.name);

  constructor(
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
    private readonly dayTypeService: DayTypeService,
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

  async getAreaSummary(area: Area): Promise<AreaSummaryDto> {
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

  async getAreaWorkers(areaId: string): Promise<UserStatusDto[]> {
    const trackingRecords = await this.trackingRepository.find({
      where: { area_id: areaId, shift_id: Not(IsNull()) },
      relations: ['user', 'shift', 'shift_definition'],
    });

    if (trackingRecords.length === 0) {
      return this.getAreaWorkersLegacy(areaId);
    }

    return trackingRecords.map((uts) => ({
      id: uts.user.id,
      full_name: uts.user.full_name,
      role: uts.user.role,
      phone: (uts.user as any).phone ?? null,
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
    const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;
    const currentTime = Date.now();

    return activeShifts.map((shift) => {
      const latestLocation = locationMap.get(shift.id);
      const isOnline = !!(
        latestLocation &&
        currentTime - latestLocation.logged_at.getTime() < ONLINE_THRESHOLD_MS
      );

      return {
        id: shift.user.id,
        full_name: shift.user.full_name,
        role: shift.user.role,
        phone: (shift.user as any).phone ?? null,
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

  async getAreaStaffRequirements(areaId: string): Promise<StaffRequirementStatusDto[]> {
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return [];

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const requirements = await this.staffRequirementRepository.find({
      where: { area_id: areaId, shift_definition_id: currentShift.id, day_type: currentDayType },
    });

    if (requirements.length === 0) return [];

    const roleStatusCounts = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('user.role', 'role')
      .addSelect('uts.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('uts.area_id = :areaId', { areaId })
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
  async countWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.area_id IN (:...areaIds)', { areaIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .getCount();
  }

  async countOnlineWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.area_id IN (:...areaIds)', { areaIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.ACTIVE, TrackingStatus.INACTIVE, TrackingStatus.OUTSIDE_AREA],
      })
      .getCount();
  }

  async countOfflineWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.trackingRepository
      .createQueryBuilder('uts')
      .where('uts.area_id IN (:...areaIds)', { areaIds })
      .andWhere('uts.shift_id IS NOT NULL')
      .andWhere('uts.status IN (:...statuses)', {
        statuses: [TrackingStatus.MISSING, TrackingStatus.OFFLINE],
      })
      .getCount();
  }

  async countRequiredWorkersByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return 0;

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const result = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .where('req.area_id IN (:...areaIds)', { areaIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .andWhere('req.day_type = :dayType', { dayType: currentDayType })
      .select('SUM(req.required_count)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0');
  }

  async countTasksByAreaIds(areaIds: string[], status: TaskStatus): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.area_id IN (:...areaIds)', { areaIds })
      .andWhere('task.status = :status', { status })
      .getCount();
  }

  async countTasksCompletedTodayByAreaIds(
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

  async countActivitiesByAreaIds(
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

  async countActiveShiftsByAreaIds(areaIds: string[]): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.area_id IN (:...areaIds)', { areaIds })
      .andWhere('shift.clock_out_time IS NULL')
      .getCount();
  }

  async getBoundaries(filters?: { rayon_id?: string }): Promise<BoundariesResponseDto> {
    const rayonWhere: Record<string, any> = {};
    if (filters?.rayon_id) {
      rayonWhere.id = filters.rayon_id;
    }

    const rayons = await this.rayonRepository.find({ where: rayonWhere });

    const rayonBoundaries: RayonBoundaryDto[] = await Promise.all(
      rayons.map(async (rayon) => {
        const areas = await this.areaRepository.find({
          where: { rayon_id: rayon.id, is_active: true },
        });

        const areaIds = areas.map((a) => a.id);
        const assignedCounts = areaIds.length > 0
          ? await this.trackingRepository
              .createQueryBuilder('uts')
              .select('uts.area_id', 'area_id')
              .addSelect('COUNT(*)', 'count')
              .where('uts.area_id IN (:...areaIds)', { areaIds })
              .groupBy('uts.area_id')
              .getRawMany()
          : [];

        const countMap = new Map(assignedCounts.map((r: any) => [r.area_id, parseInt(r.count)]));

        const requiredCounts = areaIds.length > 0
          ? await this.countRequiredWorkersByAreaIdsMap(areaIds)
          : new Map();

        const staffingByArea = areaIds.length > 0
          ? await this.getStaffingByArea(areaIds)
          : new Map();

        const areaBoundaries: AreaBoundaryDto[] = areas.map((area) => {
          const assigned = countMap.get(area.id) || 0;
          const required = requiredCounts.get(area.id) || 0;
          return {
            id: area.id,
            name: area.name,
            boundary_polygon: area.boundary_polygon || null,
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
          code: rayon.code,
          boundary_polygon: (rayon as any).boundary_polygon || null,
          center_lat: (rayon as any).center_lat ? parseFloat((rayon as any).center_lat.toString()) : null,
          center_lng: (rayon as any).center_lng ? parseFloat((rayon as any).center_lng.toString()) : null,
          area_count: areas.length,
          is_understaffed: understaffedCount > 0,
          understaffed_area_count: understaffedCount,
          areas: areaBoundaries,
        };
      }),
    );

    return {
      rayons: rayonBoundaries,
      generated_at: new Date(),
    };
  }

  private async getStaffingByArea(areaIds: string[]): Promise<Map<string, RoleStaffingItemDto[]>> {
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return new Map();

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const requirements = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .select(['req.area_id', 'req.role', 'req.required_count'])
      .where('req.area_id IN (:...areaIds)', { areaIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .andWhere('req.day_type = :dayType', { dayType: currentDayType })
      .getMany();

    const activeCounts = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('uts.user', 'user')
      .select('uts.area_id', 'area_id')
      .addSelect('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('uts.area_id IN (:...areaIds)', { areaIds })
      .andWhere('uts.status = :status', { status: TrackingStatus.ACTIVE })
      .groupBy('uts.area_id')
      .addGroupBy('user.role')
      .getRawMany();

    const activeMap = new Map<string, Map<string, number>>();
    for (const row of activeCounts) {
      if (!activeMap.has(row.area_id)) activeMap.set(row.area_id, new Map());
      activeMap.get(row.area_id)!.set(row.role, parseInt(row.count));
    }

    const result = new Map<string, RoleStaffingItemDto[]>();
    for (const req of requirements) {
      const areaStaffing = result.get(req.area_id) || [];
      areaStaffing.push({
        role: req.role,
        required: req.required_count,
        active: activeMap.get(req.area_id)?.get(req.role) || 0,
      });
      result.set(req.area_id, areaStaffing);
    }

    return result;
  }

  private async countRequiredWorkersByAreaIdsMap(areaIds: string[]): Promise<Map<string, number>> {
    if (areaIds.length === 0) return new Map();
    const currentShift = await this.getCurrentShiftDefinition();
    if (!currentShift) return new Map();

    const currentDayType = await this.dayTypeService.getCurrentDayType();

    const rows = await this.staffRequirementRepository
      .createQueryBuilder('req')
      .select('req.area_id', 'area_id')
      .addSelect('SUM(req.required_count)', 'total')
      .where('req.area_id IN (:...areaIds)', { areaIds })
      .andWhere('req.shift_definition_id = :shiftId', { shiftId: currentShift.id })
      .andWhere('req.day_type = :dayType', { dayType: currentDayType })
      .groupBy('req.area_id')
      .getRawMany();

    return new Map(rows.map((r: any) => [r.area_id, parseInt(r.total)]));
  }
}
