import { Injectable, Logger } from '@nestjs/common';
import { PlantSpecies } from '../entities/plant-species.entity';
import { AreaPlant } from '../entities/area-plant.entity';
import { AreaType } from '../../area-types/entities/area-type.entity';

export type PlantStatus = 'ok' | 'due_soon' | 'overdue' | 'unknown';

/**
 * PlantDueDateService — Deterministic pruning cycle prediction per ADR-034.
 *
 * Computes next due date and status for area plants based on:
 * 1. Species default pruning cycle (days)
 * 2. Area plant override cycle (takes precedence)
 * 3. Last pruned date (when null, no forecast available)
 * 4. Current date (for status classification)
 *
 * Status rules (ADR-034):
 * - unknown: next_due_at is null (never pruned or no cycle defined)
 * - overdue: next_due_at < now
 * - due_soon: next_due_at >= now AND next_due_at < now + 14 days
 * - ok: everything else
 *
 * Cycle precedence: override > species default > null (no forecast)
 */
@Injectable()
export class PlantDueDateService {
  private readonly logger = new Logger(PlantDueDateService.name);

  /**
   * Compute next due date for an area plant.
   *
   * @param species — PlantSpecies with defaultPruningCycleDays
   * @param areaType — AreaType (reserved for future species×area_type refinement; currently unused)
   * @param lastPrunedAt — Date when area was last pruned (null = never pruned)
   * @param overrideCycleDays — Admin override cycle in days (takes precedence over species default)
   * @returns Computed next_due_at date, or null if no forecast available
   */
  computeNextDueDate(
    species: PlantSpecies,
    areaType: AreaType | null,
    lastPrunedAt: Date | null,
    overrideCycleDays?: number | null,
  ): Date | null {
    // If never pruned, no forecast available
    if (!lastPrunedAt) {
      return null;
    }

    // Determine cycle days using precedence: override > species default
    const cycleDays = overrideCycleDays ?? species.defaultPruningCycleDays;

    // If no cycle defined, no forecast
    if (!cycleDays) {
      return null;
    }

    // Compute next due date: lastPrunedAt + cycleDays
    const nextDue = new Date(lastPrunedAt);
    nextDue.setDate(nextDue.getDate() + cycleDays);

    return nextDue;
  }

  /**
   * Classify plant status based on next due date (ADR-034).
   *
   * Status window is 14 days before due date (configurable via monitoring_configs,
   * but hardcoded to 14 here for the service; can be parameterized later).
   *
   * @param nextDueAt — Computed next_due_at date
   * @param now — Current date (defaults to new Date())
   * @returns Status classification: 'unknown' | 'overdue' | 'due_soon' | 'ok'
   */
  classifyStatus(nextDueAt: Date | null, now: Date = new Date()): PlantStatus {
    if (!nextDueAt) {
      return 'unknown';
    }

    if (nextDueAt < now) {
      return 'overdue';
    }

    // Due window: 14 days before next_due_at
    const dueWindowStart = new Date(nextDueAt);
    dueWindowStart.setDate(dueWindowStart.getDate() - 14);

    if (now >= dueWindowStart) {
      return 'due_soon';
    }

    return 'ok';
  }

  /**
   * Recompute next_due_at and status for an area plant.
   * Glue method combining computeNextDueDate and classifyStatus.
   *
   * @param plant — AreaPlant entity with species and area relations
   * @param species — PlantSpecies entity
   * @param areaType — AreaType entity (or null; reserved for future refinement)
   * @returns Object with computed nextDueAt and status
   */
  recomputeAreaPlant(
    plant: AreaPlant,
    species: PlantSpecies,
    areaType: AreaType | null,
  ): { nextDueAt: Date | null; status: PlantStatus } {
    const nextDueAt = this.computeNextDueDate(
      species,
      areaType,
      plant.lastPrunedAt,
      plant.overrideCycleDays,
    );

    const status = this.classifyStatus(nextDueAt);

    return { nextDueAt, status };
  }
}
