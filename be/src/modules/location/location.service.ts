import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { LocationLog } from './entities/location-log.entity';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';
import { Shift } from '../shifts/entities/shift.entity';

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
  ) {}

  /**
   * Batch insert location logs
   *
   * Workers send multiple GPS pings at once for efficiency.
   * Uses transaction for atomic insert of all locations.
   *
   * @param dto Batch of location points
   * @param workerId UUID of the worker
   * @returns Number of locations inserted
   */
  async createBatch(
    dto: CreateLocationBatchDto,
    workerId: string,
  ): Promise<{ count: number }> {
    this.logger.log(
      `Worker ${workerId} uploading ${dto.locations.length} location logs for shift ${dto.shift_id}`,
    );

    // Validate shift exists and belongs to worker
    const shift = await this.shiftsRepository.findOne({
      where: { id: dto.shift_id, worker_id: workerId },
    });

    if (!shift) {
      throw new NotFoundException(
        `Shift not found or does not belong to worker ${workerId}`,
      );
    }

    // Validate shift is active (no clock_out_time)
    if (shift.clock_out_time) {
      throw new BadRequestException(
        'Cannot upload locations for completed shift',
      );
    }

    // Batch insert locations in a single transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const locationEntities = dto.locations.map((location) => {
        return this.locationLogsRepository.create({
          worker_id: workerId,
          shift_id: dto.shift_id,
          gps_lat: location.gps_lat,
          gps_lng: location.gps_lng,
          accuracy_meters: location.accuracy_meters,
          battery_level: location.battery_level,
          logged_at: new Date(location.logged_at),
        });
      });

      await queryRunner.manager.save(LocationLog, locationEntities);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully inserted ${locationEntities.length} location logs`,
      );

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
   * Get location history for a worker
   *
   * @param workerId UUID of the worker
   * @param filters Date range and shift filters
   * @returns List of location logs
   */
  async getWorkerHistory(
    workerId: string,
    filters: {
      from_date?: string;
      to_date?: string;
      shift_id?: string;
    },
  ): Promise<LocationLog[]> {
    const where: any = { worker_id: workerId };

    if (filters.shift_id) {
      where.shift_id = filters.shift_id;
    }

    if (filters.from_date && filters.to_date) {
      where.logged_at = Between(
        new Date(filters.from_date),
        new Date(filters.to_date),
      );
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
   * Get latest location for a worker
   *
   * @param workerId UUID of the worker
   * @returns Most recent location log
   */
  async getLatestLocation(workerId: string): Promise<LocationLog | null> {
    return this.locationLogsRepository.findOne({
      where: { worker_id: workerId },
      relations: ['shift', 'shift.area', 'worker'],
      order: { logged_at: 'DESC' },
    });
  }
}
