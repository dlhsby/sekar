import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { ActivityTypesService } from '../activity-types/activity-types.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let usersService: jest.Mocked<UsersService>;
  let areasService: jest.Mocked<AreasService>;
  let activityTypesService: jest.Mocked<ActivityTypesService>;

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    username: 'testworker',
    role: UserRole.WORKER,
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid',
    name: 'Test Area',
  };

  const mockActivityType = {
    id: 'activity-uuid',
    name: 'Cleaning',
  };

  const mockTask: Partial<Task> = {
    id: 'task-uuid',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    area_id: 'area-uuid',
    activity_type_id: 'activity-uuid',
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
        {
          provide: ActivityTypesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    usersService = module.get(UsersService);
    areasService = module.get(AreasService);
    activityTypesService = module.get(ActivityTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Task',
      description: 'Task description',
      area_id: 'area-uuid',
      activity_type_id: 'activity-uuid',
      priority: TaskPriority.HIGH,
    };

    it('should create a task successfully', async () => {
      const createdTask = { ...mockTask, ...createDto, id: 'new-task-uuid' };
      areasService.findOne.mockResolvedValue(mockArea as any);
      activityTypesService.findOne.mockResolvedValue(mockActivityType as any);
      taskRepository.create.mockReturnValue(createdTask as Task);
      taskRepository.save.mockResolvedValue(createdTask as Task);
      taskRepository.findOne.mockResolvedValue(createdTask as Task);

      const result = await service.create(createDto, 'creator-uuid');

      expect(areasService.findOne).toHaveBeenCalledWith('area-uuid');
      expect(activityTypesService.findOne).toHaveBeenCalledWith('activity-uuid');
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

      areasService.findOne.mockResolvedValue(mockArea as any);
      activityTypesService.findOne.mockResolvedValue(mockActivityType as any);
      usersService.findOne.mockResolvedValue(worker as User);
      taskRepository.create.mockReturnValue(createdTask as Task);
      taskRepository.save.mockResolvedValue(createdTask as Task);
      taskRepository.findOne.mockResolvedValue(createdTask as Task);

      const result = await service.create(createDtoWithAssignee, 'creator-uuid');

      expect(usersService.findOne).toHaveBeenCalledWith('worker-uuid');
      expect(result.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should throw if area not found', async () => {
      areasService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto, 'creator-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw if assigning to non-worker/linmas', async () => {
      const createDtoWithAssignee = { ...createDto, assigned_to: 'admin-uuid' };
      const admin = { ...mockUser, id: 'admin-uuid', role: UserRole.ADMIN };

      areasService.findOne.mockResolvedValue(mockArea as any);
      activityTypesService.findOne.mockResolvedValue(mockActivityType as any);
      usersService.findOne.mockResolvedValue(admin as User);

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
        relations: ['area', 'activityType', 'assignee', 'creator'],
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
      usersService.findOne.mockResolvedValue(worker as User);
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
      usersService.findOne.mockResolvedValue(inactiveUser as User);

      await expect(service.assign('task-uuid', assignDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('accept', () => {
    it('should accept an assigned task', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };
      const acceptedTask = { ...assignedTask, status: TaskStatus.ACCEPTED };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce(acceptedTask as Task);
      taskRepository.save.mockResolvedValue(acceptedTask as Task);

      const result = await service.accept('task-uuid', 'user-uuid');

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not assigned to user', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'other-user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.accept('task-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if not in assigned status', async () => {
      const pendingTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(pendingTask as Task);

      await expect(service.accept('task-uuid', 'user-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('decline', () => {
    const declineDto = { reason: 'Too busy' };

    it('should decline an assigned task', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };
      const declinedTask = {
        ...assignedTask,
        status: TaskStatus.DECLINED,
        decline_reason: 'Too busy',
      };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce(declinedTask as Task);
      taskRepository.save.mockResolvedValue(declinedTask as Task);

      const result = await service.decline('task-uuid', 'user-uuid', declineDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not assigned to user', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'other-user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.decline('task-uuid', 'user-uuid', declineDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('start', () => {
    it('should start an accepted task', async () => {
      const acceptedTask = {
        ...mockTask,
        status: TaskStatus.ACCEPTED,
        assigned_to: 'user-uuid',
      };
      const inProgressTask = {
        ...acceptedTask,
        status: TaskStatus.IN_PROGRESS,
      };

      taskRepository.findOne
        .mockResolvedValueOnce(acceptedTask as Task)
        .mockResolvedValueOnce(inProgressTask as Task);
      taskRepository.save.mockResolvedValue(inProgressTask as Task);

      const result = await service.start('task-uuid', 'user-uuid');

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not accepted', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.start('task-uuid', 'user-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    const completeDto = {
      gps_lat: -7.2575,
      gps_lng: 112.7521,
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
        completion_gps_lat: -7.2575,
        completion_gps_lng: 112.7521,
      };

      taskRepository.findOne
        .mockResolvedValueOnce(inProgressTask as Task)
        .mockResolvedValueOnce(completedTask as Task);
      taskRepository.save.mockResolvedValue(completedTask as Task);

      const result = await service.complete('task-uuid', 'user-uuid', completeDto);

      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not in progress', async () => {
      const acceptedTask = {
        ...mockTask,
        status: TaskStatus.ACCEPTED,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(acceptedTask as Task);

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
        declined: 0,
      });
    });
  });
});
