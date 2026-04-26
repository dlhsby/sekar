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
    private readonly usersService: UsersService,
    private readonly areasService: AreasService,
    private readonly auditLogService: AuditLogService,
    private readonly taskTypeRegistry: TaskTypeRegistry,
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
    if (createTaskDto.assigned_to) {
      const assignee = await this.usersService.findOne(createTaskDto.assigned_to);
      this.validateAssignee(assignee);
      this.validateHierarchy(creator.role, assignee.role);
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

    // Scope-based access check when user is provided (controller calls)
    if (user) {
      this.checkTaskAccess(task, user);
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
        if (
          task.area?.rayon_id !== user.rayon_id &&
          task.rayon_id !== user.rayon_id &&
          task.created_by !== user.id &&
          task.assigned_to !== user.id
        ) {
          throw new ForbiddenException('Anda tidak memiliki akses ke tugas ini');
        }
        break;
      // top_management, admin_system, superadmin: no restriction
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
  ): Promise<PaginatedResponseDto<Task>> {
    this.logger.log(`Fetching tasks for user: ${userId}`);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.rayon', 'rayon')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('tags.user', 'taggedUser')
      .where('(task.assigned_to = :userId OR task.created_by = :userId)', { userId });

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

    // Can assign from pending (first assignment) or declined (reassignment)
    if (task.status !== TaskStatus.PENDING && task.status !== TaskStatus.DECLINED) {
      throw new BadRequestException(
        `Cannot assign task with status "${task.status}". Task must be pending or declined.`,
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

    task.assigned_to = assignTaskDto.assigned_to;
    task.status = TaskStatus.ASSIGNED;
    task.assigned_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} assigned to user ${assignTaskDto.assigned_to}`);

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

    // Verify the user has permission to add tags (task creator)
    if (task.created_by !== userId) {
      throw new ForbiddenException('Only the task creator can add tags');
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
  async removeTag(taskId: string, taggedUserId: string): Promise<void> {
    this.logger.log(`Removing tag from task ${taskId}: user ${taggedUserId}`);

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

    return this.findOne(taskId);
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

    const verifier = await this.usersService.findOne(verifierId);
    const assignee = await this.usersService.findOne(task.assigned_to);

    await this.validateVerificationHierarchy(verifier, assignee);

    task.status = TaskStatus.REVISION_NEEDED;
    task.revision_reason = reason;

    await this.taskRepository.save(task);
    this.logger.log(`Revision requested on task ${taskId} by user ${verifierId}`);

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
    if (isFullyDone && task.status === TaskStatus.IN_PROGRESS) {
      task.status = TaskStatus.COMPLETED;
      task.completed_at = new Date();
    }

    await this.taskRepository.save(task);

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
