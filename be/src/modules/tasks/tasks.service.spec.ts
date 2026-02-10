import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { TaskTag } from './entities/task-tag.entity';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let taskTagRepository: jest.Mocked<Repository<TaskTag>>;
  let usersService: jest.Mocked<UsersService>;
  let areasService: jest.Mocked<AreasService>;

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    username: 'testworker',
    role: UserRole.SATGAS,
    is_active: true,
  };

  const mockCreator: Partial<User> = {
    id: 'creator-uuid',
    username: 'korlap1',
    role: UserRole.KORLAP,
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid',
    name: 'Test Area',
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

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTask]),
    getRawOne: jest.fn().mockResolvedValue({ total: '5', pending: '2' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(TaskTag),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AreasService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    taskTagRepository = module.get(getRepositoryToken(TaskTag));
    usersService = module.get(UsersService);
    areasService = module.get(AreasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Task',
      description: 'Task description',
      area_id: 'area-uuid',
      priority: TaskPriority.HIGH,
    };

    it('should create a task successfully', async () => {
      const createdTask = { ...mockTask, ...createDto, id: 'new-task-uuid' };
      usersService.findOne.mockResolvedValue(mockCreator as User);
      areasService.findOne.mockResolvedValue(mockArea as any);
      taskRepository.create.mockReturnValue(createdTask as Task);
      taskRepository.save.mockResolvedValue(createdTask as Task);
      taskRepository.findOne.mockResolvedValue(createdTask as Task);

      const result = await service.create(createDto, 'creator-uuid');

      expect(usersService.findOne).toHaveBeenCalledWith('creator-uuid');
      expect(areasService.findOne).toHaveBeenCalledWith('area-uuid');
      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
      expect(result).toEqual(createdTask);
    });

    it('should create task with assigned user', async () => {
      const createDtoWithAssignee = {
        ...createDto,
        assigned_to: 'worker-uuid',
      };
      const worker = { ...mockUser, id: 'worker-uuid' };
      const createdTask = {
        ...mockTask,
        ...createDtoWithAssignee,
        status: TaskStatus.ASSIGNED,
      };

      usersService.findOne
        .mockResolvedValueOnce(mockCreator as User)
        .mockResolvedValueOnce(worker as User);
      areasService.findOne.mockResolvedValue(mockArea as any);
      taskRepository.create.mockReturnValue(createdTask as Task);
      taskRepository.save.mockResolvedValue(createdTask as Task);
      taskRepository.findOne.mockResolvedValue(createdTask as Task);

      const result = await service.create(createDtoWithAssignee, 'creator-uuid');

      expect(usersService.findOne).toHaveBeenCalledWith('worker-uuid');
      expect(result.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should throw if area not found', async () => {
      usersService.findOne.mockResolvedValue(mockCreator as User);
      areasService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto, 'creator-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw if assigning to non-worker/linmas', async () => {
      const createDtoWithAssignee = { ...createDto, assigned_to: 'admin-uuid' };
      const admin = { ...mockUser, id: 'admin-uuid', role: UserRole.SUPERADMIN };

      usersService.findOne
        .mockResolvedValueOnce(mockCreator as User)
        .mockResolvedValueOnce(admin as User);
      areasService.findOne.mockResolvedValue(mockArea as any);

      await expect(service.create(createDtoWithAssignee, 'creator-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);

      const result = await service.findOne('task-uuid');

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-uuid' },
        relations: ['area', 'rayon', 'assignee', 'creator', 'tags', 'tags.user'],
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all tasks with no filters', async () => {
      const result = await service.findAll();

      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result).toEqual([mockTask]);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        area_id: 'area-uuid',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
      };

      await service.findAll(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('findMyTasks', () => {
    it('should return tasks for user', async () => {
      const result = await service.findMyTasks('user-uuid');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('task.assigned_to = :userId', {
        userId: 'user-uuid',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result).toEqual([mockTask]);
    });

    it('should return all tasks including completed when activeOnly is false', async () => {
      await service.findMyTasks('user-uuid', false);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      // andWhere should not be called for status filter when activeOnly is false
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Title',
      priority: TaskPriority.URGENT,
    };

    it('should update task successfully', async () => {
      const existingTask = { ...mockTask };
      const updatedTask = { ...existingTask, ...updateDto };

      taskRepository.findOne.mockResolvedValue(existingTask as Task);
      taskRepository.save.mockResolvedValue(updatedTask as Task);

      const result = await service.update('task-uuid', updateDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assign', () => {
    const assignDto = { assigned_to: 'worker-uuid' };

    it('should assign task to worker successfully', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const assignedTask = {
        ...pendingTask,
        assigned_to: 'worker-uuid',
        status: TaskStatus.ASSIGNED,
      };
      const worker = { ...mockUser, id: 'worker-uuid' };

      taskRepository.findOne
        .mockResolvedValueOnce(pendingTask as Task)
        .mockResolvedValueOnce(assignedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(worker as User)
        .mockResolvedValueOnce(mockCreator as User);
      taskRepository.save.mockResolvedValue(assignedTask as Task);

      const result = await service.assign('task-uuid', assignDto);

      expect(usersService.findOne).toHaveBeenCalledWith('worker-uuid');
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if task is not pending/declined', async () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(service.assign('task-uuid', assignDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if assigning to inactive user', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const inactiveUser = { ...mockUser, is_active: false };

      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      usersService.findOne.mockResolvedValueOnce(inactiveUser as User);

      await expect(service.assign('task-uuid', assignDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('start', () => {
    it('should start an assigned task', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };
      const inProgressTask = {
        ...assignedTask,
        status: TaskStatus.IN_PROGRESS,
      };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce(inProgressTask as Task);
      taskRepository.save.mockResolvedValue(inProgressTask as Task);

      const result = await service.start('task-uuid', 'user-uuid');

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not assigned', async () => {
      const pendingTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(pendingTask as Task);

      await expect(service.start('task-uuid', 'user-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    const completeDto: CompleteTaskDto = {
      completion_photo_url: 'https://example.com/photo.jpg',
      completion_notes: 'Done',
    };

    it('should complete an in-progress task', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      const completedTask = {
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        completion_photo_url: 'https://example.com/photo.jpg',
        completion_notes: 'Done',
      };

      taskRepository.findOne
        .mockResolvedValueOnce(inProgressTask as Task)
        .mockResolvedValueOnce(completedTask as Task);
      taskRepository.save.mockResolvedValue(completedTask as Task);

      const result = await service.complete('task-uuid', 'user-uuid', completeDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not in progress', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.complete('task-uuid', 'user-uuid', completeDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a task', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);
      taskRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('task-uuid');

      expect(taskRepository.softDelete).toHaveBeenCalledWith('task-uuid');
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAreaId', () => {
    it('should return tasks for an area', async () => {
      const result = await service.findByAreaId('area-uuid');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('task.area_id = :areaId', {
        areaId: 'area-uuid',
      });
      expect(result).toEqual([mockTask]);
    });
  });

  describe('getAreaTaskStats', () => {
    it('should return task statistics for an area', async () => {
      const tasks = [
        { status: TaskStatus.PENDING },
        { status: TaskStatus.PENDING },
        { status: TaskStatus.ASSIGNED },
        { status: TaskStatus.IN_PROGRESS },
        { status: TaskStatus.COMPLETED },
      ];
      taskRepository.find.mockResolvedValue(tasks as Task[]);

      const result = await service.getAreaTaskStats('area-uuid');

      expect(result).toEqual({
        total: 5,
        pending: 2,
        assigned: 1,
        inProgress: 1,
        completed: 1,
      });
    });

    it('should count multiple in_progress tasks', async () => {
      const tasks = [{ status: TaskStatus.IN_PROGRESS }, { status: TaskStatus.IN_PROGRESS }];
      taskRepository.find.mockResolvedValue(tasks as Task[]);

      const result = await service.getAreaTaskStats('area-uuid');

      expect(result.inProgress).toBe(2);
    });
  });

  describe('edge cases and filters', () => {
    it('should create task without assigned_to', async () => {
      const createDtoWithoutAssignee = {
        title: 'New Task',
        description: 'Task description',
        area_id: 'area-uuid',
        priority: TaskPriority.HIGH,
      };
      const createdTask = { ...mockTask, ...createDtoWithoutAssignee, id: 'new-task-uuid' };

      usersService.findOne.mockResolvedValue(mockCreator as User);
      areasService.findOne.mockResolvedValue(mockArea as any);
      taskRepository.create.mockReturnValue(createdTask as Task);
      taskRepository.save.mockResolvedValue(createdTask as Task);
      taskRepository.findOne.mockResolvedValue(createdTask as Task);

      const result = await service.create(createDtoWithoutAssignee, 'creator-uuid');

      // Only called once for creator, not for assignee
      expect(usersService.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdTask);
    });

    it('should apply deadline_before filter', async () => {
      const filters = {
        deadline_before: '2026-12-31',
      };

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deadline <= :deadlineBefore',
        expect.any(Object),
      );
    });

    it('should apply deadline_after filter', async () => {
      const filters = {
        deadline_after: '2026-01-01',
      };

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.deadline >= :deadlineAfter',
        expect.any(Object),
      );
    });

    it('should apply created_after filter', async () => {
      const filters = {
        created_after: '2026-01-01',
      };

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.created_at >= :createdAfter',
        expect.any(Object),
      );
    });

    it('should apply created_before filter', async () => {
      const filters = {
        created_before: '2026-12-31',
      };

      await service.findAll(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.created_at <= :createdBefore',
        expect.any(Object),
      );
    });

    it('should update task with area change', async () => {
      const existingTask = { ...mockTask, area_id: 'old-area-uuid' };
      const updateDto = {
        area_id: 'new-area-uuid',
      };

      taskRepository.findOne.mockResolvedValue(existingTask as Task);
      areasService.findOne.mockResolvedValue({ id: 'new-area-uuid' } as any);
      taskRepository.save.mockResolvedValue({ ...existingTask, ...updateDto } as Task);

      await service.update('task-uuid', updateDto);

      expect(areasService.findOne).toHaveBeenCalledWith('new-area-uuid');
    });

    it('should update task description', async () => {
      const existingTask = { ...mockTask };
      const updateDto = {
        description: 'Updated description',
      };

      taskRepository.findOne.mockResolvedValue(existingTask as Task);
      taskRepository.save.mockResolvedValue({ ...existingTask, ...updateDto } as Task);

      await service.update('task-uuid', updateDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should update task description to empty string', async () => {
      const existingTask = { ...mockTask, description: 'Old description' };
      const updateDto = {
        description: '',
      };

      taskRepository.findOne.mockResolvedValue(existingTask as Task);
      taskRepository.save.mockResolvedValue({ ...existingTask, description: '' } as Task);

      await service.update('task-uuid', updateDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should update task priority', async () => {
      const existingTask = { ...mockTask };
      const updateDto = {
        priority: TaskPriority.URGENT,
      };

      taskRepository.findOne.mockResolvedValue(existingTask as Task);
      taskRepository.save.mockResolvedValue({ ...existingTask, ...updateDto } as Task);

      await service.update('task-uuid', updateDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should reassign pending task successfully', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const assignedTask = {
        ...pendingTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'worker-uuid',
      };
      const worker = { ...mockUser, id: 'worker-uuid' };

      taskRepository.findOne
        .mockResolvedValueOnce(pendingTask as Task)
        .mockResolvedValueOnce(assignedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(worker as User)
        .mockResolvedValueOnce(mockCreator as User);
      taskRepository.save.mockResolvedValue(assignedTask as Task);

      const result = await service.assign('task-uuid', { assigned_to: 'worker-uuid' });

      expect(result.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should throw BadRequestException if assigning to ADMIN', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const admin = { ...mockUser, role: UserRole.SUPERADMIN };

      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      usersService.findOne.mockResolvedValueOnce(admin as User);

      await expect(service.assign('task-uuid', { assigned_to: 'admin-uuid' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept LINMAS as assignee', async () => {
      const createDto = {
        title: 'New Task',
        description: 'Task for Linmas',
        area_id: 'area-uuid',
        assigned_to: 'linmas-uuid',
      };
      const linmas = { ...mockUser, id: 'linmas-uuid', role: UserRole.LINMAS };
      const createdTask = { ...mockTask, ...createDto, status: TaskStatus.ASSIGNED };

      usersService.findOne
        .mockResolvedValueOnce(mockCreator as User)
        .mockResolvedValueOnce(linmas as User);
      areasService.findOne.mockResolvedValue(mockArea as any);
      taskRepository.create.mockReturnValue(createdTask as Task);
      taskRepository.save.mockResolvedValue(createdTask as Task);
      taskRepository.findOne.mockResolvedValue(createdTask as Task);

      const result = await service.create(createDto, 'creator-uuid');

      expect(result.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should throw ForbiddenException when starting task not assigned to user', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'other-user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.start('task-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when completing task not assigned to user', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'other-user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(
        service.complete('task-uuid', 'user-uuid', { completion_photo_url: 'https://example.com/photo.jpg', completion_notes: 'Done' } as CompleteTaskDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should complete task with photo URL', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      const completeDto: CompleteTaskDto = {
        completion_notes: 'Done',
        completion_photo_url: 'https://example.com/photo.jpg',
      };

      taskRepository.findOne.mockResolvedValueOnce(inProgressTask as Task).mockResolvedValueOnce({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        completion_photo_url: completeDto.completion_photo_url,
      } as Task);
      taskRepository.save.mockResolvedValue({} as Task);

      await service.complete('task-uuid', 'user-uuid', completeDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should handle findByAreaId with activeOnly false', async () => {
      await service.findByAreaId('area-uuid', false);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('task.area_id = :areaId', {
        areaId: 'area-uuid',
      });
      // Should not add status filter when activeOnly is false
    });

    it('should handle findByAreaId with activeOnly true', async () => {
      await service.findByAreaId('area-uuid', true);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('task.area_id = :areaId', {
        areaId: 'area-uuid',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status NOT IN (:...completedStatuses)',
        expect.any(Object),
      );
    });
  });

  describe('findTaggedTasks', () => {
    it('should return tasks where user is tagged', async () => {
      const mockTags = [
        { task: { ...mockTask, id: 'task-1' } },
        { task: { ...mockTask, id: 'task-2' } },
      ];
      taskTagRepository.find.mockResolvedValue(mockTags as any);

      const result = await service.findTaggedTasks('user-uuid');

      expect(taskTagRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid' },
        relations: ['task', 'task.area', 'task.rayon', 'task.creator', 'task.assignee'],
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no tags', async () => {
      taskTagRepository.find.mockResolvedValue([]);

      const result = await service.findTaggedTasks('user-uuid');

      expect(result).toEqual([]);
    });
  });

  describe('addTag', () => {
    it('should add a tag to a task', async () => {
      const task = { ...mockTask, id: 'task-uuid', created_by: 'user-uuid' };
      const taggedUser = { ...mockUser, id: 'tagged-uuid' };
      const mockTag = { task_id: 'task-uuid', user_id: 'tagged-uuid' };

      taskRepository.findOne.mockResolvedValue(task as Task);
      taskTagRepository.findOne.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue(taggedUser as User);
      taskTagRepository.create.mockReturnValue(mockTag as any);
      taskTagRepository.save.mockResolvedValue(mockTag as any);

      await service.addTag('task-uuid', 'user-uuid', 'tagged-uuid');

      expect(taskTagRepository.create).toHaveBeenCalledWith({
        task_id: 'task-uuid',
        user_id: 'tagged-uuid',
      });
      expect(taskTagRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not task creator', async () => {
      const task = { ...mockTask, id: 'task-uuid', created_by: 'other-user' };
      taskRepository.findOne.mockResolvedValue(task as Task);

      await expect(service.addTag('task-uuid', 'user-uuid', 'tagged-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if user already tagged', async () => {
      const task = { ...mockTask, id: 'task-uuid', created_by: 'user-uuid' };
      const existingTag = { task_id: 'task-uuid', user_id: 'tagged-uuid' };

      taskRepository.findOne.mockResolvedValue(task as Task);
      taskTagRepository.findOne.mockResolvedValue(existingTag as any);

      await expect(service.addTag('task-uuid', 'user-uuid', 'tagged-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeTag', () => {
    it('should remove a tag from a task', async () => {
      const mockTag = { task_id: 'task-uuid', user_id: 'tagged-uuid' };
      taskTagRepository.findOne.mockResolvedValue(mockTag as any);
      taskTagRepository.remove.mockResolvedValue(mockTag as any);

      await service.removeTag('task-uuid', 'tagged-uuid');

      expect(taskTagRepository.remove).toHaveBeenCalledWith(mockTag);
    });

    it('should throw NotFoundException if tag not found', async () => {
      taskTagRepository.findOne.mockResolvedValue(null);

      await expect(service.removeTag('task-uuid', 'nonexistent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
