import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { PlantSpecies } from '../entities/plant-species.entity';
import { LocationPlant } from '../entities/location-plant.entity';
import { NotablePlant } from '../entities/notable-plant.entity';
import { Location } from '../../locations/entities/location.entity';
import { CreateNotablePlantDto } from '../dto/create-notable-plant.dto';
import { CreatePlantSpeciesDto } from '../dto/create-plant-species.dto';
import { UpdatePlantSpeciesDto } from '../dto/update-plant-species.dto';
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
    @InjectRepository(LocationPlant)
    private readonly areaPlantRepository: Repository<LocationPlant>,
    @InjectRepository(NotablePlant)
    private readonly notablePlantRepository: Repository<NotablePlant>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
  ) {}

  /**
   * List all plant species with pagination (excludes soft-deleted)
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
      where: { deletedAt: IsNull() },
      order: { nameId: 'ASC' },
      take: Math.min(limit, 50),
      skip: offset,
    });

    return { data, total };
  }

  /**
   * Search plant species by name (case-insensitive, excludes soft-deleted)
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

    query.where('species.deleted_at IS NULL');

    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      query.andWhere('species.name_id ILIKE :q OR species.name_latin ILIKE :q', {
        q: searchTerm,
      });
    }

    return query.orderBy('species.name_id', 'ASC').take(Math.min(limit, 50)).getMany();
  }

  /**
   * Get all plants in an area (inventory rollup)
   *
   * Returns location_plants rows with eager-loaded species details.
   *
   * @param locationId Location UUID
   * @returns Array of location_plants with species relation
   * @throws NotFoundException if area does not exist
   */
  async listAreaPlants(locationId: string): Promise<LocationPlant[]> {
    const area = await this.areaRepository.findOne({ where: { id: locationId } });
    if (!area) {
      this.logger.warn(`Location with ID ${locationId} not found`);
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    return this.areaPlantRepository.find({
      where: { locationId },
      relations: ['species'],
      order: { species: { nameId: 'ASC' } },
    });
  }

  /**
   * Get all notable plants in an area
   *
   * Returns heritage trees and significant specimens with species details.
   *
   * @param locationId Location UUID
   * @returns Array of notable plants with species relation
   * @throws NotFoundException if area does not exist
   */
  async listNotablePlants(locationId: string): Promise<NotablePlant[]> {
    const area = await this.areaRepository.findOne({ where: { id: locationId } });
    if (!area) {
      this.logger.warn(`Location with ID ${locationId} not found`);
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    return this.notablePlantRepository.find({
      where: { locationId },
      relations: ['species'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new notable plant
   *
   * Validates that both area and species exist before creation.
   *
   * @param dto Create DTO (location_id, species_id, label, last_pruned_at, notes)
   * @param user Current authenticated user (unused, for audit trail extensibility)
   * @returns Created notable plant with relations
   * @throws NotFoundException if area or species not found
   * @throws BadRequestException if required fields are invalid
   */
  async createNotablePlant(dto: CreateNotablePlantDto, user: User): Promise<NotablePlant> {
    const area = await this.areaRepository.findOne({ where: { id: dto.location_id } });
    if (!area) {
      this.logger.warn(`Cannot create notable plant: area ${dto.location_id} not found`);
      throw new NotFoundException(`Location with ID ${dto.location_id} not found`);
    }

    const species = await this.speciesRepository.findOne({ where: { id: dto.species_id } });
    if (!species) {
      this.logger.warn(`Cannot create notable plant: species ${dto.species_id} not found`);
      throw new NotFoundException(`Plant species with ID ${dto.species_id} not found`);
    }

    const notable = this.notablePlantRepository.create({
      locationId: dto.location_id,
      speciesId: dto.species_id,
      label: dto.label ?? null,
      notes: dto.notes ?? null,
      gpsLat: area.gps_lat,
      gpsLng: area.gps_lng,
      heritage: false,
      photoUrls: [],
    });

    const saved = await this.notablePlantRepository.save(notable);

    this.logger.log(`Created notable plant: ${saved.id} (${species.nameId} in ${area.name})`);

    const result = await this.notablePlantRepository.findOne({
      where: { id: saved.id },
      relations: ['species'],
    });

    if (!result) {
      throw new Error(`Failed to retrieve created notable plant: ${saved.id}`);
    }

    return result;
  }

  /**
   * Create a new plant species
   *
   * @param dto Create DTO (nameId, nameLatin, category, defaultPruningCycleDays, notes)
   * @returns Created plant species
   * @throws BadRequestException if required fields are invalid or nameId already exists
   */
  async createSpecies(dto: CreatePlantSpeciesDto): Promise<PlantSpecies> {
    // Check for duplicate nameId
    const existing = await this.speciesRepository.findOne({
      where: { nameId: dto.nameId, deletedAt: IsNull() },
    });
    if (existing) {
      this.logger.warn(`Cannot create species: nameId "${dto.nameId}" already exists`);
      throw new BadRequestException(`Plant species with name "${dto.nameId}" already exists`);
    }

    const species = this.speciesRepository.create({
      nameId: dto.nameId,
      nameLatin: dto.nameLatin ?? null,
      category: dto.category ?? 'tree',
      defaultPruningCycleDays: dto.defaultPruningCycleDays ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.speciesRepository.save(species);
    this.logger.log(`Created plant species: ${saved.id} (${saved.nameId})`);
    return saved;
  }

  /**
   * Update an existing plant species
   *
   * @param id Plant species UUID
   * @param dto Update DTO (all fields optional)
   * @returns Updated plant species
   * @throws NotFoundException if species not found
   * @throws BadRequestException if nameId update creates a duplicate
   */
  async updateSpecies(id: string, dto: UpdatePlantSpeciesDto): Promise<PlantSpecies> {
    const species = await this.speciesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!species) {
      this.logger.warn(`Cannot update species: species ${id} not found`);
      throw new NotFoundException(`Plant species with ID ${id} not found`);
    }

    // Check for duplicate nameId if updating it
    if (dto.nameId && dto.nameId !== species.nameId) {
      const duplicate = await this.speciesRepository.findOne({
        where: { nameId: dto.nameId, deletedAt: IsNull() },
      });
      if (duplicate) {
        this.logger.warn(`Cannot update species: nameId "${dto.nameId}" already exists`);
        throw new BadRequestException(`Plant species with name "${dto.nameId}" already exists`);
      }
    }

    if (dto.nameId !== undefined) {
      species.nameId = dto.nameId;
    }
    if (dto.nameLatin !== undefined) {
      species.nameLatin = dto.nameLatin;
    }
    if (dto.category !== undefined) {
      species.category = dto.category;
    }
    if (dto.defaultPruningCycleDays !== undefined) {
      species.defaultPruningCycleDays = dto.defaultPruningCycleDays;
    }
    if (dto.notes !== undefined) {
      species.notes = dto.notes;
    }

    const updated = await this.speciesRepository.save(species);
    this.logger.log(`Updated plant species: ${id} (${updated.nameId})`);
    return updated;
  }

  /**
   * Delete a plant species (soft delete)
   *
   * Performs referential integrity check — throws ConflictException if the species
   * is referenced by location_plants or notable_plants.
   *
   * @param id Plant species UUID
   * @returns void
   * @throws NotFoundException if species not found
   * @throws ConflictException if species is referenced by other records
   */
  async deleteSpecies(id: string): Promise<void> {
    const species = await this.speciesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!species) {
      this.logger.warn(`Cannot delete species: species ${id} not found`);
      throw new NotFoundException(`Plant species with ID ${id} not found`);
    }

    // Check referential integrity against location_plants and notable_plants concurrently.
    const [areaPlantRefs, notablePlantRefs] = await Promise.all([
      this.areaPlantRepository.count({ where: { speciesId: id } }),
      this.notablePlantRepository.count({ where: { speciesId: id } }),
    ]);
    if (areaPlantRefs > 0) {
      this.logger.warn(
        `Cannot delete species ${id}: referenced by ${areaPlantRefs} area plant records`,
      );
      throw new ConflictException(
        `Cannot delete plant species: it is referenced by ${areaPlantRefs} area inventory record(s)`,
      );
    }

    if (notablePlantRefs > 0) {
      this.logger.warn(
        `Cannot delete species ${id}: referenced by ${notablePlantRefs} notable plant records`,
      );
      throw new ConflictException(
        `Cannot delete plant species: it is referenced by ${notablePlantRefs} notable plant record(s)`,
      );
    }

    // Soft delete via softRemove
    await this.speciesRepository.softRemove(species);
    this.logger.log(`Deleted plant species: ${id} (${species.nameId})`);
  }
}
