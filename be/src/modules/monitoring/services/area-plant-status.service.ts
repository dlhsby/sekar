import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaPlant } from '../../plants/entities/area-plant.entity';
import { PlantSpecies } from '../../plants/entities/plant-species.entity';
import { Area } from '../../areas/entities/area.entity';
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
 * Area-level plant status aggregation response.
 */
export interface AreaPlantStatusResponse {
  areaId: string;
  total: number;
  ok: number;
  due_soon: number;
  overdue: number;
  unknown: number;
  plants: AreaPlantSpeciesSummary[];
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
    @InjectRepository(AreaPlant)
    private readonly areaPlantRepository: Repository<AreaPlant>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
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
   * @param areaId — UUID of the area
   * @returns AreaPlantStatusResponse with status aggregates and per-species details
   * @throws NotFoundException if area does not exist
   */
  async getAreaPlantStatus(areaId: string): Promise<AreaPlantStatusResponse> {
    this.logger.log(`Computing plant status for area: ${areaId}`);

    // Verify area exists
    const area = await this.areaRepository.findOne({
      where: { id: areaId },
      relations: ['areaType'],
    });

    if (!area) {
      throw new NotFoundException(`Area with ID ${areaId} not found`);
    }

    // Load all plants for this area with species relation
    const areaPlants = await this.areaPlantRepository.find({
      where: { areaId },
      relations: ['species'],
    });

    // Recompute status for each plant
    const plantStatuses = areaPlants.map((plant) => {
      const { nextDueAt, status } = this.plantDueDateService.recomputeAreaPlant(
        plant,
        plant.species,
        area.areaType,
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
      areaId,
      total: totalCount,
      ok: aggregates.ok,
      due_soon: aggregates.due_soon,
      overdue: aggregates.overdue,
      unknown: aggregates.unknown,
      plants,
    };
  }

  /**
   * Aggregate status counts from a list of plant statuses.
   *
   * @param statuses — Array of PlantStatus values
   * @returns Object with counts per status
   */
  private aggregateStatuses(
    statuses: PlantStatus[],
  ): { ok: number; due_soon: number; overdue: number; unknown: number } {
    return statuses.reduce(
      (acc, status) => {
        acc[status]++;
        return acc;
      },
      { ok: 0, due_soon: 0, overdue: 0, unknown: 0 },
    );
  }
}
