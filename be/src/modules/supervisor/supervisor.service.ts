import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between } from 'typeorm';
import { Shift } from '../shifts/entities/shift.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { WorkerAssignment } from '../worker-assignments/entities/worker-assignment.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { ActiveWorkersResponseDto, ActiveWorkerDto } from './dto/active-workers-response.dto';
import { AreaStatusResponseDto, AreaStatusDto } from './dto/area-status-response.dto';
import { AttendanceResponseDto, NotClockedInWorkerDto } from './dto/attendance-response.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

/**
 * Supervisor Service
 *
 * Provides dashboard queries for supervisors:
 * - Active workers with real-time locations
 * - Area status overview
 * - Daily attendance reports
 */
@Injectable()
export class SupervisorService {
  private readonly logger = new Logger(SupervisorService.name);

  constructor(
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Area)
    private areasRepository: Repository<Area>,
    @InjectRepository(WorkerAssignment)
    private workerAssignmentsRepository: Repository<WorkerAssignment>,
    @InjectRepository(LocationLog)
    private locationLogsRepository: Repository<LocationLog>,
  ) {}

  /**
   * Get all active workers with their current shift and latest location
   *
   * @returns List of active workers
   */
  async getActiveWorkers(): Promise<ActiveWorkersResponseDto> {
    this.logger.log('Fetching active workers');

    // Query for workers with active shifts (clock_in but no clock_out)
    const activeShifts = await this.shiftsRepository.find({
      where: { clock_out_time: IsNull() },
      relations: ['worker', 'area'],
      order: { clock_in_time: 'DESC' },
    });

    // For each worker, get latest location
    const workers: ActiveWorkerDto[] = await Promise.all(
      activeShifts.map(async (shift) => {
        const latestLocation = await this.locationLogsRepository.findOne({
          where: {
            worker_id: shift.worker.id,
            shift_id: shift.id,
          },
          order: { logged_at: 'DESC' },
        });

        return {
          id: shift.worker.id,
          username: shift.worker.username,
          full_name: shift.worker.full_name,
          shift: {
            id: shift.id,
            clock_in_time: shift.clock_in_time,
            area: shift.area
              ? { id: shift.area.id, name: shift.area.name }
              : null,
          },
          latest_location: latestLocation
            ? {
                gps_lat: latestLocation.gps_lat,
                gps_lng: latestLocation.gps_lng,
                logged_at: latestLocation.logged_at,
              }
            : null,
        };
      }),
    );

    return { workers };
  }

  /**
   * Get paginated active workers with their current shift and latest location
   *
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated list of active workers
   */
  async getActiveWorkersPaginated(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<ActiveWorkerDto>> {
    this.logger.log(`Fetching active workers with pagination: page=${page}, limit=${limit}`);

    // Query for workers with active shifts (clock_in but no clock_out)
    const [activeShifts, total] = await this.shiftsRepository.findAndCount({
      where: { clock_out_time: IsNull() },
      relations: ['worker', 'area'],
      order: { clock_in_time: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // For each worker, get latest location
    const workers: ActiveWorkerDto[] = await Promise.all(
      activeShifts.map(async (shift) => {
        const latestLocation = await this.locationLogsRepository.findOne({
          where: {
            worker_id: shift.worker.id,
            shift_id: shift.id,
          },
          order: { logged_at: 'DESC' },
        });

        return {
          id: shift.worker.id,
          username: shift.worker.username,
          full_name: shift.worker.full_name,
          shift: {
            id: shift.id,
            clock_in_time: shift.clock_in_time,
            area: shift.area
              ? { id: shift.area.id, name: shift.area.name }
              : null,
          },
          latest_location: latestLocation
            ? {
                gps_lat: latestLocation.gps_lat,
                gps_lng: latestLocation.gps_lng,
                logged_at: latestLocation.logged_at,
              }
            : null,
        };
      }),
    );

    return new PaginatedResponseDto(workers, total, page, limit);
  }

  /**
   * Get status overview of all areas
   *
   * @returns Area statistics
   */
  async getAreaStatus(): Promise<AreaStatusResponseDto> {
    this.logger.log('Fetching area status');

    // Get all active areas
    const areas = await this.areasRepository.find({
      where: { is_active: true },
    });

    // For each area, count assigned workers and active workers
    const areaStatuses: AreaStatusDto[] = await Promise.all(
      areas.map(async (area) => {
        const assignedCount = await this.workerAssignmentsRepository.count({
          where: { area_id: area.id },
        });

        const activeCount = await this.shiftsRepository.count({
          where: {
            area_id: area.id,
            clock_out_time: IsNull(),
          },
        });

        return {
          id: area.id,
          name: area.name,
          assigned_workers_count: assignedCount,
          active_workers_count: activeCount,
        };
      }),
    );

    return { areas: areaStatuses };
  }

  /**
   * Get daily attendance report
   *
   * @param date Target date (ISO format, defaults to today)
   * @returns Attendance statistics
   */
  async getAttendance(date?: string): Promise<AttendanceResponseDto> {
    // Get date parameter (default: today)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(`Fetching attendance for ${targetDate.toISOString().split('T')[0]}`);

    // Get all active workers
    const allWorkers = await this.usersRepository.find({
      where: { role: UserRole.SATGAS, is_active: true },
    });

    // Get workers who clocked in today
    const clockedInShifts = await this.shiftsRepository.find({
      where: {
        clock_in_time: Between(startOfDay, endOfDay),
      },
      relations: ['worker'],
    });

    const clockedInWorkerIds = clockedInShifts.map((s) => s.worker.id);

    // Get worker assignments for not-clocked-in workers
    const notClockedInWorkers = allWorkers.filter((w) => !clockedInWorkerIds.includes(w.id));

    const notClockedIn: NotClockedInWorkerDto[] = await Promise.all(
      notClockedInWorkers.map(async (worker) => {
        const assignment = await this.workerAssignmentsRepository.findOne({
          where: { worker_id: worker.id },
          relations: ['area'],
        });

        return {
          id: worker.id,
          username: worker.username,
          full_name: worker.full_name,
          area: assignment?.area
            ? {
                id: assignment.area.id,
                name: assignment.area.name,
              }
            : null,
        };
      }),
    );

    return {
      date: targetDate.toISOString().split('T')[0],
      total_workers: allWorkers.length,
      clocked_in_count: clockedInWorkerIds.length,
      not_clocked_in: notClockedIn,
    };
  }

  /**
   * Get paginated daily attendance report
   *
   * @param date Target date (ISO format, defaults to today)
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated attendance statistics
   */
  async getAttendancePaginated(
    date?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    date: string;
    total_workers: number;
    clocked_in_count: number;
    not_clocked_in: PaginatedResponseDto<NotClockedInWorkerDto>;
  }> {
    // Get date parameter (default: today)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(`Fetching paginated attendance for ${targetDate.toISOString().split('T')[0]}`);

    // Get all active workers
    const allWorkers = await this.usersRepository.find({
      where: { role: UserRole.SATGAS, is_active: true },
    });

    // Get workers who clocked in today
    const clockedInShifts = await this.shiftsRepository.find({
      where: {
        clock_in_time: Between(startOfDay, endOfDay),
      },
      relations: ['worker'],
    });

    const clockedInWorkerIds = clockedInShifts.map((s) => s.worker.id);

    // Get worker assignments for not-clocked-in workers
    const notClockedInWorkers = allWorkers.filter((w) => !clockedInWorkerIds.includes(w.id));

    // Apply pagination
    const total = notClockedInWorkers.length;
    const paginatedWorkers = notClockedInWorkers.slice((page - 1) * limit, page * limit);

    const notClockedIn: NotClockedInWorkerDto[] = await Promise.all(
      paginatedWorkers.map(async (worker) => {
        const assignment = await this.workerAssignmentsRepository.findOne({
          where: { worker_id: worker.id },
          relations: ['area'],
        });

        return {
          id: worker.id,
          username: worker.username,
          full_name: worker.full_name,
          area: assignment?.area
            ? {
                id: assignment.area.id,
                name: assignment.area.name,
              }
            : null,
        };
      }),
    );

    return {
      date: targetDate.toISOString().split('T')[0],
      total_workers: allWorkers.length,
      clocked_in_count: clockedInWorkerIds.length,
      not_clocked_in: new PaginatedResponseDto(notClockedIn, total, page, limit),
    };
  }
}
