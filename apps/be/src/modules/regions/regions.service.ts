import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Location } from '../locations/entities/location.entity';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

/**
 * Regions (Kawasan) master data (ADR-045). Region delete nulls child areas'
 * `region_id` (soft-delete won't trigger the FK), and re-parenting an area into
 * a region requires the area and region to share a rayon.
 */
@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
    @InjectRepository(Rayon)
    private readonly rayonRepo: Repository<Rayon>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  findAll(rayonId?: string): Promise<Region[]> {
    return this.regionRepo.find({
      where: rayonId ? { rayon_id: rayonId } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Region> {
    const region = await this.regionRepo.findOne({ where: { id } });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }

  async create(dto: CreateRegionDto): Promise<Region> {
    await this.assertRayonExists(dto.rayon_id);
    await this.assertNameFree(dto.rayon_id, dto.name);
    const region = this.regionRepo.create(dto);
    return this.regionRepo.save(region);
  }

  async update(id: string, dto: UpdateRegionDto): Promise<Region> {
    const region = await this.findOne(id);
    if (dto.rayon_id && dto.rayon_id !== region.rayon_id) {
      await this.assertRayonExists(dto.rayon_id);
    }
    if (dto.name && dto.name !== region.name) {
      await this.assertNameFree(dto.rayon_id ?? region.rayon_id, dto.name, id);
    }
    Object.assign(region, dto);
    return this.regionRepo.save(region);
  }

  async remove(id: string): Promise<void> {
    const region = await this.findOne(id);
    // Detach child areas first — soft-delete does not fire the FK's ON DELETE
    // SET NULL. Use an explicit SET NULL: repo.update() skips `undefined`, so
    // `{ region_id: undefined }` would be a no-op and leave areas orphaned.
    await this.locationRepo
      .createQueryBuilder()
      .update(Location)
      .set({ region_id: () => 'NULL' })
      .where('region_id = :id', { id })
      .execute();
    await this.regionRepo.softRemove(region);
  }

  /** Re-parent areas into this region (all must share the region's rayon). */
  /**
   * Set the region's areas to EXACTLY `locationIds` (replace semantics): selected
   * areas are re-parented in, and any area currently in this region but no longer
   * selected is un-parented (region_id → NULL). All selected areas must share the
   * region's rayon. Passing an empty list clears the region's areas.
   */
  async assignLocations(id: string, locationIds: string[]): Promise<{ updated: number }> {
    const region = await this.findOne(id);

    if (locationIds.length > 0) {
      const areas = await this.locationRepo.find({ where: { id: In(locationIds) } });
      if (areas.length !== locationIds.length) {
        throw new NotFoundException('One or more areas not found');
      }
      const mismatched = areas.filter((a) => a.rayon_id !== region.rayon_id);
      if (mismatched.length > 0) {
        throw new BadRequestException(
          `Areas must belong to the region's rayon: ${mismatched.map((a) => a.name).join(', ')}`,
        );
      }
    }

    // Un-parent areas currently in this region that are no longer selected.
    // TypeORM update() skips undefined, so clear via a NULL-setting QueryBuilder.
    const unassign = this.locationRepo
      .createQueryBuilder()
      .update()
      .set({ region_id: () => 'NULL' })
      .where('region_id = :id', { id });
    if (locationIds.length > 0) {
      unassign.andWhere('id NOT IN (:...locationIds)', { locationIds });
    }
    await unassign.execute();

    // Parent the selected areas into the region.
    if (locationIds.length > 0) {
      await this.locationRepo.update({ id: In(locationIds) }, { region_id: id });
    }
    return { updated: locationIds.length };
  }

  private async assertRayonExists(rayonId: string): Promise<void> {
    const exists = await this.rayonRepo.findOne({ where: { id: rayonId } });
    if (!exists) throw new BadRequestException('Parent rayon not found');
  }

  private async assertNameFree(rayonId: string, name: string, excludeId?: string): Promise<void> {
    const clash = await this.regionRepo.findOne({
      where: {
        rayon_id: rayonId,
        name,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
    if (clash) throw new ConflictException('A region with this name already exists in the rayon');
  }
}
