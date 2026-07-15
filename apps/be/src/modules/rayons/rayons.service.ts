import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rayon } from './entities/rayon.entity';
import { Location } from '../locations/entities/location.entity';
import { Region } from '../regions/entities/region.entity';
import { User } from '../users/entities/user.entity';
import { CreateRayonDto } from './dto/create-rayon.dto';
import { UpdateRayonDto } from './dto/update-rayon.dto';
import { GeoJsonValidator, GeoJsonPolygon } from '../../common/utils/geojson-validator.util';

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
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get all rayons.
   *
   * Active-only by default so deactivated rayons drop out of pickers and
   * filters; the admin management grid passes `includeInactive` so a
   * deactivated rayon stays visible and reactivatable.
   *
   * @returns Array of rayons ordered by name
   */
  async findAll(includeInactive = false): Promise<Rayon[]> {
    this.logger.log(`Fetching rayons${includeInactive ? ' (incl. inactive)' : ''}`);
    return this.rayonRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Deactivate a rayon (is_active=false) — reversible; distinct from delete.
   *
   * Guarded: a rayon is the parent of kawasan, lokasi and staff, so
   * deactivating one while it is still in use would hide it from every picker
   * while its children carried on referencing it. Refuse instead, and say what
   * is still attached — the operator re-parents or deactivates those first.
   */
  async deactivate(id: string): Promise<Rayon> {
    const rayon = await this.findOne(id);
    if (!rayon.is_active) return rayon;

    const [activeRegions, activeLocations, activeUsers] = await Promise.all([
      this.regionRepository.count({ where: { rayon_id: id, is_active: true } }),
      this.areaRepository.count({ where: { rayon_id: id, is_active: true } }),
      this.userRepository.count({ where: { rayon_id: id, is_active: true } }),
    ]);

    const blockers: string[] = [];
    if (activeRegions > 0) blockers.push(`${activeRegions} active region(s)`);
    if (activeLocations > 0) blockers.push(`${activeLocations} active location(s)`);
    if (activeUsers > 0) blockers.push(`${activeUsers} active user(s)`);

    if (blockers.length > 0) {
      this.logger.warn(`Cannot deactivate rayon ${id}: still has ${blockers.join(', ')}`);
      // Coded so the frontends localize by `code` (the API stays
      // English-canonical) instead of matching on this message text.
      throw new ApiException(
        HttpStatus.CONFLICT,
        ApiErrorCode.RAYON_DEACTIVATE_IN_USE,
        `Cannot deactivate rayon: it still has ${blockers.join(', ')}. ` +
          'Deactivate or re-parent them first.',
      );
    }

    rayon.is_active = false;
    return this.rayonRepository.save(rayon);
  }

  /** Reactivate a deactivated rayon (is_active=true). Never guarded. */
  async activate(id: string): Promise<Rayon> {
    const rayon = await this.findOne(id);
    if (rayon.is_active) return rayon;
    rayon.is_active = true;
    return this.rayonRepository.save(rayon);
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
   * Non-throwing name availability check (for the live rayon-name field). Rayon
   * `name` is unique; `excludeId` skips the rayon's own name in edit mode.
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.rayonRepository.findOne({
      where: { name },
      select: { id: true },
    });
    return !existing || existing.id === excludeId;
  }

  /**
   * Create a new rayon
   *
   * @param createRayonDto - Rayon creation data
   * @returns The created rayon
   * @throws ConflictException if name already exists
   */
  async create(createRayonDto: CreateRayonDto): Promise<Rayon> {
    this.logger.log(`Creating rayon: ${createRayonDto.name}`);

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

    // A rayon boundary must be a structurally valid polygon (same rule as
    // location boundaries). Only simple Polygons are validated — KMZ-imported
    // rayon boundaries can legitimately be MultiPolygon, which the validator
    // doesn't model yet.
    const rayonBoundary = updateRayonDto.boundary_polygon as GeoJsonPolygon | null | undefined;
    if (rayonBoundary != null && rayonBoundary.type === 'Polygon') {
      const errors = GeoJsonValidator.validatePolygon(rayonBoundary);
      if (errors.length > 0) {
        throw new BadRequestException(`Invalid polygon: ${errors.join('; ')}`);
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

    // First verify the rayon exists (keep it to softRemove below)
    const rayon = await this.findOne(id);

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

    // Regions (Kawasan) reference the rayon via an FK (ADR-045). Soft-delete
    // doesn't fire ON DELETE CASCADE, so block the delete while regions exist to
    // avoid orphaning them (mirrors the areas guard above).
    const referencingRegions = (await this.rayonRepository.manager.query(
      `SELECT COUNT(*)::int AS count FROM regions WHERE rayon_id = $1 AND deleted_at IS NULL`,
      [id],
    )) as Array<{ count: number }>;
    if ((referencingRegions[0]?.count ?? 0) > 0) {
      throw new BadRequestException(
        `Cannot delete rayon: ${referencingRegions[0].count} region(s) reference this rayon`,
      );
    }

    // softRemove (not softDelete) so the AuditSubscriber can stamp deleted_by.
    await this.rayonRepository.softRemove(rayon);
    this.logger.log(`Rayon soft deleted with ID: ${id}`);
  }

  /**
   * Get all areas belonging to a rayon
   *
   * @param id - Rayon ID (UUID)
   * @returns Array of areas in the rayon
   * @throws NotFoundException if rayon not found
   */
  async findAreasByRayonId(id: string): Promise<Location[]> {
    this.logger.log(`Fetching areas for rayon ID: ${id}`);

    // Verify rayon exists
    await this.findOne(id);

    return this.areaRepository.find({
      where: { rayon_id: id, is_active: true },
      relations: ['locationType'],
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
