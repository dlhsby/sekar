import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ShiftDefinition } from './entities/shift-definition.entity';
import { CreateShiftDefinitionDto } from './dto/create-shift-definition.dto';
import { UpdateShiftDefinitionDto } from './dto/update-shift-definition.dto';

/**
 * Service for managing shift definitions.
 *
 * Shift definitions are configurable at runtime (ADR-055) — any number of
 * shifts, each fetched from the database. Seed data ships three defaults but no
 * business logic assumes a fixed count.
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
   * Create a shift definition (ADR-055 configurable shifts). Enforces a unique
   * name; derives `crosses_midnight` from the times when omitted. The start
   * reminder defaults to 15 min (preserving the legacy fixed window); the end
   * reminder is off unless set.
   */
  async create(dto: CreateShiftDefinitionDto): Promise<ShiftDefinition> {
    await this.assertUnique(dto.name);
    const entity = this.shiftDefinitionRepository.create({
      name: dto.name,
      start_time: dto.start_time,
      end_time: dto.end_time,
      crosses_midnight:
        dto.crosses_midnight ?? this.derivesCrossesMidnight(dto.start_time, dto.end_time),
      early_window_min: dto.early_window_min ?? 60,
      cutoff_grace_min: dto.cutoff_grace_min ?? 60,
      start_reminder_min: dto.start_reminder_min ?? 15,
      end_reminder_min: dto.end_reminder_min ?? null,
      is_active: dto.is_active ?? true,
    });
    const saved = await this.shiftDefinitionRepository.save(entity);
    this.logger.log(`Created shift definition ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Update a shift definition. Works on active or inactive rows (so a shift can
   * be toggled back on); keeps name/code unique; re-derives `crosses_midnight`
   * when the times change and it isn't explicitly provided.
   */
  async update(id: string, dto: UpdateShiftDefinitionDto): Promise<ShiftDefinition> {
    const existing = await this.shiftDefinitionRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shift definition with ID ${id} not found`);
    }
    await this.assertUnique(dto.name, id);

    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.start_time !== undefined) existing.start_time = dto.start_time;
    if (dto.end_time !== undefined) existing.end_time = dto.end_time;
    if (dto.early_window_min !== undefined) existing.early_window_min = dto.early_window_min;
    if (dto.cutoff_grace_min !== undefined) existing.cutoff_grace_min = dto.cutoff_grace_min;
    if (dto.start_reminder_min !== undefined) existing.start_reminder_min = dto.start_reminder_min;
    if (dto.end_reminder_min !== undefined) existing.end_reminder_min = dto.end_reminder_min;
    if (dto.is_active !== undefined) existing.is_active = dto.is_active;
    existing.crosses_midnight =
      dto.crosses_midnight ??
      (dto.start_time !== undefined || dto.end_time !== undefined
        ? this.derivesCrossesMidnight(existing.start_time, existing.end_time)
        : existing.crosses_midnight);

    const saved = await this.shiftDefinitionRepository.save(existing);
    this.logger.log(`Updated shift definition ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Soft-delete a shift definition. Soft (not hard) so historical schedules,
   * shifts and punches keep their `shift_definition_id` intact — the row remains,
   * just hidden from the active list. To merely stop offering a shift, prefer
   * `update({ is_active: false })`.
   */
  async remove(id: string): Promise<void> {
    const existing = await this.shiftDefinitionRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shift definition with ID ${id} not found`);
    }
    await this.shiftDefinitionRepository.softDelete(id);
    this.logger.log(`Soft-deleted shift definition ${existing.name} (${id})`);
  }

  /** Reject a duplicate name (excluding `ignoreId` on update). */
  private async assertUnique(name?: string, ignoreId?: string): Promise<void> {
    if (!name) return;
    const clash = await this.shiftDefinitionRepository.findOne({
      where: ignoreId ? { name, id: Not(ignoreId) } : { name },
    });
    if (clash) throw new ConflictException(`A shift definition named "${name}" already exists`);
  }

  /** A shift crosses midnight when its end is at/earlier than its start. */
  private derivesCrossesMidnight(startTime: string, endTime: string): boolean {
    return endTime <= startTime;
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
