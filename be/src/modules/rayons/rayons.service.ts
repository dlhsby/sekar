import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rayon } from './entities/rayon.entity';
import { Area } from '../areas/entities/area.entity';
import { CreateRayonDto } from './dto/create-rayon.dto';
import { UpdateRayonDto } from './dto/update-rayon.dto';

/**
 * Service for managing rayons (geographic sectors)
 *
 * Rayons are administrative divisions in Surabaya for organizing work areas.
 * Phase 2 defines 7 rayons: Selatan, Utara, Pusat, Timur 1, Timur 2, Barat 1, Barat 2.
 */
@Injectable()
export class RayonsService {
  private readonly logger = new Logger(RayonsService.name);

  constructor(
    @InjectRepository(Rayon)
    private readonly rayonRepository: Repository<Rayon>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  /**
   * Get all rayons
   *
   * @returns Array of all rayons ordered by name
   */
  async findAll(): Promise<Rayon[]> {
    this.logger.log('Fetching all rayons');
    return this.rayonRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a single rayon by ID
   *
   * @param id - Rayon ID (UUID)
   * @returns The rayon
   * @throws NotFoundException if rayon not found
   */
  async findOne(id: string): Promise<Rayon> {
    this.logger.log(`Fetching rayon with ID: ${id}`);

    const rayon = await this.rayonRepository.findOne({
      where: { id },
    });

    if (!rayon) {
      this.logger.warn(`Rayon with ID ${id} not found`);
      throw new NotFoundException(`Rayon with ID ${id} not found`);
    }

    return rayon;
  }

  /**
   * Get a rayon by code
   *
   * @param code - Rayon code (e.g., SELATAN, UTARA)
   * @returns The rayon
   * @throws NotFoundException if rayon not found
   */
  async findByCode(code: string): Promise<Rayon> {
    this.logger.log(`Fetching rayon with code: ${code}`);

    const rayon = await this.rayonRepository.findOne({
      where: { code },
    });

    if (!rayon) {
      this.logger.warn(`Rayon with code "${code}" not found`);
      throw new NotFoundException(`Rayon with code "${code}" not found`);
    }

    return rayon;
  }

  /**
   * Create a new rayon
   *
   * @param createRayonDto - Rayon creation data
   * @returns The created rayon
   * @throws ConflictException if code already exists
   */
  async create(createRayonDto: CreateRayonDto): Promise<Rayon> {
    this.logger.log(`Creating rayon with code: ${createRayonDto.code}`);

    // Check if code already exists
    const existingByCode = await this.rayonRepository.findOne({
      where: { code: createRayonDto.code },
    });

    if (existingByCode) {
      this.logger.warn(`Rayon with code "${createRayonDto.code}" already exists`);
      throw new ConflictException(`Rayon with code "${createRayonDto.code}" already exists`);
    }

    // Check if name already exists
    const existingByName = await this.rayonRepository.findOne({
      where: { name: createRayonDto.name },
    });

    if (existingByName) {
      this.logger.warn(`Rayon with name "${createRayonDto.name}" already exists`);
      throw new ConflictException(`Rayon with name "${createRayonDto.name}" already exists`);
    }

    const rayon = this.rayonRepository.create(createRayonDto);
    const savedRayon = await this.rayonRepository.save(rayon);

    this.logger.log(`Rayon created with ID: ${savedRayon.id}`);
    return savedRayon;
  }

  /**
   * Update an existing rayon
   *
   * @param id - Rayon ID (UUID)
   * @param updateRayonDto - Rayon update data
   * @returns The updated rayon
   * @throws NotFoundException if rayon not found
   * @throws ConflictException if new code or name already exists
   */
  async update(id: string, updateRayonDto: UpdateRayonDto): Promise<Rayon> {
    this.logger.log(`Updating rayon with ID: ${id}`);

    const rayon = await this.findOne(id);

    // If updating code, check for uniqueness
    if (updateRayonDto.code && updateRayonDto.code !== rayon.code) {
      const existingByCode = await this.rayonRepository.findOne({
        where: { code: updateRayonDto.code },
      });

      if (existingByCode) {
        this.logger.warn(`Rayon with code "${updateRayonDto.code}" already exists`);
        throw new ConflictException(`Rayon with code "${updateRayonDto.code}" already exists`);
      }
    }

    // If updating name, check for uniqueness
    if (updateRayonDto.name && updateRayonDto.name !== rayon.name) {
      const existingByName = await this.rayonRepository.findOne({
        where: { name: updateRayonDto.name },
      });

      if (existingByName) {
        this.logger.warn(`Rayon with name "${updateRayonDto.name}" already exists`);
        throw new ConflictException(`Rayon with name "${updateRayonDto.name}" already exists`);
      }
    }

    // Update only provided fields without mutating the loaded entity
    const updatedRayon = await this.rayonRepository.save({ ...rayon, ...updateRayonDto });

    this.logger.log(`Rayon updated with ID: ${updatedRayon.id}`);
    return updatedRayon;
  }

  /**
   * Soft delete a rayon
   *
   * @param id - Rayon ID (UUID)
   * @throws NotFoundException if rayon not found
   * @throws BadRequestException if areas or users reference this rayon
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting rayon with ID: ${id}`);

    // First verify the rayon exists
    await this.findOne(id);

    // Check if any areas reference this rayon
    const referencingAreasCount = await this.areaRepository.count({
      where: { rayon_id: id },
    });

    if (referencingAreasCount > 0) {
      this.logger.warn(
        `Cannot delete rayon ${id}: ${referencingAreasCount} area(s) reference this rayon`,
      );
      throw new BadRequestException(
        `Cannot delete rayon: ${referencingAreasCount} area(s) reference this rayon`,
      );
    }

    // Perform soft delete
    await this.rayonRepository.softDelete(id);
    this.logger.log(`Rayon soft deleted with ID: ${id}`);
  }

  /**
   * Get all areas belonging to a rayon
   *
   * @param id - Rayon ID (UUID)
   * @returns Array of areas in the rayon
   * @throws NotFoundException if rayon not found
   */
  async findAreasByRayonId(id: string): Promise<Area[]> {
    this.logger.log(`Fetching areas for rayon ID: ${id}`);

    // Verify rayon exists
    await this.findOne(id);

    return this.areaRepository.find({
      where: { rayon_id: id, is_active: true },
      relations: ['areaType'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get rayon statistics (area count, active workers, etc.)
   *
   * @param id - Rayon ID (UUID)
   * @returns Rayon statistics
   * @throws NotFoundException if rayon not found
   */
  async getStats(id: string): Promise<{
    rayon: Rayon;
    areaCount: number;
    activeAreaCount: number;
  }> {
    this.logger.log(`Fetching stats for rayon ID: ${id}`);

    const rayon = await this.findOne(id);

    const [areaCount, activeAreaCount] = await Promise.all([
      this.areaRepository.count({ where: { rayon_id: id } }),
      this.areaRepository.count({ where: { rayon_id: id, is_active: true } }),
    ]);

    return {
      rayon,
      areaCount,
      activeAreaCount,
    };
  }
}
