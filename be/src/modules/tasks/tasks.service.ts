import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
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
import { AuditLogService } from '../audit/audit.service';
import { TaskFinderService } from './services/task-finder.service';
import { TaskDelegationService } from './services/task-delegation.service';
import { TaskStatusTransitionsService } from './services/task-status-transitions.service';
import { TaskVerificationService } from './services/task-verification.service';
import { TaskAreaSyncService } from './services/task-area-sync.service';
import {
  assertTaskReadAccess,
  assertValidAssignee,
  assertAssignmentHierarchy,
  assertCanEditTags,
} from './task.policies';

type MyTasksScope = 'assigned' | 'created' | 'all';

// May 12 — scope-aware filter so a creator's "Tugaskan" doesn't appear under
// "Ditugaskan Kepada Saya" on mobile; legacy callers without scope keep the
// assigned-or-created union.
const MY_TASKS_SCOPE_WHERE: Record<MyTasksScope, string> = {
  assigned: 'task.assigned_to = :userId',
  created: 'task.created_by = :userId',
  all: '(task.assigned_to = :userId OR task.created_by = :userId)',
};

export interface AreaTaskStats {
  total: number;
  pending: number;
  assigned: number;
  accepted: number;
  declined: number;
  inProgress: number;
  completed: number;
  verified: number;
  revisionNeeded: number;
}

/**
 * Façade for task management.
 *
 * Owns creation, queries, scoped read access and tag bookkeeping; lifecycle
 * transitions live in the sub-services under ./services (status transitions,
 * verification, delegation) behind this unchanged public API.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskTag)
    private readonly taskTagRepository: Repository<TaskTag>,
    private readonly usersService: UsersService,
    private readonly areasService: AreasService,
    private readonly auditLogService: AuditLogService,
    private readonly taskTypeRegistry: TaskTypeRegistry,
    private readonly taskFinder: TaskFinderService,
    private readonly delegationService: TaskDelegationService,
    private readonly transitionsService: TaskStatusTransitionsService,
    private readonly verificationService: TaskVerificationService,
    private readonly taskAreaSync: TaskAreaSyncService,
  ) {}

  /**
   * Create a new task.
   *
   * Accepts both the base CreateTaskDto and the extended CreateTaskTypedDto;
   * task_type + custom_fields are validated via TaskTypeRegistry.
   */
  async create(
    createTaskDto: CreateTaskDto | CreateTaskTypedDto,
    creatorId: string,
  ): Promise<Task> {
    this.logger.log(`Creating task: ${createTaskDto.title}`);
    const creator = await this.usersService.findOne(creatorId);
    await this.validateCreateTarget(creator, createTaskDto.area_id);
    const assignee = await this.resolveInitialAssignee(createTaskDto.assigned_to, creator);
    const typedFields = this.validateTypedFields(createTaskDto);

    const savedTask = await this.taskRepository.save(
      this.buildTask(createTaskDto, creatorId, assignee, typedFields),
    );
    await this.recordInitialDelegation(savedTask, creator, assignee);
    await this.createInitialTags(savedTask.id, createTaskDto.tagged_user_ids);
    this.auditCreate(savedTask, creatorId);
    // ADR-013 §5: a task created already assigned lights up that area for the worker.
    if (assignee) {
      await this.taskAreaSync.syncForUser(assignee.id);
    }
    return this.findOne(savedTask.id);
  }

  private async validateCreateTarget(creator: User, areaId?: string): Promise<void> {
    if (areaId) await this.areasService.findOne(areaId);
    await this.validateScope(creator, areaId);
  }

  private async resolveInitialAssignee(
    assignedTo: string | undefined,
    creator: User,
  ): Promise<User | null> {
    if (!assignedTo) return null;
    const assignee = await this.usersService.findOne(assignedTo);
    assertValidAssignee(assignee);
    assertAssignmentHierarchy(creator.role, assignee.role);
    return assignee;
  }

  private validateTypedFields(
    dto: CreateTaskDto | CreateTaskTypedDto,
  ): Pick<Task, 'taskType' | 'customFields' | 'targetPlantCount'> {
    const typedDto = dto as CreateTaskTypedDto;
    const taskType = typedDto.task_type ?? 'generic';
    const customFields = typedDto.custom_fields ?? {};
    try {
      this.taskTypeRegistry.validate(taskType, customFields);
    } catch {
      throw new BadRequestException(
        `custom_fields is invalid for task_type "${taskType}". Check required fields.`,
      );
    }
    return { taskType, customFields, targetPlantCount: typedDto.target_plant_count ?? null };
  }

  private buildTask(
    dto: CreateTaskDto | CreateTaskTypedDto,
    creatorId: string,
    assignee: User | null,
    typedFields: Pick<Task, 'taskType' | 'customFields' | 'targetPlantCount'>,
  ): Task {
    return this.taskRepository.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority || TaskPriority.MEDIUM,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      area_id: dto.area_id || null,
      rayon_id: dto.rayon_id || null,
      assigned_to: dto.assigned_to || null,
      status: assignee ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
      created_by: creatorId,
      assigned_at: dto.assigned_to ? new Date() : null,
      ...typedFields,
    });
  }

  /**
   * ADR-038: record the first hop in the delegation chain when the task is
   * created already-assigned (creator → assignee). Reuses the assignee loaded
   * for hierarchy validation — no extra DB roundtrip.
   */
  private async recordInitialDelegation(
    task: Task,
    creator: User,
    assignee: User | null,
  ): Promise<void> {
    if (!task.assigned_to || !assignee) return;
    await this.delegationService.recordDelegation({
      task_id: task.id,
      from_user_id: creator.id,
      from_role: creator.role,
      to_user_id: task.assigned_to,
      to_role: assignee.role,
      reason: null,
      task_title: task.title,
    });
  }

  private async createInitialTags(taskId: string, taggedUserIds?: string[]): Promise<void> {
    if (!taggedUserIds?.length) return;
    const tags = taggedUserIds.map((userId) =>
      this.taskTagRepository.create({ task_id: taskId, user_id: userId }),
    );
    await this.taskTagRepository.save(tags);
  }

  private auditCreate(task: Task, creatorId: string): void {
    this.auditLogService
      .log({
        entity_type: 'task',
        entity_id: task.id,
        action: 'create',
        actor_id: creatorId,
        new_value: { title: task.title, status: task.status, area_id: task.area_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }

  /** Get all tasks with optional filters, scoped to the caller's role. */
  async findAll(filters?: TaskFilterDto, user?: User): Promise<PaginatedResponseDto<Task>> {
    this.logger.log('Fetching tasks with filters');
    const queryBuilder = this.buildListQuery().where(this.buildWhere(filters));
    this.applyRoleScope(queryBuilder, user);
    this.applyDateFilters(queryBuilder, filters);
    this.applySortAndPagination(queryBuilder, filters);
    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, filters?.page ?? 1, filters?.limit ?? 50);
  }

  private buildListQuery(): SelectQueryBuilder<Task> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser');
  }

  private buildWhere(filters?: TaskFilterDto): FindOptionsWhere<Task> {
    if (!filters) return {};
    const where: FindOptionsWhere<Task> = {};
    if (filters.area_id) where.area_id = filters.area_id;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;
    if (filters.created_by) where.created_by = filters.created_by;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    return where;
  }

  /** Listing scope per role; roles missing from the map see everything. */
  private applyRoleScope(queryBuilder: SelectQueryBuilder<Task>, user?: User): void {
    if (!user) return;
    this.roleScopes[user.role]?.(queryBuilder, user);
  }

  private readonly roleScopes: Partial<
    Record<UserRole, (qb: SelectQueryBuilder<Task>, user: User) => void>
  > = {
    [UserRole.SATGAS]: (qb, user) => this.scopeToFieldWorker(qb, user),
    [UserRole.LINMAS]: (qb, user) => this.scopeToFieldWorker(qb, user),
    [UserRole.KORLAP]: (qb, user) => this.scopeToKorlap(qb, user),
    [UserRole.KEPALA_RAYON]: (qb, user) => this.scopeToKepalaRayon(qb, user),
    // top_management, admin_system, superadmin: no scope restriction
  };

  /** Field workers: only tasks assigned to them or where they're tagged. */
  private scopeToFieldWorker(qb: SelectQueryBuilder<Task>, user: User): void {
    qb.andWhere('(task.assigned_to = :scopeUserId OR tags.user_id = :scopeUserId)', {
      scopeUserId: user.id,
    });
  }

  /** Korlap: tasks in their area + tasks they created. */
  private scopeToKorlap(qb: SelectQueryBuilder<Task>, user: User): void {
    if (!user.area_id) {
      qb.andWhere('task.created_by = :scopeUserId', { scopeUserId: user.id });
      return;
    }
    qb.andWhere('(task.area_id = :scopeAreaId OR task.created_by = :scopeUserId)', {
      scopeAreaId: user.area_id,
      scopeUserId: user.id,
    });
  }

  /** Kepala Rayon: tasks in their rayon + tasks they created. */
  private scopeToKepalaRayon(qb: SelectQueryBuilder<Task>, user: User): void {
    if (!user.rayon_id) {
      qb.andWhere('task.created_by = :scopeUserId', { scopeUserId: user.id });
      return;
    }
    qb.andWhere(
      '(area.rayon_id = :scopeRayonId OR task.rayon_id = :scopeRayonId OR task.created_by = :scopeUserId)',
      { scopeRayonId: user.rayon_id, scopeUserId: user.id },
    );
  }

  private applyDateFilters(qb: SelectQueryBuilder<Task>, filters?: TaskFilterDto): void {
    if (filters?.deadline_before) {
      qb.andWhere('task.deadline <= :deadlineBefore', {
        deadlineBefore: new Date(filters.deadline_before),
      });
    }
    if (filters?.deadline_after) {
      qb.andWhere('task.deadline >= :deadlineAfter', {
        deadlineAfter: new Date(filters.deadline_after),
      });
    }
    if (filters?.created_after) {
      qb.andWhere('task.created_at >= :createdAfter', {
        createdAfter: new Date(filters.created_after),
      });
    }
    if (filters?.created_before) {
      qb.andWhere('task.created_at <= :createdBefore', {
        createdBefore: new Date(filters.created_before),
      });
    }
  }

  private applySortAndPagination(qb: SelectQueryBuilder<Task>, filters?: TaskFilterDto): void {
    const sortBy = filters?.sort_by ?? 'created_at';
    const sortDir = (filters?.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    qb.orderBy(`task.${sortBy}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);
  }

  /**
   * Get a single task by ID. When a user is provided (controller calls),
   * scope-based access is enforced: staff_kecamatan via an async DB lookup
   * (linked permohonan they own), other roles via the synchronous rules.
   */
  async findOne(id: string, user?: User): Promise<Task> {
    this.logger.log(`Fetching task with ID: ${id}`);
    const task = await this.taskFinder.getOrFail(id);
    if (user) await this.assertReadAccess(task, user);
    return task;
  }

  private async assertReadAccess(task: Task, user: User): Promise<void> {
    if (user.role === UserRole.STAFF_KECAMATAN) {
      return this.checkStaffKecamatanAccess(task.id, user.id);
    }
    assertTaskReadAccess(task, user);
  }

  /**
   * Async access check for staff_kecamatan — they may read tasks linked to a
   * pruning_request they themselves submitted. Kept off the synchronous rule
   * map because it needs a DB lookup.
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

  /** Get tasks assigned to and/or created by a specific user (my tasks). */
  async findMyTasks(
    userId: string,
    activeOnly = false,
    filters?: TaskFilterDto,
    scope: MyTasksScope = 'all',
  ): Promise<PaginatedResponseDto<Task>> {
    this.logger.log(`Fetching tasks for user: ${userId} (scope=${scope})`);
    const queryBuilder = this.buildMyTasksQuery(userId, scope);
    this.applyStatusFilter(queryBuilder, filters?.status, activeOnly);
    this.applySortAndPagination(queryBuilder, filters);
    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, filters?.page ?? 1, filters?.limit ?? 50);
  }

  private buildMyTasksQuery(userId: string, scope: MyTasksScope): SelectQueryBuilder<Task> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser')
      .where(MY_TASKS_SCOPE_WHERE[scope], { userId });
  }

  /** An explicit status filter overrides activeOnly behaviour. */
  private applyStatusFilter(
    qb: SelectQueryBuilder<Task>,
    status: TaskFilterDto['status'],
    activeOnly: boolean,
  ): void {
    if (status) {
      qb.andWhere('task.status = :status', { status });
      return;
    }
    if (!activeOnly) return;
    qb.andWhere('task.status NOT IN (:...completedStatuses)', {
      completedStatuses: [TaskStatus.COMPLETED, TaskStatus.VERIFIED, TaskStatus.DECLINED],
    });
  }

  /** Update a task (creator only). */
  async update(id: string, updateTaskDto: UpdateTaskDto, callerId?: string): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`);
    const task = await this.findOne(id);
    this.assertUpdateAllowed(task, callerId);
    await this.validateAreaChange(task, updateTaskDto.area_id);
    await this.taskRepository.save(this.withUpdates(task, updateTaskDto));
    return this.findOne(id);
  }

  private assertUpdateAllowed(task: Task, callerId?: string): void {
    if (callerId && task.created_by !== callerId) {
      throw new ForbiddenException('Hanya pembuat tugas yang dapat mengedit tugas ini');
    }
  }

  private async validateAreaChange(task: Task, newAreaId?: string): Promise<void> {
    if (newAreaId && newAreaId !== task.area_id) {
      await this.areasService.findOne(newAreaId);
    }
  }

  private withUpdates(task: Task, dto: UpdateTaskDto): Task {
    return {
      ...task,
      title: dto.title || task.title,
      description: dto.description !== undefined ? dto.description : task.description,
      priority: dto.priority || task.priority,
      deadline: dto.deadline ? new Date(dto.deadline) : task.deadline,
      area_id: dto.area_id !== undefined ? dto.area_id : task.area_id,
    };
  }

  /** Assign a task to a user (delegated to TaskDelegationService). */
  assign(id: string, assignTaskDto: AssignTaskDto, callerId?: string): Promise<Task> {
    return this.delegationService.assign(id, assignTaskDto, callerId);
  }

  /** List all delegation hops for a task in chronological order (ADR-038). */
  findDelegations(taskId: string): Promise<TaskDelegation[]> {
    return this.delegationService.findDelegations(taskId);
  }

  /** Start working on a task (by assignee). */
  start(id: string, userId: string): Promise<Task> {
    return this.transitionsService.start(id, userId);
  }

  /** Complete a task with evidence (by assignee). */
  complete(id: string, userId: string, completeTaskDto: CompleteTaskDto): Promise<Task> {
    return this.transitionsService.complete(id, userId, completeTaskDto);
  }

  /** Record a partial completion for a plant-counting task. */
  partialComplete(
    taskId: string,
    dto: PartialCompleteTaskDto,
    user: User,
  ): Promise<{ task: Task; child_task_id?: string }> {
    return this.transitionsService.partialComplete(taskId, dto, user);
  }

  /** Spawn a child task with the remaining plant count. */
  resume(taskId: string, user: User): Promise<Task> {
    return this.transitionsService.resume(taskId, user);
  }

  /** Accept an assigned task (by assignee only). */
  acceptTask(taskId: string, userId: string): Promise<Task> {
    return this.verificationService.acceptTask(taskId, userId);
  }

  /** Decline an assigned task (by assignee only). */
  declineTask(taskId: string, userId: string, reason: string): Promise<Task> {
    return this.verificationService.declineTask(taskId, userId, reason);
  }

  /** Verify a completed task (by direct supervisor). */
  verifyTask(taskId: string, verifierId: string): Promise<Task> {
    return this.verificationService.verifyTask(taskId, verifierId);
  }

  /** Request revision on a completed task (by direct supervisor). */
  requestRevision(taskId: string, verifierId: string, reason: string): Promise<Task> {
    return this.verificationService.requestRevision(taskId, verifierId, reason);
  }

  /** Soft delete a task. */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting task with ID: ${id}`);
    await this.findOne(id);
    await this.taskRepository.softDelete(id);
    this.logger.log(`Task soft deleted with ID: ${id}`);
  }

  /** Get tasks by area (for management roles). */
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

  /** Get task statistics for an area. */
  async getAreaTaskStats(areaId: string): Promise<AreaTaskStats> {
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

  /** Find tasks where a user is tagged. */
  async findTaggedTasks(
    userId: string,
    filters?: TaskFilterDto,
  ): Promise<PaginatedResponseDto<Task>> {
    this.logger.log(`Fetching tasks tagged for user: ${userId}`);
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.tags', 'tag', 'tag.user_id = :userId', { userId })
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser');

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }
    this.applySortAndPagination(queryBuilder, filters);
    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, filters?.page ?? 1, filters?.limit ?? 50);
  }

  /** Add a tag to a task. */
  async addTag(taskId: string, userId: string, taggedUserId: string): Promise<Task> {
    return this.addTags(taskId, userId, [taggedUserId]);
  }

  /** Add multiple tags to a task (batch); already-tagged users are skipped. */
  async addTags(taskId: string, userId: string, taggedUserIds: string[]): Promise<Task> {
    this.logger.log(`Adding ${taggedUserIds.length} tags to task ${taskId}`);
    const task = await this.findOne(taskId);
    assertCanEditTags(task, userId, 'modify');
    for (const taggedUserId of taggedUserIds) {
      await this.ensureTag(taskId, taggedUserId);
    }
    this.logger.log(`Tags added to task ${taskId}`);
    return this.findOne(taskId);
  }

  private async ensureTag(taskId: string, taggedUserId: string): Promise<void> {
    const existingTag = await this.taskTagRepository.findOne({
      where: { task_id: taskId, user_id: taggedUserId },
    });
    if (existingTag) return;
    await this.usersService.findOne(taggedUserId);
    await this.taskTagRepository.save(
      this.taskTagRepository.create({ task_id: taskId, user_id: taggedUserId }),
    );
  }

  /** Remove a tag from a task. */
  async removeTag(taskId: string, taggedUserId: string, callerId: string): Promise<void> {
    this.logger.log(`Removing tag from task ${taskId}: user ${taggedUserId}`);
    const task = await this.findOne(taskId);
    assertCanEditTags(task, callerId, 'remove');

    const tag = await this.taskTagRepository.findOne({
      where: { task_id: taskId, user_id: taggedUserId },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    await this.taskTagRepository.remove(tag);
    this.logger.log(`Tag removed from task ${taskId}`);
  }

  /** Return the full parent–task–children lineage for a task. */
  async getLineage(taskId: string): Promise<{ parent?: Task; task: Task; children: Task[] }> {
    const task = await this.taskFinder.getBareOrFail(taskId);
    const [parent, children] = await Promise.all([
      task.parentTaskId
        ? this.taskRepository.findOne({ where: { id: task.parentTaskId } })
        : Promise.resolve(null),
      this.taskRepository.find({ where: { parentTaskId: taskId } }),
    ]);
    return { parent: parent ?? undefined, task, children };
  }

  /**
   * Validate geographic scope for task creation:
   * kepala_rayon may only target areas in their rayon; korlap only their area.
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
}
