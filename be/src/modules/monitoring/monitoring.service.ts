import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { Report } from '../reports/entities/report.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { AreaStaffRequirement } from '../area-staff-requirements/entities/area-staff-requirement.entity';
import { CityStatsDto, RayonSummaryDto } from './dto/city-stats.dto';
import { RayonStatsDto, AreaSummaryDto, ShiftSummaryDto } from './dto/rayon-stats.dto';
import {
  AreaStatsDto,
  WorkerStatusDto,
  TaskSummaryDto,
  StaffRequirementStatusDto,
} from './dto/area-stats.dto';
import {
  LiveWorkersResponseDto,
  LiveWorkerDto,
  LiveWorkersFilterDto,
} from './dto/live-workers.dto';

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

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
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
    const rayonSummaries: RayonSummaryDto[] = [];

    let totalWorkers = 0;
    let workersOnline = 0;
    let workersOffline = 0;
    let totalAreas = 0;

    for (const rayon of rayons) {
      const summary = await this.getRayonSummary(rayon);
      rayonSummaries.push(summary);

      totalWorkers += summary.worker_count;
      workersOnline += summary.workers_online;
      workersOffline += summary.workers_offline;
      totalAreas += summary.area_count;
    }

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

    // Get reports submitted today
    const reportsToday = await this.reportRepository.count({
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
      reports_submitted_today: reportsToday,
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

    const areaSummaries: AreaSummaryDto[] = [];
    let totalWorkers = 0;
    let workersOnline = 0;
    let workersOffline = 0;
    const alerts: string[] = [];

    for (const area of areas) {
      const summary = await this.getAreaSummary(area);
      areaSummaries.push(summary);

      totalWorkers += summary.workers_online + summary.workers_offline;
      workersOnline += summary.workers_online;
      workersOffline += summary.workers_offline;

      if (!summary.is_fully_staffed) {
        alerts.push(`${area.name} - needs ${Math.abs(summary.staffing_delta)} more workers`);
      }
    }

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

    // Get reports count
    const reportsToday = await this.countReportsByAreaIds(areaIds, today);

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
      reports_submitted_today: reportsToday,
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
        [
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.ACCEPTED,
          TaskStatus.IN_PROGRESS,
        ].includes(t.status),
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

    // Get reports count
    const reportsToday = await this.reportRepository.count({
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
      total_workers_assigned: workers.length,
      workers_online: workersOnline,
      workers_offline: workersOffline,
      is_fully_staffed: isFullyStaffed,
      staff_requirements: staffRequirements,
      workers,
      tasks_total: tasks.length,
      tasks_pending: tasksPending,
      tasks_in_progress: tasksInProgress,
      tasks_completed_today: tasksCompletedToday,
      active_tasks: activeTasks,
      reports_submitted_today: reportsToday,
      alerts,
      generated_at: new Date(),
    };
  }

  /**
   * Get live worker positions
   *
   * @param filters - Optional filters
   * @returns Live worker positions
   */
  async getLiveWorkers(filters?: LiveWorkersFilterDto): Promise<LiveWorkersResponseDto> {
    this.logger.log('Fetching live worker positions');

    // Get workers with active shifts
    const queryBuilder = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.worker', 'worker')
      .leftJoinAndSelect('shift.area', 'area')
      .where('shift.clock_out_time IS NULL');

    if (filters?.area_id) {
      queryBuilder.andWhere('shift.area_id = :areaId', { areaId: filters.area_id });
    }

    if (filters?.rayon_id) {
      queryBuilder.andWhere('area.rayon_id = :rayonId', { rayonId: filters.rayon_id });
    }

    if (filters?.role) {
      queryBuilder.andWhere('worker.role = :role', { role: filters.role });
    }

    const activeShifts = await queryBuilder.getMany();

    const workers: LiveWorkerDto[] = [];
    let totalOnline = 0;
    let totalOffline = 0;

    for (const shift of activeShifts) {
      // Get latest location for this shift
      const latestLocation = await this.locationRepository.findOne({
        where: { shift_id: shift.id },
        order: { logged_at: 'DESC' },
      });

      // Consider online if location updated within last 10 minutes
      const isOnline = !!(
        latestLocation && new Date().getTime() - latestLocation.logged_at.getTime() < 10 * 60 * 1000
      );

      if (isOnline) {
        totalOnline++;
      } else {
        totalOffline++;
      }

      // Get current task if any
      const currentTask = await this.taskRepository.findOne({
        where: {
          assigned_to: shift.worker_id,
          status: TaskStatus.IN_PROGRESS,
        },
      });

      // Get rayon name if area has rayon_id
      let rayonName: string | null = null;
      if (shift.area?.rayon_id) {
        const rayon = await this.rayonRepository.findOne({ where: { id: shift.area.rayon_id } });
        rayonName = rayon?.name || null;
      }

      workers.push({
        id: shift.worker.id,
        full_name: shift.worker.full_name,
        role: shift.worker.role,
        area_id: shift.area_id,
        area_name: shift.area?.name || 'Unknown',
        rayon_id: shift.area?.rayon_id || null,
        rayon_name: rayonName,
        latitude: latestLocation ? parseFloat(latestLocation.gps_lat.toString()) : 0,
        longitude: latestLocation ? parseFloat(latestLocation.gps_lng.toString()) : 0,
        accuracy: latestLocation?.accuracy_meters
          ? parseFloat(latestLocation.accuracy_meters.toString())
          : null,
        battery_level: latestLocation?.battery_level || null,
        last_update: latestLocation?.logged_at || shift.clock_in_time,
        is_within_area: true, // Simplified - would need GPS calculation
        shift_id: shift.id,
        shift_name: 'Active Shift', // Would need shift definition relation
        clock_in_time: shift.clock_in_time,
        current_task_status: currentTask?.status || null,
        current_task_title: currentTask?.title || null,
      });
    }

    return {
      total_online: totalOnline,
      total_offline: totalOffline,
      workers,
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
  private async getAreaWorkers(areaId: string): Promise<WorkerStatusDto[]> {
    const activeShifts = await this.shiftRepository.find({
      where: { area_id: areaId, clock_out_time: IsNull() },
      relations: ['worker'],
    });

    const workers: WorkerStatusDto[] = [];

    for (const shift of activeShifts) {
      const latestLocation = await this.locationRepository.findOne({
        where: { shift_id: shift.id },
        order: { logged_at: 'DESC' },
      });

      const isOnline = !!(
        latestLocation && new Date().getTime() - latestLocation.logged_at.getTime() < 10 * 60 * 1000
      );

      workers.push({
        id: shift.worker.id,
        full_name: shift.worker.full_name,
        role: shift.worker.role,
        is_online: isOnline,
        last_lat: latestLocation ? parseFloat(latestLocation.gps_lat.toString()) : null,
        last_lng: latestLocation ? parseFloat(latestLocation.gps_lng.toString()) : null,
        last_location_update: latestLocation?.logged_at || null,
        is_within_area: true, // Simplified - would need GPS calculation
        current_shift_id: shift.id,
        clock_in_time: shift.clock_in_time,
      });
    }

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

    const result: StaffRequirementStatusDto[] = [];

    for (const req of requirements) {
      const currentCount = await this.shiftRepository.count({
        where: {
          area_id: areaId,
          clock_out_time: IsNull(),
        },
        relations: ['worker'],
      });

      // Filter by role if needed (simplified)
      const delta = currentCount - req.required_count;

      result.push({
        id: req.id,
        role: req.role,
        required_count: req.required_count,
        current_count: currentCount,
        delta,
        is_met: delta >= 0,
      });
    }

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
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await this.locationRepository
      .createQueryBuilder('location')
      .innerJoin('location.shift', 'shift')
      .where('shift.area_id IN (:...areaIds)', { areaIds })
      .andWhere('shift.clock_out_time IS NULL')
      .andWhere('location.logged_at >= :tenMinutesAgo', { tenMinutesAgo })
      .select('COUNT(DISTINCT shift.worker_id)', 'count')
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

  private async countReportsByAreaIds(
    areaIds: string[],
    today: { start: Date; end: Date },
  ): Promise<number> {
    if (areaIds.length === 0) return 0;
    return this.reportRepository
      .createQueryBuilder('report')
      .where('report.area_id IN (:...areaIds)', { areaIds })
      .andWhere('report.created_at BETWEEN :start AND :end', today)
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
