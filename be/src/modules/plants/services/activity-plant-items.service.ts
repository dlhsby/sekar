import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPlantItem } from '../entities/activity-plant-item.entity';

/**
 * Service for managing plant item line-items attached to activities.
 * Supports batch creation and lookup by activity.
 */
@Injectable()
export class ActivityPlantItemsService {
  constructor(
    @InjectRepository(ActivityPlantItem)
    private readonly repo: Repository<ActivityPlantItem>,
  ) {}

  /**
   * Create multiple plant item records for a single activity in one DB round-trip.
   */
  async createBatch(
    activityId: string,
    items: { speciesId: string; count: number; notes?: string }[],
  ): Promise<ActivityPlantItem[]> {
    const entities = items.map((item) =>
      this.repo.create({
        activityId,
        speciesId: item.speciesId,
        count: item.count,
        notes: item.notes ?? null,
      }),
    );
    return this.repo.save(entities);
  }

  /**
   * Retrieve all plant items for a given activity, including species details.
   */
  async findByActivity(activityId: string): Promise<ActivityPlantItem[]> {
    return this.repo.find({ where: { activityId }, relations: ['species'] });
  }
}
