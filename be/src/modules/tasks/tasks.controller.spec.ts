import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { TagUsersDto } from './dto/tag-users.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    username: 'testworker',
    role: UserRole.SATGAS,
    is_active: true,
  };

  const mockTask: Partial<Task> = {
    id: 'task-uuid',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    area_id: 'area-uuid',
    assigned_to: null,
    created_by: 'creator-uuid',
    deadline: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findMyTasks: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            assign: jest.fn(),
            start: jest.fn(),
            complete: jest.fn(),
            findTaggedTasks: jest.fn(),
            addTags: jest.fn(),
            removeTag: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        area_id: 'area-uuid',
        priority: TaskPriority.HIGH,
      };
      const createdTask = { ...mockTask, ...createDto };

      tasksService.create.mockResolvedValue(createdTask as Task);

      const result = await controller.create(createDto, mockUser as User);

      expect(tasksService.create).toHaveBeenCalledWith(createDto, mockUser.id);
      expect(result).toEqual(createdTask);
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      const tasks = [mockTask];
      tasksService.findAll.mockResolvedValue(tasks as Task[]);

      const result = await controller.findAll({});

      expect(tasksService.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(tasks);
    });

    it('should apply filters', async () => {
      const filters: TaskFilterDto = {
        area_id: 'area-uuid',
        status: TaskStatus.PENDING,
      };
      const tasks = [mockTask];
      tasksService.findAll.mockResolvedValue(tasks as Task[]);

      const result = await controller.findAll(filters);

      expect(tasksService.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(tasks);
    });
  });

  describe('findMyTasks', () => {
    it('should return tasks for current user with activeOnly default', async () => {
      const tasks = [mockTask];
      tasksService.findMyTasks.mockResolvedValue(tasks as Task[]);

      const result = await controller.findMyTasks(mockUser as User);

      expect(tasksService.findMyTasks).toHaveBeenCalledWith(mockUser.id, true);
      expect(result).toEqual(tasks);
    });

    it('should return all tasks when activeOnly is false', async () => {
      const tasks = [mockTask];
      tasksService.findMyTasks.mockResolvedValue(tasks as Task[]);

      const result = await controller.findMyTasks(mockUser as User, 'false');

      expect(tasksService.findMyTasks).toHaveBeenCalledWith(mockUser.id, false);
      expect(result).toEqual(tasks);
    });

    it('should return active tasks when activeOnly is true', async () => {
      const tasks = [mockTask];
      tasksService.findMyTasks.mockResolvedValue(tasks as Task[]);

      const result = await controller.findMyTasks(mockUser as User, 'true');

      expect(tasksService.findMyTasks).toHaveBeenCalledWith(mockUser.id, true);
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      tasksService.findOne.mockResolvedValue(mockTask as Task);

      const result = await controller.findOne('task-uuid');

      expect(tasksService.findOne).toHaveBeenCalledWith('task-uuid');
      expect(result).toEqual(mockTask);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Title',
        priority: TaskPriority.URGENT,
      };
      const updatedTask = { ...mockTask, ...updateDto };

      tasksService.update.mockResolvedValue(updatedTask as Task);

      const result = await controller.update('task-uuid', updateDto);

      expect(tasksService.update).toHaveBeenCalledWith('task-uuid', updateDto);
      expect(result).toEqual(updatedTask);
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      tasksService.remove.mockResolvedValue(undefined);

      await controller.remove('task-uuid');

      expect(tasksService.remove).toHaveBeenCalledWith('task-uuid');
    });
  });

  describe('assign', () => {
    it('should assign a task to a worker', async () => {
      const assignDto: AssignTaskDto = {
        assigned_to: 'worker-uuid',
      };
      const assignedTask = {
        ...mockTask,
        assigned_to: 'worker-uuid',
        status: TaskStatus.ASSIGNED,
      };

      tasksService.assign.mockResolvedValue(assignedTask as Task);

      const result = await controller.assign('task-uuid', assignDto);

      expect(tasksService.assign).toHaveBeenCalledWith('task-uuid', assignDto);
      expect(result).toEqual(assignedTask);
    });
  });

  describe('start', () => {
    it('should start an accepted task', async () => {
      const startedTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: mockUser.id,
      };

      tasksService.start.mockResolvedValue(startedTask as Task);

      const result = await controller.start('task-uuid', mockUser as User);

      expect(tasksService.start).toHaveBeenCalledWith('task-uuid', mockUser.id);
      expect(result).toEqual(startedTask);
    });
  });

  describe('complete', () => {
    it('should complete a task with evidence', async () => {
      const completeDto: CompleteTaskDto = {
        description: 'Task completed successfully',
        completion_photo_url: 'https://example.com/photo.jpg',
      };
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completion_gps_lat: -7.2575,
        completion_gps_lng: 112.7521,
        completion_notes: 'Task completed successfully',
        completion_photo_url: 'https://example.com/photo.jpg',
      };

      tasksService.complete.mockResolvedValue(completedTask as Task);

      const result = await controller.complete('task-uuid', completeDto, mockUser as User);

      expect(tasksService.complete).toHaveBeenCalledWith('task-uuid', mockUser.id, completeDto);
      expect(result).toEqual(completedTask);
    });
  });

  describe('findTaggedTasks', () => {
    it('should return tagged tasks for current user', async () => {
      const tasks = [mockTask];
      tasksService.findTaggedTasks.mockResolvedValue(tasks as Task[]);

      const result = await controller.findTaggedTasks(mockUser as User);

      expect(tasksService.findTaggedTasks).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(tasks);
    });
  });

  describe('addTags', () => {
    it('should add tags to a task', async () => {
      const tagDto: TagUsersDto = { user_ids: ['user-1', 'user-2'] };
      const taggedTask = { ...mockTask, tagged_user_ids: ['user-1', 'user-2'] };

      tasksService.addTags.mockResolvedValue(taggedTask as Task);

      const result = await controller.addTags('task-uuid', tagDto, mockUser as User);

      expect(tasksService.addTags).toHaveBeenCalledWith('task-uuid', mockUser.id, tagDto.user_ids);
      expect(result).toEqual(taggedTask);
    });
  });

  describe('removeTag', () => {
    it('should remove a tag from a task', async () => {
      tasksService.removeTag.mockResolvedValue(undefined);

      await controller.removeTag('task-uuid', 'user-1');

      expect(tasksService.removeTag).toHaveBeenCalledWith('task-uuid', 'user-1');
    });
  });
});
