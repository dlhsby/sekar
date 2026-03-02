import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { User } from '../users/entities/user.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaTypesService } from '../area-types/area-types.service';

/**
 * Service for managing work areas
 *
 * Provides CRUD operations for areas where workers can be assigned.
 * Validates GPS coordinates and area type references.
 */
@Injectable()
export class AreasService {
  private readonly logger = new Logger(AreasService.name);

  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly areaTypesService: AreaTypesService,
  ) {}

  /**
   * Create a new area
   *
   * @param createAreaDto - Area creation data
   * @returns The created area with areaType loaded
   * @throws BadRequestException if area_type_id is invalid
   */
  async create(createAreaDto: CreateAreaDto): Promise<Area> {
    this.logger.log(`Creating new area: ${createAreaDto.name}`);

    // Validate that area_type_id exists
    await this.areaTypesService.findOne(createAreaDto.area_type_id);

    // Create the area
    const area = this.areaRepository.create(createAreaDto);
    const savedArea = await this.areaRepository.save(area);

    this.logger.log(`Area created with ID: ${savedArea.id}`);
    return savedArea;
  }

  /**
   * Get all areas
   *
   * @param areaType - Optional filter by area type code
   * @returns Array of areas with areaType loaded
   */
  async findAll(areaType?: string): Promise<Area[]> {
    this.logger.log(`Fetching all areas${areaType ? ` filtered by type: ${areaType}` : ''}`);

    const query = this.areaRepository
      .createQueryBuilder('area')
      .leftJoinAndSelect('area.areaType', 'areaType')
      .where('area.is_active = :isActive', { isActive: true })
      .orderBy('area.id', 'ASC');

    if (areaType) {
      query.andWhere('areaType.code = :areaType', { areaType });
    }

    return query.getMany();
  }

  /**
   * Get a single area by ID
   *
   * @param id - Area UUID
   * @returns The area with areaType loaded
   * @throws NotFoundException if area not found
   */
  async findOne(id: string): Promise<Area> {
    this.logger.log(`Fetching area with ID: ${id}`);

    const area = await this.areaRepository.findOne({
      where: { id, is_active: true },
    });

    if (!area) {
      this.logger.warn(`Area with ID ${id} not found`);
      throw new NotFoundException(`Area with ID ${id} not found`);
    }

    return area;
  }

  /**
   * Update an area
   *
   * Note: Cannot update area_type_id (field excluded from UpdateAreaDto)
   *
   * @param id - Area UUID
   * @param updateAreaDto - Fields to update
   * @returns The updated area with areaType loaded
   * @throws NotFoundException if area not found
   */
  async update(id: string, updateAreaDto: UpdateAreaDto): Promise<Area> {
    this.logger.log(`Updating area with ID: ${id}`);

    const area = await this.findOne(id);

    // Update fields
    Object.assign(area, updateAreaDto);

    const updatedArea = await this.areaRepository.save(area);

    this.logger.log(`Area with ID ${id} updated successfully`);
    return updatedArea;
  }

  /**
   * Soft delete an area
   *
   * Sets is_active to false instead of actually deleting the record.
   * Cannot delete if workers are assigned to this area.
   *
   * @param id - Area UUID
   * @throws NotFoundException if area not found
   * @throws BadRequestException if workers are assigned to this area
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Soft deleting area with ID: ${id}`);

    const area = await this.findOne(id);

    // Check if any workers are assigned to this area (via user.area_id)
    const assignmentCount = await this.userRepository.count({ where: { area_id: id } });
    if (assignmentCount > 0) {
      this.logger.warn(`Cannot delete area ${id}: ${assignmentCount} worker(s) assigned`);
      throw new BadRequestException(`Cannot delete area: ${assignmentCount} worker(s) assigned`);
    }

    // Soft delete by setting is_active to false
    area.is_active = false;
    await this.areaRepository.save(area);

    this.logger.log(`Area with ID ${id} soft deleted successfully`);
  }

  /**
   * Check if an area exists and is active
   *
   * @param id - Area UUID
   * @returns true if area exists and is active, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.areaRepository.count({
      where: { id, is_active: true },
    });
    return count > 0;
  }
}
