import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { CompleteTaskDto } from '../dto/complete-task.dto';
import { PartialCompleteTaskDto } from '../dto/partial-complete-task.dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuditLogService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { TaskFinderService } from './task-finder.service';
import { TaskAreaSyncService } from './task-area-sync.service';

/** Pick a subset of keys from an object without mutating. */
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce(
    (acc, k) => {
      acc[k] = obj[k];
      return acc;
    },
    {} as Pick<T, K>,
  );
}

type CascadeStatus = 'in_progress' | 'done';

interface CascadedRequest {
  id: string;
  submitted_by: string;
  reference_code: string;
}

const PARTIAL_COMPLETE_ROLES: UserRole[] = [
  UserRole.SATGAS,
  UserRole.LINMAS,
  UserRole.KORLAP,
  UserRole.ADMIN_SYSTEM,
  UserRole.SUPERADMIN,
];

/**
 * Execution-side lifecycle transitions: start, complete, partial completion
 * and resume-tomorrow child spawning, plus the pruning-request cascade that
 * mirrors task state back onto the originating kecamatan request.
 */
@Injectable()
export class TaskStatusTransitionsService {
  private readonly logger = new Logger(TaskStatusTransitionsService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly taskFinder: TaskFinderService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly taskAreaSync: TaskAreaSyncService,
  ) {}

  /** Start working on a task (by assignee). */
  async start(id: string, userId: string): Promise<Task> {
    this.logger.log(`User ${userId} starting task ${id}`);
    const task = await this.taskFinder.getOrFail(id);
    this.assertAssignedTo(task, userId, 'You can only start tasks assigned to you');
    this.assertCanStart(task);
    await this.taskRepository.save({
      ...task,
      status: TaskStatus.IN_PROGRESS,
      started_at: new Date(),
    });
    await this.cascadePruningRequestStatus(id, 'in_progress', userId);
    return this.taskFinder.getOrFail(id);
  }

  /** Complete a task with evidence (by assignee). */
  async complete(id: string, userId: string, completeTaskDto: CompleteTaskDto): Promise<Task> {
    this.logger.log(`User ${userId} completing task ${id}`);
    const task = await this.taskFinder.getOrFail(id);
    this.assertAssignedTo(task, userId, 'You can only complete tasks assigned to you');
    this.assertCanComplete(task);
    await this.taskRepository.save(this.withCompletion(task, completeTaskDto));
    this.audit(id, userId, 'complete', { status: TaskStatus.COMPLETED });
    // Completing is terminal — drop the task-based area unless another task keeps it.
    await this.taskAreaSync.syncForUser(userId);
    await this.cascadePruningRequestStatus(id, 'done', userId);
    return this.taskFinder.getOrFail(id);
  }

  /**
   * Record a partial completion for a plant-counting task. Increments
   * completed_plant_count; when resume_tomorrow is set and the task is not
   * fully done, spawns a child task covering the remaining count.
   */
  async partialComplete(
    taskId: string,
    dto: PartialCompleteTaskDto,
    user: User,
  ): Promise<{ task: Task; child_task_id?: string }> {
    this.logger.log(`User ${user.id} partial-completing task ${taskId}`);
    const task = await this.taskFinder.getBareOrFail(taskId);
    this.assertPartialCompleteRole(user);

    const newCompleted = (task.completedPlantCount ?? 0) + dto.completed_count;
    const isFullyDone = this.isFullyDone(task, newCompleted, dto.resume_tomorrow);
    const becomesCompleted = isFullyDone && task.status === TaskStatus.IN_PROGRESS;
    const updated = this.withProgress(task, newCompleted, becomesCompleted);
    await this.taskRepository.save(updated);

    // Cascade only when the parent task is truly done; mid-progress partials
    // leave the linked request on `in_progress` (already set by start()).
    if (becomesCompleted) {
      await this.taskAreaSync.syncForUser(user.id);
      await this.cascadePruningRequestStatus(taskId, 'done', user.id);
    }

    const childTaskId =
      dto.resume_tomorrow && !isFullyDone
        ? await this.spawnResumeChild(updated, newCompleted)
        : undefined;
    this.audit(taskId, user.id, 'partial_complete', {
      completed_plant_count: newCompleted,
      resume_tomorrow: dto.resume_tomorrow,
      child_task_id: childTaskId,
    });
    return { task: updated, child_task_id: childTaskId };
  }

  /**
   * Manually resume a task by spawning a child task with the remaining plant
   * count, without going through partial-complete first.
   */
  async resume(taskId: string, user: User): Promise<Task> {
    this.logger.log(`User ${user.id} resuming task ${taskId}`);
    const parent = await this.taskFinder.getBareOrFail(taskId);
    const remaining = this.remainingPlantCount(parent, parent.completedPlantCount ?? 0);
    const child = this.buildResumeChild(parent, {
      title: `[Lanjutan] ${parent.title}`,
      targetPlantCount: remaining ?? null,
    });
    const saved = await this.taskRepository.save(child);
    this.logger.log(`Child task ${saved.id} created as resume of ${taskId}`);
    return saved;
  }

  private assertAssignedTo(task: Task, userId: string, message: string): void {
    if (task.assigned_to !== userId) throw new ForbiddenException(message);
  }

  private assertCanStart(task: Task): void {
    if (task.status === TaskStatus.ACCEPTED || task.status === TaskStatus.REVISION_NEEDED) return;
    throw new BadRequestException(
      `Cannot start task with status "${task.status}". Task must be accepted or in revision.`,
    );
  }

  private assertCanComplete(task: Task): void {
    if (task.status === TaskStatus.IN_PROGRESS) return;
    throw new BadRequestException(
      `Cannot complete task with status "${task.status}". Task must be in progress.`,
    );
  }

  private assertPartialCompleteRole(user: User): void {
    if (!PARTIAL_COMPLETE_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not authorized to partial-complete this task');
    }
  }

  private withCompletion(task: Task, dto: CompleteTaskDto): Task {
    return {
      ...task,
      status: TaskStatus.COMPLETED,
      completion_photo_urls: dto.completion_photo_urls,
      completion_notes: dto.description,
      completed_at: new Date(),
    };
  }

  private isFullyDone(task: Task, newCompleted: number, resumeTomorrow?: boolean): boolean {
    return task.targetPlantCount ? newCompleted >= task.targetPlantCount : !resumeTomorrow;
  }

  private withProgress(task: Task, newCompleted: number, becomesCompleted: boolean): Task {
    return {
      ...task,
      completedPlantCount: newCompleted,
      ...(becomesCompleted ? { status: TaskStatus.COMPLETED, completed_at: new Date() } : {}),
    };
  }

  private remainingPlantCount(task: Task, completedSoFar: number): number | undefined {
    return task.targetPlantCount ? task.targetPlantCount - completedSoFar : undefined;
  }

  private async spawnResumeChild(parent: Task, completedSoFar: number): Promise<string> {
    const remaining = this.remainingPlantCount(parent, completedSoFar);
    const child = this.buildResumeChild(parent, { targetPlantCount: remaining ?? null });
    const saved = await this.taskRepository.save(child);
    return saved.id;
  }

  private buildResumeChild(parent: Task, overrides: Partial<Task>): Task {
    return this.taskRepository.create({
      ...pick(parent, [
        'title',
        'description',
        'location_id',
        'rayon_id',
        'taskType',
        'assigned_to',
        'deadline',
        'priority',
        'created_by',
      ]),
      status: TaskStatus.ASSIGNED,
      parentTaskId: parent.id,
      completedPlantCount: 0,
      customFields: { ...(parent.customFields ?? {}), _resumed_from: parent.id },
      ...overrides,
    });
  }

  /**
   * Cascade task lifecycle state back to the linked pruning_request, if any.
   *
   * Uses raw SQL via the repository's EntityManager to avoid a circular
   * module dependency on PruningRequestsModule. Best-effort: if no linked
   * request exists the UPDATE touches 0 rows; failures are logged but never
   * bubble — task lifecycle owns the source of truth, the request status is
   * a downstream projection.
   */
  private async cascadePruningRequestStatus(
    taskId: string,
    newStatus: CascadeStatus,
    actorId: string,
  ): Promise<void> {
    try {
      const row = await this.applyCascadeUpdate(taskId, newStatus);
      if (!row) return;
      this.logger.log(
        `Cascaded pruning_request ${row.id} (${row.reference_code}) → ${newStatus} via task ${taskId} by user ${actorId}`,
      );
      this.auditCascade(row, newStatus, taskId, actorId);
      this.notifyCascadeSubmitter(row, newStatus, taskId);
    } catch (err) {
      this.logger.error(
        `cascadePruningRequestStatus failed (task=${taskId}, status=${newStatus}): ${(err as Error).message}`,
      );
    }
  }

  /**
   * Terminal statuses are guarded: a task that completes after the request
   * was rejected / cancelled / already done must NOT rewrite the lifecycle
   * of a closed request (mirrors the activities-side cascade).
   */
  private async applyCascadeUpdate(
    taskId: string,
    newStatus: CascadeStatus,
  ): Promise<CascadedRequest | null> {
    const rows = (await this.taskRepository.manager.query(
      `UPDATE pruning_requests
       SET status = $1, updated_at = NOW()
       WHERE assigned_task_id = $2
         AND status <> $1
         AND status NOT IN ('done', 'rejected', 'cancelled')
       RETURNING id, submitted_by, reference_code`,
      [newStatus, taskId],
    )) as CascadedRequest[];
    return rows[0] ?? null;
  }

  private auditCascade(
    row: CascadedRequest,
    newStatus: CascadeStatus,
    taskId: string,
    actorId: string,
  ): void {
    this.auditLogService
      .log({
        entity_type: 'pruning_request',
        entity_id: row.id,
        action: `cascade_${newStatus}`,
        actor_id: actorId,
        new_value: { status: newStatus, source_task_id: taskId },
      })
      .catch((err) => this.logger.error(`Audit log failed on request cascade: ${err.message}`));
  }

  /**
   * Best-effort push to the submitter so the kecamatan sees the status flip
   * in real-time. Maps to TASK_UPDATED so it surfaces in the generic
   * activity tray. Defensive: submitted_by is NOT NULL by schema, but if a
   * future soft-delete cascade ever orphans the row, skip rather than crash.
   */
  private notifyCascadeSubmitter(
    row: CascadedRequest,
    newStatus: CascadeStatus,
    taskId: string,
  ): void {
    if (!row.submitted_by) return;
    this.notificationsService
      .sendToUser({
        user_id: row.submitted_by,
        type: NotificationType.TASK_UPDATED,
        title:
          newStatus === 'done'
            ? 'Permohonan Perantingan Selesai'
            : 'Permohonan Perantingan Dikerjakan',
        body:
          newStatus === 'done'
            ? `Permohonan ${row.reference_code} telah selesai dikerjakan.`
            : `Permohonan ${row.reference_code} sedang dikerjakan oleh petugas.`,
        data: { pruning_request_id: row.id, task_id: taskId },
      })
      .catch((err) =>
        this.logger.warn(`Push notification failed on request cascade (${row.id}): ${err.message}`),
      );
  }

  private audit(
    taskId: string,
    actorId: string,
    action: string,
    newValue: Record<string, unknown>,
  ): void {
    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: taskId,
        action,
        actor_id: actorId,
        new_value: newValue,
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }
}
