import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { DeclineTaskDto } from './dto/decline-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { ActivityTypesService } from '../activity-types/activity-types.service';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Service for managing tasks
 *
 * Tasks are work assignments created by KoordinatorLapangan or higher roles.
 * Workers can accept, decline, start, and complete tasks.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly usersService: UsersService,
    private readonly areasService: AreasService,
    private readonly activityTypesService: ActivityTypesService,
  ) {}

  /**
   * Create a new task
   *
   * @param createTaskDto - Task creation data
   * @param creatorId - ID of the user creating the task
   * @returns The created task
   */
  async create(createTaskDto: CreateTaskDto, creatorId: string): Promise<Task> {
    this.logger.log(`Creating task: ${createTaskDto.title}`);

    // Validate area exists
    await this.areasService.findOne(createTaskDto.area_id);

    // Validate activity type if provided
    if (createTaskDto.activity_type_id) {
      await this.activityTypesService.findOne(createTaskDto.activity_type_id);
    }

    // If assigning to a user, validate the user
    let initialStatus = TaskStatus.PENDING;
    if (createTaskDto.assigned_to) {
      const assignee = await this.usersService.findOne(createTaskDto.assigned_to);
      this.validateAssignee(assignee);
      initialStatus = TaskStatus.ASSIGNED;
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      status: initialStatus,
      priority: createTaskDto.priority || TaskPriority.MEDIUM,
      deadline: createTaskDto.deadline ? new Date(createTaskDto.deadline) : null,
      created_by: creatorId,
      assigned_at: createTaskDto.assigned_to ? new Date() : null,
    });

    const savedTask = await this.taskRepository.save(task);
    this.logger.log(`Task created with ID: ${savedTask.id}`);

    return this.findOne(savedTask.id);
  }

  /**
   * Get all tasks with optional filters
   *
   * @param filters - Optional filter criteria
   * @returns Array of tasks
   */
  async findAll(filters?: TaskFilterDto): Promise<Task[]> {
    this.logger.log('Fetching tasks with filters');

    const where: FindOptionsWhere<Task> = {};

    if (filters) {
      if (filters.area_id) where.area_id = filters.area_id;
      if (filters.assigned_to) where.assigned_to = filters.assigned_to;
      if (filters.created_by) where.created_by = filters.created_by;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.activity_type_id) where.activity_type_id = filters.activity_type_id;
    }

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.activityType', 'activityType')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .where(where);

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

    return queryBuilder
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.deadline', 'ASC')
      .addOrderBy('task.created_at', 'DESC')
      .getMany();
  }

  /**
   * Get a single task by ID
   *
   * @param id - Task ID
   * @returns The task
   * @throws NotFoundException if task not found
   */
  async findOne(id: string): Promise<Task> {
    this.logger.log(`Fetching task with ID: ${id}`);

    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['area', 'activityType', 'assignee', 'creator'],
    });

    if (!task) {
      this.logger.warn(`Task with ID ${id} not found`);
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  /**
   * Get tasks assigned to a specific user (my tasks)
   *
   * @param userId - User ID
   * @param activeOnly - If true, only return non-completed/declined tasks
   * @returns Array of tasks assigned to the user
   */
  async findMyTasks(userId: string, activeOnly = true): Promise<Task[]> {
    this.logger.log(`Fetching tasks for user: ${userId}`);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.area', 'area')
      .leftJoinAndSelect('task.activityType', 'activityType')
      .leftJoinAndSelect('task.creator', 'creator')
      .where('task.assigned_to = :userId', { userId });

    if (activeOnly) {
      queryBuilder.andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.DECLINED],
      });
    }

    return queryBuilder
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.deadline', 'ASC')
      .addOrderBy('task.created_at', 'DESC')
      .getMany();
  }

  /**
   * Update a task
   *
   * @param id - Task ID
   * @param updateTaskDto - Update data
   * @returns The updated task
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`);

    const task = await this.findOne(id);

    // Validate area if being updated
    if (updateTaskDto.area_id && updateTaskDto.area_id !== task.area_id) {
      await this.areasService.findOne(updateTaskDto.area_id);
    }

    // Validate activity type if being updated
    if (
      updateTaskDto.activity_type_id &&
      updateTaskDto.activity_type_id !== task.activity_type_id
    ) {
      await this.activityTypesService.findOne(updateTaskDto.activity_type_id);
    }

    // Update fields
    if (updateTaskDto.title) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) task.description = updateTaskDto.description;
    if (updateTaskDto.priority) task.priority = updateTaskDto.priority;
    if (updateTaskDto.deadline) task.deadline = new Date(updateTaskDto.deadline);
    if (updateTaskDto.area_id) task.area_id = updateTaskDto.area_id;
    if (updateTaskDto.activity_type_id !== undefined)
      task.activity_type_id = updateTaskDto.activity_type_id;

    await this.taskRepository.save(task);
    this.logger.log(`Task updated with ID: ${id}`);

    return this.findOne(id);
  }

  /**
   * Assign a task to a worker
   *
   * @param id - Task ID
   * @param assignTaskDto - Assignment data
   * @returns The updated task
   */
  async assign(id: string, assignTaskDto: AssignTaskDto): Promise<Task> {
    this.logger.log(`Assigning task ${id} to user ${assignTaskDto.assigned_to}`);

    const task = await this.findOne(id);

    // Can only assign pending or declined tasks
    if (![TaskStatus.PENDING, TaskStatus.DECLINED].includes(task.status)) {
      throw new BadRequestException(
        `Cannot assign task with status "${task.status}". Task must be pending or declined.`,
      );
    }

    // Validate assignee
    const assignee = await this.usersService.findOne(assignTaskDto.assigned_to);
    this.validateAssignee(assignee);

    task.assigned_to = assignTaskDto.assigned_to;
    task.status = TaskStatus.ASSIGNED;
    task.assigned_at = new Date();
    task.decline_reason = null;
    task.declined_at = null;

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} assigned to user ${assignTaskDto.assigned_to}`);

    return this.findOne(id);
  }

  /**
   * Accept an assigned task (by worker)
   *
   * @param id - Task ID
   * @param userId - ID of the user accepting the task
   * @returns The updated task
   */
  async accept(id: string, userId: string): Promise<Task> {
    this.logger.log(`User ${userId} accepting task ${id}`);

    const task = await this.findOne(id);

    // Verify the task is assigned to this user
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You can only accept tasks assigned to you');
    }

    // Can only accept assigned tasks
    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException(
        `Cannot accept task with status "${task.status}". Task must be assigned.`,
      );
    }

    task.status = TaskStatus.ACCEPTED;
    task.accepted_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} accepted by user ${userId}`);

    return this.findOne(id);
  }

  /**
   * Decline an assigned task (by worker)
   *
   * @param id - Task ID
   * @param userId - ID of the user declining the task
   * @param declineTaskDto - Decline reason
   * @returns The updated task
   */
  async decline(id: string, userId: string, declineTaskDto: DeclineTaskDto): Promise<Task> {
    this.logger.log(`User ${userId} declining task ${id}`);

    const task = await this.findOne(id);

    // Verify the task is assigned to this user
    if (task.assigned_to !== userId) {
      throw new ForbiddenException('You can only decline tasks assigned to you');
    }

    // Can only decline assigned tasks
    if (task.status !== TaskStatus.ASSIGNED) {
      throw new BadRequestException(
        `Cannot decline task with status "${task.status}". Task must be assigned.`,
      );
    }

    task.status = TaskStatus.DECLINED;
    task.decline_reason = declineTaskDto.reason;
    task.declined_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} declined by user ${userId}`);

    return this.findOne(id);
  }

  /**
   * Start working on a task (by worker)
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

    // Can only start accepted tasks
    if (task.status !== TaskStatus.ACCEPTED) {
      throw new BadRequestException(
        `Cannot start task with status "${task.status}". Task must be accepted first.`,
      );
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.started_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} started by user ${userId}`);

    return this.findOne(id);
  }

  /**
   * Complete a task with evidence (by worker)
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
    task.completion_photo_url = completeTaskDto.completion_photo_url || null;
    task.completion_notes = completeTaskDto.completion_notes || null;
    task.completion_gps_lat = completeTaskDto.gps_lat;
    task.completion_gps_lng = completeTaskDto.gps_lng;
    task.completed_at = new Date();

    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} completed by user ${userId}`);

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
   * Get tasks by area (for coordinators/supervisors)
   *
   * @param areaId - Area ID
   * @param activeOnly - If true, only return non-completed/declined tasks
   * @returns Array of tasks in the area
   */
  async findByAreaId(areaId: string, activeOnly = false): Promise<Task[]> {
    this.logger.log(`Fetching tasks for area: ${areaId}`);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.activityType', 'activityType')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .where('task.area_id = :areaId', { areaId });

    if (activeOnly) {
      queryBuilder.andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.DECLINED],
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
    inProgress: number;
    completed: number;
    declined: number;
  }> {
    const tasks = await this.taskRepository.find({
      where: { area_id: areaId },
      select: ['status'],
    });

    const stats = {
      total: tasks.length,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      declined: 0,
    };

    for (const task of tasks) {
      switch (task.status) {
        case TaskStatus.PENDING:
          stats.pending++;
          break;
        case TaskStatus.ASSIGNED:
          stats.assigned++;
          break;
        case TaskStatus.ACCEPTED:
        case TaskStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case TaskStatus.COMPLETED:
          stats.completed++;
          break;
        case TaskStatus.DECLINED:
          stats.declined++;
          break;
      }
    }

    return stats;
  }

  /**
   * Validate that a user can be assigned tasks (Worker or Linmas only)
   */
  private validateAssignee(user: User): void {
    if (![UserRole.WORKER, UserRole.LINMAS].includes(user.role)) {
      throw new BadRequestException('Tasks can only be assigned to Workers or Linmas');
    }

    if (!user.is_active) {
      throw new BadRequestException('Cannot assign task to inactive user');
    }
  }
}
