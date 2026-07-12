import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { UserLocationsService } from '../../user-locations/user-locations.service';

/**
 * Keeps a worker's `task_based` location assignments (ADR-013 §5) in sync with the
 * tasks they currently have open in other locations, so monitoring boundaries follow
 * a worker onto ad-hoc tasks and clear again once those tasks finish.
 *
 * Strategy: on every task-lifecycle transition we recompute the worker's full
 * set of active-task locations and hand it to `syncTaskBasedLocations`, which is
 * idempotent (it replaces the task_based rows and never duplicates a permanent
 * location). Failures here are logged but never block the task transition itself.
 */
@Injectable()
export class TaskLocationSyncService {
  private readonly logger = new Logger(TaskLocationSyncService.name);

  /** Statuses that keep a worker actively bound to a task's area. */
  private static readonly ACTIVE_STATUSES = [
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVISION_NEEDED,
  ];

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly userLocationsService: UserLocationsService,
  ) {}

  /**
   * Recompute and persist the worker's task-based area assignments from their
   * currently-open tasks. No-op for a null/empty user.
   */
  async syncForUser(userId: string | null | undefined): Promise<void> {
    if (!userId) return;
    try {
      const tasks = await this.taskRepository.find({
        where: { assigned_to: userId, status: In(TaskLocationSyncService.ACTIVE_STATUSES) },
        select: ['id', 'location_id'],
      });
      const locationIds = [
        ...new Set(tasks.map((t) => t.location_id).filter((id): id is string => !!id)),
      ];
      await this.userLocationsService.syncTaskBasedLocations(userId, locationIds);
    } catch (error) {
      this.logger.error(
        `Failed to sync task-based locations for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
