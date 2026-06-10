import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Or, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { ShiftDefinitionsService } from '../shift-definitions/shift-definitions.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { TimezoneUtil } from '../../common/utils/timezone.util';

/**
 * Service for managing schedules
 *
 * Assigns workers to areas and shifts for specific date ranges.
 */
@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly usersService: UsersService,
    private readonly areasService: AreasService,
    private readonly shiftDefinitionsService: ShiftDefinitionsService,
  ) {}

  /**
   * Get all schedules (with optional filters)
   *
   * @param areaId - Optional filter by area
   * @param userId - Optional filter by user
   * @param activeOnly - If true, only return schedules active today
   * @returns Array of schedules
   */
  async findAll(
    areaId?: string,
    userId?: string,
    activeOnly: boolean = false,
    requestingUser?: User,
  ): Promise<Schedule[]> {
    this.logger.log(
      `Fetching schedules with filters: areaId=${areaId}, userId=${userId}, activeOnly=${activeOnly}`,
    );
    return this.buildFindAllQuery(areaId, userId, activeOnly, requestingUser).getMany();
  }

  /**
   * Paginated variant of findAll (Phase 4-6 C2). Same filters/scoping; used
   * when the client passes page/limit query params.
   */
  async findAllPaginated(
    areaId: string | undefined,
    userId: string | undefined,
    activeOnly: boolean,
    requestingUser: User | undefined,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponseDto<Schedule>> {
    const [data, total] = await this.buildFindAllQuery(areaId, userId, activeOnly, requestingUser)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  private buildFindAllQuery(
    areaId?: string,
    userId?: string,
    activeOnly: boolean = false,
    requestingUser?: User,
  ) {
    const queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.user', 'user')
      .leftJoinAndSelect('schedule.area', 'area')
      .leftJoinAndSelect('schedule.shiftDefinition', 'shiftDefinition');

    // Rayon-scoped roles see only schedules in their rayon
    if (
      requestingUser &&
      (requestingUser.role === UserRole.ADMIN_DATA ||
        requestingUser.role === UserRole.KEPALA_RAYON) &&
      requestingUser.rayon_id
    ) {
      queryBuilder.andWhere('area.rayon_id = :rayonId', { rayonId: requestingUser.rayon_id });
    }

    if (areaId) {
      queryBuilder.andWhere('schedule.area_id = :areaId', { areaId });
    }

    if (userId) {
      queryBuilder.andWhere('schedule.user_id = :userId', { userId });
    }

    if (activeOnly) {
      // WIB day boundary (Phase 4-7 E1) — UTC is yesterday before 07:00 WIB
      const today = TimezoneUtil.jakartaDateString();
      queryBuilder.andWhere('schedule.effective_date <= :today', { today });
      queryBuilder.andWhere('(schedule.end_date IS NULL OR schedule.end_date >= :today)', {
        today,
      });
    }

    return queryBuilder.orderBy('schedule.effective_date', 'DESC');
  }

  /**
   * Get a single schedule by ID
   *
   * @param id - Schedule ID (UUID)
   * @returns The schedule
   * @throws NotFoundException if schedule not found
   */
  async findOne(id: string): Promise<Schedule> {
    this.logger.log(`Fetching schedule with ID: ${id}`);

    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['user', 'area', 'shiftDefinition', 'creator'],
    });

    if (!schedule) {
      this.logger.warn(`Schedule with ID ${id} not found`);
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  /**
   * Get the current schedule for a user
   *
   * @param userId - User ID (UUID)
   * @returns The current active schedule for the user, or null
   */
  async findCurrentByUserId(userId: string): Promise<Schedule | null> {
    this.logger.log(`Fetching current schedule for user ID: ${userId}`);

    const today = new Date().toISOString().split('T')[0];

    return this.scheduleRepository.findOne({
      where: {
        user_id: userId,
        effective_date: LessThanOrEqual(new Date(today)),
        end_date: Or(IsNull(), MoreThanOrEqual(new Date(today))),
      },
      relations: ['area', 'shiftDefinition'],
      order: { effective_date: 'DESC' },
    });
  }

  /**
   * Get all schedules for an area
   *
   * @param areaId - Area ID (UUID)
   * @param activeOnly - If true, only return active schedules
   * @returns Array of schedules for the area
   */
  async findByAreaId(areaId: string, activeOnly: boolean = false): Promise<Schedule[]> {
    return this.findAll(areaId, undefined, activeOnly);
  }

  /**
   * Get all schedules for a user
   *
   * @param userId - User ID (UUID)
   * @param activeOnly - If true, only return active schedules
   * @returns Array of schedules for the user
   */
  async findByUserId(userId: string, activeOnly: boolean = false): Promise<Schedule[]> {
    return this.findAll(undefined, userId, activeOnly);
  }

  /**
   * Create a new schedule
   *
   * @param createDto - Schedule creation data
   * @param createdBy - User ID of the creator
   * @returns The created schedule
   * @throws NotFoundException if user, area, or shift definition not found
   * @throws BadRequestException if user is not a Worker or Linmas
   * @throws ConflictException if schedule overlaps with existing
   */
  async create(createDto: CreateScheduleDto, createdBy: string): Promise<Schedule> {
    this.logger.log(`Creating schedule for user ${createDto.user_id}`);

    // Verify user exists and is a Worker or Linmas
    const user = await this.usersService.findOne(createDto.user_id);
    if (user.role !== UserRole.SATGAS && user.role !== UserRole.LINMAS) {
      throw new BadRequestException(`User must be a Worker or Linmas to be assigned to a schedule`);
    }

    // Verify area exists
    await this.areasService.findOne(createDto.area_id);

    // Verify shift definition exists
    await this.shiftDefinitionsService.findOne(createDto.shift_definition_id);

    // Check for overlapping schedules
    const effectiveDate = new Date(createDto.effective_date);
    const endDate = createDto.end_date ? new Date(createDto.end_date) : null;

    if (endDate && endDate < effectiveDate) {
      throw new BadRequestException('End date cannot be before effective date');
    }

    const overlappingSchedule = await this.findOverlappingSchedule(
      createDto.user_id,
      createDto.shift_definition_id,
      effectiveDate,
      endDate,
    );

    if (overlappingSchedule) {
      throw new ConflictException(
        `Schedule overlaps with existing schedule (ID: ${overlappingSchedule.id})`,
      );
    }

    const schedule = this.scheduleRepository.create({
      user_id: createDto.user_id,
      area_id: createDto.area_id,
      shift_definition_id: createDto.shift_definition_id,
      effective_date: effectiveDate,
      end_date: endDate || undefined,
      created_by: createdBy,
    });

    const savedSchedule = await this.scheduleRepository.save(schedule);

    this.logger.log(`Schedule created with ID: ${savedSchedule.id}`);
    return savedSchedule;
  }

  /**
   * Update an existing schedule
   *
   * @param id - Schedule ID (UUID)
   * @param updateDto - Schedule update data
   * @returns The updated schedule
   * @throws NotFoundException if schedule, area, or shift definition not found
   */
  async update(id: string, updateDto: UpdateScheduleDto): Promise<Schedule> {
    this.logger.log(`Updating schedule with ID: ${id}`);

    const schedule = await this.findOne(id);

    // Verify area if being updated
    if (updateDto.area_id) {
      await this.areasService.findOne(updateDto.area_id);
    }

    // Verify shift definition if being updated
    if (updateDto.shift_definition_id) {
      await this.shiftDefinitionsService.findOne(updateDto.shift_definition_id);
    }

    // Handle date updates
    const effectiveDate = updateDto.effective_date
      ? new Date(updateDto.effective_date)
      : schedule.effective_date;

    let endDate: Date | null;
    if (updateDto.end_date === null) {
      endDate = null;
    } else if (updateDto.end_date) {
      endDate = new Date(updateDto.end_date);
    } else {
      endDate = schedule.end_date || null;
    }

    if (endDate && endDate < effectiveDate) {
      throw new BadRequestException('End date cannot be before effective date');
    }

    // Check for overlapping schedules (excluding this one)
    const shiftDefinitionId = updateDto.shift_definition_id || schedule.shift_definition_id;
    const overlappingSchedule = await this.findOverlappingSchedule(
      schedule.user_id,
      shiftDefinitionId,
      effectiveDate,
      endDate,
      id,
    );

    if (overlappingSchedule) {
      throw new ConflictException(
        `Schedule overlaps with existing schedule (ID: ${overlappingSchedule.id})`,
      );
    }

    // Update fields
    if (updateDto.area_id) schedule.area_id = updateDto.area_id;
    if (updateDto.shift_definition_id) schedule.shift_definition_id = updateDto.shift_definition_id;
    schedule.effective_date = effectiveDate;
    schedule.end_date = endDate || undefined;

    const updatedSchedule = await this.scheduleRepository.save(schedule);

    this.logger.log(`Schedule updated with ID: ${updatedSchedule.id}`);
    return updatedSchedule;
  }

  /**
   * Delete a schedule
   *
   * @param id - Schedule ID (UUID)
   * @throws NotFoundException if schedule not found
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting schedule with ID: ${id}`);

    // Verify schedule exists
    await this.findOne(id);

    // Perform soft delete
    await this.scheduleRepository.softDelete(id);
    this.logger.log(`Schedule soft deleted with ID: ${id}`);
  }

  /**
   * Find overlapping schedules for a user and shift
   *
   * @param userId - User ID
   * @param shiftDefinitionId - Shift definition ID
   * @param effectiveDate - New schedule effective date
   * @param endDate - New schedule end date (null = ongoing)
   * @param excludeId - Schedule ID to exclude from check
   * @returns Overlapping schedule if found, null otherwise
   */
  private async findOverlappingSchedule(
    userId: string,
    shiftDefinitionId: string,
    effectiveDate: Date,
    endDate: Date | null,
    excludeId?: string,
  ): Promise<Schedule | null> {
    const queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.user_id = :userId', { userId })
      .andWhere('schedule.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });

    if (excludeId) {
      queryBuilder.andWhere('schedule.id != :excludeId', { excludeId });
    }

    // Check for overlap
    // Two date ranges overlap if: start1 <= end2 AND start2 <= end1
    // For ranges where end can be null (ongoing), we treat null as infinity

    if (endDate) {
      // New schedule has an end date
      queryBuilder.andWhere('schedule.effective_date <= :endDate', {
        endDate: endDate.toISOString().split('T')[0],
      });
      queryBuilder.andWhere('(schedule.end_date IS NULL OR schedule.end_date >= :effectiveDate)', {
        effectiveDate: effectiveDate.toISOString().split('T')[0],
      });
    } else {
      // New schedule is ongoing
      queryBuilder.andWhere('(schedule.end_date IS NULL OR schedule.end_date >= :effectiveDate)', {
        effectiveDate: effectiveDate.toISOString().split('T')[0],
      });
    }

    return queryBuilder.getOne();
  }
}
