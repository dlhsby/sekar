import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationPlant } from '../../plants/entities/location-plant.entity';
import { Location } from '../../locations/entities/location.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { PlantDueDateService, PlantStatus } from '../../plants/services/plant-due-date.service';

/**
 * Per-species breakdown in area plant status response.
 */
export interface AreaPlantSpeciesSummary {
  speciesId: string;
  speciesName: string;
  count: number;
  nextDueAt: Date | null;
  status: PlantStatus;
}

/**
 * Location-level plant status aggregation response.
 */
export interface AreaPlantStatusResponse {
  locationId: string;
  total: number;
  ok: number;
  due_soon: number;
  overdue: number;
  unknown: number;
  plants: AreaPlantSpeciesSummary[];
}

/**
 * Rayon-level rollup (Phase 3-8 close-out: dashboard widget + overdue digest).
 */
export interface RayonPlantStatusSummary {
  rayon_id: string | null;
  rayon_name: string | null;
  ok: number;
  due_soon: number;
  overdue: number;
  unknown: number;
  overdue_areas: { location_id: string; area_name: string; overdue: number }[];
}

export interface PlantStatusSummaryResponse {
  generated_at: Date;
  rayons: RayonPlantStatusSummary[];
}

/**
 * AreaPlantStatusService — Computes area-level plant maintenance status.
 *
 * Given an area ID, eagerly loads all plants and their species, applies
 * PlantDueDateService.recomputeAreaPlant to each, and aggregates status counts
 * and per-species breakdowns for dashboard display.
 *
 * Implements the `/monitoring/area/:id/plant-status` endpoint contract per
 * Phase 3 specs (3-8 sub-phase).
 */
@Injectable()
export class AreaPlantStatusService {
  private readonly logger = new Logger(AreaPlantStatusService.name);

  constructor(
    @InjectRepository(LocationPlant)
    private readonly areaPlantRepository: Repository<LocationPlant>,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    @InjectRepository(Rayon)
    private readonly rayonRepository: Repository<Rayon>,
    private readonly plantDueDateService: PlantDueDateService,
  ) {}

  /**
   * Get plant maintenance status for an area.
   *
   * Fetches all area_plants rows for the given area, eagerly loading species
   * and area_type via the area relation. For each plant, recomputes next_due_at
   * and status using PlantDueDateService. Aggregates status counts and returns
   * a per-species breakdown.
   *
   * @param locationId — UUID of the area
   * @returns AreaPlantStatusResponse with status aggregates and per-species details
   * @throws NotFoundException if area does not exist
   */
  async getAreaPlantStatus(locationId: string): Promise<AreaPlantStatusResponse> {
    this.logger.log(`Computing plant status for area: ${locationId}`);

    // Verify area exists
    const area = await this.areaRepository.findOne({
      where: { id: locationId },
      relations: ['locationType'],
    });

    if (!area) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    // Load all plants for this area with species relation
    const areaPlants = await this.areaPlantRepository.find({
      where: { locationId },
      relations: ['species'],
    });

    // Recompute status for each plant
    const plantStatuses = areaPlants.map((plant) => {
      const { nextDueAt, status } = this.plantDueDateService.recomputeAreaPlant(
        plant,
        plant.species,
        area.locationType,
      );

      return {
        plant,
        nextDueAt,
        status,
      };
    });

    // Aggregate status counts
    const aggregates = this.aggregateStatuses(plantStatuses.map((ps) => ps.status));

    // Build per-species breakdown
    const plants: AreaPlantSpeciesSummary[] = plantStatuses.map((ps) => ({
      speciesId: ps.plant.speciesId,
      speciesName: ps.plant.species.nameId,
      count: ps.plant.count,
      nextDueAt: ps.nextDueAt,
      status: ps.status,
    }));

    const totalCount = plants.reduce((sum, p) => sum + p.count, 0);

    return {
      locationId,
      total: totalCount,
      ok: aggregates.ok,
      due_soon: aggregates.due_soon,
      overdue: aggregates.overdue,
      unknown: aggregates.unknown,
      plants,
    };
  }

  /**
   * Per-rayon plant-status rollup across all areas (optionally one rayon).
   * Recomputes every row's status (same path as getAreaPlantStatus) and groups
   * counts per rayon, listing the areas that currently have overdue species.
   */
  async getSummary(rayonId?: string): Promise<PlantStatusSummaryResponse> {
    const areas = await this.areaRepository.find({
      where: rayonId ? { rayon_id: rayonId } : {},
      relations: ['locationType'],
    });
    const areaById = new Map(areas.map((a) => [a.id, a]));
    const rayons = await this.rayonRepository.find({ select: ['id', 'name'] });
    const rayonNameById = new Map(rayons.map((r) => [r.id, r.name]));

    const plants = await this.areaPlantRepository.find({ relations: ['species'] });

    const rayonMap = new Map<string, RayonPlantStatusSummary>();
    const overduePerArea = new Map<string, number>();

    for (const plant of plants) {
      const area = areaById.get(plant.locationId);
      if (!area) continue; // outside the requested rayon scope (or orphaned)

      const { status } = this.plantDueDateService.recomputeAreaPlant(
        plant,
        plant.species,
        area.locationType,
      );

      const key = area.rayon_id ?? 'none';
      const entry =
        rayonMap.get(key) ??
        rayonMap
          .set(key, {
            rayon_id: area.rayon_id ?? null,
            rayon_name: area.rayon_id ? (rayonNameById.get(area.rayon_id) ?? null) : null,
            ok: 0,
            due_soon: 0,
            overdue: 0,
            unknown: 0,
            overdue_areas: [],
          })
          .get(key)!;
      entry[status] += 1;

      if (status === 'overdue') {
        overduePerArea.set(area.id, (overduePerArea.get(area.id) ?? 0) + 1);
      }
    }

    for (const [locationId, count] of overduePerArea) {
      const area = areaById.get(locationId)!;
      const entry = rayonMap.get(area.rayon_id ?? 'none');
      entry?.overdue_areas.push({ location_id: locationId, area_name: area.name, overdue: count });
    }
    for (const entry of rayonMap.values()) {
      entry.overdue_areas.sort((a, b) => b.overdue - a.overdue);
    }

    return {
      generated_at: new Date(),
      rayons: [...rayonMap.values()].sort((a, b) =>
        (a.rayon_name ?? '').localeCompare(b.rayon_name ?? ''),
      ),
    };
  }

  /**
   * Aggregate status counts from a list of plant statuses.
   *
   * @param statuses — Array of PlantStatus values
   * @returns Object with counts per status
   */
  private aggregateStatuses(statuses: PlantStatus[]): {
    ok: number;
    due_soon: number;
    overdue: number;
    unknown: number;
  } {
    return statuses.reduce(
      (acc, status) => {
        acc[status]++;
        return acc;
      },
      { ok: 0, due_soon: 0, overdue: 0, unknown: 0 },
    );
  }
}
