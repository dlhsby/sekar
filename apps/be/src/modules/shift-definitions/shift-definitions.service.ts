import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
   * Get shift definitions ordered by start time (soft-deleted always excluded).
   *
   * @param includeInactive - when true, also return inactive shifts (the
   *   management datagrid shows them with an "Inactive" status); default false
   *   keeps the picker/scheduling to active shifts only.
   * @returns Array of shift definitions ordered by start time
   */
  async findAll(includeInactive = false): Promise<ShiftDefinition[]> {
    this.logger.log(`Fetching shift definitions (includeInactive=${includeInactive})`);
    return this.shiftDefinitionRepository.find({
      where: includeInactive ? {} : { is_active: true },
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
    this.assertCrossesMidnight(dto.start_time, dto.end_time, dto.crosses_midnight);
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
    // Validate against the times AFTER any change to them, so editing only the
    // end time is checked against the value it will actually have.
    this.assertCrossesMidnight(existing.start_time, existing.end_time, dto.crosses_midnight);
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
   * Reject a `crosses_midnight` that contradicts the times.
   *
   * The flag is DERIVED when omitted, but an explicit wrong value used to be
   * stored verbatim — and the consequences are silent and severe. Every window
   * calculation in the system (attribution, the no-show sweep, the presence
   * lifecycle, the lazy display flip) rolls the end time forward by 24h only when
   * this flag is set. Clear it on a 21:00→05:00 shift and the window is read as
   * ending at 05:00 the SAME morning — i.e. already closed before it starts — so
   * every night worker becomes an instant no-show, and the reverse (setting it on
   * a day shift) makes a 06:00→15:00 shift look 33 hours long, so nobody is ever
   * late or absent.
   *
   * There is exactly one correct value for any pair of times, so it is validated
   * rather than silently corrected: an operator who typed it deliberately should
   * be told they are wrong, not quietly overruled.
   */
  private assertCrossesMidnight(
    startTime: string,
    endTime: string,
    crossesMidnight: boolean | undefined,
  ): void {
    if (crossesMidnight === undefined) return;
    const derived = this.derivesCrossesMidnight(startTime, endTime);
    if (crossesMidnight === derived) return;
    throw new BadRequestException(
      derived
        ? `A shift ending at ${endTime} on or before its ${startTime} start crosses midnight; crosses_midnight must be true.`
        : `A shift running ${startTime}–${endTime} ends the same day; crosses_midnight must be false.`,
    );
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
