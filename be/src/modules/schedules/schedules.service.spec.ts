import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull, Or, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Schedule } from './entities/schedule.entity';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { ShiftDefinitionsService } from '../shift-definitions/shift-definitions.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UserRole } from '../users/entities/user.entity';

describe('SchedulesService', () => {
  let module: TestingModule;
  let service: SchedulesService;
  let repository: jest.Mocked<Repository<Schedule>>;
  let usersService: jest.Mocked<UsersService>;
  let areasService: jest.Mocked<AreasService>;
  let shiftDefinitionsService: jest.Mocked<ShiftDefinitionsService>;

  const mockUser = {
    id: 'user-uuid-1a2b3c4d',
    username: 'worker1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
  };

  const mockLinmasUser = {
    id: 'user-uuid-2b3c4d5e',
    username: 'linmas1',
    role: UserRole.LINMAS,
    full_name: 'Linmas One',
    is_active: true,
  };

  const mockSupervisorUser = {
    id: 'user-uuid-3c4d5e6f',
    username: 'supervisor1',
    role: UserRole.KORLAP,
    full_name: 'Supervisor One',
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid-a1b2c3d4',
    name: 'Taman Bungkul',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 150,
    is_active: true,
  };

  const mockShiftDefinition = {
    id: 'shift-def-uuid-1',
    name: 'Shift 1 (Morning)',
    start_time: '08:00',
    end_time: '16:00',
    is_active: true,
  };

  const mockSchedule: any = {
    id: 'schedule-uuid-1',
    user_id: mockUser.id,
    area_id: mockArea.id,
    shift_definition_id: mockShiftDefinition.id,
    effective_date: new Date('2026-01-20'),
    end_date: new Date('2026-12-31'),
    created_by: 'admin-uuid',
    user: mockUser,
    area: mockArea,
    shiftDefinition: mockShiftDefinition,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
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
        SchedulesService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockRepository,
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

    service = module.get<SchedulesService>(SchedulesService);
    repository = module.get(getRepositoryToken(Schedule)) as jest.Mocked<Repository<Schedule>>;
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    areasService = module.get(AreasService) as jest.Mocked<AreasService>;
    shiftDefinitionsService = module.get(ShiftDefinitionsService) as jest.Mocked<
      ShiftDefinitionsService
    >;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const mockQueryBuilder: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return all schedules without filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      const result = await service.findAll();

      expect(result).toEqual([mockSchedule]);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('schedule');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('schedule.user', 'user');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('schedule.area', 'area');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'schedule.shiftDefinition',
        'shiftDefinition',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('schedule.effective_date', 'DESC');
    });

    it('should filter schedules by area ID', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll(mockArea.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.area_id = :areaId', {
        areaId: mockArea.id,
      });
    });

    it('should filter schedules by user ID', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll(undefined, mockUser.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.user_id = :userId', {
        userId: mockUser.id,
      });
    });

    it('should filter schedules by activeOnly', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);
      const today = new Date().toISOString().split('T')[0];

      await service.findAll(undefined, undefined, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.effective_date <= :today', {
        today,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(schedule.end_date IS NULL OR schedule.end_date >= :today)',
        { today },
      );
    });

    it('should apply all filters together', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);
      const today = new Date().toISOString().split('T')[0];

      await service.findAll(mockArea.id, mockUser.id, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.area_id = :areaId', {
        areaId: mockArea.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.user_id = :userId', {
        userId: mockUser.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.effective_date <= :today', {
        today,
      });
    });

    it('should filter schedules by rayon for ADMIN_DATA user', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
      };
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll(undefined, undefined, false, adminDataUser as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', {
        rayonId: 'rayon-uuid-1',
      });
    });

    it('should filter schedules by rayon for KEPALA_RAYON user', async () => {
      const kepalaRayonUser = {
        id: 'kepala-rayon-uuid',
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'rayon-uuid-2',
      };
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll(undefined, undefined, false, kepalaRayonUser as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', {
        rayonId: 'rayon-uuid-2',
      });
    });

    it('should not filter by rayon for ADMIN_SYSTEM user', async () => {
      const adminSystemUser = {
        id: 'admin-system-uuid',
        role: UserRole.ADMIN_SYSTEM,
      };
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findAll(undefined, undefined, false, adminSystemUser as any);

      // Should not have rayon filter
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'area.rayon_id = :rayonId',
        expect.anything(),
      );
    });

    it('should return empty array for admin_data when no schedules in their rayon', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid-2',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'empty-rayon-uuid',
      };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(undefined, undefined, false, adminDataUser as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', {
        rayonId: 'empty-rayon-uuid',
      });
      expect(result).toHaveLength(0);
    });

    it('should return empty array for kepala_rayon when no schedules in their rayon', async () => {
      const kepalaRayonUser = {
        id: 'kepala-rayon-uuid-2',
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'empty-rayon-uuid-2',
      };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(undefined, undefined, false, kepalaRayonUser as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', {
        rayonId: 'empty-rayon-uuid-2',
      });
      expect(result).toHaveLength(0);
    });

    it('should properly scope admin_data to only their rayon schedules', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
      };

      const rayon1Schedules = [
        { ...mockSchedule, id: 'schedule-1', area: { rayon_id: 'rayon-uuid-1' } },
        { ...mockSchedule, id: 'schedule-2', area: { rayon_id: 'rayon-uuid-1' } },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(rayon1Schedules);

      const result = await service.findAll(undefined, undefined, false, adminDataUser as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', {
        rayonId: 'rayon-uuid-1',
      });
      expect(result).toHaveLength(2);
      expect(result.every((s: any) => s.area.rayon_id === 'rayon-uuid-1')).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return schedule by ID with all relations', async () => {
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne(mockSchedule.id);

      expect(result).toEqual(mockSchedule);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSchedule.id },
        relations: ['user', 'area', 'shiftDefinition', 'creator'],
      });
    });

    it('should throw NotFoundException if schedule not found', async () => {
      const nonExistentId = 'nonexistent-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(nonExistentId)).rejects.toThrow(
        `Schedule with ID ${nonExistentId} not found`,
      );
    });
  });

  describe('findCurrentByUserId', () => {
    it('should return current active schedule for user', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findCurrentByUserId(mockUser.id);

      expect(result).toEqual(mockSchedule);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          user_id: mockUser.id,
          effective_date: LessThanOrEqual(new Date(today)),
          end_date: Or(IsNull(), MoreThanOrEqual(new Date(today))),
        },
        relations: ['area', 'shiftDefinition'],
        order: { effective_date: 'DESC' },
      });
    });

    it('should return null if no current schedule exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findCurrentByUserId(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findByAreaId', () => {
    const mockQueryBuilder: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return all schedules for an area', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      const result = await service.findByAreaId(mockArea.id);

      expect(result).toEqual([mockSchedule]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.area_id = :areaId', {
        areaId: mockArea.id,
      });
    });

    it('should return only active schedules when activeOnly is true', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findByAreaId(mockArea.id, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.area_id = :areaId', {
        areaId: mockArea.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('effective_date'),
        expect.any(Object),
      );
    });
  });

  describe('findByUserId', () => {
    const mockQueryBuilder: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return all schedules for a user', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      const result = await service.findByUserId(mockUser.id);

      expect(result).toEqual([mockSchedule]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.user_id = :userId', {
        userId: mockUser.id,
      });
    });

    it('should return only active schedules when activeOnly is true', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockSchedule]);

      await service.findByUserId(mockUser.id, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.user_id = :userId', {
        userId: mockUser.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('effective_date'),
        expect.any(Object),
      );
    });
  });

  describe('create', () => {
    const createDto: CreateScheduleDto = {
      user_id: mockUser.id,
      area_id: mockArea.id,
      shift_definition_id: mockShiftDefinition.id,
      effective_date: '2026-01-20',
      end_date: '2026-12-31',
    };

    const mockQueryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should successfully create a schedule for a Worker', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No overlapping schedule
      mockRepository.create.mockReturnValue(mockSchedule);
      mockRepository.save.mockResolvedValue(mockSchedule);

      const result = await service.create(createDto, 'admin-uuid');

      expect(result).toEqual(mockSchedule);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(areasService.findOne).toHaveBeenCalledWith(mockArea.id);
      expect(shiftDefinitionsService.findOne).toHaveBeenCalledWith(mockShiftDefinition.id);
      expect(repository.create).toHaveBeenCalledWith({
        user_id: createDto.user_id,
        area_id: createDto.area_id,
        shift_definition_id: createDto.shift_definition_id,
        effective_date: new Date(createDto.effective_date),
        end_date: createDto.end_date ? new Date(createDto.end_date) : undefined,
        created_by: 'admin-uuid',
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should successfully create a schedule for a Linmas user', async () => {
      const linmasDto = { ...createDto, user_id: mockLinmasUser.id };
      mockUsersService.findOne.mockResolvedValue(mockLinmasUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSchedule);
      mockRepository.save.mockResolvedValue(mockSchedule);

      const result = await service.create(linmasDto, 'admin-uuid');

      expect(result).toEqual(mockSchedule);
      expect(usersService.findOne).toHaveBeenCalledWith(mockLinmasUser.id);
    });

    it('should create schedule with no end_date (ongoing)', async () => {
      const ongoingDto: CreateScheduleDto = {
        user_id: mockUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-01-20',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockSchedule, end_date: undefined });
      mockRepository.save.mockResolvedValue({ ...mockSchedule, end_date: undefined });

      const result = await service.create(ongoingDto, 'admin-uuid');

      expect(result.end_date).toBeUndefined();
      expect(repository.create).toHaveBeenCalledWith({
        user_id: ongoingDto.user_id,
        area_id: ongoingDto.area_id,
        shift_definition_id: ongoingDto.shift_definition_id,
        effective_date: new Date(ongoingDto.effective_date),
        end_date: undefined,
        created_by: 'admin-uuid',
      });
    });

    it('should throw BadRequestException if user is not Worker or Linmas', async () => {
      mockUsersService.findOne.mockResolvedValue(mockSupervisorUser as any);

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        'User must be a Worker or Linmas to be assigned to a schedule',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if area not found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockRejectedValue(new NotFoundException('Area not found'));

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if shift definition not found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockRejectedValue(
        new NotFoundException('Shift definition not found'),
      );

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if end_date is before effective_date', async () => {
      const invalidDto: CreateScheduleDto = {
        user_id: mockUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-12-31',
        end_date: '2026-01-01',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);

      await expect(service.create(invalidDto, 'admin-uuid')).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidDto, 'admin-uuid')).rejects.toThrow(
        'End date cannot be before effective date',
      );
    });

    it('should throw ConflictException if schedule overlaps with existing', async () => {
      const existingSchedule = { ...mockSchedule, id: 'existing-schedule-id' };
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);
      mockQueryBuilder.getOne.mockResolvedValue(existingSchedule);

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(ConflictException);
      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        `Schedule overlaps with existing schedule (ID: ${existingSchedule.id})`,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateScheduleDto = {
      area_id: 'new-area-id',
      effective_date: '2026-02-01',
      end_date: '2026-11-30',
    };

    const mockQueryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should successfully update a schedule', async () => {
      const existingSchedule = { ...mockSchedule };
      mockRepository.findOne.mockResolvedValue(existingSchedule);
      mockAreasService.findOne.mockResolvedValue({ id: 'new-area-id' } as any);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No overlapping schedule
      mockRepository.save.mockResolvedValue({
        ...existingSchedule,
        ...updateDto,
        effective_date: updateDto.effective_date ? new Date(updateDto.effective_date) : existingSchedule.effective_date,
        end_date: updateDto.end_date ? new Date(updateDto.end_date) : existingSchedule.end_date,
      });

      const result = await service.update(mockSchedule.id, updateDto);

      expect(result.area_id).toBe(updateDto.area_id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockSchedule.id },
        relations: ['user', 'area', 'shiftDefinition', 'creator'],
      });
      expect(areasService.findOne).toHaveBeenCalledWith(updateDto.area_id);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should update shift_definition_id if provided', async () => {
      const updateWithShift: UpdateScheduleDto = {
        shift_definition_id: 'new-shift-id',
      };

      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockShiftDefinitionsService.findOne.mockResolvedValue({ id: 'new-shift-id' } as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        ...mockSchedule,
        shift_definition_id: 'new-shift-id',
      });

      const result = await service.update(mockSchedule.id, updateWithShift);

      expect(result.shift_definition_id).toBe('new-shift-id');
      expect(shiftDefinitionsService.findOne).toHaveBeenCalledWith('new-shift-id');
    });

    it('should set end_date to null when explicitly set to null', async () => {
      const updateToOngoing: UpdateScheduleDto = {
        end_date: null,
      };

      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        ...mockSchedule,
        end_date: undefined,
      });

      const result = await service.update(mockSchedule.id, updateToOngoing);

      expect(result.end_date).toBeUndefined();
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if new area not found', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockAreasService.findOne.mockRejectedValue(new NotFoundException('Area not found'));

      await expect(service.update(mockSchedule.id, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if new shift definition not found', async () => {
      const updateWithShift: UpdateScheduleDto = {
        shift_definition_id: 'new-shift-id',
      };

      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockShiftDefinitionsService.findOne.mockRejectedValue(
        new NotFoundException('Shift definition not found'),
      );

      await expect(service.update(mockSchedule.id, updateWithShift)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if updated end_date is before effective_date', async () => {
      const invalidUpdate: UpdateScheduleDto = {
        effective_date: '2026-12-31',
        end_date: '2026-01-01',
      };

      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });

      await expect(service.update(mockSchedule.id, invalidUpdate)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(mockSchedule.id, invalidUpdate)).rejects.toThrow(
        'End date cannot be before effective date',
      );
    });

    it('should throw ConflictException if updated schedule overlaps with existing', async () => {
      const conflictUpdateDto: UpdateScheduleDto = {
        effective_date: '2026-01-25',
      };
      const overlappingSchedule = { ...mockSchedule, id: 'other-schedule-id' };
      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockQueryBuilder.getOne.mockResolvedValue(overlappingSchedule);

      await expect(service.update(mockSchedule.id, conflictUpdateDto)).rejects.toThrow(ConflictException);
      await expect(service.update(mockSchedule.id, conflictUpdateDto)).rejects.toThrow(
        `Schedule overlaps with existing schedule (ID: ${overlappingSchedule.id})`,
      );
    });

    it('should allow updating without any changes (empty DTO)', async () => {
      const emptyUpdate: UpdateScheduleDto = {};
      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({ ...mockSchedule });

      const result = await service.update(mockSchedule.id, emptyUpdate);

      expect(result).toEqual(mockSchedule);
    });
  });

  describe('remove', () => {
    it('should successfully soft delete a schedule', async () => {
      mockRepository.findOne.mockResolvedValue(mockSchedule);
      mockRepository.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.remove(mockSchedule.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockSchedule.id },
        relations: ['user', 'area', 'shiftDefinition', 'creator'],
      });
      expect(repository.softDelete).toHaveBeenCalledWith(mockSchedule.id);
    });

    it('should throw NotFoundException if schedule not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOverlappingSchedule (integration)', () => {
    const mockQueryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should detect overlap when new schedule starts during existing schedule', async () => {
      const createDto: CreateScheduleDto = {
        user_id: mockUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-02-01',
        end_date: '2026-03-01',
      };

      const existingSchedule = {
        ...mockSchedule,
        effective_date: new Date('2026-01-01'),
        end_date: new Date('2026-02-15'),
      };

      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);
      mockQueryBuilder.getOne.mockResolvedValue(existingSchedule);

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(ConflictException);
    });

    it('should not detect overlap when schedules are sequential', async () => {
      const createDto: CreateScheduleDto = {
        user_id: mockUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-02-16',
        end_date: '2026-03-15',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockAreasService.findOne.mockResolvedValue(mockArea as any);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition as any);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No overlap
      mockRepository.create.mockReturnValue(mockSchedule);
      mockRepository.save.mockResolvedValue(mockSchedule);

      const result = await service.create(createDto, 'admin-uuid');

      expect(result).toBeDefined();
    });

    it('should exclude current schedule when checking overlap during update', async () => {
      const updateDto: UpdateScheduleDto = {
        effective_date: '2026-01-25',
      };

      mockRepository.findOne.mockResolvedValue({ ...mockSchedule });
      mockQueryBuilder.getOne.mockResolvedValue(null); // No overlap (excluding self)
      mockRepository.save.mockResolvedValue({ ...mockSchedule, ...updateDto });

      const result = await service.update(mockSchedule.id, updateDto);

      expect(result).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('schedule.id != :excludeId', {
        excludeId: mockSchedule.id,
      });
    });
  });
});
