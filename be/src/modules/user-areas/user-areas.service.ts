import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserArea } from './entities/user-area.entity';
import { Area } from '../areas/entities/area.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UserAreasService {
  private readonly logger = new Logger(UserAreasService.name);

  constructor(
    @InjectRepository(UserArea)
    private readonly userAreaRepo: Repository<UserArea>,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getEffectiveAreas(userId: string): Promise<Area[]> {
    const userAreas = await this.userAreaRepo.find({
      where: { user_id: userId },
      relations: ['area'],
    });
    return userAreas.map((ua) => ua.area).filter(Boolean);
  }

  async getPermanentAreas(userId: string): Promise<UserArea[]> {
    return this.userAreaRepo.find({
      where: { user_id: userId, assignment_type: 'permanent' },
      relations: ['area'],
    });
  }

  async getPermanentAreaIds(userId: string): Promise<string[]> {
    const areas = await this.userAreaRepo.find({
      where: { user_id: userId, assignment_type: 'permanent' },
      select: ['area_id'],
    });
    return areas.map((ua) => ua.area_id);
  }

  async assignAreas(userId: string, areaIds: string[], assignedBy: string): Promise<UserArea[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const areas = await this.areaRepo.find({ where: { id: In(areaIds) } });
    if (areas.length !== areaIds.length) {
      throw new NotFoundException('One or more areas not found');
    }

    const results: UserArea[] = [];
    for (const areaId of areaIds) {
      const existing = await this.userAreaRepo.findOne({
        where: { user_id: userId, area_id: areaId, assignment_type: 'permanent' },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      const userArea = this.userAreaRepo.create({
        user_id: userId,
        area_id: areaId,
        assignment_type: 'permanent',
        assigned_by: assignedBy,
      });
      results.push(await this.userAreaRepo.save(userArea));
    }

    this.logger.log(`Assigned ${areaIds.length} areas to user ${userId}`);
    return results;
  }

  /**
   * Make a user's PERMANENT area set exactly match `areaIds` (add missing,
   * remove dropped). Leaves `task_based` rows untouched. Returns the
   * {added, removed} area ids so callers can audit reassignments.
   */
  async reconcilePermanentAreas(
    userId: string,
    areaIds: string[],
    assignedBy: string,
  ): Promise<{ added: string[]; removed: string[] }> {
    const desired = [...new Set(areaIds)];
    // If a desired area currently exists only as a task_based row, drop that row
    // so it is represented once (as permanent) — avoids duplicate memberships.
    if (desired.length) {
      await this.userAreaRepo.delete({
        user_id: userId,
        area_id: In(desired),
        assignment_type: 'task_based',
      });
    }
    const current = await this.getPermanentAreaIds(userId);
    const added = desired.filter((id) => !current.includes(id));
    const removed = current.filter((id) => !desired.includes(id));

    if (added.length) {
      await this.assignAreas(userId, added, assignedBy);
    }
    for (const areaId of removed) {
      await this.userAreaRepo.delete({
        user_id: userId,
        area_id: areaId,
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
    const result = await this.userAreaRepo.delete({
      user_id: userId,
      area_id: areaId,
      assignment_type: 'permanent',
    });
    if (result.affected === 0) {
      throw new NotFoundException('Assignment not found');
    }
    this.logger.log(`Removed area ${areaId} from user ${userId}`);
  }

  async syncTaskBasedAreas(userId: string, activeTaskAreaIds: string[]): Promise<void> {
    // Remove stale task-based assignments
    await this.userAreaRepo.delete({
      user_id: userId,
      assignment_type: 'task_based',
    });

    // Add current task-based assignments
    for (const areaId of activeTaskAreaIds) {
      const existing = await this.userAreaRepo.findOne({
        where: { user_id: userId, area_id: areaId },
      });
      if (!existing) {
        const userArea = this.userAreaRepo.create({
          user_id: userId,
          area_id: areaId,
          assignment_type: 'task_based',
        });
        await this.userAreaRepo.save(userArea);
      }
    }
  }

  async getUsersByArea(areaId: string): Promise<User[]> {
    const userAreas = await this.userAreaRepo.find({
      where: { area_id: areaId },
      relations: ['user'],
    });
    return userAreas.map((ua) => ua.user).filter(Boolean);
  }

  async isUserAssignedToArea(userId: string, areaId: string): Promise<boolean> {
    const count = await this.userAreaRepo.count({
      where: { user_id: userId, area_id: areaId },
    });
    return count > 0;
  }
}
