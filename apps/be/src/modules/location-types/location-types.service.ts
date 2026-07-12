import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationType } from './entities/location-type.entity';
import { Location } from '../locations/entities/location.entity';
import { CreateLocationTypeDto } from './dto/create-location-type.dto';
import { UpdateLocationTypeDto } from './dto/update-location-type.dto';

/**
 * Service for managing area types
 *
 * AreaTypes are master data (lookup table) for categorizing work areas.
 * Provides full CRUD operations with Admin-only access for modifications.
 */
@Injectable()
export class LocationTypesService {
  private readonly logger = new Logger(LocationTypesService.name);

  constructor(
    @InjectRepository(LocationType)
    private readonly locationTypeRepository: Repository<LocationType>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
  ) {}

  /**
   * Get all area types
   *
   * @returns Array of all area types
   */
  async findAll(): Promise<LocationType[]> {
    this.logger.log('Fetching all area types');
    return this.locationTypeRepository.find({
      order: { id: 'ASC' },
    });
  }

  /**
   * Get a single area type by ID
   *
   * @param id - Location type ID (UUID)
   * @returns The area type
   * @throws NotFoundException if area type not found
   */
  async findOne(id: string): Promise<LocationType> {
    this.logger.log(`Fetching area type with ID: ${id}`);

    const locationType = await this.locationTypeRepository.findOne({
      where: { id },
    });

    if (!locationType) {
      this.logger.warn(`Location type with ID ${id} not found`);
      throw new NotFoundException(`Location type with ID ${id} not found`);
    }

    return locationType;
  }

  /**
   * Get an area type by code
   *
   * @param code - Location type code (park, pedestrian, mini_garden, street)
   * @returns The area type
   * @throws NotFoundException if area type not found
   */
  async findByCode(code: string): Promise<LocationType> {
    this.logger.log(`Fetching area type with code: ${code}`);

    const locationType = await this.locationTypeRepository.findOne({
      where: { code },
    });

    if (!locationType) {
      this.logger.warn(`Location type with code "${code}" not found`);
      throw new NotFoundException(`Location type with code "${code}" not found`);
    }

    return locationType;
  }

  /**
   * Create a new area type
   *
   * @param createAreaTypeDto - Location type creation data
   * @returns The created area type
   * @throws ConflictException if code already exists
   */
  async create(createAreaTypeDto: CreateLocationTypeDto): Promise<LocationType> {
    this.logger.log(`Creating area type with code: ${createAreaTypeDto.code}`);

    // Check if code already exists
    const existingAreaType = await this.locationTypeRepository.findOne({
      where: { code: createAreaTypeDto.code },
    });

    if (existingAreaType) {
      this.logger.warn(`Location type with code "${createAreaTypeDto.code}" already exists`);
      throw new ConflictException(
        `Location type with code "${createAreaTypeDto.code}" already exists`,
      );
    }

    const locationType = this.locationTypeRepository.create(createAreaTypeDto);
    const savedAreaType = await this.locationTypeRepository.save(locationType);

    this.logger.log(`Location type created with ID: ${savedAreaType.id}`);
    return savedAreaType;
  }

  /**
   * Update an existing area type
   *
   * @param id - Location type ID (UUID)
   * @param updateAreaTypeDto - Location type update data
   * @returns The updated area type
   * @throws NotFoundException if area type not found
   * @throws ConflictException if new code already exists
   */
  async update(id: string, updateAreaTypeDto: UpdateLocationTypeDto): Promise<LocationType> {
    this.logger.log(`Updating area type with ID: ${id}`);

    const locationType = await this.findOne(id);

    // If updating code, check for uniqueness
    if (updateAreaTypeDto.code && updateAreaTypeDto.code !== locationType.code) {
      const existingAreaType = await this.locationTypeRepository.findOne({
        where: { code: updateAreaTypeDto.code },
      });

      if (existingAreaType) {
        this.logger.warn(`Location type with code "${updateAreaTypeDto.code}" already exists`);
        throw new ConflictException(
          `Location type with code "${updateAreaTypeDto.code}" already exists`,
        );
      }
    }

    // Update only provided fields without mutating the loaded entity
    const updatedAreaType = await this.locationTypeRepository.save({
      ...locationType,
      ...updateAreaTypeDto,
    });

    this.logger.log(`Location type updated with ID: ${updatedAreaType.id}`);
    return updatedAreaType;
  }

  /**
   * Soft delete an area type
   *
   * @param id - Location type ID (UUID)
   * @throws NotFoundException if area type not found
   * @throws BadRequestException if areas reference this type
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting area type with ID: ${id}`);

    // First verify the area type exists
    await this.findOne(id);

    // Check if any areas reference this type (including soft-deleted areas)
    const referencingAreasCount = await this.areaRepository.count({
      where: { location_type_id: id },
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
    await this.locationTypeRepository.softDelete(id);
    this.logger.log(`Location type soft deleted with ID: ${id}`);
  }
}
