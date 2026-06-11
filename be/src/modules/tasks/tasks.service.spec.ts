import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskFinderService } from './services/task-finder.service';
import { TaskDelegationService } from './services/task-delegation.service';
import { TaskStatusTransitionsService } from './services/task-status-transitions.service';
import { TaskVerificationService } from './services/task-verification.service';
import { Task, TaskStatus, TaskPriority } from './entities/task.entity';
import { TaskTag } from './entities/task-tag.entity';
import { TaskDelegation } from './entities/task-delegation.entity';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { User, UserRole } from '../users/entities/user.entity';
import { AuditLogService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskTypeRegistry } from './registry/task-type-registry';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let taskTagRepository: jest.Mocked<Repository<TaskTag>>;
  let taskDelegationRepository: jest.Mocked<Repository<TaskDelegation>>;
  let notificationsService: jest.Mocked<NotificationsService>;
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
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTask]),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
    getRawOne: jest.fn().mockResolvedValue({ total: '5', pending: '2' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        // Real sub-services — behavior is exercised through the façade
        // against the same mocked repositories/services below.
        TaskFinderService,
        TaskDelegationService,
        TaskStatusTransitionsService,
        TaskVerificationService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            // Used by cascadePruningRequestStatus (and checkStaffKecamatanAccess).
            // Default to "no linked request" so existing tests stay green.
            manager: { query: jest.fn().mockResolvedValue([]) },
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
          provide: getRepositoryToken(TaskDelegation),
          useValue: {
            create: jest.fn((row) => row),
            save: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
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
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendToUser: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: TaskTypeRegistry,
          useValue: {
            validate: jest.fn(),
            isKnownType: jest.fn().mockReturnValue(true),
            getSupportedTypes: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    taskTagRepository = module.get(getRepositoryToken(TaskTag));
    taskDelegationRepository = module.get(getRepositoryToken(TaskDelegation));
    notificationsService = module.get(NotificationsService);
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
        relations: ['area', 'rayon', 'assignee', 'creator', 'verifier', 'tags', 'tags.user'],
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks with no filters', async () => {
      const result = await service.findAll();

      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(result.data).toEqual([mockTask]);
      expect(result.meta.total).toBe(1);
    });

    it('should apply filters correctly and return paginated result', async () => {
      const filters = {
        area_id: 'area-uuid',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
      };

      const result = await service.findAll(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(result.data).toEqual([mockTask]);
    });

    it('should use custom sort and pagination when provided', async () => {
      const filters = {
        sort_by: 'deadline',
        sort_dir: 'asc',
        page: 2,
        limit: 10,
      };

      const result = await service.findAll(filters);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.deadline', 'ASC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });

    it('should apply satgas/linmas scope filter', async () => {
      await service.findAll(undefined, { id: 'u-1', role: UserRole.SATGAS } as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.assigned_to = :scopeUserId OR tags.user_id = :scopeUserId)',
        { scopeUserId: 'u-1' },
      );
    });

    it('should apply korlap scope filter with area_id', async () => {
      await service.findAll(undefined, {
        id: 'u-1',
        role: UserRole.KORLAP,
        area_id: 'area-1',
      } as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.area_id = :scopeAreaId OR task.created_by = :scopeUserId)',
        { scopeAreaId: 'area-1', scopeUserId: 'u-1' },
      );
    });

    it('should apply korlap scope filter without area_id', async () => {
      await service.findAll(undefined, { id: 'u-1', role: UserRole.KORLAP } as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.created_by = :scopeUserId', {
        scopeUserId: 'u-1',
      });
    });

    it('should apply kepala_rayon scope filter with rayon_id', async () => {
      await service.findAll(undefined, {
        id: 'u-1',
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'rayon-1',
      } as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(area.rayon_id = :scopeRayonId OR task.rayon_id = :scopeRayonId OR task.created_by = :scopeUserId)',
        { scopeRayonId: 'rayon-1', scopeUserId: 'u-1' },
      );
    });

    it('should apply kepala_rayon scope filter without rayon_id', async () => {
      await service.findAll(undefined, { id: 'u-1', role: UserRole.KEPALA_RAYON } as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.created_by = :scopeUserId', {
        scopeUserId: 'u-1',
      });
    });
  });

  describe('findMyTasks', () => {
    it('should return paginated tasks for user', async () => {
      const result = await service.findMyTasks('user-uuid');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(task.assigned_to = :userId OR task.created_by = :userId)',
        {
          userId: 'user-uuid',
        },
      );
      // activeOnly defaults to false — no status exclusion applied
      expect(result.data).toEqual([mockTask]);
      expect(result.meta.total).toBe(1);
    });

    it('should return all tasks including completed when activeOnly is false', async () => {
      const result = await service.findMyTasks('user-uuid', false);

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(result.data).toEqual([mockTask]);
    });

    it('should use custom sort and pagination when filters provided', async () => {
      const filters = { sort_by: 'priority', sort_dir: 'asc', page: 1, limit: 20 };
      const result = await service.findMyTasks('user-uuid', true, filters);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.priority', 'ASC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.meta.limit).toBe(20);
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

    // ADR-038: current assignee can delegate from ASSIGNED status
    it('allows the current assignee to delegate from ASSIGNED status', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'caller-uuid',
      };
      const newAssignee = { ...mockUser, id: 'worker-uuid', role: UserRole.SATGAS };
      const caller = { ...mockUser, id: 'caller-uuid', role: UserRole.KORLAP };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce({ ...assignedTask, assigned_to: 'worker-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(newAssignee as User) // assignee validation
        .mockResolvedValueOnce(caller as User) // authority lookup
        .mockResolvedValueOnce(caller as User); // previous-assignee role lookup
      taskRepository.save.mockResolvedValue(assignedTask as Task);

      await service.assign('task-uuid', assignDto, 'caller-uuid');

      expect(taskRepository.save).toHaveBeenCalled();
      expect(taskDelegationRepository.save).toHaveBeenCalledTimes(1);
      const saved = (taskDelegationRepository.save as jest.Mock).mock.calls[0][0];
      expect(saved).toMatchObject({
        from_user_id: 'caller-uuid',
        to_user_id: 'worker-uuid',
      });
    });

    it('rejects delegation from ASSIGNED status when caller is not the current assignee', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'someone-else-uuid',
      };
      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.assign('task-uuid', assignDto, 'caller-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows the creator to reassign from ASSIGNED before the assignee accepts', async () => {
      // May 11, 2026 — admin reassign path: callerId === task.created_by
      // while task.status === ASSIGNED. Lets admin_data fix a wrong
      // Tugaskan pick without forcing the assignee to decline first.
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'wrong-person-uuid',
        created_by: 'creator-uuid',
      };
      const newAssignee = { ...mockUser, id: 'right-person-uuid', role: UserRole.SATGAS };
      const creator = { ...mockUser, id: 'creator-uuid', role: UserRole.ADMIN_DATA };
      const previousAssignee = { ...mockUser, id: 'wrong-person-uuid', role: UserRole.SATGAS };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce({ ...assignedTask, assigned_to: 'right-person-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(newAssignee as User) // assignee validation
        .mockResolvedValueOnce(creator as User) // authority lookup
        .mockResolvedValueOnce(previousAssignee as User); // previous-assignee role
      taskRepository.save.mockResolvedValue(assignedTask as Task);

      await service.assign(
        'task-uuid',
        { assigned_to: 'right-person-uuid' } as any,
        'creator-uuid',
      );

      expect(taskRepository.save).toHaveBeenCalled();
      const calls = (taskDelegationRepository.save as jest.Mock).mock.calls;
      const saved = calls[calls.length - 1]?.[0];
      expect(saved).toMatchObject({
        from_user_id: 'wrong-person-uuid',
        to_user_id: 'right-person-uuid',
      });
    });

    it('should throw BadRequestException if assigning to inactive user', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const inactiveUser = { ...mockUser, is_active: false };

      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      usersService.findOne.mockResolvedValueOnce(inactiveUser as User);

      await expect(service.assign('task-uuid', assignDto)).rejects.toThrow(BadRequestException);
    });

    // ADR-038: delegation chain audit
    it('records a delegation hop on first assignment (caller → assignee)', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING, assigned_to: null };
      const worker = { ...mockUser, id: 'worker-uuid', role: UserRole.SATGAS };

      taskRepository.findOne
        .mockResolvedValueOnce(pendingTask as Task)
        .mockResolvedValueOnce({ ...pendingTask, assigned_to: 'worker-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(worker as User) // assignee validation
        .mockResolvedValueOnce(mockCreator as User); // authority lookup
      taskRepository.save.mockResolvedValue(pendingTask as Task);

      await service.assign('task-uuid', assignDto, 'creator-uuid');

      expect(taskDelegationRepository.save).toHaveBeenCalledTimes(1);
      const saved = (taskDelegationRepository.save as jest.Mock).mock.calls[0][0];
      expect(saved).toMatchObject({
        task_id: 'task-uuid',
        from_user_id: 'creator-uuid',
        from_role: UserRole.KORLAP,
        to_user_id: 'worker-uuid',
        to_role: UserRole.SATGAS,
      });
    });

    it('records a delegation hop on reassignment (prev assignee → new assignee)', async () => {
      const declinedTask = {
        ...mockTask,
        status: TaskStatus.DECLINED,
        assigned_to: 'old-worker-uuid',
      };
      const newWorker = { ...mockUser, id: 'worker-uuid', role: UserRole.SATGAS };
      const oldWorker = { ...mockUser, id: 'old-worker-uuid', role: UserRole.LINMAS };

      taskRepository.findOne
        .mockResolvedValueOnce(declinedTask as Task)
        .mockResolvedValueOnce({ ...declinedTask, assigned_to: 'worker-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(newWorker as User) // new assignee validation
        .mockResolvedValueOnce(mockCreator as User) // authority lookup
        .mockResolvedValueOnce(oldWorker as User); // previous-assignee role lookup
      taskRepository.save.mockResolvedValue(declinedTask as Task);

      await service.assign('task-uuid', assignDto, 'creator-uuid');

      const saved = (taskDelegationRepository.save as jest.Mock).mock.calls[0][0];
      expect(saved).toMatchObject({
        from_user_id: 'old-worker-uuid',
        from_role: UserRole.LINMAS,
        to_user_id: 'worker-uuid',
        to_role: UserRole.SATGAS,
      });
    });

    it('sends a TASK_ASSIGNED push to the new assignee', async () => {
      const pendingTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        assigned_to: null,
        title: 'Pangkas pohon',
      };
      const worker = { ...mockUser, id: 'worker-uuid', role: UserRole.SATGAS };

      taskRepository.findOne
        .mockResolvedValueOnce(pendingTask as Task)
        .mockResolvedValueOnce({ ...pendingTask, assigned_to: 'worker-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(worker as User)
        .mockResolvedValueOnce(mockCreator as User);
      taskRepository.save.mockResolvedValue(pendingTask as Task);

      await service.assign('task-uuid', assignDto, 'creator-uuid');

      expect(notificationsService.sendToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'worker-uuid',
          type: 'task_assigned',
          title: expect.stringContaining('Pangkas pohon'),
          data: { task_id: 'task-uuid' },
        }),
      );
    });

    it('does not abort assignment when notification send fails', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING, assigned_to: null };
      const worker = { ...mockUser, id: 'worker-uuid', role: UserRole.SATGAS };

      taskRepository.findOne
        .mockResolvedValueOnce(pendingTask as Task)
        .mockResolvedValueOnce({ ...pendingTask, assigned_to: 'worker-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(worker as User)
        .mockResolvedValueOnce(mockCreator as User);
      taskRepository.save.mockResolvedValue(pendingTask as Task);
      (notificationsService.sendToUser as jest.Mock).mockRejectedValueOnce(new Error('fcm down'));

      await expect(service.assign('task-uuid', assignDto, 'creator-uuid')).resolves.toBeDefined();
    });

    it('does not abort assignment when delegation insert fails', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING, assigned_to: null };
      const worker = { ...mockUser, id: 'worker-uuid', role: UserRole.SATGAS };

      taskRepository.findOne
        .mockResolvedValueOnce(pendingTask as Task)
        .mockResolvedValueOnce({ ...pendingTask, assigned_to: 'worker-uuid' } as Task);
      usersService.findOne
        .mockResolvedValueOnce(worker as User)
        .mockResolvedValueOnce(mockCreator as User);
      taskRepository.save.mockResolvedValue(pendingTask as Task);
      (taskDelegationRepository.save as jest.Mock).mockRejectedValueOnce(new Error('db blip'));

      await expect(service.assign('task-uuid', assignDto, 'creator-uuid')).resolves.toBeDefined();
    });
  });

  describe('findDelegations (ADR-038)', () => {
    it('returns chronological hops via QB with projected user columns', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);
      const hops = [{ id: 'h1', task_id: 'task-uuid', created_at: new Date() }];
      const qb: any = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(hops),
      };
      (taskDelegationRepository.createQueryBuilder as unknown) = jest.fn(() => qb);

      const result = await service.findDelegations('task-uuid');

      expect(result).toEqual(hops);
      expect(qb.where).toHaveBeenCalledWith('d.task_id = :taskId', { taskId: 'task-uuid' });
      expect(qb.orderBy).toHaveBeenCalledWith('d.created_at', 'ASC');
      // Confirm we never project sensitive columns (password_hash etc.)
      const selectArgs = (qb.addSelect as jest.Mock).mock.calls.flat(2).join(',');
      expect(selectArgs).not.toContain('password');
    });

    it('throws 404 when the task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);
      await expect(service.findDelegations('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('start', () => {
    it('should start an accepted task', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ACCEPTED,
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
      completion_photo_urls: ['https://example.com/photo.jpg'],
      description: 'Done',
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
        completion_photo_urls: ['https://example.com/photo.jpg'],
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

  describe('cascadePruningRequestStatus (May 12)', () => {
    it('guards terminal statuses (UPDATE skips done/rejected/cancelled rows)', async () => {
      // Confidence in the SQL guard: the WHERE clause is the only thing
      // standing between a stray task completion and a wrong status flip
      // on a rejected/cancelled request. This test asserts the exact
      // shape of the SQL so a refactor can't quietly drop the guard.
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      taskRepository.save.mockResolvedValue({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
      } as Task);

      const queryMock = taskRepository.manager.query as jest.Mock;
      queryMock.mockResolvedValueOnce([]); // empty = no row matched the guard

      await service.complete('task-uuid', 'user-uuid', {
        completion_photo_urls: ['https://example.com/photo.jpg'],
        description: 'Done',
      });

      const cascadeCall = queryMock.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE pruning_requests'),
      );
      expect(cascadeCall).toBeDefined();
      const sql = cascadeCall![0] as string;
      expect(sql).toMatch(/status NOT IN \('done', 'rejected', 'cancelled'\)/);
      // Submitter push must NOT fire when the UPDATE touched 0 rows.
      expect(notificationsService.sendToUser).not.toHaveBeenCalled();
    });

    it('fires UPDATE pruning_requests when start() runs', async () => {
      const acceptedTask = {
        ...mockTask,
        status: TaskStatus.ACCEPTED,
        assigned_to: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(acceptedTask as Task);
      taskRepository.save.mockResolvedValue({
        ...acceptedTask,
        status: TaskStatus.IN_PROGRESS,
      } as Task);

      const queryMock = taskRepository.manager.query as jest.Mock;
      queryMock.mockResolvedValueOnce([
        { id: 'req-uuid', submitted_by: 'kec-uuid', reference_code: 'PR-1234' },
      ]);

      await service.start('task-uuid', 'user-uuid');

      const cascadeCall = queryMock.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE pruning_requests'),
      );
      expect(cascadeCall).toBeDefined();
      expect(cascadeCall![1]).toEqual(['in_progress', 'task-uuid']);
    });

    it('fires UPDATE pruning_requests with status=done when complete() runs', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      taskRepository.save.mockResolvedValue({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
      } as Task);

      const queryMock = taskRepository.manager.query as jest.Mock;
      queryMock.mockResolvedValueOnce([
        { id: 'req-uuid', submitted_by: 'kec-uuid', reference_code: 'PR-1234' },
      ]);

      await service.complete('task-uuid', 'user-uuid', {
        completion_photo_urls: ['https://example.com/photo.jpg'],
        description: 'Done',
      });

      const cascadeCall = queryMock.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE pruning_requests'),
      );
      expect(cascadeCall).toBeDefined();
      expect(cascadeCall![1]).toEqual(['done', 'task-uuid']);
    });

    it('does not abort task lifecycle when cascade UPDATE throws', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      taskRepository.save.mockResolvedValue({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
      } as Task);

      const queryMock = taskRepository.manager.query as jest.Mock;
      queryMock.mockRejectedValueOnce(new Error('DB unreachable'));

      // Cascade failure must not surface as a failed task.complete().
      await expect(
        service.complete('task-uuid', 'user-uuid', {
          completion_photo_urls: ['https://example.com/photo.jpg'],
          description: 'Done',
        }),
      ).resolves.toBeDefined();
    });

    it('no-ops cleanly when the task has no linked request (UPDATE returns 0 rows)', async () => {
      const acceptedTask = {
        ...mockTask,
        status: TaskStatus.ACCEPTED,
        assigned_to: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(acceptedTask as Task);
      taskRepository.save.mockResolvedValue({
        ...acceptedTask,
        status: TaskStatus.IN_PROGRESS,
      } as Task);

      // Default mock returns [] — empty result, no submitter to push to.
      await expect(service.start('task-uuid', 'user-uuid')).resolves.toBeDefined();
      // sendToUser must NOT fire when there's no linked request.
      expect(notificationsService.sendToUser).not.toHaveBeenCalled();
    });

    it('pushes notification to submitter when cascade hits a linked request', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      taskRepository.save.mockResolvedValue({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
      } as Task);

      const queryMock = taskRepository.manager.query as jest.Mock;
      queryMock.mockResolvedValueOnce([
        { id: 'req-uuid', submitted_by: 'kec-uuid', reference_code: 'PR-1234' },
      ]);

      await service.complete('task-uuid', 'user-uuid', {
        completion_photo_urls: ['https://example.com/photo.jpg'],
        description: 'Done',
      });

      expect(notificationsService.sendToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'kec-uuid',
          title: 'Permohonan Perantingan Selesai',
          data: expect.objectContaining({ pruning_request_id: 'req-uuid' }),
        }),
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
    function mockQueryBuilder(rows: { status: string; count: string }[]) {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rows),
      };
      taskRepository.createQueryBuilder = jest.fn().mockReturnValue(qb);
      return qb;
    }

    it('should return task statistics for an area', async () => {
      mockQueryBuilder([
        { status: TaskStatus.PENDING, count: '2' },
        { status: TaskStatus.ASSIGNED, count: '1' },
        { status: TaskStatus.IN_PROGRESS, count: '1' },
        { status: TaskStatus.COMPLETED, count: '1' },
      ]);

      const result = await service.getAreaTaskStats('area-uuid');

      expect(result).toEqual({
        total: 5,
        pending: 2,
        assigned: 1,
        accepted: 0,
        declined: 0,
        inProgress: 1,
        completed: 1,
        verified: 0,
        revisionNeeded: 0,
      });
    });

    it('should count multiple in_progress tasks', async () => {
      mockQueryBuilder([{ status: TaskStatus.IN_PROGRESS, count: '2' }]);

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
        service.complete('task-uuid', 'user-uuid', {
          completion_photo_urls: ['https://example.com/photo.jpg'],
          description: 'Done',
        } as CompleteTaskDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should complete task with photo URL', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };
      const completeDto: CompleteTaskDto = {
        description: 'Done',
        completion_photo_urls: ['https://example.com/photo.jpg'],
      };

      taskRepository.findOne.mockResolvedValueOnce(inProgressTask as Task).mockResolvedValueOnce({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        completion_photo_urls: completeDto.completion_photo_urls,
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
    it('should return paginated tasks where user is tagged', async () => {
      const result = await service.findTaggedTasks('user-uuid');

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'task.tags',
        'tag',
        'tag.user_id = :userId',
        { userId: 'user-uuid' },
      );
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(result.data).toEqual([mockTask]);
      expect(result.meta.total).toBe(1);
    });

    it('should use custom sort and pagination when filters provided', async () => {
      const filters = { sort_by: 'deadline', sort_dir: 'asc', page: 1, limit: 10 };
      const result = await service.findTaggedTasks('user-uuid', filters);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.deadline', 'ASC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.meta.limit).toBe(10);
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

    it('should skip silently if user already tagged', async () => {
      const task = { ...mockTask, id: 'task-uuid', created_by: 'user-uuid' };
      const existingTag = { task_id: 'task-uuid', user_id: 'tagged-uuid' };

      taskRepository.findOne.mockResolvedValue(task as Task);
      taskTagRepository.findOne.mockResolvedValue(existingTag as any);

      const result = await service.addTag('task-uuid', 'user-uuid', 'tagged-uuid');
      expect(result).toEqual(task);
    });
  });

  describe('removeTag', () => {
    it('should remove a tag from a task when caller is creator', async () => {
      const task = { ...mockTask, id: 'task-uuid', created_by: 'user-uuid' };
      const mockTag = { task_id: 'task-uuid', user_id: 'tagged-uuid' };
      taskRepository.findOne.mockResolvedValue(task as Task);
      taskTagRepository.findOne.mockResolvedValue(mockTag as any);
      taskTagRepository.remove.mockResolvedValue(mockTag as any);

      await service.removeTag('task-uuid', 'tagged-uuid', 'user-uuid');

      expect(taskTagRepository.remove).toHaveBeenCalledWith(mockTag);
    });

    it('should throw NotFoundException if tag not found', async () => {
      const task = { ...mockTask, id: 'task-uuid', created_by: 'user-uuid' };
      taskRepository.findOne.mockResolvedValue(task as Task);
      taskTagRepository.findOne.mockResolvedValue(null);

      await expect(service.removeTag('task-uuid', 'nonexistent-uuid', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTags assignee path (May 12)', () => {
    it('allows the current assignee to tag (not just the creator)', async () => {
      const task = {
        ...mockTask,
        id: 'task-uuid',
        created_by: 'creator-uuid',
        assigned_to: 'assignee-uuid',
        status: TaskStatus.IN_PROGRESS,
      };
      const tagged = { ...mockUser, id: 'tagged-uuid' };

      taskRepository.findOne.mockResolvedValue(task as Task);
      taskTagRepository.findOne.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue(tagged as User);
      taskTagRepository.save.mockResolvedValue({} as any);

      await service.addTags('task-uuid', 'assignee-uuid', ['tagged-uuid']);

      expect(taskTagRepository.save).toHaveBeenCalled();
    });

    it('rejects callers who are neither creator nor assignee', async () => {
      const task = {
        ...mockTask,
        created_by: 'creator-uuid',
        assigned_to: 'assignee-uuid',
        status: TaskStatus.IN_PROGRESS,
      };
      taskRepository.findOne.mockResolvedValue(task as Task);

      await expect(service.addTags('task-uuid', 'random-uuid', ['tagged-uuid'])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each([TaskStatus.COMPLETED, TaskStatus.VERIFIED, TaskStatus.DECLINED])(
      'blocks tag changes when task is sealed (%s)',
      async (sealedStatus) => {
        const task = {
          ...mockTask,
          created_by: 'creator-uuid',
          assigned_to: 'assignee-uuid',
          status: sealedStatus,
        };
        taskRepository.findOne.mockResolvedValue(task as Task);

        await expect(service.addTags('task-uuid', 'creator-uuid', ['tagged-uuid'])).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it('blocks removeTag with same sealed/permission gates', async () => {
      const sealedTask = {
        ...mockTask,
        created_by: 'creator-uuid',
        assigned_to: 'assignee-uuid',
        status: TaskStatus.COMPLETED,
      };
      taskRepository.findOne.mockResolvedValue(sealedTask as Task);

      await expect(service.removeTag('task-uuid', 'tagged-uuid', 'creator-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('removeTag rejects non-creator non-assignee callers', async () => {
      const task = {
        ...mockTask,
        created_by: 'creator-uuid',
        assigned_to: 'assignee-uuid',
        status: TaskStatus.IN_PROGRESS,
      };
      taskRepository.findOne.mockResolvedValue(task as Task);

      await expect(service.removeTag('task-uuid', 'tagged-uuid', 'random-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('acceptTask', () => {
    it('should accept an assigned task and set accepted_at', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };
      const acceptedTask = {
        ...assignedTask,
        status: TaskStatus.ACCEPTED,
        accepted_at: new Date(),
      };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce(acceptedTask as Task);
      taskRepository.save.mockResolvedValue(acceptedTask as Task);

      const result = await service.acceptTask('task-uuid', 'user-uuid');

      expect(taskRepository.save).toHaveBeenCalled();
      const savedArg = taskRepository.save.mock.calls[0][0] as Partial<Task>;
      expect(savedArg.status).toBe(TaskStatus.ACCEPTED);
      expect(savedArg.accepted_at).toBeInstanceOf(Date);
      expect(result.status).toBe(TaskStatus.ACCEPTED);
    });

    it('should throw ForbiddenException when non-assignee tries to accept', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'other-user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.acceptTask('task-uuid', 'user-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when task is not in ASSIGNED status', async () => {
      const pendingTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(pendingTask as Task);

      await expect(service.acceptTask('task-uuid', 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when task is in ACCEPTED status', async () => {
      const alreadyAcceptedTask = {
        ...mockTask,
        status: TaskStatus.ACCEPTED,
        assigned_to: 'user-uuid',
        accepted_at: new Date(),
      };

      taskRepository.findOne.mockResolvedValue(alreadyAcceptedTask as Task);

      await expect(service.acceptTask('task-uuid', 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('declineTask', () => {
    it('should decline an assigned task and set declined_at and decline_reason', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'user-uuid',
      };
      const declinedTask = {
        ...assignedTask,
        status: TaskStatus.DECLINED,
        declined_at: new Date(),
        decline_reason: 'Cannot complete due to equipment shortage',
      };

      taskRepository.findOne
        .mockResolvedValueOnce(assignedTask as Task)
        .mockResolvedValueOnce(declinedTask as Task);
      taskRepository.save.mockResolvedValue(declinedTask as Task);

      const result = await service.declineTask(
        'task-uuid',
        'user-uuid',
        'Cannot complete due to equipment shortage',
      );

      expect(taskRepository.save).toHaveBeenCalled();
      const savedArg = taskRepository.save.mock.calls[0][0] as Partial<Task>;
      expect(savedArg.status).toBe(TaskStatus.DECLINED);
      expect(savedArg.declined_at).toBeInstanceOf(Date);
      expect(savedArg.decline_reason).toBe('Cannot complete due to equipment shortage');
      expect(result.status).toBe(TaskStatus.DECLINED);
    });

    it('should throw ForbiddenException when non-assignee tries to decline', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to: 'other-user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.declineTask('task-uuid', 'user-uuid', 'Some reason')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when task is not in ASSIGNED status', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(service.declineTask('task-uuid', 'user-uuid', 'Some reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when task is in COMPLETED status', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'user-uuid',
      };

      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(service.declineTask('task-uuid', 'user-uuid', 'Too late')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyTask', () => {
    const mockAssignedSatgas: Partial<User> = {
      id: 'satgas-uuid',
      role: UserRole.SATGAS,
      area_id: 'area-uuid',
      is_active: true,
    };

    const mockKorlapVerifier: Partial<User> = {
      id: 'korlap-uuid',
      role: UserRole.KORLAP,
      area_id: 'area-uuid',
      is_active: true,
    };

    const mockKepalaRayonVerifier: Partial<User> = {
      id: 'kr-uuid',
      role: UserRole.KEPALA_RAYON,
      rayon_id: 'rayon-uuid',
      is_active: true,
    };

    const mockTopManagementVerifier: Partial<User> = {
      id: 'tm-uuid',
      role: UserRole.TOP_MANAGEMENT,
      is_active: true,
    };

    const mockAssignedKorlap: Partial<User> = {
      id: 'korlap-assignee-uuid',
      role: UserRole.KORLAP,
      area_id: 'area-uuid',
      is_active: true,
    };

    const mockAssignedKepalaRayon: Partial<User> = {
      id: 'kr-assignee-uuid',
      role: UserRole.KEPALA_RAYON,
      rayon_id: 'rayon-uuid',
      is_active: true,
    };

    it('should allow korlap to verify satgas task in same area', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'satgas-uuid',
      };
      const verifiedTask = {
        ...completedTask,
        status: TaskStatus.VERIFIED,
        verified_by: 'korlap-uuid',
        verified_at: new Date(),
      };

      taskRepository.findOne
        .mockResolvedValueOnce(completedTask as Task)
        .mockResolvedValueOnce(verifiedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockKorlapVerifier as User)
        .mockResolvedValueOnce(mockAssignedSatgas as User);
      taskRepository.save.mockResolvedValue(verifiedTask as Task);

      const result = await service.verifyTask('task-uuid', 'korlap-uuid');

      expect(taskRepository.save).toHaveBeenCalled();
      const savedArg = taskRepository.save.mock.calls[0][0] as Partial<Task>;
      expect(savedArg.status).toBe(TaskStatus.VERIFIED);
      expect(savedArg.verified_by).toBe('korlap-uuid');
      expect(savedArg.verified_at).toBeInstanceOf(Date);
      expect(result.status).toBe(TaskStatus.VERIFIED);
    });

    it('should allow kepala_rayon to verify korlap task in same rayon', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'korlap-assignee-uuid',
      };
      const verifiedTask = {
        ...completedTask,
        status: TaskStatus.VERIFIED,
        verified_by: 'kr-uuid',
        verified_at: new Date(),
      };

      taskRepository.findOne
        .mockResolvedValueOnce(completedTask as Task)
        .mockResolvedValueOnce(verifiedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockKepalaRayonVerifier as User)
        .mockResolvedValueOnce(mockAssignedKorlap as User);
      // kepala_rayon scope check: areasService.findOne returns area with matching rayon_id
      areasService.findOne.mockResolvedValue({ id: 'area-uuid', rayon_id: 'rayon-uuid' } as any);
      taskRepository.save.mockResolvedValue(verifiedTask as Task);

      const result = await service.verifyTask('task-uuid', 'kr-uuid');

      expect(areasService.findOne).toHaveBeenCalledWith('area-uuid');
      expect(taskRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(TaskStatus.VERIFIED);
    });

    it('should allow top_management to verify kepala_rayon task without scope restriction', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'kr-assignee-uuid',
      };
      const verifiedTask = {
        ...completedTask,
        status: TaskStatus.VERIFIED,
        verified_by: 'tm-uuid',
        verified_at: new Date(),
      };

      taskRepository.findOne
        .mockResolvedValueOnce(completedTask as Task)
        .mockResolvedValueOnce(verifiedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockTopManagementVerifier as User)
        .mockResolvedValueOnce(mockAssignedKepalaRayon as User);
      taskRepository.save.mockResolvedValue(verifiedTask as Task);

      const result = await service.verifyTask('task-uuid', 'tm-uuid');

      // top_management has no scope check so areasService should not be called
      expect(areasService.findOne).not.toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(TaskStatus.VERIFIED);
    });

    it('should throw BadRequestException when task is not COMPLETED', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to: 'satgas-uuid',
      };

      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(service.verifyTask('task-uuid', 'korlap-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when korlap tries to verify another korlap', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'korlap-assignee-uuid',
      };

      taskRepository.findOne.mockResolvedValue(completedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockKorlapVerifier as User)
        .mockResolvedValueOnce(mockAssignedKorlap as User);

      await expect(service.verifyTask('task-uuid', 'korlap-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when korlap verifies satgas in different area', async () => {
      const differentAreaSatgas: Partial<User> = {
        id: 'satgas-other-area-uuid',
        role: UserRole.SATGAS,
        area_id: 'different-area-uuid',
        is_active: true,
      };
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'satgas-other-area-uuid',
      };

      taskRepository.findOne.mockResolvedValue(completedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockKorlapVerifier as User)
        .mockResolvedValueOnce(differentAreaSatgas as User);

      await expect(service.verifyTask('task-uuid', 'korlap-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('requestRevision', () => {
    const mockAssignedSatgas: Partial<User> = {
      id: 'satgas-uuid',
      role: UserRole.SATGAS,
      area_id: 'area-uuid',
      is_active: true,
    };

    const mockKorlapVerifier: Partial<User> = {
      id: 'korlap-uuid',
      role: UserRole.KORLAP,
      area_id: 'area-uuid',
      is_active: true,
    };

    const mockKorlapAssignee: Partial<User> = {
      id: 'korlap-assignee-uuid',
      role: UserRole.KORLAP,
      area_id: 'area-uuid',
      is_active: true,
    };

    it('should request revision on a completed task and set revision_reason', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'satgas-uuid',
      };
      const revisionTask = {
        ...completedTask,
        status: TaskStatus.REVISION_NEEDED,
        revision_reason: 'Photo evidence is unclear',
      };

      taskRepository.findOne
        .mockResolvedValueOnce(completedTask as Task)
        .mockResolvedValueOnce(revisionTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockKorlapVerifier as User)
        .mockResolvedValueOnce(mockAssignedSatgas as User);
      taskRepository.save.mockResolvedValue(revisionTask as Task);

      const result = await service.requestRevision(
        'task-uuid',
        'korlap-uuid',
        'Photo evidence is unclear',
      );

      expect(taskRepository.save).toHaveBeenCalled();
      const savedArg = taskRepository.save.mock.calls[0][0] as Partial<Task>;
      expect(savedArg.status).toBe(TaskStatus.REVISION_NEEDED);
      expect(savedArg.revision_reason).toBe('Photo evidence is unclear');
      expect(result.status).toBe(TaskStatus.REVISION_NEEDED);
    });

    it('should throw BadRequestException when task is not COMPLETED', async () => {
      const verifiedTask = {
        ...mockTask,
        status: TaskStatus.VERIFIED,
        assigned_to: 'satgas-uuid',
      };

      taskRepository.findOne.mockResolvedValue(verifiedTask as Task);

      await expect(
        service.requestRevision('task-uuid', 'korlap-uuid', 'Needs more detail'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when task is REVISION_NEEDED', async () => {
      const revisionTask = {
        ...mockTask,
        status: TaskStatus.REVISION_NEEDED,
        assigned_to: 'satgas-uuid',
      };

      taskRepository.findOne.mockResolvedValue(revisionTask as Task);

      await expect(
        service.requestRevision('task-uuid', 'korlap-uuid', 'Still needs improvement'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when requester has wrong hierarchy', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to: 'korlap-assignee-uuid',
      };

      // korlap cannot request revision on another korlap's task
      taskRepository.findOne.mockResolvedValue(completedTask as Task);
      usersService.findOne
        .mockResolvedValueOnce(mockKorlapVerifier as User)
        .mockResolvedValueOnce(mockKorlapAssignee as User);

      await expect(
        service.requestRevision('task-uuid', 'korlap-uuid', 'Needs rework'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create — tagged users + audit error path', () => {
    const baseDto = {
      title: 'Tagged task',
      description: 'd',
      assigned_to: null,
      priority: TaskPriority.MEDIUM,
      tagged_user_ids: ['tagged-1', 'tagged-2'],
    };

    it('should create tag rows for tagged_user_ids', async () => {
      const creator = { id: 'creator-uuid', role: UserRole.KORLAP, area_id: 'area-uuid' } as User;
      usersService.findOne.mockResolvedValueOnce(creator);
      taskRepository.create.mockReturnValue({ id: 'task-uuid', assigned_to: null } as any);
      taskRepository.save.mockResolvedValue({ id: 'task-uuid', assigned_to: null } as any);
      taskTagRepository.create.mockImplementation((row: any) => row);
      taskTagRepository.save.mockResolvedValue([] as any);
      taskRepository.findOne.mockResolvedValue({ id: 'task-uuid' } as Task);

      await service.create(baseDto as any, 'creator-uuid');

      expect(taskTagRepository.create).toHaveBeenCalledWith({
        task_id: 'task-uuid',
        user_id: 'tagged-1',
      });
      expect(taskTagRepository.create).toHaveBeenCalledWith({
        task_id: 'task-uuid',
        user_id: 'tagged-2',
      });
      expect(taskTagRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when task type validation fails', async () => {
      const creator = { id: 'creator-uuid', role: UserRole.KORLAP, area_id: 'area-uuid' } as User;
      usersService.findOne.mockResolvedValueOnce(creator);
      const registry: any = (service as any).taskTypeRegistry;
      registry.validate.mockImplementationOnce(() => {
        throw new Error('invalid custom_fields');
      });

      await expect(
        service.create(
          { ...baseDto, task_type: 'plant_pruning', custom_fields: {} } as any,
          'creator-uuid',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('partialComplete', () => {
    const partialTask = {
      ...mockTask,
      id: 'task-uuid',
      status: TaskStatus.IN_PROGRESS,
      targetPlantCount: 10,
      completedPlantCount: 3,
      customFields: {},
    };

    it('should throw NotFoundException when task is missing', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.partialComplete('task-uuid', { completed_count: 1 }, mockUser as User),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-field-worker non-manager role', async () => {
      taskRepository.findOne.mockResolvedValue(partialTask as Task);

      await expect(
        service.partialComplete('task-uuid', { completed_count: 1 }, {
          id: 'u',
          role: UserRole.TOP_MANAGEMENT,
        } as User),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should record progress without completing when below target', async () => {
      taskRepository.findOne.mockResolvedValue({ ...partialTask } as Task);
      taskRepository.save.mockImplementation(async (t) => t as Task);

      const result = await service.partialComplete(
        'task-uuid',
        { completed_count: 4 },
        mockUser as User,
      );

      expect(result.task.completedPlantCount).toBe(7);
      expect(result.task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.child_task_id).toBeUndefined();
    });

    it('should mark task complete when reaching target', async () => {
      taskRepository.findOne.mockResolvedValue({ ...partialTask } as Task);
      taskRepository.save.mockImplementation(async (t) => t as Task);

      const result = await service.partialComplete(
        'task-uuid',
        { completed_count: 7 },
        mockUser as User,
      );

      expect(result.task.status).toBe(TaskStatus.COMPLETED);
      expect(result.task.completed_at).toBeInstanceOf(Date);
    });

    it('should spawn child task when resume_tomorrow is requested mid-progress', async () => {
      taskRepository.findOne.mockResolvedValue({ ...partialTask } as Task);
      taskRepository.create.mockImplementation((row: any) => ({ ...row, id: 'child-uuid' }));
      taskRepository.save.mockImplementation(async (t: any) => ({
        ...t,
        id: t.id ?? 'child-uuid',
      }));

      const result = await service.partialComplete(
        'task-uuid',
        { completed_count: 2, resume_tomorrow: true },
        mockUser as User,
      );

      expect(result.child_task_id).toBe('child-uuid');
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentTaskId: 'task-uuid', targetPlantCount: 5 }),
      );
    });

    it('should handle tasks without targetPlantCount (open-ended)', async () => {
      const openEnded = { ...partialTask, targetPlantCount: null, completedPlantCount: 0 };
      taskRepository.findOne.mockResolvedValue(openEnded as Task);
      taskRepository.save.mockImplementation(async (t) => t as Task);

      const result = await service.partialComplete(
        'task-uuid',
        { completed_count: 5 },
        mockUser as User,
      );

      // resume_tomorrow not set → considered fully done
      expect(result.task.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('resume', () => {
    it('should throw NotFoundException when task is missing', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.resume('task-uuid', mockUser as User)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create a child task with remaining plant count', async () => {
      const parent = {
        ...mockTask,
        targetPlantCount: 10,
        completedPlantCount: 4,
        customFields: { foo: 'bar' },
      } as Task;
      taskRepository.findOne.mockResolvedValue(parent);
      taskRepository.create.mockImplementation((row: any) => ({ ...row, id: 'child-uuid' }));
      taskRepository.save.mockImplementation(async (t: any) => ({ ...t, id: 'child-uuid' }));

      const result = await service.resume('task-uuid', mockUser as User);

      expect(result.id).toBe('child-uuid');
      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentTaskId: 'task-uuid',
          targetPlantCount: 6,
          title: expect.stringContaining('[Lanjutan]'),
        }),
      );
    });

    it('should create child task without target count when parent has none', async () => {
      taskRepository.findOne.mockResolvedValue({
        ...mockTask,
        targetPlantCount: null,
        completedPlantCount: 0,
      } as Task);
      taskRepository.create.mockImplementation((row: any) => ({ ...row, id: 'c' }));
      taskRepository.save.mockImplementation(async (t: any) => t);

      await service.resume('task-uuid', mockUser as User);

      expect(taskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetPlantCount: null }),
      );
    });
  });

  describe('getLineage', () => {
    it('should throw NotFoundException when task missing', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.getLineage('task-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should return task with parent and children', async () => {
      const target = { ...mockTask, parentTaskId: 'parent-uuid' } as Task;
      const parent = { ...mockTask, id: 'parent-uuid', title: 'Parent' } as Task;
      const children = [{ ...mockTask, id: 'child-1' } as Task];

      taskRepository.findOne
        .mockResolvedValueOnce(target) // initial fetch
        .mockResolvedValueOnce(parent); // parent fetch
      taskRepository.find.mockResolvedValue(children);

      const result = await service.getLineage('task-uuid');

      expect(result.task).toEqual(target);
      expect(result.parent).toEqual(parent);
      expect(result.children).toEqual(children);
    });

    it('should return undefined parent when task has no parentTaskId', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);
      taskRepository.find.mockResolvedValue([]);

      const result = await service.getLineage('task-uuid');

      expect(result.parent).toBeUndefined();
      expect(result.children).toEqual([]);
    });
  });

  describe('checkTaskAccess branches', () => {
    it('should deny satgas/linmas access when not assigned/created/tagged', async () => {
      const task = {
        ...mockTask,
        assigned_to: 'someone-else',
        created_by: 'someone-else',
        tags: [],
      } as Task;
      taskRepository.findOne.mockResolvedValue(task);

      await expect(
        service.findOne('task-uuid', { id: 'me', role: UserRole.SATGAS } as User),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow satgas access when tagged', async () => {
      const task = {
        ...mockTask,
        assigned_to: 'someone-else',
        created_by: 'someone-else',
        tags: [{ user_id: 'me' } as TaskTag],
      } as Task;
      taskRepository.findOne.mockResolvedValue(task);

      const result = await service.findOne('task-uuid', {
        id: 'me',
        role: UserRole.SATGAS,
      } as User);
      expect(result).toBeDefined();
    });

    it('should deny korlap access when task is outside their area', async () => {
      const task = {
        ...mockTask,
        area_id: 'other-area',
        assigned_to: 'someone-else',
        created_by: 'someone-else',
        tags: [],
      } as Task;
      taskRepository.findOne.mockResolvedValue(task);

      await expect(
        service.findOne('task-uuid', {
          id: 'me',
          role: UserRole.KORLAP,
          area_id: 'my-area',
        } as User),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny kepala_rayon access when task outside their rayon', async () => {
      const task = {
        ...mockTask,
        rayon_id: 'other-rayon',
        area: { rayon_id: 'other-rayon' },
        assigned_to: 'someone-else',
        created_by: 'someone-else',
      } as unknown as Task;
      taskRepository.findOne.mockResolvedValue(task);

      await expect(
        service.findOne('task-uuid', {
          id: 'me',
          role: UserRole.KEPALA_RAYON,
          rayon_id: 'my-rayon',
        } as User),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin_data access when task in their rayon', async () => {
      const task = {
        ...mockTask,
        rayon_id: 'my-rayon',
      } as Task;
      taskRepository.findOne.mockResolvedValue(task);

      const result = await service.findOne('task-uuid', {
        id: 'me',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'my-rayon',
      } as User);
      expect(result).toBeDefined();
    });

    it('should allow staff_kecamatan access when they submitted the linked request', async () => {
      const task = { ...mockTask } as Task;
      taskRepository.findOne.mockResolvedValue(task);
      (taskRepository as any).manager.query.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await service.findOne('task-uuid', {
        id: 'staff-1',
        role: UserRole.STAFF_KECAMATAN,
      } as User);
      expect(result).toBeDefined();
    });

    it('should deny staff_kecamatan access when no linked submitted request', async () => {
      const task = { ...mockTask } as Task;
      taskRepository.findOne.mockResolvedValue(task);
      (taskRepository as any).manager.query.mockResolvedValueOnce([]);

      await expect(
        service.findOne('task-uuid', {
          id: 'staff-1',
          role: UserRole.STAFF_KECAMATAN,
        } as User),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
