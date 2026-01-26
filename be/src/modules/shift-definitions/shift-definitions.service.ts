import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftDefinition } from './entities/shift-definition.entity';

/**
 * Service for managing shift definitions (read-only)
 *
 * Shift definitions are fixed and not configurable at runtime.
 * Phase 2 defines 3 fixed shifts:
 * - Shift 1: 06:00 - 15:00 (morning)
 * - Shift 2: 15:00 - 23:00 (afternoon)
 * - Shift 3: 21:00 - 05:00 (night, crosses midnight)
 */
@Injectable()
export class ShiftDefinitionsService {
  private readonly logger = new Logger(ShiftDefinitionsService.name);

  constructor(
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepository: Repository<ShiftDefinition>,
  ) {}

  /**
   * Get all active shift definitions
   *
   * @returns Array of all active shift definitions ordered by start time
   */
  async findAll(): Promise<ShiftDefinition[]> {
    this.logger.log('Fetching all shift definitions');
    return this.shiftDefinitionRepository.find({
      where: { is_active: true },
      order: { start_time: 'ASC' },
    });
  }

  /**
   * Get a single shift definition by ID
   *
   * @param id - Shift definition ID (UUID)
   * @returns The shift definition
   * @throws NotFoundException if shift definition not found
   */
  async findOne(id: string): Promise<ShiftDefinition> {
    this.logger.log(`Fetching shift definition with ID: ${id}`);

    const shiftDefinition = await this.shiftDefinitionRepository.findOne({
      where: { id, is_active: true },
    });

    if (!shiftDefinition) {
      this.logger.warn(`Shift definition with ID ${id} not found`);
      throw new NotFoundException(`Shift definition with ID ${id} not found`);
    }

    return shiftDefinition;
  }

  /**
   * Get a shift definition by code
   *
   * @param code - Shift definition code (SHIFT1, SHIFT2, SHIFT3)
   * @returns The shift definition
   * @throws NotFoundException if shift definition not found
   */
  async findByCode(code: string): Promise<ShiftDefinition> {
    this.logger.log(`Fetching shift definition with code: ${code}`);

    const shiftDefinition = await this.shiftDefinitionRepository.findOne({
      where: { code, is_active: true },
    });

    if (!shiftDefinition) {
      this.logger.warn(`Shift definition with code "${code}" not found`);
      throw new NotFoundException(`Shift definition with code "${code}" not found`);
    }

    return shiftDefinition;
  }

  /**
   * Check if a shift definition exists by ID
   *
   * @param id - Shift definition ID (UUID)
   * @returns True if shift definition exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.shiftDefinitionRepository.count({
      where: { id, is_active: true },
    });
    return count > 0;
  }

  /**
   * Get the current shift based on current time
   *
   * @returns The current shift definition or null if outside shift hours
   */
  async getCurrentShift(): Promise<ShiftDefinition | null> {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format

    const shifts = await this.findAll();

    for (const shift of shifts) {
      if (shift.crosses_midnight) {
        // For shifts that cross midnight (e.g., 21:00-05:00)
        // Check if current time is >= start OR < end
        if (currentTime >= shift.start_time || currentTime < shift.end_time) {
          return shift;
        }
      } else {
        // For normal shifts
        if (currentTime >= shift.start_time && currentTime < shift.end_time) {
          return shift;
        }
      }
    }

    return null;
  }
}
