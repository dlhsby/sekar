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
import { CityStatsDto, RayonSummaryDto } from './dto/city-stats.dto';
import { RayonStatsDto, AreaSummaryDto, ShiftSummaryDto } from './dto/rayon-stats.dto';
import {
  AreaStatsDto,
  UserStatusDto,
  TaskSummaryDto,
  StaffRequirementStatusDto,
} from './dto/area-stats.dto';
import {
  LiveUsersResponseDto,
  LiveUserDto,
  LiveUsersFilterDto,
} from './dto/live-users.dto';

/**
 * Service for real-time monitoring statistics
 *
 * Provides aggregated statistics for:
 * - City-wide overview (Admin/TopManagement)
 * - Rayon-level details (KepalaRayon)
 * - Area-level details (KoordinatorLapangan)
 * - Live worker positions
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly ONLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

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
  ) {}

  /**
   * Get city-wide statistics
   *
   * @returns City-wide statistics including all rayons
   */
  async getCityStats(): Promise<CityStatsDto> {
    this.logger.log('Generating city-wide statistics');

    const today = this.getTodayRange();

    // Get all rayons with areas
    const rayons = await this.rayonRepository.find();

    // Parallel execution: get all rayon summaries at once
    const rayonSummaries = await Promise.all(
      rayons.map(rayon => this.getRayonSummary(rayon))
    );

    // Aggregate totals
    const totalWorkers = rayonSummaries.reduce((sum, s) => sum + s.worker_count, 0);
    const workersOnline = rayonSummaries.reduce((sum, s) => sum + s.workers_online, 0);
    const workersOffline = rayonSummaries.reduce((sum, s) => sum + s.workers_offline, 0);
    const totalAreas = rayonSummaries.reduce((sum, s) => sum + s.area_count, 0);

    // Get active shifts count
    const activeShifts = await this.shiftRepository.count({
      where: { clock_out_time: IsNull() },
    });

    // Get task statistics
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

    // Get activities submitted today
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

  /**
   * Get rayon-level statistics
   *
   * @param rayonId - Rayon ID
   * @returns Rayon statistics with all areas
   */
  async getRayonStats(rayonId: string): Promise<RayonStatsDto> {
    this.logger.log(`Generating statistics for rayon: ${rayonId}`);

    const rayon = await this.rayonRepository.findOne({
      where: { id: rayonId },
    });

    if (!rayon) {
      throw new NotFoundException(`Rayon with ID ${rayonId} not found`);
    }

    const today = this.getTodayRange();

    // Get areas in this rayon
    const areas = await this.areaRepository.find({
      where: { rayon_id: rayonId },
      relations: ['areaType'],
    });

    // Parallel execution: get all area summaries at once
    const areaSummaries = await Promise.all(
      areas.map(area => this.getAreaSummary(area))
    );

    // Aggregate totals and alerts
    const totalWorkers = areaSummaries.reduce((sum, s) => sum + s.workers_online + s.workers_offline, 0);
    const workersOnline = areaSummaries.reduce((sum, s) => sum + s.workers_online, 0);
    const workersOffline = areaSummaries.reduce((sum, s) => sum + s.workers_offline, 0);
    const alerts = areaSummaries
      .filter(s => !s.is_fully_staffed)
      .map((s, idx) => `${areas[idx].name} - needs ${Math.abs(s.staffing_delta)} more workers`);

    // Get shift summaries
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
      workers_required: 0, // Would need to sum from staff requirements
      workers_on_shift: 0, // Would need to count from active shifts
    }));

    // Get task statistics
    const areaIds = areas.map((a) => a.id);
    const [tasksPending, tasksInProgress, tasksCompletedToday] = await Promise.all([
      this.countTasksByAreaIds(areaIds, TaskStatus.PENDING),
      this.countTasksByAreaIds(areaIds, TaskStatus.IN_PROGRESS),
      this.countTasksCompletedTodayByAreaIds(areaIds, today),
    ]);

    // Get activities count
    const activitiesSubmittedToday = await this.countActivitiesByAreaIds(areaIds, today);

    // Get active shifts count
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

  /**
   * Get area-level statistics
   *
   * @param areaId - Area ID
   * @returns Detailed area statistics
   */
  async getAreaStats(areaId: string): Promise<AreaStatsDto> {
    this.logger.log(`Generating statistics for area: ${areaId}`);

    const area = await this.areaRepository.findOne({
      where: { id: areaId },
      relations: ['areaType'],
    });

    if (!area) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    // Get rayon name if area has rayon_id
    let rayonName = 'Unassigned';
    if (area.rayon_id) {
      const rayon = await this.rayonRepository.findOne({ where: { id: area.rayon_id } });
      rayonName = rayon?.name || 'Unassigned';
    }

    const today = this.getTodayRange();

    // Get workers assigned to this area with their latest location
    const workers = await this.getAreaWorkers(areaId);

    const workersOnline = workers.filter((w) => w.is_online).length;
    const workersOffline = workers.filter((w) => !w.is_online).length;

    // Get staff requirements for current shift
    const staffRequirements = await this.getAreaStaffRequirements(areaId);

    // Check if fully staffed
    const isFullyStaffed = staffRequirements.every((r) => r.is_met);

    // Get tasks
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

    // Get activities count
    const activitiesSubmittedToday = await this.activityRepository.count({
      where: {
        area_id: areaId,
        created_at: Between(today.start, today.end),
      },
    });

    // Generate alerts
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
   * Get live user positions
   *
   * @param filters - Optional filters
   * @returns Live user positions
   */
  async getLiveUsers(filters?: LiveUsersFilterDto): Promise<LiveUsersResponseDto> {
    this.logger.log('Fetching live user positions');

    // Get users with active shifts
    const queryBuilder = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.user', 'user')
      .leftJoinAndSelect('shift.area', 'area')
      .where('shift.clock_out_time IS NULL');

    if (filters?.area_id) {
      queryBuilder.andWhere('shift.area_id = :areaId', { areaId: filters.area_id });
    }

    if (filters?.rayon_id) {
      queryBuilder.andWhere('area.rayon_id = :rayonId', { rayonId: filters.rayon_id });
    }

    if (filters?.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    const activeShifts = await queryBuilder.getMany();

    // Parallel execution: fetch all data for all shifts at once
    const users = await Promise.all(
      activeShifts.map(async (shift) => {
        const [latestLocation, currentTask, rayon] = await Promise.all([
          this.locationRepository.findOne({
            where: { shift_id: shift.id },
            order: { logged_at: 'DESC' },
          }),
          this.taskRepository.findOne({
            where: {
              assigned_to: shift.user_id,
              status: TaskStatus.IN_PROGRESS,
            },
          }),
          shift.area?.rayon_id
            ? this.rayonRepository.findOne({ where: { id: shift.area.rayon_id } })
            : Promise.resolve(null),
        ]);

        // Consider online if location updated within last 10 minutes
        const isOnline = !!(
          latestLocation && new Date().getTime() - latestLocation.logged_at.getTime() < this.ONLINE_THRESHOLD_MS
        );

        return {
          user: {
            id: shift.user.id,
            full_name: shift.user.full_name,
            role: shift.user.role,
            area_id: shift.area_id,
            area_name: shift.area?.name || 'Unknown',
            rayon_id: shift.area?.rayon_id || null,
            rayon_name: rayon?.name || null,
            latitude: latestLocation ? parseFloat(latestLocation.gps_lat.toString()) : 0,
            longitude: latestLocation ? parseFloat(latestLocation.gps_lng.toString()) : 0,
            accuracy: latestLocation?.accuracy_meters
              ? parseFloat(latestLocation.accuracy_meters.toString())
              : null,
            battery_level: latestLocation?.battery_level || null,
            last_update: latestLocation?.logged_at || shift.clock_in_time,
            is_within_area: true, // Simplified - would need GPS calculation
            outside_boundary: shift.clock_in_outside_boundary || false,
            shift_id: shift.id,
            shift_name: 'Active Shift', // Would need shift definition relation
            clock_in_time: shift.clock_in_time,
            current_task_status: currentTask?.status || null,
            current_task_title: currentTask?.title || null,
          },
          isOnline,
        };
      })
    );

    const totalOnline = users.filter((u) => u.isOnline).length;
    const totalOffline = users.length - totalOnline;

    return {
      total_online: totalOnline,
      total_offline: totalOffline,
      users: users.map((u) => u.user),
      generated_at: new Date(),
    };
  }

  /**
   * Helper: Get today's date range
   */
  private getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Helper: Get rayon summary
   */
  private async getRayonSummary(rayon: Rayon): Promise<RayonSummaryDto> {
    const areas = await this.areaRepository.find({
      where: { rayon_id: rayon.id },
    });

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

  /**
   * Helper: Get area summary
   */
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
   * Helper: Get workers for an area
   */
  private async getAreaWorkers(areaId: string): Promise<UserStatusDto[]> {
    const activeShifts = await this.shiftRepository.find({
      where: { area_id: areaId, clock_out_time: IsNull() },
      relations: ['user'],
    });

    if (activeShifts.length === 0) {
      return [];
    }

    // Parallel execution: get latest locations for all shifts
    const shiftIds = activeShifts.map(s => s.id);
    const latestLocations = await this.locationRepository
      .createQueryBuilder('location')
      .select([
        'location.shift_id',
        'location.gps_lat',
        'location.gps_lng',
        'location.logged_at',
      ])
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

    const locationMap = new Map(latestLocations.map(loc => [loc.shift_id, loc]));
    const currentTime = new Date().getTime();

    const workers: UserStatusDto[] = activeShifts.map(shift => {
      const latestLocation = locationMap.get(shift.id);
      const isOnline = !!(
        latestLocation && currentTime - latestLocation.logged_at.getTime() < this.ONLINE_THRESHOLD_MS
      );

      return {
        id: shift.user.id,
        full_name: shift.user.full_name,
        role: shift.user.role,
        is_online: isOnline,
        last_lat: latestLocation ? parseFloat(latestLocation.gps_lat.toString()) : null,
        last_lng: latestLocation ? parseFloat(latestLocation.gps_lng.toString()) : null,
        last_location_update: latestLocation?.logged_at || null,
        is_within_area: true, // Simplified - would need GPS calculation
        current_shift_id: shift.id,
        clock_in_time: shift.clock_in_time,
      };
    });

    return workers;
  }

  /**
   * Helper: Get staff requirements for an area
   */
  private async getAreaStaffRequirements(areaId: string): Promise<StaffRequirementStatusDto[]> {
    // Get current shift definition
    const currentShift = await this.getCurrentShiftDefinition();

    if (!currentShift) {
      return [];
    }

    const requirements = await this.staffRequirementRepository.find({
      where: {
        area_id: areaId,
        shift_definition_id: currentShift.id,
      },
    });

    if (requirements.length === 0) {
      return [];
    }

    // Get current worker count once for the area
    const currentCount = await this.shiftRepository.count({
      where: {
        area_id: areaId,
        clock_out_time: IsNull(),
      },
    });

    // Map all requirements with the same current count (simplified)
    // Note: This is simplified - in a real scenario, you'd need to count by role
    const result: StaffRequirementStatusDto[] = requirements.map(req => {
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

    return result;
  }

  /**
   * Helper: Check if shift definition is currently active
   */
  private isShiftActive(shift: ShiftDefinition, currentTime: Date): boolean {
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const [endHour, endMin] = shift.end_time.split(':').map(Number);

    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    const currentMinutes = currentHour * 60 + currentMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (shift.crosses_midnight) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Helper: Get current shift definition
   */
  private async getCurrentShiftDefinition(): Promise<ShiftDefinition | null> {
    const shifts = await this.shiftDefinitionRepository.find({
      where: { is_active: true },
    });

    const now = new Date();
    return shifts.find((s) => this.isShiftActive(s, now)) || null;
  }

  // Count helper methods
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
}
