import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaType } from './entities/area-type.entity';

/**
 * Service for managing area types
 *
 * AreaTypes are master data (lookup table) for categorizing work areas.
 * For MVP, this is read-only - types are seeded via database migration.
 */
@Injectable()
export class AreaTypesService {
  private readonly logger = new Logger(AreaTypesService.name);

  constructor(
    @InjectRepository(AreaType)
    private readonly areaTypeRepository: Repository<AreaType>,
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
}
