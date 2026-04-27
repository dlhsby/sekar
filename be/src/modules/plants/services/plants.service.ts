import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { PlantSpecies } from '../entities/plant-species.entity';
import { AreaPlant } from '../entities/area-plant.entity';
import { NotablePlant } from '../entities/notable-plant.entity';
import { Area } from '../../areas/entities/area.entity';
import { CreateNotablePlantDto } from '../dto/create-notable-plant.dto';
import { User } from '../../users/entities/user.entity';

/**
 * Service for managing plant species and notable plants
 *
 * Provides listing, searching, and CRUD operations for plant catalogs.
 */
@Injectable()
export class PlantsService {
  private readonly logger = new Logger(PlantsService.name);

  constructor(
    @InjectRepository(PlantSpecies)
    private readonly speciesRepository: Repository<PlantSpecies>,
    @InjectRepository(AreaPlant)
    private readonly areaPlantRepository: Repository<AreaPlant>,
    @InjectRepository(NotablePlant)
    private readonly notablePlantRepository: Repository<NotablePlant>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  /**
   * List all plant species with pagination
   *
   * @param limit Number of results (default 20, max 50)
   * @param offset Pagination offset (default 0)
   * @returns Array of plant species and total count
   */
  async listSpecies(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: PlantSpecies[]; total: number }> {
    const [data, total] = await this.speciesRepository.findAndCount({
      order: { nameId: 'ASC' },
      take: Math.min(limit, 50),
      skip: offset,
    });

    return { data, total };
  }

  /**
   * Search plant species by name (case-insensitive)
   *
   * Matches both Indonesian (name_id) and scientific names (name_latin).
   * Uses ILIKE for PostgreSQL case-insensitive search.
   *
   * @param q Search query string
   * @param limit Maximum results (default 20, max 50)
   * @returns Matching plant species ordered by name_id ASC
   */
  async searchSpecies(q: string, limit: number = 20): Promise<PlantSpecies[]> {
    const query = this.speciesRepository.createQueryBuilder('species');

    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      query.where('species.name_id ILIKE :q OR species.name_latin ILIKE :q', {
        q: searchTerm,
      });
    }

    return query.orderBy('species.name_id', 'ASC').take(Math.min(limit, 50)).getMany();
  }

  /**
   * Get all plants in an area (inventory rollup)
   *
   * Returns area_plants rows with eager-loaded species details.
   *
   * @param areaId Area UUID
   * @returns Array of area_plants with species relation
   * @throws NotFoundException if area does not exist
   */
  async listAreaPlants(areaId: string): Promise<AreaPlant[]> {
    const area = await this.areaRepository.findOne({ where: { id: areaId } });
    if (!area) {
      this.logger.warn(`Area with ID ${areaId} not found`);
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    return this.areaPlantRepository.find({
      where: { areaId },
      relations: ['species'],
      order: { species: { nameId: 'ASC' } },
    });
  }

  /**
   * Get all notable plants in an area
   *
   * Returns heritage trees and significant specimens with species details.
   *
   * @param areaId Area UUID
   * @returns Array of notable plants with species relation
   * @throws NotFoundException if area does not exist
   */
  async listNotablePlants(areaId: string): Promise<NotablePlant[]> {
    const area = await this.areaRepository.findOne({ where: { id: areaId } });
    if (!area) {
      this.logger.warn(`Area with ID ${areaId} not found`);
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    return this.notablePlantRepository.find({
      where: { areaId },
      relations: ['species'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new notable plant
   *
   * Validates that both area and species exist before creation.
   *
   * @param dto Create DTO (area_id, species_id, label, last_pruned_at, notes)
   * @param user Current authenticated user (unused, for audit trail extensibility)
   * @returns Created notable plant with relations
   * @throws NotFoundException if area or species not found
   * @throws BadRequestException if required fields are invalid
   */
  async createNotablePlant(dto: CreateNotablePlantDto, user: User): Promise<NotablePlant> {
    const area = await this.areaRepository.findOne({ where: { id: dto.area_id } });
    if (!area) {
      this.logger.warn(`Cannot create notable plant: area ${dto.area_id} not found`);
      throw new NotFoundException(`Area with ID ${dto.area_id} not found`);
    }

    const species = await this.speciesRepository.findOne({ where: { id: dto.species_id } });
    if (!species) {
      this.logger.warn(`Cannot create notable plant: species ${dto.species_id} not found`);
      throw new NotFoundException(`Plant species with ID ${dto.species_id} not found`);
    }

    const notable = this.notablePlantRepository.create({
      areaId: dto.area_id,
      speciesId: dto.species_id,
      label: dto.label ?? null,
      notes: dto.notes ?? null,
      gpsLat: area.gps_lat,
      gpsLng: area.gps_lng,
      heritage: false,
      photoUrls: [],
    });

    const saved = await this.notablePlantRepository.save(notable);

    this.logger.log(
      `Created notable plant: ${saved.id} (${species.nameId} in ${area.name})`,
    );

    const result = await this.notablePlantRepository.findOne({
      where: { id: saved.id },
      relations: ['species'],
    });

    if (!result) {
      throw new Error(`Failed to retrieve created notable plant: ${saved.id}`);
    }

    return result;
  }
}
