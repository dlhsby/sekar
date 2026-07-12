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
    private readonly userAreaRepo: Repository<UserLocation>,
    @InjectRepository(Location)
    private readonly areaRepo: Repository<Location>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getEffectiveAreas(userId: string): Promise<Location[]> {
    const userAreas = await this.userAreaRepo.find({
      where: { user_id: userId },
      relations: ['location'],
    });
    return userAreas.map((ua) => ua.location).filter(Boolean);
  }

  async getPermanentAreas(userId: string): Promise<UserLocation[]> {
    // `location.locationType` is eager on Location, so it loads automatically. The rayon name
    // is resolved client-side from `location.rayon_id` (8 rayons, cached) rather than
    // eager-joined here.
    return this.userAreaRepo.find({
      where: { user_id: userId, assignment_type: 'permanent' },
      relations: ['location'],
    });
  }

  async getPermanentLocationIds(userId: string): Promise<string[]> {
    const areas = await this.userAreaRepo.find({
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

    const areas = await this.userAreaRepo.find({
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

  async assignAreas(
    userId: string,
    locationIds: string[],
    assignedBy: string,
  ): Promise<UserLocation[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const areas = await this.areaRepo.find({ where: { id: In(locationIds) } });
    if (areas.length !== locationIds.length) {
      throw new NotFoundException('One or more locations not found');
    }

    const results: UserLocation[] = [];
    for (const locationId of locationIds) {
      const existing = await this.userAreaRepo.findOne({
        where: { user_id: userId, location_id: locationId, assignment_type: 'permanent' },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      const userLocation = this.userAreaRepo.create({
        user_id: userId,
        location_id: locationId,
        assignment_type: 'permanent',
        assigned_by: assignedBy,
      });
      results.push(await this.userAreaRepo.save(userLocation));
    }

    this.logger.log(`Assigned ${locationIds.length} locations to user ${userId}`);
    return results;
  }

  /**
   * Make a user's PERMANENT location set exactly match `locationIds` (add missing,
   * remove dropped). Leaves `task_based` rows untouched. Returns the
   * {added, removed} location ids so callers can audit reassignments.
   */
  async reconcilePermanentAreas(
    userId: string,
    locationIds: string[],
    assignedBy: string,
  ): Promise<{ added: string[]; removed: string[] }> {
    const desired = [...new Set(locationIds)];
    // If a desired location currently exists only as a task_based row, drop that row
    // so it is represented once (as permanent) — avoids duplicate memberships.
    if (desired.length) {
      await this.userAreaRepo.delete({
        user_id: userId,
        location_id: In(desired),
        assignment_type: 'task_based',
      });
    }
    const current = await this.getPermanentLocationIds(userId);
    const added = desired.filter((id) => !current.includes(id));
    const removed = current.filter((id) => !desired.includes(id));

    if (added.length) {
      await this.assignAreas(userId, added, assignedBy);
    }
    for (const locationId of removed) {
      await this.userAreaRepo.delete({
        user_id: userId,
        location_id: locationId,
        assignment_type: 'permanent',
      });
    }
    if (added.length || removed.length) {
      this.logger.log(
        `Reconciled permanent locations for user ${userId}: +${added.length} -${removed.length}`,
      );
    }
    return { added, removed };
  }

  async removeAssignment(userId: string, locationId: string): Promise<void> {
    const result = await this.userAreaRepo.delete({
      user_id: userId,
      location_id: locationId,
      assignment_type: 'permanent',
    });
    if (result.affected === 0) {
      throw new NotFoundException('Assignment not found');
    }
    this.logger.log(`Removed location ${locationId} from user ${userId}`);
  }

  async syncTaskBasedLocations(userId: string, activeTaskLocationIds: string[]): Promise<void> {
    // Remove stale task-based assignments
    await this.userAreaRepo.delete({
      user_id: userId,
      assignment_type: 'task_based',
    });

    // Add current task-based assignments
    for (const locationId of activeTaskLocationIds) {
      const existing = await this.userAreaRepo.findOne({
        where: { user_id: userId, location_id: locationId },
      });
      if (!existing) {
        const userLocation = this.userAreaRepo.create({
          user_id: userId,
          location_id: locationId,
          assignment_type: 'task_based',
        });
        await this.userAreaRepo.save(userLocation);
      }
    }
  }

  async getUsersByArea(locationId: string): Promise<User[]> {
    const userAreas = await this.userAreaRepo.find({
      where: { location_id: locationId },
      relations: ['user'],
    });
    return userAreas.map((ua) => ua.user).filter(Boolean);
  }

  async isUserAssignedToArea(userId: string, locationId: string): Promise<boolean> {
    const count = await this.userAreaRepo.count({
      where: { user_id: userId, location_id: locationId },
    });
    return count > 0;
  }
}
