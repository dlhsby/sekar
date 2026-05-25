import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { LocationLog } from './entities/location-log.entity';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';
import { Shift } from '../shifts/entities/shift.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { StatusCalculatorService } from '../monitoring/services/status-calculator.service';

/**
 * Location Service
 *
 * Handles batch GPS location logging for worker tracking.
 * Supports efficient bulk inserts and querying location history.
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectRepository(LocationLog)
    private locationLogsRepository: Repository<LocationLog>,
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    private dataSource: DataSource,
    @Optional()
    @Inject(forwardRef(() => StatusCalculatorService))
    private readonly statusCalculator: StatusCalculatorService | undefined,
    @Optional()
    private readonly redisService: RedisService | undefined,
  ) {}

  /**
   * Batch insert location logs
   *
   * Users send multiple GPS pings at once for efficiency.
   * Uses transaction for atomic insert of all locations.
   *
   * @param dto Batch of location points
   * @param userId UUID of the user
   * @returns Number of locations inserted
   */
  async createBatch(dto: CreateLocationBatchDto, userId: string): Promise<{ count: number }> {
    this.logger.log(
      `User ${userId} uploading ${dto.locations.length} location logs for shift ${dto.shift_id}`,
    );

    // Validate shift exists and belongs to user
    const shift = await this.shiftsRepository.findOne({
      where: { id: dto.shift_id, user_id: userId },
    });

    if (!shift) {
      throw new NotFoundException(`Shift not found or does not belong to user ${userId}`);
    }

    // Validate shift is active (no clock_out_time)
    if (shift.clock_out_time) {
      throw new BadRequestException('Cannot upload locations for completed shift');
    }

    // Batch insert locations in a single transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const locationEntities = dto.locations.map((location) => {
        return this.locationLogsRepository.create({
          user_id: userId,
          shift_id: dto.shift_id,
          gps_lat: location.gps_lat,
          gps_lng: location.gps_lng,
          accuracy_meters: location.accuracy_meters,
          battery_level: location.battery_level,
          logged_at: new Date(location.logged_at),
        });
      });

      const savedLogs = await queryRunner.manager.save(LocationLog, locationEntities);
      await queryRunner.commitTransaction();

      this.logger.log(`Successfully inserted ${locationEntities.length} location logs`);

      if (savedLogs?.length > 0) {
        if (this.redisService) {
          // Phase 3: queue all pings to Redis Stream for async processing
          for (const log of savedLogs) {
            await this.redisService
              .streamAdd('location:pings', {
                userId,
                lat: log.gps_lat.toString(),
                lng: log.gps_lng.toString(),
                accuracy: log.accuracy_meters?.toString() ?? 'null',
                battery: log.battery_level?.toString() ?? 'null',
                loggedAt: log.logged_at.toISOString(),
              })
              .catch((e) => this.logger.warn(`Stream add failed for user ${userId}: ${e.message}`));
          }
        } else if (this.statusCalculator) {
          // Fallback: process only the latest ping synchronously (no Redis)
          const latestLog = savedLogs.reduce((a, b) => (a.logged_at > b.logged_at ? a : b));
          await this.statusCalculator
            .onLocationPing(
              userId,
              parseFloat(latestLog.gps_lat.toString()),
              parseFloat(latestLog.gps_lng.toString()),
              latestLog.accuracy_meters ? parseFloat(latestLog.accuracy_meters.toString()) : null,
              latestLog.battery_level ?? null,
              latestLog.logged_at,
            )
            .catch((err) =>
              this.logger.error(
                `StatusCalculator.onLocationPing failed for user ${userId}: ${err.message}`,
                err.stack,
              ),
            );
        }
      }

      return { count: locationEntities.length };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to insert location logs: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get location history for a user
   *
   * @param userId UUID of the user
   * @param filters Date range and shift filters
   * @returns List of location logs
   */
  async getUserHistory(
    userId: string,
    filters: {
      from_date?: string;
      to_date?: string;
      shift_id?: string;
    },
  ): Promise<LocationLog[]> {
    const where: any = { user_id: userId };

    if (filters.shift_id) {
      where.shift_id = filters.shift_id;
    }

    if (filters.from_date && filters.to_date) {
      where.logged_at = Between(new Date(filters.from_date), new Date(filters.to_date));
    } else if (filters.from_date) {
      where.logged_at = Between(new Date(filters.from_date), new Date());
    }

    return this.locationLogsRepository.find({
      where,
      relations: ['shift', 'shift.area'],
      order: { logged_at: 'DESC' },
      take: 1000, // Limit to 1000 records
    });
  }

  /**
   * Get paginated location history for a user
   *
   * @param userId UUID of the user
   * @param filters Date range and shift filters
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated location logs
   */
  async getUserHistoryPaginated(
    userId: string,
    filters: {
      from_date?: string;
      to_date?: string;
      shift_id?: string;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<LocationLog>> {
    const where: any = { user_id: userId };

    if (filters.shift_id) {
      where.shift_id = filters.shift_id;
    }

    if (filters.from_date && filters.to_date) {
      where.logged_at = Between(new Date(filters.from_date), new Date(filters.to_date));
    } else if (filters.from_date) {
      where.logged_at = Between(new Date(filters.from_date), new Date());
    }

    const [data, total] = await this.locationLogsRepository.findAndCount({
      where,
      relations: ['shift', 'shift.area'],
      order: { logged_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get latest location for a user
   *
   * @param userId UUID of the user
   * @returns Most recent location log
   */
  async getLatestLocation(userId: string): Promise<LocationLog | null> {
    return this.locationLogsRepository.findOne({
      where: { user_id: userId },
      relations: ['shift', 'shift.area', 'user'],
      order: { logged_at: 'DESC' },
    });
  }
}
