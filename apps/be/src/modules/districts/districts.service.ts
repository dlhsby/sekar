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
import { District } from './entities/district.entity';
import { Location } from '../locations/entities/location.entity';
import { Region } from '../regions/entities/region.entity';
import { User } from '../users/entities/user.entity';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { GeoJsonValidator, GeoJsonPolygon } from '../../common/utils/geojson-validator.util';

/**
 * Service for managing districts (geographic sectors)
 *
 * Districts are administrative divisions in Surabaya for organizing work areas.
 * Phase 2 defines 7 districts: Selatan, Utara, Pusat, Timur 1, Timur 2, Barat 1, Barat 2.
 */
@Injectable()
export class DistrictsService {
  private readonly logger = new Logger(DistrictsService.name);

  constructor(
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get all districts.
   *
   * Active-only by default so deactivated districts drop out of pickers and
   * filters; the admin management grid passes `includeInactive` so a
   * deactivated district stays visible and reactivatable.
   *
   * @returns Array of districts ordered by name
   */
  async findAll(includeInactive = false): Promise<District[]> {
    this.logger.log(`Fetching districts${includeInactive ? ' (incl. inactive)' : ''}`);
    return this.districtRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Deactivate a district (is_active=false) — reversible; distinct from delete.
   *
   * Guarded: a district is the parent of kawasan, lokasi and staff, so
   * deactivating one while it is still in use would hide it from every picker
   * while its children carried on referencing it. Refuse instead, and say what
   * is still attached — the operator re-parents or deactivates those first.
   */
  async deactivate(id: string): Promise<District> {
    const district = await this.findOne(id);
    if (!district.is_active) return district;

    const [activeRegions, activeLocations, activeUsers] = await Promise.all([
      this.regionRepository.count({ where: { district_id: id, is_active: true } }),
      this.areaRepository.count({ where: { district_id: id, is_active: true } }),
      this.userRepository.count({ where: { district_id: id, is_active: true } }),
    ]);

    const blockers: string[] = [];
    if (activeRegions > 0) blockers.push(`${activeRegions} active region(s)`);
    if (activeLocations > 0) blockers.push(`${activeLocations} active location(s)`);
    if (activeUsers > 0) blockers.push(`${activeUsers} active user(s)`);

    if (blockers.length > 0) {
      this.logger.warn(`Cannot deactivate district ${id}: still has ${blockers.join(', ')}`);
      // Coded so the frontends localize by `code` (the API stays
      // English-canonical) instead of matching on this message text.
      throw new ApiException(
        HttpStatus.CONFLICT,
        ApiErrorCode.RAYON_DEACTIVATE_IN_USE,
        `Cannot deactivate district: it still has ${blockers.join(', ')}. ` +
          'Deactivate or re-parent them first.',
      );
    }

    district.is_active = false;
    return this.districtRepository.save(district);
  }

  /** Reactivate a deactivated district (is_active=true). Never guarded. */
  async activate(id: string): Promise<District> {
    const district = await this.findOne(id);
    if (district.is_active) return district;
    district.is_active = true;
    return this.districtRepository.save(district);
  }

  /**
   * Get a single district by ID
   *
   * @param id - District ID (UUID)
   * @returns The district
   * @throws NotFoundException if district not found
   */
  async findOne(id: string): Promise<District> {
    this.logger.log(`Fetching district with ID: ${id}`);

    const district = await this.districtRepository.findOne({
      where: { id },
    });

    if (!district) {
      this.logger.warn(`District with ID ${id} not found`);
      throw new NotFoundException(`District with ID ${id} not found`);
    }

    return district;
  }

  /**
   * Non-throwing name availability check (for the live district-name field). District
   * `name` is unique; `excludeId` skips the district's own name in edit mode.
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.districtRepository.findOne({
      where: { name },
      select: { id: true },
    });
    return !existing || existing.id === excludeId;
  }

  /**
   * Create a new district
   *
   * @param createDistrictDto - District creation data
   * @returns The created district
   * @throws ConflictException if name already exists
   */
  async create(createDistrictDto: CreateDistrictDto): Promise<District> {
    this.logger.log(`Creating district: ${createDistrictDto.name}`);

    // Check if name already exists
    const existingByName = await this.districtRepository.findOne({
      where: { name: createDistrictDto.name },
    });

    if (existingByName) {
      this.logger.warn(`District with name "${createDistrictDto.name}" already exists`);
      throw new ConflictException(`District with name "${createDistrictDto.name}" already exists`);
    }

    const district = this.districtRepository.create(createDistrictDto);
    const savedDistrict = await this.districtRepository.save(district);

    this.logger.log(`District created with ID: ${savedDistrict.id}`);
    return savedDistrict;
  }

  /**
   * Update an existing district
   *
   * @param id - District ID (UUID)
   * @param updateDistrictDto - District update data
   * @returns The updated district
   * @throws NotFoundException if district not found
   * @throws ConflictException if new code or name already exists
   */
  async update(id: string, updateDistrictDto: UpdateDistrictDto): Promise<District> {
    this.logger.log(`Updating district with ID: ${id}`);

    const district = await this.findOne(id);

    // If updating name, check for uniqueness
    if (updateDistrictDto.name && updateDistrictDto.name !== district.name) {
      const existingByName = await this.districtRepository.findOne({
        where: { name: updateDistrictDto.name },
      });

      if (existingByName) {
        this.logger.warn(`District with name "${updateDistrictDto.name}" already exists`);
        throw new ConflictException(
          `District with name "${updateDistrictDto.name}" already exists`,
        );
      }
    }

    // A district boundary must be a structurally valid polygon (same rule as
    // location boundaries). Only simple Polygons are validated — KMZ-imported
    // district boundaries can legitimately be MultiPolygon, which the validator
    // doesn't model yet.
    const districtBoundary = updateDistrictDto.boundary_polygon as
      | GeoJsonPolygon
      | null
      | undefined;
    if (districtBoundary != null && districtBoundary.type === 'Polygon') {
      const errors = GeoJsonValidator.validatePolygon(districtBoundary);
      if (errors.length > 0) {
        throw new BadRequestException(`Invalid polygon: ${errors.join('; ')}`);
      }
    }

    // Update only provided fields without mutating the loaded entity
    const updatedDistrict = await this.districtRepository.save({
      ...district,
      ...updateDistrictDto,
    });

    this.logger.log(`District updated with ID: ${updatedDistrict.id}`);
    return updatedDistrict;
  }

  /**
   * Soft delete a district
   *
   * @param id - District ID (UUID)
   * @throws NotFoundException if district not found
   * @throws BadRequestException if areas or users reference this district
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting district with ID: ${id}`);

    // First verify the district exists (keep it to softRemove below)
    const district = await this.findOne(id);

    // Check if any areas reference this district
    const referencingAreasCount = await this.areaRepository.count({
      where: { district_id: id },
    });

    if (referencingAreasCount > 0) {
      this.logger.warn(
        `Cannot delete district ${id}: ${referencingAreasCount} area(s) reference this district`,
      );
      throw new BadRequestException(
        `Cannot delete district: ${referencingAreasCount} area(s) reference this district`,
      );
    }

    // Regions (Kawasan) reference the district via an FK (ADR-045). Soft-delete
    // doesn't fire ON DELETE CASCADE, so block the delete while regions exist to
    // avoid orphaning them (mirrors the areas guard above).
    const referencingRegions = (await this.districtRepository.manager.query(
      `SELECT COUNT(*)::int AS count FROM regions WHERE district_id = $1 AND deleted_at IS NULL`,
      [id],
    )) as Array<{ count: number }>;
    if ((referencingRegions[0]?.count ?? 0) > 0) {
      throw new BadRequestException(
        `Cannot delete district: ${referencingRegions[0].count} region(s) reference this district`,
      );
    }

    // softRemove (not softDelete) so the AuditSubscriber can stamp deleted_by.
    await this.districtRepository.softRemove(district);
    this.logger.log(`District soft deleted with ID: ${id}`);
  }

  /**
   * Get all areas belonging to a district
   *
   * @param id - District ID (UUID)
   * @returns Array of areas in the district
   * @throws NotFoundException if district not found
   */
  async findAreasByDistrictId(id: string): Promise<Location[]> {
    this.logger.log(`Fetching areas for district ID: ${id}`);

    // Verify district exists
    await this.findOne(id);

    return this.areaRepository.find({
      where: { district_id: id, is_active: true },
      relations: ['locationType'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get district statistics (area count, active workers, etc.)
   *
   * @param id - District ID (UUID)
   * @returns District statistics
   * @throws NotFoundException if district not found
   */
  async getStats(id: string): Promise<{
    district: District;
    areaCount: number;
    activeAreaCount: number;
  }> {
    this.logger.log(`Fetching stats for district ID: ${id}`);

    const district = await this.findOne(id);

    const [areaCount, activeAreaCount] = await Promise.all([
      this.areaRepository.count({ where: { district_id: id } }),
      this.areaRepository.count({ where: { district_id: id, is_active: true } }),
    ]);

    return {
      district,
      areaCount,
      activeAreaCount,
    };
  }
}
