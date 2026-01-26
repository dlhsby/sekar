import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WorkerSchedulesService } from './worker-schedules.service';
import { WorkerSchedule } from './entities/worker-schedule.entity';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { ShiftDefinitionsService } from '../shift-definitions/shift-definitions.service';
import { CreateWorkerScheduleDto } from './dto/create-worker-schedule.dto';
import { UpdateWorkerScheduleDto } from './dto/update-worker-schedule.dto';
import { UserRole } from '../users/entities/user.entity';

describe('WorkerSchedulesService', () => {
  let module: TestingModule;
  let service: WorkerSchedulesService;
  let usersService: UsersService;
  let areasService: AreasService;
  let shiftDefinitionsService: ShiftDefinitionsService;

  const mockWorkerUser = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    username: 'worker1',
    full_name: 'Test Worker',
    role: UserRole.WORKER,
    is_active: true,
  };

  const mockSupervisorUser = {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    username: 'supervisor1',
    full_name: 'Test Supervisor',
    role: UserRole.SUPERVISOR,
    is_active: true,
  };

  const mockArea = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    is_active: true,
  };

  const mockShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Shift 1',
    code: 'SHIFT1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
  };

  const mockSchedule: WorkerSchedule = {
    id: '55555555-5555-5555-5555-555555555501',
    user_id: mockWorkerUser.id,
    area_id: mockArea.id,
    shift_definition_id: mockShiftDefinition.id,
    effective_date: new Date('2026-01-20'),
    end_date: undefined,
    created_by: mockSupervisorUser.id,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    user: mockWorkerUser as any,
    area: mockArea as any,
    shiftDefinition: mockShiftDefinition as any,
    creator: mockSupervisorUser as any,
  };

  const mockQueryBuilder = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };

  const mockScheduleRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockAreasService = {
    findOne: jest.fn(),
  };

  const mockShiftDefinitionsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        WorkerSchedulesService,
        {
          provide: getRepositoryToken(WorkerSchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
        {
          provide: ShiftDefinitionsService,
          useValue: mockShiftDefinitionsService,
        },
      ],
    }).compile();

    service = module.get<WorkerSchedulesService>(WorkerSchedulesService);
    usersService = module.get<UsersService>(UsersService);
    areasService = module.get<AreasService>(AreasService);
    shiftDefinitionsService = module.get<ShiftDefinitionsService>(ShiftDefinitionsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all schedules without filters', async () => {
      const schedules = [mockSchedule];
      mockQueryBuilder.getMany.mockResolvedValue(schedules);

      const result = await service.findAll();

      expect(result).toEqual(schedules);
      expect(mockScheduleRepository.createQueryBuilder).toHaveBeenCalledWith('schedule');
    });

    it('should filter by areaId', async () => {
      const schedules = [mockSchedule];
      mockQueryBuilder.getMany.mockResolvedValue(schedules);

      await service.findAll(mockArea.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.area_id = :areaId', {
        areaId: mockArea.id,
      });
    });

    it('should filter by userId', async () => {
      const schedules = [mockSchedule];
      mockQueryBuilder.getMany.mockResolvedValue(schedules);

      await service.findAll(undefined, mockWorkerUser.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.user_id = :userId', {
        userId: mockWorkerUser.id,
      });
    });

    it('should filter activeOnly schedules', async () => {
      const schedules = [mockSchedule];
      mockQueryBuilder.getMany.mockResolvedValue(schedules);

      await service.findAll(undefined, undefined, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should return empty array when no schedules exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a schedule by ID', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne(mockSchedule.id);

      expect(result).toEqual(mockSchedule);
      expect(mockScheduleRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSchedule.id },
        relations: ['user', 'area', 'shiftDefinition', 'creator'],
      });
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Schedule with ID non-existent-id not found',
      );
    });
  });

  describe('findCurrentByUserId', () => {
    it('should return current schedule for a user', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findCurrentByUserId(mockWorkerUser.id);

      expect(result).toEqual(mockSchedule);
    });

    it('should return null when user has no current schedule', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(null);

      const result = await service.findCurrentByUserId(mockWorkerUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findByAreaId', () => {
    it('should return schedules for an area', async () => {
      const schedules = [mockSchedule];
      mockQueryBuilder.getMany.mockResolvedValue(schedules);

      const result = await service.findByAreaId(mockArea.id);

      expect(result).toEqual(schedules);
    });
  });

  describe('findByUserId', () => {
    it('should return schedules for a user', async () => {
      const schedules = [mockSchedule];
      mockQueryBuilder.getMany.mockResolvedValue(schedules);

      const result = await service.findByUserId(mockWorkerUser.id);

      expect(result).toEqual(schedules);
    });
  });

  describe('create', () => {
    const createDto: CreateWorkerScheduleDto = {
      user_id: mockWorkerUser.id,
      area_id: mockArea.id,
      shift_definition_id: mockShiftDefinition.id,
      effective_date: '2026-01-20',
    };

    it('should successfully create a schedule', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorkerUser);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No overlap
      mockScheduleRepository.create.mockReturnValue(mockSchedule);
      mockScheduleRepository.save.mockResolvedValue(mockSchedule);

      const result = await service.create(createDto, mockSupervisorUser.id);

      expect(result).toEqual(mockSchedule);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(createDto.user_id);
      expect(mockAreasService.findOne).toHaveBeenCalledWith(createDto.area_id);
      expect(mockShiftDefinitionsService.findOne).toHaveBeenCalledWith(
        createDto.shift_definition_id,
      );
    });

    it('should throw BadRequestException for non-Worker/Linmas user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockSupervisorUser);

      await expect(service.create(createDto, mockSupervisorUser.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, mockSupervisorUser.id)).rejects.toThrow(
        'User must be a Worker or Linmas to be assigned to a schedule',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto, mockSupervisorUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if area not found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorkerUser);
      mockAreasService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto, mockSupervisorUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if shift definition not found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorkerUser);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto, mockSupervisorUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if end_date is before effective_date', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorkerUser);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);

      const invalidDto: CreateWorkerScheduleDto = {
        ...createDto,
        effective_date: '2026-02-01',
        end_date: '2026-01-01',
      };

      await expect(service.create(invalidDto, mockSupervisorUser.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, mockSupervisorUser.id)).rejects.toThrow(
        'End date cannot be before effective date',
      );
    });

    it('should throw ConflictException if schedule overlaps', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorkerUser);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);
      mockQueryBuilder.getOne.mockResolvedValue(mockSchedule); // Overlapping schedule exists

      await expect(service.create(createDto, mockSupervisorUser.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create schedule with Linmas user', async () => {
      const linmasUser = { ...mockWorkerUser, role: UserRole.LINMAS };
      mockUsersService.findOne.mockResolvedValue(linmasUser);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockScheduleRepository.create.mockReturnValue(mockSchedule);
      mockScheduleRepository.save.mockResolvedValue(mockSchedule);

      const result = await service.create(createDto, mockSupervisorUser.id);

      expect(result).toEqual(mockSchedule);
    });
  });

  describe('update', () => {
    const updateDto: UpdateWorkerScheduleDto = {
      area_id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
    };

    it('should update a schedule', async () => {
      const newArea = { ...mockArea, id: updateDto.area_id };
      mockScheduleRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockAreasService.findOne.mockResolvedValue(newArea);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No overlap
      const updatedSchedule = { ...mockSchedule, area_id: updateDto.area_id };
      mockScheduleRepository.save.mockResolvedValue(updatedSchedule);

      const result = await service.update(mockSchedule.id, updateDto);

      expect(result.area_id).toBe(updateDto.area_id);
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if new area not found', async () => {
      mockScheduleRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockAreasService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.update(mockSchedule.id, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if updated end_date is before effective_date', async () => {
      mockScheduleRepository.findOne.mockResolvedValue({ ...mockSchedule });

      const invalidUpdate: UpdateWorkerScheduleDto = {
        end_date: '2025-01-01', // Before effective_date of 2026-01-20
      };

      await expect(service.update(mockSchedule.id, invalidUpdate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if update causes overlap', async () => {
      mockScheduleRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockQueryBuilder.getOne.mockResolvedValue({ ...mockSchedule, id: 'other-id' });

      const dateUpdate: UpdateWorkerScheduleDto = {
        effective_date: '2026-02-01',
      };

      await expect(service.update(mockSchedule.id, dateUpdate)).rejects.toThrow(ConflictException);
    });

    it('should allow setting end_date to null (ongoing)', async () => {
      const scheduleWithEndDate = {
        ...mockSchedule,
        end_date: new Date('2026-12-31'),
      };
      mockScheduleRepository.findOne.mockResolvedValue({ ...scheduleWithEndDate });
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockScheduleRepository.save.mockResolvedValue({
        ...scheduleWithEndDate,
        end_date: undefined,
      });

      const updateWithNull: UpdateWorkerScheduleDto = {
        end_date: null,
      };

      const result = await service.update(mockSchedule.id, updateWithNull);

      expect(result.end_date).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should soft delete a schedule', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);
      mockScheduleRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockSchedule.id);

      expect(mockScheduleRepository.softDelete).toHaveBeenCalledWith(mockSchedule.id);
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
