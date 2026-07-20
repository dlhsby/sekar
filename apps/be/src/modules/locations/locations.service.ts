import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { MONITORING_CITY } from '../users/constants/role-groups';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { LocationTypesService } from '../location-types/location-types.service';
import {
  AreaBoundaryResponseDto,
  UpdateAreaBoundaryDto,
  GeoJsonPolygon,
} from '../monitoring/dto/area-boundary.dto';
import { GeoJsonValidator } from '../../common/utils/geojson-validator.util';

/**
 * Service for managing work areas
 *
 * Provides CRUD operations for areas where workers can be assigned.
 * Validates GPS coordinates and area type references.
 */
@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly locationTypesService: LocationTypesService,
  ) {}

  /**
   * Create a new area
   *
   * @param createAreaDto - Location creation data
   * @returns The created area with areaType loaded
   * @throws BadRequestException if location_type_id is invalid
   */
  async create(createAreaDto: CreateLocationDto): Promise<Location> {
    this.logger.log(`Creating new area: ${createAreaDto.name}`);

    // Validate that location_type_id exists
    await this.locationTypesService.findOne(createAreaDto.location_type_id);
    await this.validateRegion(createAreaDto.region_id, createAreaDto.district_id);

    // Create the area
    const area = this.locationRepository.create(createAreaDto);
    const savedArea = await this.locationRepository.save(area);

    this.logger.log(`Location created with ID: ${savedArea.id}`);
    return savedArea;
  }

  /**
   * When an area is put into a region, the region must exist and belong to the
   * same district as the area (ADR-045). `region_id` null/undefined clears it.
   */
  private async validateRegion(regionId?: string | null, areaDistrictId?: string): Promise<void> {
    if (!regionId) return;
    const rows = (await this.locationRepository.manager.query(
      `SELECT district_id FROM regions WHERE id = $1 AND deleted_at IS NULL`,
      [regionId],
    )) as Array<{ district_id: string }>;
    if (!rows[0]) throw new BadRequestException('Region not found');
    if (areaDistrictId && rows[0].district_id !== areaDistrictId) {
      throw new BadRequestException("Region must belong to the area's district");
    }
  }

  /**
   * Get all areas
   *
   * District scoping (2026-05-18):
   *   - City roles (superadmin / admin_system / management): see all areas.
   *   - Everyone else (kepala_rayon / admin_rayon / korlap / satgas / linmas /
   *     staff_kecamatan): filtered to `area.district_id = user.district_id`.
   *     Users without a district_id see nothing (defensive default).
   *
   * @param requester - The authenticated user issuing the request
   * @param areaType - Optional filter by area type code
   * @param includeInactive - When true, also return deactivated areas (admin
   *   management grid). Every other consumer (monitoring, worker-facing
   *   pickers) defaults to false so a deactivated area stays out of live ops.
   * @returns Array of areas with areaType loaded
   */
  async findAll(requester: User, areaType?: string, includeInactive = false): Promise<Location[]> {
    this.logger.log(
      `Fetching areas for ${requester.username} (${requester.role})` +
        (areaType ? ` filtered by type: ${areaType}` : ''),
    );

    const query = this.buildFindAllQuery(requester, areaType, includeInactive);
    if (!query) return [];
    return query.getMany();
  }

  /**
   * Paginated variant of findAll (Phase 4-6 C2). Same scoping rules; used
   * when the client passes page/limit query params.
   */
  async findAllPaginated(
    requester: User,
    areaType: string | undefined,
    page: number = 1,
    limit: number = 20,
    includeInactive = false,
  ): Promise<PaginatedResponseDto<Location>> {
    const query = this.buildFindAllQuery(requester, areaType, includeInactive);
    if (!query) return new PaginatedResponseDto<Location>([], 0, page, limit);

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Shared findAll query builder. Returns null for district-scoped users with
   * no district_id — they must see nothing (defensive cross-district guard).
   */
  private buildFindAllQuery(requester: User, areaType?: string, includeInactive = false) {
    const query = this.locationRepository
      .createQueryBuilder('area')
      .leftJoinAndSelect('area.locationType', 'locationType')
      .leftJoinAndSelect('area.district', 'district')
      .orderBy('area.id', 'ASC');

    if (!includeInactive) {
      query.andWhere('area.is_active = :isActive', { isActive: true });
    }

    if (areaType) {
      query.andWhere('locationType.code = :areaType', { areaType });
    }

    const isCityRole = MONITORING_CITY.includes(requester.role as UserRole);
    if (!isCityRole) {
      if (!requester.district_id) {
        return null;
      }
      query.andWhere('area.district_id = :districtId', { districtId: requester.district_id });
    }

    return query;
  }

  /**
   * Get a single area by ID
   *
   * @param id - Location UUID
   * @returns The area with areaType loaded
   * @throws NotFoundException if area not found
   */
  async findOne(id: string): Promise<Location> {
    this.logger.log(`Fetching area with ID: ${id}`);

    // No is_active filter: this is a direct by-ID lookup (detail view, edit,
    // deactivate/activate, delete, boundary read/write) — the caller already
    // knows the ID, so "hide inactive from browsing" doesn't apply. Filtering
    // it here made activate() 404 on the very area it's meant to reactivate.
    const area = await this.locationRepository.findOne({
      where: { id },
      relations: ['district'],
    });

    if (!area) {
      this.logger.warn(`Location with ID ${id} not found`);
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return area;
  }

  /**
   * Update an area
   *
   * Note: Cannot update location_type_id (field excluded from UpdateLocationDto)
   *
   * @param id - Location UUID
   * @param updateAreaDto - Fields to update
   * @returns The updated area with areaType loaded
   * @throws NotFoundException if area not found
   */
  async update(id: string, updateAreaDto: UpdateLocationDto): Promise<Location> {
    this.logger.log(`Updating area with ID: ${id}`);

    const area = await this.findOne(id);

    if (updateAreaDto.region_id !== undefined) {
      await this.validateRegion(
        updateAreaDto.region_id,
        updateAreaDto.district_id ?? area.district_id,
      );
    }

    // Drop the loaded `district` relation object before merging: keeping it would
    // let TypeORM prefer the stale relation over a changed `district_id` on save,
    // silently ignoring a district reassignment. We save by FK column only.
    const { district: _rayon, ...areaWithoutDistrict } = area;
    void _rayon;
    const updatedArea = await this.locationRepository.save({
      ...areaWithoutDistrict,
      ...updateAreaDto,
    });

    this.logger.log(`Location with ID ${id} updated successfully`);
    return updatedArea;
  }

  /**
   * Soft delete an area
   *
   * Sets is_active to false instead of actually deleting the record.
   * Cannot delete if workers are assigned to this area.
   *
   * @param id - Location UUID
   * @throws NotFoundException if area not found
   * @throws BadRequestException if workers are assigned to this area
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Soft deleting area with ID: ${id}`);

    const area = await this.findOne(id);

    // Check if any workers are assigned to this area (via user.location_id)
    const assignmentCount = await this.userRepository.count({ where: { location_id: id } });
    if (assignmentCount > 0) {
      this.logger.warn(`Cannot delete area ${id}: ${assignmentCount} worker(s) assigned`);
      throw new BadRequestException(`Cannot delete area: ${assignmentCount} worker(s) assigned`);
    }

    // True soft delete (deleted_at + deleted_by via AuditSubscriber). Distinct
    // from deactivation, which only flips is_active.
    await this.locationRepository.softRemove(area);

    this.logger.log(`Location with ID ${id} soft deleted successfully`);
  }

  /** Deactivate an area (is_active=false) — kept and reversible; distinct from delete. */
  async deactivate(id: string): Promise<Location> {
    const area = await this.findOne(id);
    if (!area.is_active) return area;
    area.is_active = false;
    return this.locationRepository.save(area);
  }

  /** Reactivate a deactivated area (is_active=true). */
  async activate(id: string): Promise<Location> {
    const area = await this.findOne(id);
    if (area.is_active) return area;
    area.is_active = true;
    return this.locationRepository.save(area);
  }

  /**
   * Check if an area exists and is active
   *
   * @param id - Location UUID
   * @returns true if area exists and is active, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.locationRepository.count({
      where: { id, is_active: true },
    });
    return count > 0;
  }

  async getBoundary(id: string): Promise<AreaBoundaryResponseDto> {
    const area = await this.findOne(id);

    return {
      location_id: area.id,
      name: area.name,
      boundary_polygon: (area.boundary_polygon as GeoJsonPolygon) || null,
      gps_lat: parseFloat(area.gps_lat?.toString() || '0'),
      gps_lng: parseFloat(area.gps_lng?.toString() || '0'),
      coverage_area: area.coverage_area ? parseFloat(area.coverage_area.toString()) : null,
    };
  }

  async updateBoundary(id: string, dto: UpdateAreaBoundaryDto): Promise<AreaBoundaryResponseDto> {
    const area = await this.findOne(id);
    const errors = GeoJsonValidator.validatePolygon(dto.boundary_polygon);

    if (errors.length > 0) {
      throw new BadRequestException(`Invalid polygon: ${errors.join('; ')}`);
    }

    const coverageArea =
      dto.coverage_area ??
      GeoJsonValidator.computeAreaSqMeters(dto.boundary_polygon.coordinates[0]);

    area.boundary_polygon = dto.boundary_polygon;
    area.coverage_area = coverageArea;

    const saved = await this.locationRepository.save(area);
    this.logger.log(`Updated boundary for area ${id}`);

    // District boundaries are the official KMZ "Batas Wilayah Kerja Rayon" outlines
    // set by the seeder — NOT derived from member-area geofences. Editing an
    // area therefore never touches its district's boundary.

    return {
      location_id: saved.id,
      name: saved.name,
      boundary_polygon: (saved.boundary_polygon as GeoJsonPolygon) || null,
      gps_lat: parseFloat(saved.gps_lat?.toString() || '0'),
      gps_lng: parseFloat(saved.gps_lng?.toString() || '0'),
      coverage_area: saved.coverage_area ? parseFloat(saved.coverage_area.toString()) : null,
    };
  }
}
