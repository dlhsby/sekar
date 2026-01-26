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
import { DeclineTaskDto } from './dto/decline-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Controller for task management
 *
 * Provides endpoints for creating, assigning, and managing tasks.
 * Tasks flow: pending → assigned → accepted → in_progress → completed
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
  @Roles(UserRole.ADMIN, UserRole.KEPALA_RAYON, UserRole.KOORDINATOR_LAPANGAN)
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
  @Roles(
    UserRole.ADMIN,
    UserRole.TOP_MANAGEMENT,
    UserRole.KEPALA_RAYON,
    UserRole.KOORDINATOR_LAPANGAN,
    UserRole.SUPERVISOR,
  )
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
  @Roles(UserRole.WORKER, UserRole.LINMAS)
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
  @Roles(UserRole.ADMIN, UserRole.KEPALA_RAYON, UserRole.KOORDINATOR_LAPANGAN)
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
  @Roles(UserRole.ADMIN, UserRole.KEPALA_RAYON, UserRole.KOORDINATOR_LAPANGAN)
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
  @Roles(UserRole.ADMIN, UserRole.KEPALA_RAYON, UserRole.KOORDINATOR_LAPANGAN)
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
   * Accept an assigned task (worker action)
   */
  @Post(':id/accept')
  @Roles(UserRole.WORKER, UserRole.LINMAS)
  @ApiOperation({ summary: 'Accept an assigned task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task accepted successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Task cannot be accepted (wrong status)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - task not assigned to you' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async accept(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User): Promise<Task> {
    return this.tasksService.accept(id, user.id);
  }

  /**
   * Decline an assigned task (worker action)
   */
  @Post(':id/decline')
  @Roles(UserRole.WORKER, UserRole.LINMAS)
  @ApiOperation({ summary: 'Decline an assigned task with reason' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task declined successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Task cannot be declined (wrong status)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - task not assigned to you' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() declineTaskDto: DeclineTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    return this.tasksService.decline(id, user.id, declineTaskDto);
  }

  /**
   * Start working on a task (worker action)
   */
  @Post(':id/start')
  @Roles(UserRole.WORKER, UserRole.LINMAS)
  @ApiOperation({ summary: 'Start working on a task' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Task started successfully', type: Task })
  @ApiResponse({ status: 400, description: 'Task cannot be started (must be accepted first)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - task not assigned to you' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async start(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User): Promise<Task> {
    return this.tasksService.start(id, user.id);
  }

  /**
   * Complete a task with evidence (worker action)
   */
  @Post(':id/complete')
  @Roles(UserRole.WORKER, UserRole.LINMAS)
  @ApiOperation({ summary: 'Complete a task with photo and GPS evidence' })
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
