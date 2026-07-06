import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaType } from './entities/area-type.entity';
import { Area } from '../areas/entities/area.entity';
import { CreateAreaTypeDto } from './dto/create-area-type.dto';
import { UpdateAreaTypeDto } from './dto/update-area-type.dto';

/**
 * Service for managing area types
 *
 * AreaTypes are master data (lookup table) for categorizing work areas.
 * Provides full CRUD operations with Admin-only access for modifications.
 */
@Injectable()
export class AreaTypesService {
  private readonly logger = new Logger(AreaTypesService.name);

  constructor(
    @InjectRepository(AreaType)
    private readonly areaTypeRepository: Repository<AreaType>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  /**
   * Get all area types
   *
   * @returns Array of all area types
   */
  async findAll(): Promise<AreaType[]> {
    this.logger.log('Fetching all area types');
    return this.areaTypeRepository.find({
      order: { id: 'ASC' },
    });
  }

  /**
   * Get a single area type by ID
   *
   * @param id - Area type ID (UUID)
   * @returns The area type
   * @throws NotFoundException if area type not found
   */
  async findOne(id: string): Promise<AreaType> {
    this.logger.log(`Fetching area type with ID: ${id}`);

    const areaType = await this.areaTypeRepository.findOne({
      where: { id },
    });

    if (!areaType) {
      this.logger.warn(`Area type with ID ${id} not found`);
      throw new NotFoundException(`Area type with ID ${id} not found`);
    }

    return areaType;
  }

  /**
   * Get an area type by code
   *
   * @param code - Area type code (park, pedestrian, mini_garden, street)
   * @returns The area type
   * @throws NotFoundException if area type not found
   */
  async findByCode(code: string): Promise<AreaType> {
    this.logger.log(`Fetching area type with code: ${code}`);

    const areaType = await this.areaTypeRepository.findOne({
      where: { code },
    });

    if (!areaType) {
      this.logger.warn(`Area type with code "${code}" not found`);
      throw new NotFoundException(`Area type with code "${code}" not found`);
    }

    return areaType;
  }

  /**
   * Create a new area type
   *
   * @param createAreaTypeDto - Area type creation data
   * @returns The created area type
   * @throws ConflictException if code already exists
   */
  async create(createAreaTypeDto: CreateAreaTypeDto): Promise<AreaType> {
    this.logger.log(`Creating area type with code: ${createAreaTypeDto.code}`);

    // Check if code already exists
    const existingAreaType = await this.areaTypeRepository.findOne({
      where: { code: createAreaTypeDto.code },
    });

    if (existingAreaType) {
      this.logger.warn(`Area type with code "${createAreaTypeDto.code}" already exists`);
      throw new ConflictException(`Area type with code "${createAreaTypeDto.code}" already exists`);
    }

    const areaType = this.areaTypeRepository.create(createAreaTypeDto);
    const savedAreaType = await this.areaTypeRepository.save(areaType);

    this.logger.log(`Area type created with ID: ${savedAreaType.id}`);
    return savedAreaType;
  }

  /**
   * Update an existing area type
   *
   * @param id - Area type ID (UUID)
   * @param updateAreaTypeDto - Area type update data
   * @returns The updated area type
   * @throws NotFoundException if area type not found
   * @throws ConflictException if new code already exists
   */
  async update(id: string, updateAreaTypeDto: UpdateAreaTypeDto): Promise<AreaType> {
    this.logger.log(`Updating area type with ID: ${id}`);

    const areaType = await this.findOne(id);

    // If updating code, check for uniqueness
    if (updateAreaTypeDto.code && updateAreaTypeDto.code !== areaType.code) {
      const existingAreaType = await this.areaTypeRepository.findOne({
        where: { code: updateAreaTypeDto.code },
      });

      if (existingAreaType) {
        this.logger.warn(`Area type with code "${updateAreaTypeDto.code}" already exists`);
        throw new ConflictException(
          `Area type with code "${updateAreaTypeDto.code}" already exists`,
        );
      }
    }

    // Update only provided fields without mutating the loaded entity
    const updatedAreaType = await this.areaTypeRepository.save({
      ...areaType,
      ...updateAreaTypeDto,
    });

    this.logger.log(`Area type updated with ID: ${updatedAreaType.id}`);
    return updatedAreaType;
  }

  /**
   * Soft delete an area type
   *
   * @param id - Area type ID (UUID)
   * @throws NotFoundException if area type not found
   * @throws BadRequestException if areas reference this type
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting area type with ID: ${id}`);

    // First verify the area type exists
    await this.findOne(id);

    // Check if any areas reference this type (including soft-deleted areas)
    const referencingAreasCount = await this.areaRepository.count({
      where: { area_type_id: id },
      withDeleted: true,
    });

    if (referencingAreasCount > 0) {
      this.logger.warn(
        `Cannot delete area type ${id}: ${referencingAreasCount} area(s) reference this type`,
      );
      throw new BadRequestException(
        `Cannot delete area type: ${referencingAreasCount} area(s) reference this type`,
      );
    }

    // Perform soft delete
    await this.areaTypeRepository.softDelete(id);
    this.logger.log(`Area type soft deleted with ID: ${id}`);
  }
}
