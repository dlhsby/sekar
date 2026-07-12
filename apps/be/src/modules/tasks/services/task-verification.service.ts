import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { VERIFY_MAP } from '../../users/constants/role-groups';
import { UsersService } from '../../users/users.service';
import { LocationsService } from '../../locations/locations.service';
import { AuditLogService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { TaskFinderService } from './task-finder.service';
import { TaskAreaSyncService } from './task-area-sync.service';

type LifecycleEvent = 'accepted' | 'declined' | 'verified' | 'revision_needed';

/**
 * Assignee response (accept/decline) and supervisor review (verify/revision)
 * transitions, including the role-hierarchy checks and the lifecycle pushes
 * that keep creator and assignee in sync.
 */
@Injectable()
export class TaskVerificationService {
  private readonly logger = new Logger(TaskVerificationService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly taskFinder: TaskFinderService,
    private readonly usersService: UsersService,
    private readonly locationsService: LocationsService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly taskAreaSync: TaskAreaSyncService,
  ) {}

  /** Accept an assigned task (by assignee only). */
  async acceptTask(taskId: string, userId: string): Promise<Task> {
    this.logger.log(`User ${userId} accepting task ${taskId}`);
    const task = await this.taskFinder.getOrFail(taskId);
    this.assertIsAssignee(task, userId);
    this.assertAwaitingResponse(task);
    await this.taskRepository.save({
      ...task,
      status: TaskStatus.ACCEPTED,
      accepted_at: new Date(),
    });
    // ADR-013 §5: accepting a task in another area extends the worker's
    // monitoring boundary to that area while the task is active.
    await this.taskAreaSync.syncForUser(userId);
    this.notifyLifecycleParty(task, userId, 'accepted');
    return this.taskFinder.getOrFail(taskId);
  }

  /** Decline an assigned task (by assignee only). */
  async declineTask(taskId: string, userId: string, reason: string): Promise<Task> {
    this.logger.log(`User ${userId} declining task ${taskId}`);
    const task = await this.taskFinder.getOrFail(taskId);
    this.assertIsAssignee(task, userId);
    this.assertAwaitingResponse(task);
    await this.taskRepository.save({
      ...task,
      status: TaskStatus.DECLINED,
      declined_at: new Date(),
      decline_reason: reason,
    });
    // Declining frees the worker from that area (unless another active task keeps it).
    await this.taskAreaSync.syncForUser(userId);
    // Decline is high-priority for the creator — they need to reassign
    // or the work won't happen.
    this.notifyLifecycleParty(task, userId, 'declined', reason);
    return this.taskFinder.getOrFail(taskId);
  }

  /** Verify a completed task (by direct supervisor). */
  async verifyTask(taskId: string, verifierId: string): Promise<Task> {
    this.logger.log(`User ${verifierId} verifying task ${taskId}`);
    const task = await this.taskFinder.getOrFail(taskId);
    this.assertAwaitingVerification(
      task,
      verifierId,
      'Anda tidak dapat memverifikasi penyelesaian tugas Anda sendiri',
    );
    await this.assertVerifierAuthority(verifierId, task.assigned_to as string);
    await this.taskRepository.save({
      ...task,
      status: TaskStatus.VERIFIED,
      verified_by: verifierId,
      verified_at: new Date(),
    });
    this.audit(taskId, verifierId, 'verify', {
      status: TaskStatus.VERIFIED,
      verified_by: verifierId,
    });
    // Verified is terminal — clear the assignee's task-based area if unused.
    await this.taskAreaSync.syncForUser(task.assigned_to);
    this.notifyLifecycleParty(task, verifierId, 'verified');
    return this.taskFinder.getOrFail(taskId);
  }

  /** Request revision on a completed task (by direct supervisor). */
  async requestRevision(taskId: string, verifierId: string, reason: string): Promise<Task> {
    this.logger.log(`User ${verifierId} requesting revision on task ${taskId}`);
    const task = await this.taskFinder.getOrFail(taskId);
    this.assertAwaitingVerification(
      task,
      verifierId,
      'Anda tidak dapat meminta revisi atas penyelesaian tugas Anda sendiri',
    );
    await this.assertVerifierAuthority(verifierId, task.assigned_to as string);
    await this.taskRepository.save({
      ...task,
      status: TaskStatus.REVISION_NEEDED,
      revision_reason: reason,
    });
    this.notifyLifecycleParty(task, verifierId, 'revision_needed', reason);
    this.audit(taskId, verifierId, 'request_revision', {
      status: TaskStatus.REVISION_NEEDED,
      revision_reason: reason,
    });
    return this.taskFinder.getOrFail(taskId);
  }

  private assertIsAssignee(task: Task, userId: string): void {
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You are not the assignee of this task');
    }
  }

  private assertAwaitingResponse(task: Task): void {
    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException('The task is not in the assigned status');
    }
  }

  /** The assignee cannot verify / request revision on their own completion. */
  private assertAwaitingVerification(
    task: Task,
    verifierId: string,
    selfReviewMessage: string,
  ): void {
    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('The task has not been completed');
    }
    if (!task.assigned_to) {
      throw new BadRequestException('The task has no assignee');
    }
    if (task.assigned_to === verifierId) {
      throw new ForbiddenException(selfReviewMessage);
    }
  }

  private async assertVerifierAuthority(verifierId: string, assigneeId: string): Promise<void> {
    const verifier = await this.usersService.findOne(verifierId);
    const assignee = await this.usersService.findOne(assigneeId);
    this.assertRoleCanVerify(verifier.role, assignee.role);
    this.assertKorlapScope(verifier, assignee);
    await this.assertKepalaRayonScope(verifier, assignee);
    // management: no scope restriction
  }

  private assertRoleCanVerify(verifierRole: UserRole, assigneeRole: UserRole): void {
    const allowedAssigneeRoles = VERIFY_MAP[verifierRole];
    if (!allowedAssigneeRoles?.includes(assigneeRole)) {
      throw new ForbiddenException('You are not authorized to verify this task');
    }
  }

  private assertKorlapScope(verifier: User, assignee: User): void {
    if (verifier.role !== UserRole.KORLAP) return;
    if (!verifier.location_id || verifier.location_id !== assignee.location_id) {
      throw new ForbiddenException('You can only verify tasks in your area');
    }
  }

  private async assertKepalaRayonScope(verifier: User, assignee: User): Promise<void> {
    if (verifier.role !== UserRole.KEPALA_RAYON) return;
    if (!verifier.rayon_id) {
      throw new ForbiddenException('Your Kepala Rayon account has no rayon assigned');
    }
    if (!assignee.location_id) {
      throw new ForbiddenException('The task assignee has no valid area');
    }
    const area = await this.locationsService.findOne(assignee.location_id);
    if (area.rayon_id !== verifier.rayon_id) {
      throw new ForbiddenException('You can only verify tasks in your rayon');
    }
  }

  /**
   * Fire a best-effort push on lifecycle transitions the creator / assignee
   * needs to know about. Routing:
   *   accepted / declined   -> notify creator (they assigned the work)
   *   verified / revision   -> notify assignee (they did the work)
   */
  private notifyLifecycleParty(
    task: Task,
    actorId: string,
    event: LifecycleEvent,
    extra?: string,
  ): void {
    const recipientId =
      event === 'accepted' || event === 'declined' ? task.created_by : task.assigned_to;
    if (!recipientId || recipientId === actorId) return;

    this.notificationsService
      .sendToUser({
        user_id: recipientId,
        type: LIFECYCLE_NOTIFICATION_TYPES[event],
        title: LIFECYCLE_TITLES[event],
        body: this.lifecycleBody(task, event, extra),
        data: { task_id: task.id, event },
      })
      .catch((err) =>
        this.logger.warn(
          `notifyLifecycleParty push failed (task ${task.id}, event ${event}): ${err.message}`,
        ),
      );
  }

  private lifecycleBody(task: Task, event: LifecycleEvent, extra?: string): string {
    const bodyMap: Record<LifecycleEvent, string> = {
      accepted: `Tugas "${task.title}" diterima oleh petugas.`,
      declined: `Tugas "${task.title}" ditolak oleh petugas${extra ? `. Alasan: ${extra}` : '.'}`,
      verified: `Tugas "${task.title}" telah diverifikasi.`,
      revision_needed: `Tugas "${task.title}" perlu direvisi${extra ? `. Alasan: ${extra}` : '.'}`,
    };
    return bodyMap[event];
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
        old_value: { status: TaskStatus.COMPLETED },
        new_value: newValue,
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }
}

const LIFECYCLE_TITLES: Record<LifecycleEvent, string> = {
  accepted: 'Tugas Diterima',
  declined: 'Tugas Ditolak',
  verified: 'Tugas Diverifikasi',
  revision_needed: 'Tugas Perlu Revisi',
};

const LIFECYCLE_NOTIFICATION_TYPES: Record<LifecycleEvent, NotificationType> = {
  accepted: NotificationType.TASK_UPDATED,
  declined: NotificationType.TASK_DECLINED,
  verified: NotificationType.TASK_COMPLETED,
  revision_needed: NotificationType.TASK_UPDATED,
};
