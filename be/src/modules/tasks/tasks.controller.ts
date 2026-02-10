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
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { TASK_CREATORS, TASK_RECEIVERS } from '../users/constants/role-groups';

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
   * Create a new task
   */
  @Post()
  @Roles(...TASK_CREATORS)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Area or activity type not found' })
  async create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User): Promise<Task> {
    return this.tasksService.create(createTaskDto, user.id);
  }

  /**
   * Get all tasks with optional filters
   */
  @Get()
  @Roles(...TASK_CREATORS, ...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiResponse({ status: 200, description: 'List of tasks', type: [Task] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() filters: TaskFilterDto): Promise<Task[]> {
    return this.tasksService.findAll(filters);
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
    description: 'If true, only return non-completed/declined tasks (default: true)',
  })
  @ApiResponse({ status: 200, description: 'List of user tasks', type: [Task] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyTasks(
    @GetUser() user: User,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<Task[]> {
    const activeOnlyBool = activeOnly !== 'false';
    return this.tasksService.findMyTasks(user.id, activeOnlyBool);
  }

  /**
   * Get tasks where current user is tagged
   */
  @Get('tagged')
  @Roles(...TASK_RECEIVERS)
  @ApiOperation({ summary: 'Get tasks where the current user is tagged' })
  @ApiResponse({ status: 200, description: 'List of tagged tasks', type: [Task] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findTaggedTasks(@GetUser() user: User): Promise<Task[]> {
    return this.tasksService.findTaggedTasks(user.id);
  }

  /**
   * Get a specific task by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task found', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
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
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto);
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
   * Assign a task to a worker
   */
  @Post(':id/assign')
  @Roles(...TASK_CREATORS)
  @ApiOperation({ summary: 'Assign a task to a worker' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Invalid assignment (wrong status or invalid user)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignTaskDto: AssignTaskDto,
  ): Promise<Task> {
    return this.tasksService.assign(id, assignTaskDto);
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
   * Add a tag to a task
   */
  @Post(':id/tag')
  @Roles(...TASK_CREATORS)
  @ApiOperation({ summary: 'Add a user tag to a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Tag added successfully', type: Task })
  @ApiResponse({ status: 400, description: 'User already tagged or invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only task creator can add tags' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async addTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.addTag(id, user.id, userId);
  }

  /**
   * Remove a tag from a task
   */
  @Delete(':id/tag/:userId')
  @Roles(...TASK_CREATORS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user tag from a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'Tagged user ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Tag removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.tasksService.removeTag(id, userId);
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
}
