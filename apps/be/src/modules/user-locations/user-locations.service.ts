import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserLocation } from './entities/user-location.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UserLocationsService {
  private readonly logger = new Logger(UserLocationsService.name);

  constructor(
    @InjectRepository(UserLocation)
    private readonly userLocationRepo: Repository<UserLocation>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getEffectiveLocations(userId: string): Promise<Location[]> {
    const userAreas = await this.userLocationRepo.find({
      where: { user_id: userId },
      relations: ['area'],
    });
    return userAreas.map((ua) => ua.area).filter(Boolean);
  }

  async getPermanentLocations(userId: string): Promise<UserLocation[]> {
    // `area.areaType` is eager on Location, so it loads automatically. The rayon name
    // is resolved client-side from `area.rayon_id` (8 rayons, cached) rather than
    // eager-joined here.
    return this.userLocationRepo.find({
      where: { user_id: userId, assignment_type: 'permanent' },
      relations: ['area'],
    });
  }

  async getPermanentLocationIds(userId: string): Promise<string[]> {
    const areas = await this.userLocationRepo.find({
      where: { user_id: userId, assignment_type: 'permanent' },
      select: ['location_id'],
    });
    return areas.map((ua) => ua.location_id);
  }

  /**
   * Batch query for permanent area IDs across multiple users.
   * Returns a Map from user_id to location_id[]. Users with no permanent areas
   * are included in the Map with an empty array.
   * Handles empty userIds gracefully by returning an empty Map.
   */
  async getPermanentLocationIdsForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    if (!userIds.length) {
      return result;
    }

    const areas = await this.userLocationRepo.find({
      where: { user_id: In(userIds), assignment_type: 'permanent' },
      select: ['user_id', 'location_id'],
    });

    // Initialize all users with empty arrays
    for (const userId of userIds) {
      result.set(userId, []);
    }

    // Group by user_id
    for (const area of areas) {
      const existing = result.get(area.user_id) ?? [];
      existing.push(area.location_id);
      result.set(area.user_id, existing);
    }

    return result;
  }

  async assignLocations(
    userId: string,
    locationIds: string[],
    assignedBy: string,
  ): Promise<UserLocation[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const areas = await this.locationRepo.find({ where: { id: In(locationIds) } });
    if (areas.length !== locationIds.length) {
      throw new NotFoundException('One or more areas not found');
    }

    const results: UserLocation[] = [];
    for (const areaId of locationIds) {
      const existing = await this.userLocationRepo.findOne({
        where: { user_id: userId, location_id: areaId, assignment_type: 'permanent' },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      const userArea = this.userLocationRepo.create({
        user_id: userId,
        location_id: areaId,
        assignment_type: 'permanent',
        assigned_by: assignedBy,
      });
      results.push(await this.userLocationRepo.save(userArea));
    }

    this.logger.log(`Assigned ${locationIds.length} areas to user ${userId}`);
    return results;
  }

  /**
   * Make a user's PERMANENT area set exactly match `locationIds` (add missing,
   * remove dropped). Leaves `task_based` rows untouched. Returns the
   * {added, removed} area ids so callers can audit reassignments.
   */
  async reconcilePermanentLocations(
    userId: string,
    locationIds: string[],
    assignedBy: string,
  ): Promise<{ added: string[]; removed: string[] }> {
    const desired = [...new Set(locationIds)];
    // If a desired area currently exists only as a task_based row, drop that row
    // so it is represented once (as permanent) — avoids duplicate memberships.
    if (desired.length) {
      await this.userLocationRepo.delete({
        user_id: userId,
        location_id: In(desired),
        assignment_type: 'task_based',
      });
    }
    const current = await this.getPermanentLocationIds(userId);
    const added = desired.filter((id) => !current.includes(id));
    const removed = current.filter((id) => !desired.includes(id));

    if (added.length) {
      await this.assignLocations(userId, added, assignedBy);
    }
    for (const areaId of removed) {
      await this.userLocationRepo.delete({
        user_id: userId,
        location_id: areaId,
        assignment_type: 'permanent',
      });
    }
    if (added.length || removed.length) {
      this.logger.log(
        `Reconciled permanent areas for user ${userId}: +${added.length} -${removed.length}`,
      );
    }
    return { added, removed };
  }

  async removeAssignment(userId: string, areaId: string): Promise<void> {
    const result = await this.userLocationRepo.delete({
      user_id: userId,
      location_id: areaId,
      assignment_type: 'permanent',
    });
    if (result.affected === 0) {
      throw new NotFoundException('Assignment not found');
    }
    this.logger.log(`Removed area ${areaId} from user ${userId}`);
  }

  async syncTaskBasedLocations(userId: string, activeTaskAreaIds: string[]): Promise<void> {
    // Remove stale task-based assignments
    await this.userLocationRepo.delete({
      user_id: userId,
      assignment_type: 'task_based',
    });

    // Add current task-based assignments
    for (const areaId of activeTaskAreaIds) {
      const existing = await this.userLocationRepo.findOne({
        where: { user_id: userId, location_id: areaId },
      });
      if (!existing) {
        const userArea = this.userLocationRepo.create({
          user_id: userId,
          location_id: areaId,
          assignment_type: 'task_based',
        });
        await this.userLocationRepo.save(userArea);
      }
    }
  }

  async getUsersByLocation(areaId: string): Promise<User[]> {
    const userAreas = await this.userLocationRepo.find({
      where: { location_id: areaId },
      relations: ['user'],
    });
    return userAreas.map((ua) => ua.user).filter(Boolean);
  }

  async isUserAssignedToLocation(userId: string, areaId: string): Promise<boolean> {
    const count = await this.userLocationRepo.count({
      where: { user_id: userId, location_id: areaId },
    });
    return count > 0;
  }
}
