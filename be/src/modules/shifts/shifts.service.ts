import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Shift } from './entities/shift.entity';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AreasService } from '../areas/areas.service';
import { WorkerAssignmentsService } from '../worker-assignments/worker-assignments.service';
import { S3Service } from '../../shared/services/s3.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  MINIMUM_SHIFT_DURATION_MS,
  MINIMUM_SHIFT_DURATION_MINUTES,
} from '../../common/constants/shift.constants';
import { WorkerSchedule } from '../worker-schedules/entities/worker-schedule.entity';
import { WorkerAssignment } from '../worker-assignments/entities/worker-assignment.entity';
import { Area } from '../areas/entities/area.entity';

/**
 * Service for managing worker shifts
 *
 * Handles clock-in/out operations with GPS recording and photo uploads.
 * Phase 2C: GPS boundary validation removed, area auto-detection added.
 */
@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(WorkerSchedule)
    private readonly workerScheduleRepo: Repository<WorkerSchedule>,
    @InjectRepository(WorkerAssignment)
    private readonly workerAssignmentRepo: Repository<WorkerAssignment>,
    private readonly areasService: AreasService,
    private readonly workerAssignmentsService: WorkerAssignmentsService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Get active area for a worker
   * Checks WorkerSchedule (primary) then WorkerAssignment (fallback)
   *
   * @param userId Worker UUID
   * @returns Area entity or null if no assignment found
   */
  async getActiveArea(userId: string): Promise<Area | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check WorkerSchedule (PRIMARY - uses user_id, effective_date)
    const schedule = await this.workerScheduleRepo.findOne({
      where: {
        user_id: userId,
        effective_date: LessThanOrEqual(today),
      },
      relations: ['area'],
      order: { effective_date: 'DESC' },
    });
    if (schedule?.area) return schedule.area;

    // 2. Fallback to WorkerAssignment (deprecated)
    const assignment = await this.workerAssignmentRepo.findOne({
      where: { worker_id: userId },
      relations: ['area'],
    });
    if (assignment?.area) return assignment.area;

    return null;
  }

  /**
   * Clock in to start a shift
   * Phase 2C: GPS boundary validation removed, area auto-detection added
   *
   * @param workerId Worker UUID
   * @param dto Clock-in data (optional area_id, GPS, selfie photo)
   * @returns Created shift entity
   * @throws BadRequestException if already clocked in
   */
  async clockIn(workerId: string, dto: ClockInDto): Promise<Shift> {
    this.logger.log(`Worker ${workerId} attempting to clock in`);

    // 1. Check if worker already has an active shift
    const activeShift = await this.findActiveShift(workerId);
    if (activeShift) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_ALREADY_ACTIVE,
        `Already clocked in. Active shift ID: ${activeShift.id}`,
        { activeShiftId: activeShift.id },
      );
    }

    // 2. Get area: from DTO or auto-detect
    let area: Area | null = null;
    if (dto.area_id) {
      area = await this.areasService.findOne(dto.area_id);
    } else {
      area = await this.getActiveArea(workerId);
    }
    // area can be null - allow clock-in without area (GPS still recorded)

    // 3. Upload selfie to S3
    let photoUrl: string;
    try {
      const photoData = dto.selfie_photo.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      const photoBuffer = Buffer.from(photoData, 'base64');
      const filename = `${uuid()}.jpg`;
      const key = this.s3Service.generateKey('clock-in', filename);
      photoUrl = await this.s3Service.uploadFile(photoBuffer, key, 'image/jpeg');
    } catch (error) {
      this.logger.error(`Failed to upload selfie photo: ${error.message}`, error.stack);
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_PHOTO_UPLOAD_FAILED,
        'Failed to upload selfie photo',
        { error: error.message },
      );
    }

    // 4. Create shift record
    const shift = this.shiftRepository.create({
      worker_id: workerId,
      area_id: area?.id || null,
      clock_in_time: new Date(),
      clock_in_gps_lat: dto.gps_lat,
      clock_in_gps_lng: dto.gps_lng,
      clock_in_photo_url: photoUrl,
    });

    const savedShift = await this.shiftRepository.save(shift);
    this.logger.log(
      `Worker ${workerId} clocked in successfully. Shift ID: ${savedShift.id}, Area: ${area?.name || 'None'}`,
    );

    return savedShift;
  }

  /**
   * Clock out to end a shift
   *
   * @param workerId Worker UUID
   * @param dto Clock-out data (GPS coordinates)
   * @returns Updated shift entity
   * @throws BadRequestException if no active shift found
   */
  async clockOut(workerId: string, dto: ClockOutDto): Promise<Shift> {
    this.logger.log(`Worker ${workerId} attempting to clock out`);

    // Find active shift
    const shift = await this.shiftRepository.findOne({
      where: {
        worker_id: workerId,
        clock_out_time: IsNull(),
      },
      relations: ['area'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_NOT_ACTIVE,
        'No active shift found',
      );
    }

    // Check minimum shift duration (15 minutes)
    const shiftDurationMs = Date.now() - shift.clock_in_time.getTime();

    if (shiftDurationMs < MINIMUM_SHIFT_DURATION_MS) {
      const minutesWorked = Math.floor(shiftDurationMs / (60 * 1000));
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_DURATION_TOO_SHORT,
        `Shift duration too short. Minimum ${MINIMUM_SHIFT_DURATION_MINUTES} minutes required. Current duration: ${minutesWorked} minutes`,
        {
          minutesWorked,
          minimumRequired: MINIMUM_SHIFT_DURATION_MINUTES,
          clockInTime: shift.clock_in_time.toISOString(),
        },
      );
    }

    // Update shift with clock-out details
    shift.clock_out_time = new Date();
    shift.clock_out_gps_lat = dto.gps_lat;
    shift.clock_out_gps_lng = dto.gps_lng;

    const updatedShift = await this.shiftRepository.save(shift);

    const hoursWorked = this.calculateHoursWorked(shift.clock_in_time, shift.clock_out_time);
    this.logger.log(`Worker ${workerId} clocked out successfully. Hours worked: ${hoursWorked}`);

    return updatedShift;
  }

  /**
   * Get active shift for a worker
   *
   * @param workerId Worker UUID
   * @returns Active shift or null if not clocked in
   */
  async findActiveShift(workerId: string): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: {
        worker_id: workerId,
        clock_out_time: IsNull(),
      },
      relations: ['area', 'area.areaType', 'worker'],
    });
  }

  /**
   * Get shift by ID
   *
   * @param id Shift UUID
   * @returns Shift entity
   * @throws NotFoundException if shift not found
   */
  async findOne(id: string): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: ['area', 'area.areaType', 'worker'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.SHIFT_NOT_FOUND,
        `Shift with ID ${id} not found`,
      );
    }

    return shift;
  }

  /**
   * Get all shifts for a worker
   *
   * @param workerId Worker UUID
   * @param limit Maximum number of results (default: 50)
   * @returns Array of shifts ordered by clock-in time descending
   */
  async findByWorkerId(workerId: string, limit = 50): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { worker_id: workerId },
      relations: ['area', 'area.areaType'],
      order: { clock_in_time: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get all shifts for an area
   *
   * @param areaId Area UUID
   * @param limit Maximum number of results (default: 100)
   * @returns Array of shifts ordered by clock-in time descending
   */
  async findByAreaId(areaId: string, limit = 100): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { area_id: areaId },
      relations: ['worker'],
      order: { clock_in_time: 'DESC' },
      take: limit,
    });
  }

  /**
   * Calculate hours worked in a shift
   *
   * @param clockInTime Clock-in timestamp
   * @param clockOutTime Clock-out timestamp (if null, uses current time)
   * @returns Hours worked rounded to 2 decimal places
   */
  calculateHoursWorked(clockInTime: Date, clockOutTime: Date | null): number {
    const end = clockOutTime || new Date();
    const diffMs = end.getTime() - clockInTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.round(hours * 100) / 100;
  }

  /**
   * Get all active shifts (for supervisor dashboard)
   *
   * @returns Array of active shifts with worker and area details
   */
  async findAllActiveShifts(): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { clock_out_time: IsNull() },
      relations: ['worker', 'area', 'area.areaType'],
      order: { clock_in_time: 'ASC' },
    });
  }

  /**
   * Get all active shifts with pagination (for supervisor dashboard)
   *
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated active shifts with worker and area details
   */
  async findAllActiveShiftsPaginated(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Shift>> {
    const [data, total] = await this.shiftRepository.findAndCount({
      where: { clock_out_time: IsNull() },
      relations: ['worker', 'area', 'area.areaType'],
      order: { clock_in_time: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
