import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SpecialDayOverride } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';

@Injectable()
export class SpecialDayOverridesService {
  constructor(
    @InjectRepository(SpecialDayOverride)
    private readonly specialDayOverridesRepository: Repository<SpecialDayOverride>,
  ) {}

  /**
   * Create a new special day override
   * Validates that the date doesn't already exist
   */
  async create(createDto: CreateSpecialDayOverrideDto): Promise<SpecialDayOverride> {
    // Check if date already exists
    const existing = await this.specialDayOverridesRepository.findOne({
      where: { date: new Date(createDto.date) },
    });

    if (existing) {
      throw new ConflictException(`Special day override for date ${createDto.date} already exists`);
    }

    const specialDay = this.specialDayOverridesRepository.create(createDto);
    return this.specialDayOverridesRepository.save(specialDay);
  }

  /**
   * Find all special day overrides with optional date range filtering
   */
  async findAll(startDate?: string, endDate?: string): Promise<SpecialDayOverride[]> {
    const where: any = {};

    if (startDate && endDate) {
      where.date = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.date = Between(new Date(startDate), new Date('2100-12-31'));
    } else if (endDate) {
      where.date = Between(new Date('1900-01-01'), new Date(endDate));
    }

    return this.specialDayOverridesRepository.find({
      where,
      order: { date: 'ASC' },
    });
  }

  /**
   * Find a special day override by ID
   */
  async findOne(id: string): Promise<SpecialDayOverride> {
    const specialDay = await this.specialDayOverridesRepository.findOne({
      where: { id },
    });

    if (!specialDay) {
      throw new NotFoundException(`Special day override with ID ${id} not found`);
    }

    return specialDay;
  }

  /**
   * Find a special day override by date
   */
  async findByDate(date: string): Promise<SpecialDayOverride | null> {
    return this.specialDayOverridesRepository.findOne({
      where: { date: new Date(date) },
    });
  }

  /**
   * Update a special day override
   * Validates that the new date doesn't conflict with existing entries
   */
  async update(id: string, updateDto: UpdateSpecialDayOverrideDto): Promise<SpecialDayOverride> {
    const specialDay = await this.findOne(id);

    // If date is being changed, check for conflicts
    if (updateDto.date && updateDto.date !== specialDay.date.toISOString().split('T')[0]) {
      const existing = await this.specialDayOverridesRepository.findOne({
        where: { date: new Date(updateDto.date) },
      });

      if (existing) {
        throw new ConflictException(
          `Special day override for date ${updateDto.date} already exists`,
        );
      }
    }

    Object.assign(specialDay, updateDto);
    return this.specialDayOverridesRepository.save(specialDay);
  }

  /**
   * Delete a special day override
   */
  async remove(id: string): Promise<void> {
    const specialDay = await this.findOne(id);
    await this.specialDayOverridesRepository.remove(specialDay);
  }
}
