import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { CreateTaskTypedDto } from './dto/create-task-typed.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { PartialCompleteTaskDto } from './dto/partial-complete-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TagUsersDto } from './dto/tag-users.dto';
import { DeclineTaskDto } from './dto/decline-task.dto';
import { RequestRevisionDto } from './dto/request-revision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import {
  TASK_CREATORS,
  TASK_RECEIVERS,
  TASK_VERIFIERS,
  USER_MANAGERS,
} from '../users/constants/role-groups';

/**
 * Controller for task management
 *
 * Provides endpoints for creating, assigning, and managing tasks.
 * Tasks flow: pending → assigned → in_progress → completed
 */
@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Create a new task (Phase 3: accepts task_type, custom_fields, target_plant_count)
   */
  @Post()
  @Roles(...TASK_CREATORS)
  @ApiOperation({ summary: 'Create a new task (supports task_type + custom_fields from Phase 3)' })
  @ApiBody({ type: CreateTaskTypedDto })
  @ApiResponse({ status: 201, description: 'Task created successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Invalid input or custom_fields schema mismatch' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Area or activity type not found' })
  async create(@Body() createTaskDto: CreateTaskTypedDto, @GetUser() user: User): Promise<Task> {
    return this.tasksService.create(createTaskDto, user.id);
  }

  /**
   * Get all tasks with optional filters
   */
  @Get()
  @Roles(...TASK_CREATORS, ...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() filters: TaskFilterDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<Task>> {
    return this.tasksService.findAll(filters, user);
  }

  /**
   * Get tasks assigned to the current user
   */
  @Get('my-tasks')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Get tasks assigned to the current user' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'If true, only return non-completed/declined tasks (default: false)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of user tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyTasks(
    @GetUser() user: User,
    @Query('activeOnly') activeOnly?: string,
    @Query() filters?: TaskFilterDto,
  ): Promise<PaginatedResponseDto<Task>> {
    const activeOnlyBool = activeOnly === 'true';
    return this.tasksService.findMyTasks(user.id, activeOnlyBool, filters);
  }

  /**
   * Get tasks where current user is tagged
   */
  @Get('tagged')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Get tasks where the current user is tagged' })
  @ApiResponse({ status: 200, description: 'Paginated list of tagged tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findTaggedTasks(
    @GetUser() user: User,
    @Query() filters?: TaskFilterDto,
  ): Promise<PaginatedResponseDto<Task>> {
    return this.tasksService.findTaggedTasks(user.id, filters);
  }

  /**
   * Accept an assigned task (assignee only)
   */
  @Post(':id/accept')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Accept an assigned task (Assignee only)' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task accepted', type: Task })
  @ApiResponse({ status: 400, description: 'Task not in assigned status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the task assignee' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async accept(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User): Promise<Task> {
    return this.tasksService.acceptTask(id, user.id);
  }

  /**
   * Decline an assigned task (assignee only)
   */
  @Post(':id/decline')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Decline an assigned task (Assignee only)' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task declined', type: Task })
  @ApiResponse({ status: 400, description: 'Task not in assigned status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the task assignee' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeclineTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.declineTask(id, user.id, dto.reason);
  }

  /**
   * Verify a completed task (direct supervisor only)
   */
  @Patch(':id/verify')
  @Roles(...TASK_VERIFIERS)
  @ApiOperation({ summary: 'Verify a completed task (Direct supervisor only)' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task verified', type: Task })
  @ApiResponse({ status: 400, description: 'Task not in completed status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to verify this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async verify(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User): Promise<Task> {
    return this.tasksService.verifyTask(id, user.id);
  }

  /**
   * Request revision on a completed task (direct supervisor only)
   */
  @Patch(':id/revision')
  @Roles(...TASK_VERIFIERS)
  @ApiOperation({ summary: 'Request revision on a completed task (Direct supervisor only)' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Revision requested', type: Task })
  @ApiResponse({ status: 400, description: 'Task not in completed status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to request revision' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async requestRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestRevisionDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.requestRevision(id, user.id, dto.reason);
  }

  /**
   * Get a specific task by ID
   */
  @Get(':id')
  // May 12, 2026 — `staff_kecamatan` may view the task linked to a
  // pruning_request they submitted (so they know who's doing it +
  // status). Service-level `checkTaskAccess` enforces the ownership
  // predicate (request.submitted_by === user.id).
  @Roles(...TASK_CREATORS, ...TASK_RECEIVERS, UserRole.STAFF_KECAMATAN)
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task found', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User): Promise<Task> {
    return this.tasksService.findOne(id, user);
  }

  /**
   * Update a task
   */
  @Patch(':id')
  @Roles(...TASK_CREATORS)
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task updated successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto, user.id);
  }

  /**
   * Delete a task
   */
  @Delete(':id')
  @Roles(...TASK_CREATORS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasksService.remove(id);
  }

  /**
   * Assign a task to a user
   */
  @Post(':id/assign')
  @Roles(...TASK_CREATORS)
  @ApiOperation({ summary: 'Assign a task to a user' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Invalid assignment (wrong status or invalid user)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignTaskDto: AssignTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.assign(id, assignTaskDto, user.id);
  }

  /**
   * Start working on a task (worker action)
   */
  @Post(':id/start')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Start working on a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task started successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Task cannot be started (must be assigned first)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - task not assigned to you' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async start(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User): Promise<Task> {
    return this.tasksService.start(id, user.id);
  }

  /**
   * Add tags to a task (batch)
   */
  @Post(':id/tag')
  @Roles(...TASK_CREATORS, ...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Add user tags to a task (batch) — creator or current assignee' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Tags added successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Task is sealed (completed/verified/declined) or invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only task creator or current assignee can add tags' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async addTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() tagUsersDto: TagUsersDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.addTags(id, user.id, tagUsersDto.user_ids);
  }

  /**
   * Remove a tag from a task
   */
  @Delete(':id/tag/:userId')
  @Roles(...TASK_CREATORS, ...TASK_RECEIVERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user tag from a task — creator or current assignee' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'Tagged user ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Tag removed successfully' })
  @ApiResponse({ status: 400, description: 'Task is sealed (completed/verified/declined)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only task creator or current assignee can remove tags' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @GetUser() user: User,
  ): Promise<void> {
    return this.tasksService.removeTag(id, userId, user.id);
  }

  /**
   * Complete a task with evidence (worker action)
   */
  @Post(':id/complete')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Complete a task with photo and notes' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task completed successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Task cannot be completed (must be in progress)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - task not assigned to you' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeTaskDto: CompleteTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.complete(id, user.id, completeTaskDto);
  }

  /**
   * Partial-complete a plant-counting task.
   * Updates completed_plant_count; optionally spawns a child task for tomorrow.
   */
  @Post(':id/partial-complete')
  @Roles(UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Partial-complete a task — updates completed_plant_count, optionally spawns child',
  })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiBody({ type: PartialCompleteTaskDto })
  @ApiResponse({ status: 200, description: 'Task partially completed' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async partialComplete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartialCompleteTaskDto,
    @GetUser() user: User,
  ): Promise<{ task: Task; child_task_id?: string }> {
    return this.tasksService.partialComplete(id, dto, user);
  }

  /**
   * Resume a task — spawns a child task with remaining target_plant_count.
   */
  @Post(':id/resume')
  @Roles(UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Resume a task — spawns child task with remaining target_plant_count' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 201, description: 'Child task created', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async resume(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.resume(id, user);
  }

  /**
   * List the delegation chain (assignment hops) for a task (ADR-038).
   *
   * Read scope mirrors the standard task-read scope: anyone allowed to see
   * the task can see who handed it where.
   */
  @Get(':id/delegations')
  @Roles(
    ...USER_MANAGERS,
    UserRole.KORLAP,
    UserRole.SATGAS,
    UserRole.LINMAS,
    UserRole.KEPALA_RAYON,
    UserRole.TOP_MANAGEMENT,
  )
  @ApiOperation({ summary: 'List task delegation chain (ADR-038)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({
    status: 200,
    description: 'Chronological array of delegation hops with from/to user joined',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async listDelegations(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findDelegations(id);
  }

  /**
   * Get the full task lineage — parent chain plus child tasks.
   */
  @Get(':id/lineage')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.SATGAS, UserRole.LINMAS, UserRole.KEPALA_RAYON, UserRole.TOP_MANAGEMENT)
  @ApiOperation({ summary: 'Get task lineage — parent chain + children' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task lineage returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getLineage(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ parent?: Task; task: Task; children: Task[] }> {
    return this.tasksService.getLineage(id);
  }
}
