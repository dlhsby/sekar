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
import { Repository, DataSource, Between, IsNull } from 'typeorm';
import { LocationLog } from './entities/location-log.entity';
import { evaluateLocation, type PreviousFix } from '../../common/utils/location-integrity.util';
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
  /** The most recent stored ping with usable coordinates, for impossible-travel. */
  private async lastKnownFix(userId: string): Promise<PreviousFix | null> {
    const previous = await this.locationLogsRepository.findOne({
      // Chain only from clean fixes: seeding the speed check with a spoofed
      // position would make the NEXT (genuine) ping look like a teleport.
      where: { user_id: userId, rejection_reason: IsNull() },
      order: { logged_at: 'DESC' },
    });

    if (!previous) return null;
    return {
      lat: parseFloat(previous.gps_lat.toString()),
      lng: parseFloat(previous.gps_lng.toString()),
      at: previous.logged_at,
    };
  }

  /**
   * Judge every ping in a batch and build the rows to store.
   *
   * Unlike a punch, a bad ping does NOT fail the request. Rejecting the whole
   * batch would punish an honest client for one bad fix among twenty, and the
   * offline queue would then retry the same batch forever. Each ping is judged
   * on its own and carries its own verdict.
   *
   * Pings are processed in capture order and chained: each accepted fix becomes
   * the reference for the next, so a spoofed jump is caught within a batch and
   * not just across batches.
   */
  private async evaluateBatch(dto: CreateLocationBatchDto, userId: string): Promise<LocationLog[]> {
    const now = new Date();
    let previous = await this.lastKnownFix(userId);

    // Sort defensively: the client buffers and may flush out of order, and an
    // out-of-order sequence would derive nonsense speeds.
    const ordered = [...dto.locations].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );

    return ordered.map((location) => {
      const verdict = evaluateLocation(
        {
          lat: location.gps_lat,
          lng: location.gps_lng,
          accuracyMeters: location.accuracy_meters ?? null,
          isMocked: location.is_mocked ?? null,
          clientTimestamp: new Date(location.logged_at),
        },
        { now, previous },
      );

      if (verdict.accepted) {
        previous = {
          lat: location.gps_lat,
          lng: location.gps_lng,
          at: verdict.effectiveTimestamp,
        };
      } else {
        this.logger.warn(`Ping refused for user ${userId}: ${verdict.rejection}`);
      }

      return this.locationLogsRepository.create({
        user_id: userId,
        shift_id: dto.shift_id,
        gps_lat: location.gps_lat,
        gps_lng: location.gps_lng,
        accuracy_meters: location.accuracy_meters,
        battery_level: location.battery_level,
        // Clamped, never the raw client claim — `logged_at` drives presence
        // freshness, so an unbounded backdate would let a client fabricate its
        // own attendance history.
        logged_at: verdict.effectiveTimestamp,
        rejection_reason: verdict.rejection,
        poor_accuracy: verdict.advisories.poorAccuracy,
        clock_skew_ms: verdict.advisories.clockSkewMs,
      });
    });
  }

  async createBatch(
    dto: CreateLocationBatchDto,
    userId: string,
  ): Promise<{ count: number; rejected: number }> {
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
      const locationEntities = await this.evaluateBatch(dto, userId);

      const savedLogs = await queryRunner.manager.save(LocationLog, locationEntities);
      await queryRunner.commitTransaction();

      // Only clean pings may drive presence. A refused ping is stored (so a
      // supervisor sees "faking location" rather than a silent gap) but never
      // advances tracking status — the worker goes inactive until they stop.
      const accepted = savedLogs?.filter((log) => !log.rejection_reason) ?? [];
      const rejected = (savedLogs?.length ?? 0) - accepted.length;

      this.logger.log(
        `Inserted ${locationEntities.length} location logs for user ${userId}` +
          (rejected > 0 ? ` (${rejected} refused on integrity, excluded from presence)` : ''),
      );

      if (accepted.length > 0) {
        if (this.redisService) {
          // Phase 3: queue all pings to Redis Stream for async processing
          for (const log of accepted) {
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
          const latestLog = accepted.reduce((a, b) => (a.logged_at > b.logged_at ? a : b));
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

      return { count: locationEntities.length, rejected };
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
