import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SpecialDayOverride } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';

/**
 * Service for managing special day overrides
 *
 * Special day overrides define dates that should be treated differently
 * for staffing requirements (e.g., national holidays, special events).
 */
@Injectable()
export class SpecialDayOverridesService {
  private readonly logger = new Logger(SpecialDayOverridesService.name);

  constructor(
    @InjectRepository(SpecialDayOverride)
    private readonly specialDayOverrideRepository: Repository<SpecialDayOverride>,
  ) {}

  /**
   * Get all special day overrides, optionally filtered by date range
   *
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns Array of special day overrides
   */
  async findAll(startDate?: string, endDate?: string): Promise<SpecialDayOverride[]> {
    this.logger.log(
      `Fetching special day overrides${startDate || endDate ? ` (range: ${startDate || '*'} to ${endDate || '*'})` : ''}`,
    );

    const whereClause: Record<string, unknown> = {};

    if (startDate && endDate) {
      whereClause.date = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      whereClause.date = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      whereClause.date = LessThanOrEqual(new Date(endDate));
    }

    return this.specialDayOverrideRepository.find({
      where: whereClause,
      order: { date: 'ASC' },
    });
  }

  /**
   * Get a single special day override by ID
   *
   * @param id - Special day override ID (UUID)
   * @returns The special day override
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<SpecialDayOverride> {
    this.logger.log(`Fetching special day override with ID: ${id}`);

    const specialDayOverride = await this.specialDayOverrideRepository.findOne({
      where: { id },
    });

    if (!specialDayOverride) {
      this.logger.warn(`Special day override with ID ${id} not found`);
      throw new NotFoundException(`Special day override with ID ${id} not found`);
    }

    return specialDayOverride;
  }

  /**
   * Get a special day override by date
   *
   * @param date - Date to check (Date object or ISO string)
   * @returns The special day override or null if not found
   */
  async findByDate(date: Date | string): Promise<SpecialDayOverride | null> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    this.logger.log(`Fetching special day override for date: ${dateObj.toISOString()}`);

    return this.specialDayOverrideRepository.findOne({
      where: { date: dateObj },
    });
  }

  /**
   * Create a new special day override
   *
   * @param createDto - Special day override creation data
   * @returns The created special day override
   * @throws ConflictException if date already has an override
   */
  async create(createDto: CreateSpecialDayOverrideDto): Promise<SpecialDayOverride> {
    this.logger.log(`Creating special day override for date: ${createDto.date}`);

    // Check if date already has an override
    const existingOverride = await this.findByDate(createDto.date);

    if (existingOverride) {
      this.logger.warn(`Special day override for date ${createDto.date} already exists`);
      throw new ConflictException(`Special day override for date ${createDto.date} already exists`);
    }

    const specialDayOverride = this.specialDayOverrideRepository.create({
      ...createDto,
      date: new Date(createDto.date),
    });
    const savedOverride = await this.specialDayOverrideRepository.save(specialDayOverride);

    this.logger.log(`Special day override created with ID: ${savedOverride.id}`);
    return savedOverride;
  }

  /**
   * Update an existing special day override
   *
   * @param id - Special day override ID (UUID)
   * @param updateDto - Special day override update data
   * @returns The updated special day override
   * @throws NotFoundException if not found
   * @throws ConflictException if new date already has an override
   */
  async update(id: string, updateDto: UpdateSpecialDayOverrideDto): Promise<SpecialDayOverride> {
    this.logger.log(`Updating special day override with ID: ${id}`);

    const specialDayOverride = await this.findOne(id);

    // If updating date, check for uniqueness
    if (updateDto.date) {
      const existingOverride = await this.findByDate(updateDto.date);

      if (existingOverride && existingOverride.id !== id) {
        this.logger.warn(`Special day override for date ${updateDto.date} already exists`);
        throw new ConflictException(
          `Special day override for date ${updateDto.date} already exists`,
        );
      }
    }

    // Update only provided fields
    if (updateDto.date) {
      specialDayOverride.date = new Date(updateDto.date);
    }
    if (updateDto.day_type !== undefined) {
      specialDayOverride.day_type = updateDto.day_type;
    }
    if (updateDto.name !== undefined) {
      specialDayOverride.name = updateDto.name;
    }

    const updatedOverride = await this.specialDayOverrideRepository.save(specialDayOverride);

    this.logger.log(`Special day override updated with ID: ${updatedOverride.id}`);
    return updatedOverride;
  }

  /**
   * Delete a special day override
   *
   * @param id - Special day override ID (UUID)
   * @throws NotFoundException if not found
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting special day override with ID: ${id}`);

    // First verify it exists
    await this.findOne(id);

    await this.specialDayOverrideRepository.delete(id);
    this.logger.log(`Special day override deleted with ID: ${id}`);
  }

  /**
   * Check if a date is a special day
   *
   * @param date - Date to check
   * @returns True if the date has an override
   */
  async isSpecialDay(date: Date | string): Promise<boolean> {
    const override = await this.findByDate(date);
    return override !== null;
  }
}
