import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { UserLocation } from '../user-locations/entities/user-location.entity';
import { RedisService } from '../../common/services/redis.service';
import { PerformanceScoreService } from './services/performance-score.service';
import { WorkerAnalyticsDto } from './dto/worker-analytics.dto';
import { LocationAnalyticsDto } from './dto/location-analytics.dto';
import { OperationalAnalyticsDto } from './dto/operational-analytics.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { WorkerAnalyticsQueryDto } from './dto/worker-analytics-query.dto';
import { LocationAnalyticsQueryDto } from './dto/location-analytics-query.dto';
import { OperationalQueryDto } from './dto/operational-query.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Location) private areaRepo: Repository<Location>,
    @InjectRepository(Rayon) private rayonRepo: Repository<Rayon>,
    @InjectRepository(UserLocation) private userAreaRepo: Repository<UserLocation>,
    private redis: RedisService,
    private performanceScoreService: PerformanceScoreService,
  ) {}

  async getDashboardSummary(user: User): Promise<DashboardSummaryDto> {
    const cacheKey = `analytics:dashboard:${user.id}:${new Date().toISOString().slice(0, 10)}`;
    const cached = await this.getCached<DashboardSummaryDto>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    const todayMetrics = await this.getMetricsForDate(today, user);
    const trendMetrics = await this.getTrends(user);
    const alertMetrics = await this.getAlerts(user);

    const summary: DashboardSummaryDto = {
      today: {
        attendanceRate: todayMetrics.attendanceRate,
        activeWorkers: todayMetrics.activeWorkers,
        tasksCompleted: todayMetrics.tasksCompleted,
        activitiesSubmitted: todayMetrics.activitiesSubmitted,
        openTasks: todayMetrics.openTasks,
        overtimeHours: todayMetrics.overtimeHours,
      },
      trends: {
        attendance: trendMetrics.attendance,
        taskCompletion: trendMetrics.taskCompletion,
        activities: trendMetrics.activities,
      },
      alerts: {
        understaffedAreas: alertMetrics.understaffedAreas,
        overdueMaintenances: alertMetrics.overdueMaintenances,
        missingWorkers: alertMetrics.missingWorkers,
        overdueTasks: alertMetrics.overdueTasks,
      },
    };

    await this.setCached(cacheKey, summary, CACHE_TTL);
    return summary;
  }

  async listWorkers(
    user: User,
    query: WorkerAnalyticsQueryDto,
  ): Promise<PaginatedResponseDto<WorkerAnalyticsDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u').where('u.deleted_at IS NULL');

    this.applyWorkerScope(qb, user);

    if (query.location_id) {
      qb.andWhere('u.location_id = :locationId', { locationId: query.location_id });
    }
    if (query.rayon_id) {
      qb.andWhere('u.rayon_id = :rayonId', { rayonId: query.rayon_id });
    }
    if (query.search) {
      qb.andWhere('LOWER(u.full_name) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    const [users, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const dateStr = new Date().toISOString().slice(0, 10);
    const data = await Promise.all(users.map((u) => this.buildWorkerAnalytics(u.id, dateStr, u)));

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getWorker(
    id: string,
    user: User,
    query: WorkerAnalyticsQueryDto,
  ): Promise<WorkerAnalyticsDto> {
    this.enforceWorkerAccess(id, user);

    const worker = await this.userRepo.findOne({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found');

    const dateStr = query.date_from ?? new Date().toISOString().slice(0, 10);
    return this.buildWorkerAnalytics(id, dateStr, worker);
  }

  async listAreas(
    user: User,
    query: LocationAnalyticsQueryDto,
  ): Promise<PaginatedResponseDto<LocationAnalyticsDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const qb = this.areaRepo.createQueryBuilder('a').where('a.deleted_at IS NULL');

    this.applyAreaScope(qb, user);

    if (query.rayon_id) {
      qb.andWhere('a.rayon_id = :rayonId', { rayonId: query.rayon_id });
    }
    if (query.search) {
      qb.andWhere('LOWER(a.name) LIKE LOWER(:search)', { search: `%${query.search}%` });
    }

    const [areas, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const dateStr = query.date_from ?? new Date().toISOString().slice(0, 10);
    const data = await Promise.all(
      areas.map((a) => this.buildAreaAnalytics(a.id, dateStr, a.name)),
    );

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getArea(
    id: string,
    user: User,
    query: LocationAnalyticsQueryDto,
  ): Promise<LocationAnalyticsDto> {
    const area = await this.areaRepo.findOne({ where: { id } });
    if (!area) throw new NotFoundException('Location not found');

    await this.enforceAreaAccess(user, area);

    const dateStr = query.date_from ?? new Date().toISOString().slice(0, 10);
    return this.buildAreaAnalytics(id, dateStr, area.name);
  }

  async getOperational(query: OperationalQueryDto): Promise<OperationalAnalyticsDto> {
    const dateStr = query.date_from ?? new Date().toISOString().slice(0, 10);
    const cacheKey = `analytics:operational:${dateStr}`;
    const cached = await this.getCached<OperationalAnalyticsDto>(cacheKey);
    if (cached) return cached;

    const data = await this.buildOperationalAnalytics(dateStr);
    await this.setCached(cacheKey, data, CACHE_TTL);
    return data;
  }

  async getOperationalTrends(query: OperationalQueryDto): Promise<OperationalAnalyticsDto[]> {
    const startDate = query.date_from ?? new Date().toISOString().slice(0, 10);
    const endDate = query.date_to ?? new Date().toISOString().slice(0, 10);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const trends: OperationalAnalyticsDto[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      trends.push(await this.buildOperationalAnalytics(dateStr));
    }

    return trends;
  }

  async refreshViews(): Promise<void> {
    const start = Date.now();
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY worker_performance_daily');
      await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY area_metrics_daily');
      await queryRunner.query('REFRESH MATERIALIZED VIEW CONCURRENTLY operational_metrics_daily');
      await queryRunner.release();

      const duration = Date.now() - start;
      this.logger.log(`Materialized views refreshed in ${duration}ms`);

      await this.clearAnalyticsCache();
    } catch (err) {
      this.logger.error(`Failed to refresh materialized views: ${(err as Error).message}`);
    }
  }

  private async buildWorkerAnalytics(
    workerId: string,
    dateStr: string,
    worker: User,
  ): Promise<WorkerAnalyticsDto> {
    const result = await this.dataSource.query(
      `SELECT * FROM worker_performance_daily WHERE user_id = $1 AND date = $2`,
      [workerId, dateStr],
    );

    if (result.length === 0) {
      return this.emptyWorkerAnalytics(worker.id, worker.full_name, dateStr);
    }

    const row = result[0];
    const attendance = row.attended > 0 ? 100 : 0;
    const punctuality = row.late_minutes <= 15 && row.attended > 0 ? 100 : 0;
    const taskCompletion = row.total_tasks > 0 ? (row.completed_tasks / row.total_tasks) * 100 : 0;
    const activitySubmission = row.attended > 0 ? (row.total_activities / row.attended) * 100 : 0;
    const activityApproval =
      row.total_activities > 0 ? (row.approved_activities / row.total_activities) * 100 : 0;
    const areaCompliance =
      row.total_pings > 0 ? (row.within_area_pings / row.total_pings) * 100 : 0;

    const score = this.performanceScoreService.calculateScore(
      attendance,
      punctuality,
      taskCompletion,
      activitySubmission,
      activityApproval,
      areaCompliance,
    );

    return {
      id: worker.id,
      full_name: worker.full_name,
      date: dateStr,
      attended: row.attended,
      late_minutes: row.late_minutes,
      total_tasks: row.total_tasks,
      completed_tasks: row.completed_tasks,
      task_completion_rate: Math.round(taskCompletion * 100) / 100,
      total_activities: row.total_activities,
      approved_activities: row.approved_activities,
      activity_submission_rate: Math.round(activitySubmission * 100) / 100,
      activity_approval_rate: Math.round(activityApproval * 100) / 100,
      within_area_pings: row.within_area_pings,
      total_pings: row.total_pings,
      area_compliance: Math.round(areaCompliance * 100) / 100,
      overtime_hours: row.overtime_hours,
      performance_score: score,
      grade: this.performanceScoreService.getGrade(score),
      last_updated: new Date().toISOString(),
    };
  }

  private async buildAreaAnalytics(
    locationId: string,
    dateStr: string,
    areaName: string,
  ): Promise<LocationAnalyticsDto> {
    const result = await this.dataSource.query(
      `SELECT * FROM area_metrics_daily WHERE location_id = $1 AND date = $2`,
      [locationId, dateStr],
    );

    if (result.length === 0) {
      return this.emptyAreaAnalytics(locationId, areaName, dateStr);
    }

    const row = result[0];
    const staffing =
      row.required_workers > 0 ? (row.attended_workers / row.required_workers) * 100 : 0;

    return {
      id: locationId,
      area_name: areaName,
      date: dateStr,
      attended_workers: row.attended_workers,
      required_workers: row.required_workers,
      staffing_coverage: Math.round(staffing * 100) / 100,
      open_tasks: row.open_tasks_count,
      maintenance_count: row.maintenance_count,
      incident_rate: row.outside_area_events + row.missing_events,
      avg_worker_performance: 0,
      last_updated: new Date().toISOString(),
    };
  }

  private async buildOperationalAnalytics(dateStr: string): Promise<OperationalAnalyticsDto> {
    const result = await this.dataSource.query(
      `SELECT * FROM operational_metrics_daily WHERE date = $1`,
      [dateStr],
    );

    if (result.length === 0) {
      return this.emptyOperationalAnalytics(dateStr);
    }

    const row = result[0];
    const attendance =
      row.total_scheduled > 0 ? (row.total_attended / row.total_scheduled) * 100 : 0;
    const utilization =
      row.total_scheduled > 0 ? (row.total_attended / row.total_scheduled) * 100 : 0;
    const overtimeRatio =
      row.total_attended > 0 ? row.overtime_total_hours / (row.total_attended * 8) : 0;

    return {
      date: dateStr,
      system_attendance: Math.round(attendance * 100) / 100,
      task_throughput: row.tasks_completed,
      avg_response_hours: row.avg_task_duration_hours,
      overtime_ratio: Math.round(overtimeRatio * 100) / 100,
      worker_utilization: Math.round(utilization * 100) / 100,
      geofence_compliance: 95.0,
      last_updated: new Date().toISOString(),
    };
  }

  private async getMetricsForDate(
    dateStr: string,
    user: User,
  ): Promise<{
    attendanceRate: number;
    activeWorkers: number;
    tasksCompleted: number;
    activitiesSubmitted: number;
    openTasks: number;
    overtimeHours: number;
  }> {
    if (user.role === UserRole.SATGAS || user.role === UserRole.LINMAS) {
      const analytics = await this.buildWorkerAnalytics(user.id, dateStr, user);
      return {
        attendanceRate: analytics.performance_score,
        activeWorkers: analytics.attended,
        tasksCompleted: analytics.completed_tasks,
        activitiesSubmitted: analytics.total_activities,
        openTasks: 0,
        overtimeHours: analytics.overtime_hours,
      };
    }

    const result = await this.dataSource.query(
      `SELECT * FROM operational_metrics_daily WHERE date = $1`,
      [dateStr],
    );

    const row = result[0] || {};
    return {
      attendanceRate:
        row.total_scheduled > 0 ? (row.total_attended / row.total_scheduled) * 100 : 0,
      activeWorkers: row.total_attended || 0,
      tasksCompleted: row.tasks_completed || 0,
      activitiesSubmitted: 0,
      openTasks: 0,
      overtimeHours: row.overtime_total_hours || 0,
    };
  }

  private async getTrends(
    user: User,
  ): Promise<{ attendance: number[]; taskCompletion: number[]; activities: number[] }> {
    const trends = {
      attendance: [] as number[],
      taskCompletion: [] as number[],
      activities: [] as number[],
    };

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      const metrics = await this.getMetricsForDate(dateStr, user);
      trends.attendance.push(metrics.attendanceRate);
      trends.taskCompletion.push(metrics.tasksCompleted);
      trends.activities.push(metrics.activitiesSubmitted);
    }

    return trends;
  }

  private async getAlerts(user: User): Promise<{
    understaffedAreas: Array<{ locationId: string; areaName: string; deficit: number }>;
    overdueMaintenances: number;
    missingWorkers: number;
    overdueTasks: number;
  }> {
    return {
      understaffedAreas: [],
      overdueMaintenances: 0,
      missingWorkers: 0,
      overdueTasks: 0,
    };
  }

  private applyWorkerScope(qb: any, user: User): void {
    const adminRoles = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN, UserRole.TOP_MANAGEMENT];

    if (!adminRoles.includes(user.role)) {
      if (user.role === UserRole.KEPALA_RAYON) {
        qb.andWhere('u.rayon_id = :rayonId', { rayonId: user.rayon_id });
      } else if (user.role === UserRole.KORLAP) {
        qb.andWhere('u.location_id = :locationId', { locationId: user.location_id });
      } else if (user.role === UserRole.ADMIN_DATA) {
        qb.andWhere('u.location_id = :locationId', { locationId: user.location_id });
      }
    }
  }

  private applyAreaScope(qb: any, user: User): void {
    const adminRoles = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN, UserRole.TOP_MANAGEMENT];

    if (!adminRoles.includes(user.role)) {
      if (user.role === UserRole.KEPALA_RAYON) {
        qb.andWhere('a.rayon_id = :rayonId', { rayonId: user.rayon_id });
      } else if (user.role === UserRole.KORLAP) {
        qb.andWhere('a.id = :locationId', { locationId: user.location_id });
      }
    }
  }

  private enforceWorkerAccess(id: string, user: User): void {
    if (user.role === UserRole.SATGAS || user.role === UserRole.LINMAS) {
      if (id !== user.id) {
        throw new ForbiddenException('Cannot access other workers analytics');
      }
    }
  }

  /**
   * Enforce per-role area scoping for area analytics:
   * - top_management / admin_system / superadmin → all areas (global)
   * - kepala_rayon / admin_data → their own rayon (admin_data is rayon-scoped, ADR-033)
   * - korlap → their assigned areas (user_areas), not a single location_id
   */
  private async enforceAreaAccess(user: User, area: Location): Promise<void> {
    const { role } = user;
    if (
      role === UserRole.TOP_MANAGEMENT ||
      role === UserRole.ADMIN_SYSTEM ||
      role === UserRole.SUPERADMIN
    ) {
      return;
    }

    if (role === UserRole.KEPALA_RAYON || role === UserRole.ADMIN_DATA) {
      if (area.rayon_id !== user.rayon_id) {
        throw new ForbiddenException('Cannot access areas outside your rayon');
      }
      return;
    }

    if (role === UserRole.KORLAP) {
      const assigned = await this.userAreaRepo.find({ where: { user_id: user.id } });
      const locationIds = assigned.map((a) => a.location_id);
      if (!locationIds.includes(area.id)) {
        throw new ForbiddenException('Cannot access areas outside your assigned areas');
      }
      return;
    }

    // Any other role reaching this point is out of scope for area analytics.
    throw new ForbiddenException('You do not have access to area analytics');
  }

  private emptyWorkerAnalytics(id: string, name: string, dateStr: string): WorkerAnalyticsDto {
    return {
      id,
      full_name: name,
      date: dateStr,
      attended: 0,
      late_minutes: 0,
      total_tasks: 0,
      completed_tasks: 0,
      task_completion_rate: 0,
      total_activities: 0,
      approved_activities: 0,
      activity_submission_rate: 0,
      activity_approval_rate: 0,
      within_area_pings: 0,
      total_pings: 0,
      area_compliance: 0,
      overtime_hours: 0,
      performance_score: 0,
      grade: 'F',
      last_updated: new Date().toISOString(),
    };
  }

  private emptyAreaAnalytics(id: string, name: string, dateStr: string): LocationAnalyticsDto {
    return {
      id,
      area_name: name,
      date: dateStr,
      attended_workers: 0,
      required_workers: 0,
      staffing_coverage: 0,
      open_tasks: 0,
      maintenance_count: 0,
      incident_rate: 0,
      avg_worker_performance: 0,
      last_updated: new Date().toISOString(),
    };
  }

  private emptyOperationalAnalytics(dateStr: string): OperationalAnalyticsDto {
    return {
      date: dateStr,
      system_attendance: 0,
      task_throughput: 0,
      avg_response_hours: 0,
      overtime_ratio: 0,
      worker_utilization: 0,
      geofence_compliance: 0,
      last_updated: new Date().toISOString(),
    };
  }

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.getClient().get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      return null;
    }
  }

  private async setCached(key: string, value: any, ttl: number): Promise<void> {
    try {
      await this.redis.getClient().set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Failed to cache ${key}: ${(err as Error).message}`);
    }
  }

  private async clearAnalyticsCache(): Promise<void> {
    try {
      const keys = await this.redis.getClient().keys('analytics:*');
      if (keys.length > 0) {
        await this.redis.getClient().del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Failed to clear analytics cache: ${(err as Error).message}`);
    }
  }
}
