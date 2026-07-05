import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { MONITORING_CITY } from '../users/constants/role-groups';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { AreaTypesService } from '../area-types/area-types.service';
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
   * Rayon scoping (2026-05-18):
   *   - City roles (superadmin / admin_system / top_management): see all areas.
   *   - Everyone else (kepala_rayon / admin_data / korlap / satgas / linmas /
   *     staff_kecamatan): filtered to `area.rayon_id = user.rayon_id`.
   *     Users without a rayon_id see nothing (defensive default).
   *
   * @param requester - The authenticated user issuing the request
   * @param areaType - Optional filter by area type code
   * @returns Array of areas with areaType loaded
   */
  async findAll(requester: User, areaType?: string): Promise<Area[]> {
    this.logger.log(
      `Fetching areas for ${requester.username} (${requester.role})` +
        (areaType ? ` filtered by type: ${areaType}` : ''),
    );

    const query = this.buildFindAllQuery(requester, areaType);
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
  ): Promise<PaginatedResponseDto<Area>> {
    const query = this.buildFindAllQuery(requester, areaType);
    if (!query) return new PaginatedResponseDto<Area>([], 0, page, limit);

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Shared findAll query builder. Returns null for rayon-scoped users with
   * no rayon_id — they must see nothing (defensive cross-rayon guard).
   */
  private buildFindAllQuery(requester: User, areaType?: string) {
    const query = this.areaRepository
      .createQueryBuilder('area')
      .leftJoinAndSelect('area.areaType', 'areaType')
      .leftJoinAndSelect('area.rayon', 'rayon')
      .where('area.is_active = :isActive', { isActive: true })
      .orderBy('area.id', 'ASC');

    if (areaType) {
      query.andWhere('areaType.code = :areaType', { areaType });
    }

    const isCityRole = MONITORING_CITY.includes(requester.role as UserRole);
    if (!isCityRole) {
      if (!requester.rayon_id) {
        return null;
      }
      query.andWhere('area.rayon_id = :rayonId', { rayonId: requester.rayon_id });
    }

    return query;
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
      relations: ['rayon'],
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

    // Drop the loaded `rayon` relation object before merging: keeping it would
    // let TypeORM prefer the stale relation over a changed `rayon_id` on save,
    // silently ignoring a rayon reassignment. We save by FK column only.
    const { rayon: _rayon, ...areaWithoutRayon } = area;
    void _rayon;
    const updatedArea = await this.areaRepository.save({ ...areaWithoutRayon, ...updateAreaDto });

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

    // True soft delete (deleted_at + deleted_by via AuditSubscriber). Distinct
    // from deactivation, which only flips is_active.
    await this.areaRepository.softRemove(area);

    this.logger.log(`Area with ID ${id} soft deleted successfully`);
  }

  /** Deactivate an area (is_active=false) — kept and reversible; distinct from delete. */
  async deactivate(id: string): Promise<Area> {
    const area = await this.findOne(id);
    if (!area.is_active) return area;
    area.is_active = false;
    return this.areaRepository.save(area);
  }

  /** Reactivate a deactivated area (is_active=true). */
  async activate(id: string): Promise<Area> {
    const area = await this.findOne(id);
    if (area.is_active) return area;
    area.is_active = true;
    return this.areaRepository.save(area);
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

  async getBoundary(id: string): Promise<AreaBoundaryResponseDto> {
    const area = await this.findOne(id);

    return {
      area_id: area.id,
      name: area.name,
      boundary_polygon: (area.boundary_polygon as GeoJsonPolygon) || null,
      gps_lat: parseFloat(area.gps_lat?.toString() || '0'),
      gps_lng: parseFloat(area.gps_lng?.toString() || '0'),
      radius_meters: area.radius_meters,
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

    const saved = await this.areaRepository.save(area);
    this.logger.log(`Updated boundary for area ${id}`);

    // Rayon boundaries are the official KMZ "Batas Wilayah Kerja Rayon" outlines
    // set by the seeder — NOT derived from member-area geofences. Editing an
    // area therefore never touches its rayon's boundary.

    return {
      area_id: saved.id,
      name: saved.name,
      boundary_polygon: (saved.boundary_polygon as GeoJsonPolygon) || null,
      gps_lat: parseFloat(saved.gps_lat?.toString() || '0'),
      gps_lng: parseFloat(saved.gps_lng?.toString() || '0'),
      radius_meters: saved.radius_meters,
      coverage_area: saved.coverage_area ? parseFloat(saved.coverage_area.toString()) : null,
    };
  }
}
