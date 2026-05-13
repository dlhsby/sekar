import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { TaskTag } from './entities/task-tag.entity';
import { TaskDelegation } from './entities/task-delegation.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskTypedDto } from './dto/create-task-typed.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { PartialCompleteTaskDto } from './dto/partial-complete-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskTypeRegistry } from './registry/task-type-registry';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { User, UserRole } from '../users/entities/user.entity';
import { VALID_TASK_ASSIGNMENTS, VERIFY_MAP } from '../users/constants/role-groups';
import { AuditLogService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

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

/**
 * Service for managing tasks
 *
 * Tasks are work assignments created by korlap or higher roles.
 * Assignees (satgas, linmas, korlap) can start and complete tasks.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskTag)
    private readonly taskTagRepository: Repository<TaskTag>,
    @InjectRepository(TaskDelegation)
    private readonly taskDelegationRepository: Repository<TaskDelegation>,
    private readonly usersService: UsersService,
    private readonly areasService: AreasService,
    private readonly auditLogService: AuditLogService,
    private readonly taskTypeRegistry: TaskTypeRegistry,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new task
   *
   * Accepts both the base CreateTaskDto and the extended CreateTaskTypedDto.
   * When task_type and custom_fields are provided they are validated via TaskTypeRegistry.
   *
   * @param createTaskDto - Task creation data (may include Phase 3 typed fields)
   * @param creatorId - ID of the user creating the task
   * @returns The created task
   */
  async create(createTaskDto: CreateTaskDto | CreateTaskTypedDto, creatorId: string): Promise<Task> {
    this.logger.log(`Creating task: ${createTaskDto.title}`);

    // Get creator to validate hierarchy
    const creator = await this.usersService.findOne(creatorId);

    // Validate area exists if provided and check scope
    if (createTaskDto.area_id) {
      await this.areasService.findOne(createTaskDto.area_id);
    }
    await this.validateScope(creator, createTaskDto.area_id);

    // If assigning to a user, validate the user and hierarchy
    let initialStatus = TaskStatus.PENDING;
    let initialAssignee: User | null = null;
    if (createTaskDto.assigned_to) {
      initialAssignee = await this.usersService.findOne(createTaskDto.assigned_to);
      this.validateAssignee(initialAssignee);
      this.validateHierarchy(creator.role, initialAssignee.role);
      initialStatus = TaskStatus.ASSIGNED;
    }

    // Phase 3: validate task_type + custom_fields when provided
    const typedDto = createTaskDto as CreateTaskTypedDto;
    const taskType = typedDto.task_type ?? 'generic';
    const customFields = typedDto.custom_fields ?? {};

    try {
      this.taskTypeRegistry.validate(taskType, customFields);
    } catch {
      throw new BadRequestException(
        `custom_fields is invalid for task_type "${taskType}". Check required fields.`,
      );
    }

    const task = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      priority: createTaskDto.priority || TaskPriority.MEDIUM,
      deadline: createTaskDto.deadline ? new Date(createTaskDto.deadline) : null,
      area_id: createTaskDto.area_id || null,
      rayon_id: createTaskDto.rayon_id || null,
      assigned_to: createTaskDto.assigned_to || null,
      status: initialStatus,
      created_by: creatorId,
      assigned_at: createTaskDto.assigned_to ? new Date() : null,
      taskType,
      customFields,
      targetPlantCount: typedDto.target_plant_count ?? null,
    });

    const savedTask = await this.taskRepository.save(task);

    // ADR-038: record the first hop in the delegation chain when the task
    // is created already-assigned (creator → assignee). Reuses the assignee
    // loaded above for hierarchy validation — no extra DB roundtrip.
    if (savedTask.assigned_to && initialAssignee) {
      await this.recordDelegation({
        task_id: savedTask.id,
        from_user_id: creatorId,
        from_role: creator.role,
        to_user_id: savedTask.assigned_to,
        to_role: initialAssignee.role,
        reason: null,
        task_title: savedTask.title,
      });
    }

    // Handle tagged users
    if (createTaskDto.tagged_user_ids && createTaskDto.tagged_user_ids.length > 0) {
      const tags = createTaskDto.tagged_user_ids.map((userId) =>
        this.taskTagRepository.create({
          task_id: savedTask.id,
          user_id: userId,
        }),
      );
      await this.taskTagRepository.save(tags);
    }

    this.logger.log(`Task created with ID: ${savedTask.id}`);

    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: savedTask.id,
        action: 'create',
        actor_id: creatorId,
        new_value: { title: savedTask.title, status: savedTask.status, area_id: savedTask.area_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return this.findOne(savedTask.id);
  }

  /**
   * Get all tasks with optional filters
   *
   * @param filters - Optional filter criteria
   * @returns Array of tasks
   */
  async findAll(filters?: TaskFilterDto, user?: User): Promise<PaginatedResponseDto<Task>> {
    this.logger.log('Fetching tasks with filters');

    const where: FindOptionsWhere<Task> = {};

    if (filters) {
      if (filters.area_id) where.area_id = filters.area_id;
      if (filters.assigned_to) where.assigned_to = filters.assigned_to;
      if (filters.created_by) where.created_by = filters.created_by;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
    }

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser')
      .where(where);

    // Scope-based filtering by role
    if (user) {
      switch (user.role) {
        case UserRole.SATGAS:
        case UserRole.LINMAS:
          // Field workers: only tasks assigned to them or where they're tagged
          queryBuilder.andWhere(
            '(task.assigned_to = :scopeUserId OR tags.user_id = :scopeUserId)',
            { scopeUserId: user.id },
          );
          break;
        case UserRole.KORLAP:
          // Korlap: tasks in their area + tasks they created
          if (user.area_id) {
            queryBuilder.andWhere(
              '(task.area_id = :scopeAreaId OR task.created_by = :scopeUserId)',
              { scopeAreaId: user.area_id, scopeUserId: user.id },
            );
          } else {
            queryBuilder.andWhere('task.created_by = :scopeUserId', { scopeUserId: user.id });
          }
          break;
        case UserRole.KEPALA_RAYON:
          // Kepala Rayon: tasks in their rayon + tasks they created
          if (user.rayon_id) {
            queryBuilder.andWhere(
              '(area.rayon_id = :scopeRayonId OR task.rayon_id = :scopeRayonId OR task.created_by = :scopeUserId)',
              { scopeRayonId: user.rayon_id, scopeUserId: user.id },
            );
          } else {
            queryBuilder.andWhere('task.created_by = :scopeUserId', { scopeUserId: user.id });
          }
          break;
        // top_management, admin_system, superadmin: no scope restriction
      }
    }

    // Date range filters
    if (filters?.deadline_before) {
      queryBuilder.andWhere('task.deadline <= :deadlineBefore', {
        deadlineBefore: new Date(filters.deadline_before),
      });
    }
    if (filters?.deadline_after) {
      queryBuilder.andWhere('task.deadline >= :deadlineAfter', {
        deadlineAfter: new Date(filters.deadline_after),
      });
    }
    if (filters?.created_after) {
      queryBuilder.andWhere('task.created_at >= :createdAfter', {
        createdAfter: new Date(filters.created_after),
      });
    }
    if (filters?.created_before) {
      queryBuilder.andWhere('task.created_at <= :createdBefore', {
        createdBefore: new Date(filters.created_before),
      });
    }

    // Dynamic sort
    const sortBy = filters?.sort_by ?? 'created_at';
    const sortDir = (filters?.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    queryBuilder.orderBy(`task.${sortBy}`, sortDir);

    // Pagination
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get a single task by ID
   *
   * @param id - Task ID
   * @returns The task
   * @throws NotFoundException if task not found
   */
  async findOne(id: string, user?: User): Promise<Task> {
    this.logger.log(`Fetching task with ID: ${id}`);

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['area', 'rayon', 'assignee', 'creator', 'verifier', 'tags', 'tags.user'],
    });

    if (!task) {
      this.logger.warn(`Task with ID ${id} not found`);
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Scope-based access check when user is provided (controller calls).
    // staff_kecamatan goes through an async DB lookup (linked permohonan
    // they own); other roles use the synchronous role-switch.
    if (user) {
      if (user.role === UserRole.STAFF_KECAMATAN) {
        await this.checkStaffKecamatanAccess(task.id, user.id);
      } else {
        this.checkTaskAccess(task, user);
      }
    }

    return task;
  }

  /**
   * Check if a user has access to view a specific task based on their role and scope
   */
  private checkTaskAccess(task: Task, user: User): void {
    switch (user.role) {
      case UserRole.SATGAS:
      case UserRole.LINMAS:
        if (
          task.assigned_to !== user.id &&
          task.created_by !== user.id &&
          !task.tags?.some((t) => t.user_id === user.id)
        ) {
          throw new ForbiddenException('Anda tidak memiliki akses ke tugas ini');
        }
        break;
      case UserRole.KORLAP:
        if (
          task.area_id !== user.area_id &&
          task.created_by !== user.id &&
          task.assigned_to !== user.id &&
          !task.tags?.some((t) => t.user_id === user.id)
        ) {
          throw new ForbiddenException('Anda tidak memiliki akses ke tugas ini');
        }
        break;
      case UserRole.KEPALA_RAYON:
      case UserRole.ADMIN_DATA:
        // May 11, 2026 — admin_data joined the rayon-scoped admin path
        // (was falling through to the "no restriction" default, which
        // was both incorrect and incidentally hiding the @Roles 403 that
        // came from the controller decorator before ADMIN_DATA was added
        // to TASK_RECEIVERS).
        if (
          task.area?.rayon_id !== user.rayon_id &&
          task.rayon_id !== user.rayon_id &&
          task.created_by !== user.id &&
          task.assigned_to !== user.id
        ) {
          throw new ForbiddenException('Anda tidak memiliki akses ke tugas ini');
        }
        break;
      // top_management, admin_system, superadmin: no restriction.
      // staff_kecamatan handled separately below (async check).
    }
  }

  /**
   * Async access check for staff_kecamatan — they may read tasks linked
   * to a pruning_request they themselves submitted. Kept off the main
   * `checkTaskAccess` switch because it needs a DB lookup.
   */
  private async checkStaffKecamatanAccess(taskId: string, userId: string): Promise<void> {
    const rows = (await this.taskRepository.manager.query(
      `SELECT 1 FROM pruning_requests
       WHERE assigned_task_id = $1 AND submitted_by = $2
       LIMIT 1`,
      [taskId, userId],
    )) as Array<unknown>;
    if (rows.length === 0) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tugas ini');
    }
  }

  /**
   * Cascade task lifecycle state back to the linked pruning_request, if any.
   *
   * Closes the loop opened by `PruningRequestsService.assignToTask` — once
   * a task is started/completed, the kecamatan-side request should reflect
   * the same state instead of being stuck on `assigned` forever.
   *
   * Uses raw SQL via the repository's EntityManager to avoid a circular
   * module dependency on PruningRequestsModule. The update is best-effort:
   * if no linked request exists (task created outside the pruning flow),
   * the UPDATE simply touches 0 rows and we move on. Failures are logged
   * but never bubble — task lifecycle owns the source of truth, the
   * request status is a downstream projection.
   *
   * @param taskId        Linked task id (matched against `pruning_requests.assigned_task_id`).
   * @param newStatus     One of `in_progress` | `done`.
   * @param actorId       User who triggered the transition (audit trail).
   */
  private async cascadePruningRequestStatus(
    taskId: string,
    newStatus: 'in_progress' | 'done',
    actorId: string,
  ): Promise<void> {
    try {
      // May 12 late+2 — guard terminal statuses. A task that completes
      // after the request was rejected / cancelled / already done must
      // NOT silently rewrite the lifecycle backwards or forwards on
      // a closed request. Mirror the activities-side cascade
      // (activities.service.ts:create) which already excludes the same
      // set. The `status <> $1` guard alone was too narrow (it only
      // prevented overwriting an already-done request with done).
      const result = (await this.taskRepository.manager.query(
        `UPDATE pruning_requests
         SET status = $1, updated_at = NOW()
         WHERE assigned_task_id = $2
           AND status <> $1
           AND status NOT IN ('done', 'rejected', 'cancelled')
         RETURNING id, submitted_by, reference_code`,
        [newStatus, taskId],
      )) as Array<{ id: string; submitted_by: string; reference_code: string }>;

      if (result.length === 0) return;

      const row = result[0];
      this.logger.log(
        `Cascaded pruning_request ${row.id} (${row.reference_code}) → ${newStatus} via task ${taskId} by user ${actorId}`,
      );

      this.auditLogService
        .log({
          entity_type: 'pruning_request',
          entity_id: row.id,
          action: `cascade_${newStatus}`,
          actor_id: actorId,
          new_value: { status: newStatus, source_task_id: taskId },
        })
        .catch((err) =>
          this.logger.error(`Audit log failed on request cascade: ${err.message}`),
        );

      // Best-effort push to the submitter so the kecamatan sees status flip
      // in real-time. Maps to TASK_UPDATED so it surfaces in the generic
      // activity tray; a dedicated PRUNING_REQUEST_STATUS type can come
      // later if we want a distinct icon/grouping on the client.
      // Defensive: submitted_by is NOT NULL by schema, but if a future
      // soft-delete cascade ever orphans the row, skip rather than crash.
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
          this.logger.warn(
            `Push notification failed on request cascade (${row.id}): ${err.message}`,
          ),
        );
    } catch (err) {
      this.logger.error(
        `cascadePruningRequestStatus failed (task=${taskId}, status=${newStatus}): ${(err as Error).message}`,
      );
    }
  }

  /**
   * Get tasks assigned to a specific user (my tasks)
   *
   * @param userId - User ID
   * @param activeOnly - If true, only return non-completed/declined tasks
   * @returns Array of tasks assigned to the user
   */
  async findMyTasks(
    userId: string,
    activeOnly = false,
    filters?: TaskFilterDto,
    scope: 'assigned' | 'created' | 'all' = 'all',
  ): Promise<PaginatedResponseDto<Task>> {
    this.logger.log(`Fetching tasks for user: ${userId} (scope=${scope})`);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser');

    // May 12 — scope-aware filter. Pre-existing behavior was "assigned OR
    // created", which meant admin_data who Tugaskan'd a task saw it under
    // "Ditugaskan Kepada Saya" on mobile even though they weren't the
    // assignee. Now the mobile passes scope=assigned for the assignee
    // tab and scope=created for the creator tab; legacy callers without
    // scope keep the union behavior.
    if (scope === 'assigned') {
      queryBuilder.where('task.assigned_to = :userId', { userId });
    } else if (scope === 'created') {
      queryBuilder.where('task.created_by = :userId', { userId });
    } else {
      queryBuilder.where('(task.assigned_to = :userId OR task.created_by = :userId)', { userId });
    }

    if (filters?.status) {
      // Explicit status filter overrides activeOnly behaviour
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    } else if (activeOnly) {
      queryBuilder.andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.VERIFIED, TaskStatus.DECLINED],
      });
    }

    // Dynamic sort
    const sortBy = filters?.sort_by ?? 'created_at';
    const sortDir = (filters?.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    queryBuilder.orderBy(`task.${sortBy}`, sortDir);

    // Pagination
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Update a task
   *
   * @param id - Task ID
   * @param updateTaskDto - Update data
   * @returns The updated task
   */
  async update(id: string, updateTaskDto: UpdateTaskDto, callerId?: string): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`);

    const task = await this.findOne(id);

    // Ownership check: only creator can update
    if (callerId && task.created_by !== callerId) {
      throw new ForbiddenException('Hanya pembuat tugas yang dapat mengedit tugas ini');
    }

    // Validate area if being updated
    if (updateTaskDto.area_id && updateTaskDto.area_id !== task.area_id) {
      await this.areasService.findOne(updateTaskDto.area_id);
    }

    // Update fields
    if (updateTaskDto.title) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) task.description = updateTaskDto.description;
    if (updateTaskDto.priority) task.priority = updateTaskDto.priority;
    if (updateTaskDto.deadline) task.deadline = new Date(updateTaskDto.deadline);
    if (updateTaskDto.area_id !== undefined) task.area_id = updateTaskDto.area_id;

    await this.taskRepository.save(task);
    this.logger.log(`Task updated with ID: ${id}`);

    return this.findOne(id);
  }

  /**
   * Assign a task to a user
   *
   * @param id - Task ID
   * @param assignTaskDto - Assignment data
   * @returns The updated task
   */
  async assign(id: string, assignTaskDto: AssignTaskDto, callerId?: string): Promise<Task> {
    this.logger.log(`Assigning task ${id} to user ${assignTaskDto.assigned_to}`);

    const task = await this.findOne(id);

    // ADR-038 — four legal states for /assign:
    //   1. PENDING   — initial assignment by creator or a higher role.
    //   2. DECLINED  — reassignment after the previous assignee refused.
    //   3. ASSIGNED  — delegation by the current assignee before accepting
    //      ("kepala_rayon got the task, hands it to admin_data"). Only the
    //      current assignee may delegate; once they accept, the task is
    //      committed and a decline is required to reroute.
    //   4. ASSIGNED  — admin reassign by the task creator before the
    //      assignee accepts (May 11, 2026). Lets admin_data fix a wrong
    //      Tugaskan pick without forcing the assignee to decline first.
    //      Hierarchy validation below still applies, so a creator can't
    //      escalate above their own authority via this path.
    const isCurrentAssigneeDelegation =
      task.status === TaskStatus.ASSIGNED && callerId === task.assigned_to;
    const isCreatorReassignBeforeAccept =
      task.status === TaskStatus.ASSIGNED && callerId === task.created_by;
    const allowed =
      task.status === TaskStatus.PENDING ||
      task.status === TaskStatus.DECLINED ||
      isCurrentAssigneeDelegation ||
      isCreatorReassignBeforeAccept;
    if (!allowed) {
      throw new BadRequestException(
        `Cannot assign task with status "${task.status}". Task must be pending, declined, or assigned (delegation by the current assignee, or reassignment by the creator before acceptance).`,
      );
    }

    // Validate assignee
    const assignee = await this.usersService.findOne(assignTaskDto.assigned_to);
    this.validateAssignee(assignee);

    // Validate hierarchy using caller's role (not creator's)
    const authorityUser = callerId
      ? await this.usersService.findOne(callerId)
      : await this.usersService.findOne(task.created_by);
    this.validateHierarchy(authorityUser.role, assignee.role);

    const previousAssigneeId = task.assigned_to;
    let previousAssigneeRole: UserRole | null = null;
    if (previousAssigneeId) {
      try {
        const prev = await this.usersService.findOne(previousAssigneeId);
        previousAssigneeRole = prev.role;
      } catch {
        // Previous assignee may have been deleted; leave role null.
      }
    }

    task.assigned_to = assignTaskDto.assigned_to;
    task.status = TaskStatus.ASSIGNED;
    task.assigned_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} assigned to user ${assignTaskDto.assigned_to}`);

    // ADR-038: record this hop in the delegation chain. The "from" side is
    // either the prior assignee (reassignment) or the caller (first assign).
    await this.recordDelegation({
      task_id: id,
      from_user_id: previousAssigneeId ?? authorityUser.id,
      from_role: previousAssigneeRole ?? authorityUser.role,
      to_user_id: assignTaskDto.assigned_to,
      to_role: assignee.role,
      reason: null,
      task_title: task.title,
    });

    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: id,
        action: 'assign',
        actor_id: callerId || task.created_by,
        new_value: { assigned_to: assignTaskDto.assigned_to, status: TaskStatus.ASSIGNED },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return this.findOne(id);
  }

  /**
   * Insert one task_delegations row. Failures are logged but do not abort
   * the assignment — the audit trail is best-effort, never load-bearing.
   */
  private async recordDelegation(input: {
    task_id: string;
    from_user_id: string | null;
    from_role: UserRole | null;
    to_user_id: string;
    to_role: UserRole;
    reason: string | null;
    task_title?: string;
  }): Promise<void> {
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

    // ADR-038: notify the new assignee. Best-effort — the assignment is
    // already persisted, so a notification failure must not throw.
    try {
      const title = input.task_title
        ? `Tugas baru: ${input.task_title}`
        : 'Tugas baru';
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

  /**
   * List all delegation hops for a task in chronological order (ADR-038).
   * Used by the mobile TaskDetail screen to render the assignment chain.
   */
  async findDelegations(taskId: string): Promise<TaskDelegation[]> {
    // Ensure the task exists so callers get a clean 404 instead of [].
    await this.findOne(taskId);
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
   * Start working on a task (by assignee)
   *
   * @param id - Task ID
   * @param userId - ID of the user starting the task
   * @returns The updated task
   */
  async start(id: string, userId: string): Promise<Task> {
    this.logger.log(`User ${userId} starting task ${id}`);

    const task = await this.findOne(id);

    // Verify the task is assigned to this user
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You can only start tasks assigned to you');
    }

    // Can only start accepted tasks or tasks needing revision
    if (task.status !== TaskStatus.ACCEPTED && task.status !== TaskStatus.REVISION_NEEDED) {
      throw new BadRequestException(
        `Cannot start task with status "${task.status}". Task must be accepted or in revision.`,
      );
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.started_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} started by user ${userId}`);

    // Cascade lifecycle back to linked pruning_request (if any).
    await this.cascadePruningRequestStatus(id, 'in_progress', userId);

    return this.findOne(id);
  }

  /**
   * Complete a task with evidence (by assignee)
   *
   * @param id - Task ID
   * @param userId - ID of the user completing the task
   * @param completeTaskDto - Completion data with photo and GPS
   * @returns The updated task
   */
  async complete(id: string, userId: string, completeTaskDto: CompleteTaskDto): Promise<Task> {
    this.logger.log(`User ${userId} completing task ${id}`);

    const task = await this.findOne(id);

    // Verify the task is assigned to this user
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You can only complete tasks assigned to you');
    }

    // Can only complete in-progress tasks
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete task with status "${task.status}". Task must be in progress.`,
      );
    }

    task.status = TaskStatus.COMPLETED;
    task.completion_photo_urls = completeTaskDto.completion_photo_urls;
    task.completion_notes = completeTaskDto.description;
    task.completed_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} completed by user ${userId}`);

    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: id,
        action: 'complete',
        actor_id: userId,
        new_value: { status: TaskStatus.COMPLETED },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // Cascade lifecycle back to linked pruning_request (if any).
    await this.cascadePruningRequestStatus(id, 'done', userId);

    return this.findOne(id);
  }

  /**
   * Soft delete a task
   *
   * @param id - Task ID
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting task with ID: ${id}`);

    // Verify task exists
    await this.findOne(id);

    await this.taskRepository.softDelete(id);
    this.logger.log(`Task soft deleted with ID: ${id}`);
  }

  /**
   * Get tasks by area (for management roles)
   *
   * @param areaId - Area ID
   * @param activeOnly - If true, only return non-completed/declined tasks
   * @returns Array of tasks in the area
   */
  async findByAreaId(areaId: string, activeOnly = false): Promise<Task[]> {
    this.logger.log(`Fetching tasks for area: ${areaId}`);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser')
      .where('task.area_id = :areaId', { areaId });

    if (activeOnly) {
      queryBuilder.andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED],
      });
    }

    return queryBuilder
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.deadline', 'ASC')
      .getMany();
  }

  /**
   * Get task statistics for an area
   *
   * @param areaId - Area ID
   * @returns Task statistics
   */
  async getAreaTaskStats(areaId: string): Promise<{
    total: number;
    pending: number;
    assigned: number;
    accepted: number;
    declined: number;
    inProgress: number;
    completed: number;
    verified: number;
    revisionNeeded: number;
  }> {
    const rows = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.area_id = :areaId AND t.deleted_at IS NULL', { areaId })
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string }>();

    const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
    const g = (s: string) => map[s] ?? 0;
    return {
      total: rows.reduce((sum, r) => sum + Number(r.count), 0),
      pending: g(TaskStatus.PENDING),
      assigned: g(TaskStatus.ASSIGNED),
      accepted: g(TaskStatus.ACCEPTED),
      declined: g(TaskStatus.DECLINED),
      inProgress: g(TaskStatus.IN_PROGRESS),
      completed: g(TaskStatus.COMPLETED),
      verified: g(TaskStatus.VERIFIED),
      revisionNeeded: g(TaskStatus.REVISION_NEEDED),
    };
  }

  /**
   * Find tasks where a user is tagged
   *
   * @param userId - User ID
   * @returns Array of tasks where user is tagged
   */
  async findTaggedTasks(
    userId: string,
    filters?: TaskFilterDto,
  ): Promise<PaginatedResponseDto<Task>> {
    this.logger.log(`Fetching tasks tagged for user: ${userId}`);

    const sortBy = filters?.sort_by ?? 'created_at';
    const sortDir = (filters?.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.tags', 'tag', 'tag.user_id = :userId', { userId })
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser')
      .orderBy(`task.${sortBy}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Add a tag to a task
   *
   * @param taskId - Task ID
   * @param userId - ID of the user adding the tag (for authorization)
   * @param taggedUserId - ID of the user to tag
   * @returns The updated task
   */
  async addTag(taskId: string, userId: string, taggedUserId: string): Promise<Task> {
    return this.addTags(taskId, userId, [taggedUserId]);
  }

  /**
   * Add multiple tags to a task (batch)
   *
   * @param taskId - Task ID
   * @param userId - ID of the user adding the tags (for authorization)
   * @param taggedUserIds - Array of user IDs to tag
   * @returns The updated task
   */
  async addTags(taskId: string, userId: string, taggedUserIds: string[]): Promise<Task> {
    this.logger.log(`Adding ${taggedUserIds.length} tags to task ${taskId}`);

    const task = await this.findOne(taskId);

    // May 12, 2026 — widened from "creator only" to "creator OR current
    // assignee". Visibility tags reflect who is expected to help, so the
    // assignee (typically a korlap pulling satgas onto a job) needs to be
    // able to tag too. Sealed states (completed/verified/declined/cancelled)
    // are frozen — the task record is closed, no more roster changes.
    //
    // Late-day refinement: the assignee can only tag once they've ACCEPTED
    // the work. While status is `assigned` (not yet accepted) only the
    // creator can edit tags — a pending assignee shouldn't be able to
    // shape the roster before committing.
    const isCreator = task.created_by === userId;
    const isAssignee = task.assigned_to === userId;
    const assigneeAcceptedStates: TaskStatus[] = [
      TaskStatus.ACCEPTED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVISION_NEEDED,
    ];
    const canEdit =
      isCreator || (isAssignee && assigneeAcceptedStates.includes(task.status));
    if (!canEdit) {
      throw new ForbiddenException(
        'Only the task creator or accepted assignee can modify tags',
      );
    }
    const sealedStatuses: TaskStatus[] = [
      TaskStatus.COMPLETED,
      TaskStatus.VERIFIED,
      TaskStatus.DECLINED,
    ];
    if (sealedStatuses.includes(task.status)) {
      throw new BadRequestException(
        `Cannot modify tags on a task with status "${task.status}"`,
      );
    }

    for (const taggedUserId of taggedUserIds) {
      // Check if tag already exists
      const existingTag = await this.taskTagRepository.findOne({
        where: { task_id: taskId, user_id: taggedUserId },
      });

      if (existingTag) {
        continue; // Skip already tagged users in batch mode
      }

      // Verify tagged user exists
      await this.usersService.findOne(taggedUserId);

      const tag = this.taskTagRepository.create({
        task_id: taskId,
        user_id: taggedUserId,
      });

      await this.taskTagRepository.save(tag);
    }

    this.logger.log(`Tags added to task ${taskId}`);
    return this.findOne(taskId);
  }

  /**
   * Remove a tag from a task
   *
   * @param taskId - Task ID
   * @param taggedUserId - ID of the tagged user to remove
   */
  async removeTag(taskId: string, taggedUserId: string, callerId: string): Promise<void> {
    this.logger.log(`Removing tag from task ${taskId}: user ${taggedUserId}`);

    const task = await this.findOne(taskId);

    // Mirror the addTags permission model — creator anytime (until sealed);
    // assignee only after they've accepted (not while status='assigned').
    // Previously this endpoint had no permission gate at all.
    const isCreator = task.created_by === callerId;
    const isAssignee = task.assigned_to === callerId;
    const assigneeAcceptedStates: TaskStatus[] = [
      TaskStatus.ACCEPTED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVISION_NEEDED,
    ];
    const canEdit =
      isCreator || (isAssignee && assigneeAcceptedStates.includes(task.status));
    if (!canEdit) {
      throw new ForbiddenException(
        'Only the task creator or accepted assignee can remove tags',
      );
    }
    const sealedStatuses: TaskStatus[] = [
      TaskStatus.COMPLETED,
      TaskStatus.VERIFIED,
      TaskStatus.DECLINED,
    ];
    if (sealedStatuses.includes(task.status)) {
      throw new BadRequestException(
        `Cannot modify tags on a task with status "${task.status}"`,
      );
    }

    const tag = await this.taskTagRepository.findOne({
      where: { task_id: taskId, user_id: taggedUserId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.taskTagRepository.remove(tag);
    this.logger.log(`Tag removed from task ${taskId}`);
  }

  /**
   * Accept an assigned task (by assignee only)
   *
   * @param taskId - Task ID
   * @param userId - ID of the assignee accepting the task
   * @returns The updated task
   */
  async acceptTask(taskId: string, userId: string): Promise<Task> {
    this.logger.log(`User ${userId} accepting task ${taskId}`);

    const task = await this.findOne(taskId);

    if (task.assigned_to !== userId) {
      throw new ForbiddenException('Anda bukan penerima tugas ini');
    }

    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException('Tugas tidak dalam status ditugaskan');
    }

    task.status = TaskStatus.ACCEPTED;
    task.accepted_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${taskId} accepted by user ${userId}`);

    // May 13 — notify the creator so they don't have to poll the
    // queue. Best-effort; never blocks acceptance on FCM dispatch.
    this.notifyTaskLifecycleParty(task, userId, 'accepted');

    return this.findOne(taskId);
  }

  /**
   * Fire a best-effort push on lifecycle transitions the creator /
   * assignee needs to know about. Keeps the notification graph
   * symmetric with the existing assign + cascade pushes.
   *
   * Routing:
   *   accepted / declined   -> notify creator (they assigned the work)
   *   verified / revision   -> notify assignee (they did the work)
   *
   * @param task     the task BEFORE the most-recent save (status field
   *                 may already reflect the new state — that's fine,
   *                 the helper only uses created_by / assigned_to / title
   *                 and route).
   * @param actorId  user who triggered the transition (used for audit;
   *                 the recipient is the *other* side of the pair).
   * @param event    one of 'accepted' | 'declined' | 'verified' | 'revision_needed'.
   * @param extra    optional reason string included in the body.
   */
  private notifyTaskLifecycleParty(
    task: Task,
    actorId: string,
    event: 'accepted' | 'declined' | 'verified' | 'revision_needed',
    extra?: string,
  ): void {
    const recipientId =
      event === 'accepted' || event === 'declined'
        ? task.created_by
        : task.assigned_to;
    if (!recipientId || recipientId === actorId) return;

    const titleMap = {
      accepted: 'Tugas Diterima',
      declined: 'Tugas Ditolak',
      verified: 'Tugas Diverifikasi',
      revision_needed: 'Tugas Perlu Revisi',
    };
    const bodyMap = {
      accepted: `Tugas "${task.title}" diterima oleh petugas.`,
      declined: `Tugas "${task.title}" ditolak oleh petugas${extra ? `. Alasan: ${extra}` : '.'}`,
      verified: `Tugas "${task.title}" telah diverifikasi.`,
      revision_needed: `Tugas "${task.title}" perlu direvisi${extra ? `. Alasan: ${extra}` : '.'}`,
    };
    const typeMap = {
      accepted: NotificationType.TASK_UPDATED,
      declined: NotificationType.TASK_DECLINED,
      verified: NotificationType.TASK_COMPLETED,
      revision_needed: NotificationType.TASK_UPDATED,
    };

    this.notificationsService
      .sendToUser({
        user_id: recipientId,
        type: typeMap[event],
        title: titleMap[event],
        body: bodyMap[event],
        data: { task_id: task.id, event },
      })
      .catch((err) =>
        this.logger.warn(
          `notifyTaskLifecycleParty push failed (task ${task.id}, event ${event}): ${err.message}`,
        ),
      );
  }

  /**
   * Decline an assigned task (by assignee only)
   *
   * @param taskId - Task ID
   * @param userId - ID of the assignee declining the task
   * @param reason - Reason for declining
   * @returns The updated task
   */
  async declineTask(taskId: string, userId: string, reason: string): Promise<Task> {
    this.logger.log(`User ${userId} declining task ${taskId}`);

    const task = await this.findOne(taskId);

    if (task.assigned_to !== userId) {
      throw new ForbiddenException('Anda bukan penerima tugas ini');
    }

    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException('Tugas tidak dalam status ditugaskan');
    }

    task.status = TaskStatus.DECLINED;
    task.declined_at = new Date();
    task.decline_reason = reason;

    await this.taskRepository.save(task);
    this.logger.log(`Task ${taskId} declined by user ${userId}`);

    // May 13 — decline is high-priority for the creator (they need to
    // reassign or the work won't happen). Push regardless of who else
    // is watching the audit trail.
    this.notifyTaskLifecycleParty(task, userId, 'declined', reason);

    return this.findOne(taskId);
  }

  /**
   * Verify a completed task (by direct supervisor)
   *
   * @param taskId - Task ID
   * @param verifierId - ID of the verifier
   * @returns The updated task
   */
  async verifyTask(taskId: string, verifierId: string): Promise<Task> {
    this.logger.log(`User ${verifierId} verifying task ${taskId}`);

    const task = await this.findOne(taskId);

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Tugas belum diselesaikan');
    }

    if (!task.assigned_to) {
      throw new BadRequestException('Tugas tidak memiliki penerima');
    }

    // May 12 — assignee cannot verify their own completion. The hierarchy
    // check below will still run for valid verifiers (creator, delegation
    // hop, supervisor role).
    if (task.assigned_to === verifierId) {
      throw new ForbiddenException(
        'Anda tidak dapat memverifikasi penyelesaian tugas Anda sendiri',
      );
    }

    const verifier = await this.usersService.findOne(verifierId);
    const assignee = await this.usersService.findOne(task.assigned_to);

    await this.validateVerificationHierarchy(verifier, assignee);

    task.status = TaskStatus.VERIFIED;
    task.verified_by = verifierId;
    task.verified_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${taskId} verified by user ${verifierId}`);

    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'verify',
        actor_id: verifierId,
        old_value: { status: TaskStatus.COMPLETED },
        new_value: { status: TaskStatus.VERIFIED, verified_by: verifierId },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // May 13 — positive feedback to the assignee that their work
    // was accepted. Best-effort.
    this.notifyTaskLifecycleParty(task, verifierId, 'verified');

    return this.findOne(taskId);
  }

  /**
   * Request revision on a completed task (by direct supervisor)
   *
   * @param taskId - Task ID
   * @param verifierId - ID of the verifier requesting revision
   * @param reason - Reason for revision
   * @returns The updated task
   */
  async requestRevision(taskId: string, verifierId: string, reason: string): Promise<Task> {
    this.logger.log(`User ${verifierId} requesting revision on task ${taskId}`);

    const task = await this.findOne(taskId);

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Tugas belum diselesaikan');
    }

    if (!task.assigned_to) {
      throw new BadRequestException('Tugas tidak memiliki penerima');
    }

    if (task.assigned_to === verifierId) {
      throw new ForbiddenException(
        'Anda tidak dapat meminta revisi atas penyelesaian tugas Anda sendiri',
      );
    }

    const verifier = await this.usersService.findOne(verifierId);
    const assignee = await this.usersService.findOne(task.assigned_to);

    await this.validateVerificationHierarchy(verifier, assignee);

    task.status = TaskStatus.REVISION_NEEDED;
    task.revision_reason = reason;

    await this.taskRepository.save(task);
    this.logger.log(`Revision requested on task ${taskId} by user ${verifierId}`);

    // May 13 — high-priority push to the assignee with the revision
    // reason so they know what to fix without re-opening the app.
    this.notifyTaskLifecycleParty(task, verifierId, 'revision_needed', reason);

    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'request_revision',
        actor_id: verifierId,
        old_value: { status: TaskStatus.COMPLETED },
        new_value: { status: TaskStatus.REVISION_NEEDED, revision_reason: reason },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return this.findOne(taskId);
  }

  /**
   * Validate that verifier has authority over assignee based on role hierarchy and scope
   *
   * @param verifier - The verifying user
   * @param assignee - The task assignee
   */
  private async validateVerificationHierarchy(verifier: User, assignee: User): Promise<void> {
    const allowedAssigneeRoles = VERIFY_MAP[verifier.role];

    if (!allowedAssigneeRoles?.includes(assignee.role as UserRole)) {
      throw new ForbiddenException('Anda tidak berwenang memverifikasi tugas ini');
    }

    if (verifier.role === UserRole.KORLAP) {
      if (!verifier.area_id || verifier.area_id !== assignee.area_id) {
        throw new ForbiddenException('Anda hanya dapat memverifikasi tugas di area Anda');
      }
    }

    if (verifier.role === UserRole.KEPALA_RAYON) {
      if (!verifier.rayon_id) {
        throw new ForbiddenException('Akun Kepala Rayon Anda belum memiliki rayon');
      }
      if (!assignee.area_id) {
        throw new ForbiddenException('Penerima tugas tidak memiliki area yang valid');
      }
      const area = await this.areasService.findOne(assignee.area_id);
      if (area.rayon_id !== verifier.rayon_id) {
        throw new ForbiddenException('Anda hanya dapat memverifikasi tugas di rayon Anda');
      }
    }

    // top_management: no scope restriction
  }

  /**
   * Validate that a user can be assigned tasks
   */
  private validateAssignee(user: User): void {
    const validRoles = [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.KEPALA_RAYON];

    if (!validRoles.includes(user.role)) {
      throw new BadRequestException(
        'Tasks can only be assigned to Satgas, Linmas, Korlap, or Kepala Rayon',
      );
    }

    if (!user.is_active) {
      throw new BadRequestException('Cannot assign task to inactive user');
    }
  }

  /**
   * Validate task assignment hierarchy
   *
   * @param creatorRole - Role of the user creating/assigning the task
   * @param assigneeRole - Role of the user being assigned the task
   */
  private validateHierarchy(creatorRole: UserRole, assigneeRole: UserRole): void {
    const validAssignments = VALID_TASK_ASSIGNMENTS[creatorRole];

    if (!validAssignments || !validAssignments.includes(assigneeRole)) {
      throw new ForbiddenException(
        `Users with role "${creatorRole}" cannot assign tasks to users with role "${assigneeRole}"`,
      );
    }
  }

  /**
   * Validate geographic scope for task creation
   *
   * - kepala_rayon: area.rayon_id must match creator.rayon_id
   * - korlap: dto.area_id must match creator.area_id
   */
  private async validateScope(creator: User, areaId?: string): Promise<void> {
    if (creator.role === UserRole.KEPALA_RAYON && creator.rayon_id && areaId) {
      const area = await this.areasService.findOne(areaId);
      if (area.rayon_id !== creator.rayon_id) {
        throw new ForbiddenException(
          'Kepala Rayon can only create tasks for areas within their rayon',
        );
      }
    }

    if (creator.role === UserRole.KORLAP && creator.area_id && areaId) {
      if (areaId !== creator.area_id) {
        throw new ForbiddenException('Korlap can only create tasks for their own area');
      }
    }
  }

  /**
   * Record a partial completion for a plant-counting task.
   *
   * Increments completed_plant_count by dto.completed_count.
   * When resume_tomorrow is true and the task is not yet fully done,
   * a child task is spawned covering the remaining count.
   *
   * @param taskId  - UUID of the task
   * @param dto     - Partial completion payload
   * @param user    - The acting user (authorization check)
   */
  async partialComplete(
    taskId: string,
    dto: PartialCompleteTaskDto,
    user: User,
  ): Promise<{ task: Task; child_task_id?: string }> {
    this.logger.log(`User ${user.id} partial-completing task ${taskId}`);

    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const isFieldWorker = [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP].includes(
      user.role as UserRole,
    );
    const isManager = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN].includes(user.role as UserRole);
    if (!isFieldWorker && !isManager) {
      throw new ForbiddenException('Not authorized to partial-complete this task');
    }

    const newCompleted = (task.completedPlantCount ?? 0) + dto.completed_count;
    const isFullyDone = task.targetPlantCount ? newCompleted >= task.targetPlantCount : !dto.resume_tomorrow;

    task.completedPlantCount = newCompleted;
    const becomesCompleted = isFullyDone && task.status === TaskStatus.IN_PROGRESS;
    if (becomesCompleted) {
      task.status = TaskStatus.COMPLETED;
      task.completed_at = new Date();
    }

    await this.taskRepository.save(task);

    // Cascade lifecycle back to linked pruning_request only when the parent
    // task is truly done. Mid-progress partial submissions leave the
    // request on `in_progress` (already set by `start`).
    if (becomesCompleted) {
      await this.cascadePruningRequestStatus(taskId, 'done', user.id);
    }

    let childTaskId: string | undefined;
    if (dto.resume_tomorrow && !isFullyDone) {
      const remaining = task.targetPlantCount ? task.targetPlantCount - newCompleted : undefined;
      const child = this.taskRepository.create({
        ...pick(task, ['title', 'description', 'area_id', 'rayon_id', 'taskType', 'assigned_to', 'deadline', 'priority', 'created_by']),
        status: TaskStatus.ASSIGNED,
        parentTaskId: task.id,
        targetPlantCount: remaining ?? null,
        completedPlantCount: 0,
        customFields: { ...(task.customFields ?? {}), _resumed_from: taskId },
      });
      const saved = await this.taskRepository.save(child);
      childTaskId = saved.id;
    }

    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: taskId,
        action: 'partial_complete',
        actor_id: user.id,
        new_value: {
          completed_plant_count: newCompleted,
          resume_tomorrow: dto.resume_tomorrow,
          child_task_id: childTaskId,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    return { task, child_task_id: childTaskId };
  }

  /**
   * Manually resume a task by spawning a child task with the remaining plant count.
   * Use when the worker wants to continue work on a separate day without going
   * through partial-complete first.
   *
   * @param taskId - UUID of the parent task
   * @param user   - The acting user (used to preserve assigned_to if needed)
   */
  async resume(taskId: string, user: User): Promise<Task> {
    this.logger.log(`User ${user.id} resuming task ${taskId}`);

    const parent = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!parent) throw new NotFoundException(`Task ${taskId} not found`);

    const remaining = parent.targetPlantCount
      ? parent.targetPlantCount - (parent.completedPlantCount ?? 0)
      : undefined;

    const child = this.taskRepository.create({
      ...pick(parent, ['description', 'area_id', 'rayon_id', 'taskType', 'assigned_to', 'deadline', 'priority', 'created_by']),
      title: `[Lanjutan] ${parent.title}`,
      status: TaskStatus.ASSIGNED,
      parentTaskId: parent.id,
      targetPlantCount: remaining ?? null,
      completedPlantCount: 0,
      customFields: { ...(parent.customFields ?? {}), _resumed_from: taskId },
    });

    const saved = await this.taskRepository.save(child);
    this.logger.log(`Child task ${saved.id} created as resume of ${taskId}`);
    return saved;
  }

  /**
   * Return the full parent–task–children lineage for a task.
   *
   * @param taskId - UUID of the task
   */
  async getLineage(taskId: string): Promise<{ parent?: Task; task: Task; children: Task[] }> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const [parent, children] = await Promise.all([
      task.parentTaskId
        ? this.taskRepository.findOne({ where: { id: task.parentTaskId } })
        : Promise.resolve(null),
      this.taskRepository.find({ where: { parentTaskId: taskId } }),
    ]);

    return { parent: parent ?? undefined, task, children };
  }
}
