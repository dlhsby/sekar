import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaStaffRequirement, DayType, StaffRole } from './entities/area-staff-requirement.entity';
import { AreasService } from '../areas/areas.service';
import { ShiftDefinitionsService } from '../shift-definitions/shift-definitions.service';
import { CreateAreaStaffRequirementDto } from './dto/create-area-staff-requirement.dto';
import { UpdateAreaStaffRequirementDto } from './dto/update-area-staff-requirement.dto';

/**
 * Service for managing area staff requirements
 *
 * Defines how many staff (Workers/Linmas) are needed for each area
 * per shift and day type.
 */
@Injectable()
export class AreaStaffRequirementsService {
  private readonly logger = new Logger(AreaStaffRequirementsService.name);

  constructor(
    @InjectRepository(AreaStaffRequirement)
    private readonly requirementRepository: Repository<AreaStaffRequirement>,
    private readonly areasService: AreasService,
    private readonly shiftDefinitionsService: ShiftDefinitionsService,
  ) {}

  /**
   * Get all staff requirements for an area
   *
   * @param areaId - Area ID (UUID)
   * @returns Array of staff requirements for the area
   */
  async findByAreaId(areaId: string): Promise<AreaStaffRequirement[]> {
    this.logger.log(`Fetching staff requirements for area ID: ${areaId}`);

    // Verify area exists
    await this.areasService.findOne(areaId);

    return this.requirementRepository.find({
      where: { area_id: areaId },
      relations: ['shiftDefinition'],
      order: { day_type: 'ASC', role: 'ASC' },
    });
  }

  /**
   * Get all staff requirements for a specific shift within an area
   *
   * @param areaId - Area ID (UUID)
   * @param shiftDefinitionId - Shift definition ID (UUID)
   * @param dayType - Optional day type filter
   * @returns Array of staff requirements
   */
  async findByAreaAndShift(
    areaId: string,
    shiftDefinitionId: string,
    dayType?: DayType,
  ): Promise<AreaStaffRequirement[]> {
    this.logger.log(`Fetching staff requirements for area ${areaId}, shift ${shiftDefinitionId}`);

    const whereClause: any = {
      area_id: areaId,
      shift_definition_id: shiftDefinitionId,
    };

    if (dayType) {
      whereClause.day_type = dayType;
    }

    return this.requirementRepository.find({
      where: whereClause,
      relations: ['shiftDefinition'],
      order: { role: 'ASC' },
    });
  }

  /**
   * Get a single staff requirement by ID
   *
   * @param id - Requirement ID (UUID)
   * @returns The staff requirement
   * @throws NotFoundException if requirement not found
   */
  async findOne(id: string): Promise<AreaStaffRequirement> {
    this.logger.log(`Fetching staff requirement with ID: ${id}`);

    const requirement = await this.requirementRepository.findOne({
      where: { id },
      relations: ['area', 'shiftDefinition'],
    });

    if (!requirement) {
      this.logger.warn(`Staff requirement with ID ${id} not found`);
      throw new NotFoundException(`Staff requirement with ID ${id} not found`);
    }

    return requirement;
  }

  /**
   * Create a new staff requirement
   *
   * @param createDto - Staff requirement creation data
   * @returns The created staff requirement
   * @throws NotFoundException if area or shift definition not found
   * @throws ConflictException if requirement already exists for this combination
   */
  async create(createDto: CreateAreaStaffRequirementDto): Promise<AreaStaffRequirement> {
    this.logger.log(
      `Creating staff requirement for area ${createDto.area_id}, shift ${createDto.shift_definition_id}`,
    );

    // Verify area exists
    await this.areasService.findOne(createDto.area_id);

    // Verify shift definition exists
    await this.shiftDefinitionsService.findOne(createDto.shift_definition_id);

    const dayType = createDto.day_type || DayType.WEEKDAY;

    // Check for existing requirement with same combination
    const existingRequirement = await this.requirementRepository.findOne({
      where: {
        area_id: createDto.area_id,
        shift_definition_id: createDto.shift_definition_id,
        role: createDto.role,
        day_type: dayType,
      },
    });

    if (existingRequirement) {
      this.logger.warn(
        `Staff requirement already exists for this area/shift/role/day_type combination`,
      );
      throw new ConflictException(
        `Staff requirement already exists for this area, shift, role, and day type combination`,
      );
    }

    const requirement = this.requirementRepository.create({
      ...createDto,
      day_type: dayType,
    });
    const savedRequirement = await this.requirementRepository.save(requirement);

    this.logger.log(`Staff requirement created with ID: ${savedRequirement.id}`);
    return savedRequirement;
  }

  /**
   * Update an existing staff requirement
   *
   * @param id - Requirement ID (UUID)
   * @param updateDto - Staff requirement update data
   * @returns The updated staff requirement
   * @throws NotFoundException if requirement not found
   */
  async update(
    id: string,
    updateDto: UpdateAreaStaffRequirementDto,
  ): Promise<AreaStaffRequirement> {
    this.logger.log(`Updating staff requirement with ID: ${id}`);

    const requirement = await this.findOne(id);

    // If changing role or day_type, check for uniqueness
    if (
      (updateDto.role && updateDto.role !== requirement.role) ||
      (updateDto.day_type && updateDto.day_type !== requirement.day_type)
    ) {
      const existingRequirement = await this.requirementRepository.findOne({
        where: {
          area_id: requirement.area_id,
          shift_definition_id: requirement.shift_definition_id,
          role: updateDto.role || requirement.role,
          day_type: updateDto.day_type || requirement.day_type,
        },
      });

      if (existingRequirement && existingRequirement.id !== id) {
        this.logger.warn(
          `Staff requirement already exists for this area/shift/role/day_type combination`,
        );
        throw new ConflictException(
          `Staff requirement already exists for this area, shift, role, and day type combination`,
        );
      }
    }

    // Update only provided fields without mutating the loaded entity
    const updatedRequirement = await this.requirementRepository.save({
      ...requirement,
      ...updateDto,
    });

    this.logger.log(`Staff requirement updated with ID: ${updatedRequirement.id}`);
    return updatedRequirement;
  }

  /**
   * Delete a staff requirement
   *
   * @param id - Requirement ID (UUID)
   * @throws NotFoundException if requirement not found
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting staff requirement with ID: ${id}`);

    // First verify the requirement exists
    await this.findOne(id);

    // Perform soft delete
    await this.requirementRepository.softDelete(id);
    this.logger.log(`Staff requirement soft deleted with ID: ${id}`);
  }

  /**
   * Get total staff requirements for an area on a given day type
   *
   * @param areaId - Area ID (UUID)
   * @param dayType - Day type (WEEKDAY, WEEKEND, HOLIDAY)
   * @returns Summary of staff requirements by shift
   */
  async getRequirementsSummary(
    areaId: string,
    dayType: DayType = DayType.WEEKDAY,
  ): Promise<{
    areaId: string;
    dayType: DayType;
    shifts: Array<{
      shiftDefinitionId: string;
      shiftName: string;
      workerCount: number;
      linmasCount: number;
    }>;
    totalWorkers: number;
    totalLinmas: number;
  }> {
    this.logger.log(`Fetching requirements summary for area ${areaId}, day type ${dayType}`);

    const requirements = await this.requirementRepository.find({
      where: { area_id: areaId, day_type: dayType },
      relations: ['shiftDefinition'],
    });

    // Group by shift
    const shiftMap = new Map<
      string,
      { shiftName: string; workerCount: number; linmasCount: number }
    >();

    for (const req of requirements) {
      const shiftId = req.shift_definition_id;
      if (!shiftMap.has(shiftId)) {
        shiftMap.set(shiftId, {
          shiftName: req.shiftDefinition.name,
          workerCount: 0,
          linmasCount: 0,
        });
      }

      const shift = shiftMap.get(shiftId)!;
      if (req.role === StaffRole.SATGAS) {
        shift.workerCount = req.required_count;
      } else if (req.role === StaffRole.LINMAS) {
        shift.linmasCount = req.required_count;
      }
    }

    const shifts = Array.from(shiftMap.entries()).map(([shiftId, data]) => ({
      shiftDefinitionId: shiftId,
      ...data,
    }));

    const totalWorkers = shifts.reduce((sum, s) => sum + s.workerCount, 0);
    const totalLinmas = shifts.reduce((sum, s) => sum + s.linmasCount, 0);

    return {
      areaId,
      dayType,
      shifts,
      totalWorkers,
      totalLinmas,
    };
  }
}
