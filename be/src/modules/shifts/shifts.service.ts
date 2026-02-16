import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, Or, MoreThanOrEqual } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Shift } from './entities/shift.entity';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { AreasService } from '../areas/areas.service';
import { S3Service } from '../../shared/services/s3.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { GpsUtil } from '../../common/utils/gps.util';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  MINIMUM_SHIFT_DURATION_MS,
  MINIMUM_SHIFT_DURATION_MINUTES,
} from '../../common/constants/shift.constants';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Area } from '../areas/entities/area.entity';

/**
 * Service for managing user shifts
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
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    private readonly areasService: AreasService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Get active area for a user
   * Checks Schedule using effective_date and end_date
   *
   * @param userId User UUID
   * @returns Area entity or null if no assignment found
   */
  async getActiveArea(userId: string): Promise<Area | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check Schedule (uses user_id, effective_date)
    const schedule = await this.scheduleRepo.findOne({
      where: {
        user_id: userId,
        effective_date: LessThanOrEqual(today),
        end_date: Or(IsNull(), MoreThanOrEqual(today)),
      },
      relations: ['area'],
      order: { effective_date: 'DESC' },
    });
    if (schedule?.area) return schedule.area;

    return null;
  }

  /**
   * Clock in to start a shift
   * Phase 2C: GPS boundary validation removed, area auto-detection added
   *
   * @param userId User UUID
   * @param dto Clock-in data (optional area_id, GPS, selfie photo)
   * @returns Created shift entity
   * @throws BadRequestException if already clocked in
   */
  async clockIn(userId: string, dto: ClockInDto): Promise<Shift> {
    this.logger.log(`User ${userId} attempting to clock in`);

    // 1. Check if user already has an active shift
    const activeShift = await this.findActiveShift(userId);
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
      area = await this.getActiveArea(userId);
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

    // 4. Check boundary (soft geofencing — never blocks clock-in)
    let clockInOutsideBoundary = false;
    if (area) {
      const isWithin = GpsUtil.isWithinAreaBoundary(dto.gps_lat, dto.gps_lng, area);
      clockInOutsideBoundary = !isWithin;
      if (clockInOutsideBoundary) {
        this.logger.warn(`User ${userId} clocking in outside area boundary: ${area.name}`);
      }
    }

    // 5. Create shift record
    const shift = this.shiftRepository.create({
      user_id: userId,
      area_id: area?.id || null,
      clock_in_time: new Date(),
      clock_in_gps_lat: dto.gps_lat,
      clock_in_gps_lng: dto.gps_lng,
      clock_in_photo_url: photoUrl,
      clock_in_outside_boundary: clockInOutsideBoundary,
    });

    const savedShift = await this.shiftRepository.save(shift);
    this.logger.log(
      `User ${userId} clocked in successfully. Shift ID: ${savedShift.id}, Area: ${area?.name || 'None'}`,
    );

    return savedShift;
  }

  /**
   * Clock out to end a shift
   *
   * @param userId User UUID
   * @param dto Clock-out data (GPS coordinates)
   * @returns Updated shift entity
   * @throws BadRequestException if no active shift found
   */
  async clockOut(userId: string, dto: ClockOutDto): Promise<Shift> {
    this.logger.log(`User ${userId} attempting to clock out`);

    // Find active shift
    const shift = await this.shiftRepository.findOne({
      where: {
        user_id: userId,
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

    // Check boundary (soft geofencing — never blocks clock-out)
    let clockOutOutsideBoundary = false;
    if (shift.area) {
      const isWithin = GpsUtil.isWithinAreaBoundary(dto.gps_lat, dto.gps_lng, shift.area);
      clockOutOutsideBoundary = !isWithin;
      if (clockOutOutsideBoundary) {
        this.logger.warn(`User ${userId} clocking out outside area boundary: ${shift.area.name}`);
      }
    }

    // Update shift with clock-out details
    shift.clock_out_time = new Date();
    shift.clock_out_gps_lat = dto.gps_lat;
    shift.clock_out_gps_lng = dto.gps_lng;
    shift.clock_out_outside_boundary = clockOutOutsideBoundary;

    const updatedShift = await this.shiftRepository.save(shift);

    const hoursWorked = this.calculateHoursWorked(shift.clock_in_time, shift.clock_out_time);
    this.logger.log(`User ${userId} clocked out successfully. Hours worked: ${hoursWorked}`);

    return updatedShift;
  }

  /**
   * Get active shift for a user
   *
   * @param userId User UUID
   * @returns Active shift or null if not clocked in
   */
  async findActiveShift(userId: string): Promise<Shift | null> {
    return this.shiftRepository.findOne({
      where: {
        user_id: userId,
        clock_out_time: IsNull(),
      },
      relations: ['area', 'area.areaType', 'user'],
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
      relations: ['area', 'area.areaType', 'user'],
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
   * Get all shifts for a user
   *
   * @param userId User UUID
   * @param limit Maximum number of results (default: 50)
   * @returns Array of shifts ordered by clock-in time descending
   */
  async findByUserId(userId: string, limit = 50): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { user_id: userId },
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
      relations: ['user'],
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
   * Get all active shifts (for management dashboard)
   *
   * @returns Array of active shifts with user and area details
   */
  async findAllActiveShifts(): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { clock_out_time: IsNull() },
      relations: ['user', 'area', 'area.areaType'],
      order: { clock_in_time: 'ASC' },
    });
  }

  /**
   * Get all active shifts with pagination (for management dashboard)
   *
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated active shifts with user and area details
   */
  async findAllActiveShiftsPaginated(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Shift>> {
    const [data, total] = await this.shiftRepository.findAndCount({
      where: { clock_out_time: IsNull() },
      relations: ['user', 'area', 'area.areaType'],
      order: { clock_in_time: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
