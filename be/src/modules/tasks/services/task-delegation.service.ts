import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../entities/task.entity';
import { TaskDelegation } from '../entities/task-delegation.entity';
import { AssignTaskDto } from '../dto/assign-task.dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AuditLogService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { TaskFinderService } from './task-finder.service';
import { assertValidAssignee, assertAssignmentHierarchy } from '../task.policies';

export interface DelegationHop {
  task_id: string;
  from_user_id: string | null;
  from_role: UserRole | null;
  to_user_id: string;
  to_role: UserRole;
  reason: string | null;
  task_title?: string;
}

/**
 * Assignment + delegation-chain bookkeeping (ADR-038): /assign transitions,
 * task_delegations rows, and the new-assignee push notification.
 */
@Injectable()
export class TaskDelegationService {
  private readonly logger = new Logger(TaskDelegationService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskDelegation)
    private readonly taskDelegationRepository: Repository<TaskDelegation>,
    private readonly taskFinder: TaskFinderService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Assign (or re-assign / delegate) a task to a user. */
  async assign(id: string, assignTaskDto: AssignTaskDto, callerId?: string): Promise<Task> {
    this.logger.log(`Assigning task ${id} to user ${assignTaskDto.assigned_to}`);
    const task = await this.taskFinder.getOrFail(id);
    this.assertAssignmentAllowed(task, callerId);

    const assignee = await this.loadValidAssignee(assignTaskDto.assigned_to);
    // Hierarchy is validated against the caller's role (not the creator's).
    const authority = await this.usersService.findOne(callerId ?? task.created_by);
    assertAssignmentHierarchy(authority.role, assignee.role);
    const previousRole = await this.lookupRole(task.assigned_to);

    await this.taskRepository.save({
      ...task,
      assigned_to: assignTaskDto.assigned_to,
      status: TaskStatus.ASSIGNED,
      assigned_at: new Date(),
    });
    // ADR-038: record this hop in the delegation chain. The "from" side is
    // either the prior assignee (reassignment) or the caller (first assign).
    await this.recordDelegation({
      task_id: id,
      from_user_id: task.assigned_to ?? authority.id,
      from_role: previousRole ?? authority.role,
      to_user_id: assignTaskDto.assigned_to,
      to_role: assignee.role,
      reason: null,
      task_title: task.title,
    });
    this.auditAssign(id, assignTaskDto.assigned_to, callerId ?? task.created_by);
    return this.taskFinder.getOrFail(id);
  }

  /**
   * Insert one task_delegations row and push to the new assignee. Failures
   * are logged but do not abort the assignment — the audit trail is
   * best-effort, never load-bearing.
   */
  async recordDelegation(input: DelegationHop): Promise<void> {
    await this.insertDelegationRow(input);
    await this.notifyNewAssignee(input);
  }

  /**
   * List all delegation hops for a task in chronological order (ADR-038).
   * Used by the mobile TaskDetail screen to render the assignment chain.
   */
  async findDelegations(taskId: string): Promise<TaskDelegation[]> {
    // Ensure the task exists so callers get a clean 404 instead of [].
    await this.taskFinder.getOrFail(taskId);
    // Project only safe user columns on the joins — the User entity carries
    // password_hash, which the default `relations` loader would include.
    return this.taskDelegationRepository
      .createQueryBuilder('d')
      .leftJoin('d.from_user', 'fu')
      .leftJoin('d.to_user', 'tu')
      .addSelect(['fu.id', 'fu.full_name', 'fu.role'])
      .addSelect(['tu.id', 'tu.full_name', 'tu.role'])
      .where('d.task_id = :taskId', { taskId })
      .orderBy('d.created_at', 'ASC')
      .getMany();
  }

  /**
   * ADR-038 — four legal states for /assign:
   *   1. PENDING   — initial assignment by creator or a higher role.
   *   2. DECLINED  — reassignment after the previous assignee refused.
   *   3. ASSIGNED  — delegation by the current assignee before accepting;
   *      once they accept, a decline is required to reroute.
   *   4. ASSIGNED  — admin reassign by the task creator before the assignee
   *      accepts (May 11, 2026), so a wrong Tugaskan pick can be fixed
   *      without forcing a decline. Hierarchy validation still applies.
   */
  private assertAssignmentAllowed(task: Task, callerId?: string): void {
    if (this.isAssignable(task, callerId)) return;
    throw new BadRequestException(
      `Cannot assign task with status "${task.status}". Task must be pending, declined, or assigned (delegation by the current assignee, or reassignment by the creator before acceptance).`,
    );
  }

  private isAssignable(task: Task, callerId?: string): boolean {
    if (task.status === TaskStatus.PENDING || task.status === TaskStatus.DECLINED) return true;
    if (task.status !== TaskStatus.ASSIGNED) return false;
    return callerId === task.assigned_to || callerId === task.created_by;
  }

  private async loadValidAssignee(userId: string): Promise<User> {
    const assignee = await this.usersService.findOne(userId);
    assertValidAssignee(assignee);
    return assignee;
  }

  /** Previous assignee may have been deleted; return null so the caller falls back. */
  private async lookupRole(userId: string | null): Promise<UserRole | null> {
    if (!userId) return null;
    try {
      const user = await this.usersService.findOne(userId);
      return user.role;
    } catch {
      return null;
    }
  }

  private async insertDelegationRow(input: DelegationHop): Promise<void> {
    try {
      const row = this.taskDelegationRepository.create({
        task_id: input.task_id,
        from_user_id: input.from_user_id,
        from_role: input.from_role,
        to_user_id: input.to_user_id,
        to_role: input.to_role,
        reason: input.reason,
      });
      await this.taskDelegationRepository.save(row);
    } catch (err) {
      this.logger.error(
        `Failed to record task delegation for task ${input.task_id}: ${(err as Error).message}`,
      );
    }
  }

  private async notifyNewAssignee(input: DelegationHop): Promise<void> {
    try {
      const title = input.task_title ? `Tugas baru: ${input.task_title}` : 'Tugas baru';
      await this.notificationsService.sendToUser({
        user_id: input.to_user_id,
        title,
        body: 'Anda mendapat penugasan baru. Buka aplikasi untuk melihat detail.',
        type: NotificationType.TASK_ASSIGNED,
        data: { task_id: input.task_id },
      });
    } catch (err) {
      this.logger.error(
        `Failed to send task-assignment notification for task ${input.task_id}: ${(err as Error).message}`,
      );
    }
  }

  private auditAssign(taskId: string, assignedTo: string, actorId: string): void {
    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'assign',
        actor_id: actorId,
        new_value: { assigned_to: assignedTo, status: TaskStatus.ASSIGNED },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }
}
