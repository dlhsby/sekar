import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArrayContains } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ActivityTypesService } from './activity-types.service';
import { ActivityType } from './entities/activity-type.entity';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

describe('ActivityTypesService', () => {
  let module: TestingModule;
  let service: ActivityTypesService;

  const mockWorkerActivity: ActivityType = {
    id: '33333333-3333-3333-3333-333333333301',
    name: 'Penyiraman',
    code: 'WATERING',
    description: 'Watering plants and gardens',
    applicable_roles: ['Worker'],
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockLinmasActivity: ActivityType = {
    id: '33333333-3333-3333-3333-333333333302',
    name: 'Patroli Keamanan',
    code: 'SECURITY_PATROL',
    description: 'Security patrol duties',
    applicable_roles: ['Linmas'],
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockSharedActivity: ActivityType = {
    id: '33333333-3333-3333-3333-333333333303',
    name: 'Pembersihan',
    code: 'CLEANING',
    description: 'Cleaning activities',
    applicable_roles: ['Worker', 'Linmas'],
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockActivityTypeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ActivityTypesService,
        {
          provide: getRepositoryToken(ActivityType),
          useValue: mockActivityTypeRepository,
        },
      ],
    }).compile();

    service = module.get<ActivityTypesService>(ActivityTypesService);
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
    it('should return all active activity types when no role filter', async () => {
      const activities = [mockWorkerActivity, mockLinmasActivity, mockSharedActivity];
      mockActivityTypeRepository.find.mockResolvedValue(activities);

      const result = await service.findAll();

      expect(result).toEqual(activities);
      expect(mockActivityTypeRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { name: 'ASC' },
      });
    });

    it('should return activity types filtered by Worker role', async () => {
      const workerActivities = [mockWorkerActivity, mockSharedActivity];
      mockActivityTypeRepository.find.mockResolvedValue(workerActivities);

      const result = await service.findAll('Worker');

      expect(result).toEqual(workerActivities);
      expect(mockActivityTypeRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          applicable_roles: ArrayContains(['Worker']),
        },
        order: { name: 'ASC' },
      });
    });

    it('should return activity types filtered by Linmas role', async () => {
      const linmasActivities = [mockLinmasActivity, mockSharedActivity];
      mockActivityTypeRepository.find.mockResolvedValue(linmasActivities);

      const result = await service.findAll('Linmas');

      expect(result).toEqual(linmasActivities);
      expect(mockActivityTypeRepository.find).toHaveBeenCalledWith({
        where: {
          is_active: true,
          applicable_roles: ArrayContains(['Linmas']),
        },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no activities exist', async () => {
      mockActivityTypeRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an activity type by ID', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockWorkerActivity);

      const result = await service.findOne(mockWorkerActivity.id);

      expect(result).toEqual(mockWorkerActivity);
      expect(mockActivityTypeRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockWorkerActivity.id },
      });
    });

    it('should throw NotFoundException if activity type not found', async () => {
      const id = 'non-existent-id';
      mockActivityTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(`Activity type with ID ${id} not found`);
    });
  });

  describe('findByCode', () => {
    it('should return an activity type by code', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockWorkerActivity);

      const result = await service.findByCode('WATERING');

      expect(result).toEqual(mockWorkerActivity);
      expect(mockActivityTypeRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'WATERING', is_active: true },
      });
    });

    it('should throw NotFoundException if activity type with code not found', async () => {
      const code = 'NONEXISTENT';
      mockActivityTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode(code)).rejects.toThrow(NotFoundException);
      await expect(service.findByCode(code)).rejects.toThrow(
        `Activity type with code "${code}" not found`,
      );
    });
  });

  describe('create', () => {
    const createActivityTypeDto: CreateActivityTypeDto = {
      code: 'PLANTING',
      name: 'Penanaman',
      description: 'Planting new vegetation',
      applicable_roles: ['Worker'],
    };

    it('should successfully create an activity type', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(null);
      const newActivityType = { id: 'new-id', ...createActivityTypeDto };
      mockActivityTypeRepository.create.mockReturnValue(newActivityType);
      mockActivityTypeRepository.save.mockResolvedValue(newActivityType);

      const result = await service.create(createActivityTypeDto);

      expect(result).toEqual(newActivityType);
      expect(mockActivityTypeRepository.create).toHaveBeenCalledWith(createActivityTypeDto);
      expect(mockActivityTypeRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockWorkerActivity);

      const duplicateCodeDto: CreateActivityTypeDto = {
        code: 'WATERING',
        name: 'Different Name',
        applicable_roles: ['Worker'],
      };

      await expect(service.create(duplicateCodeDto)).rejects.toThrow(ConflictException);
      await expect(service.create(duplicateCodeDto)).rejects.toThrow(
        `Activity type with code "${duplicateCodeDto.code}" already exists`,
      );
    });

    it('should create activity type with multiple roles', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(null);
      const multiRoleDto: CreateActivityTypeDto = {
        code: 'SHARED_ACTIVITY',
        name: 'Shared Activity',
        applicable_roles: ['Worker', 'Linmas'],
      };
      const newActivityType = { id: 'new-id', ...multiRoleDto };
      mockActivityTypeRepository.create.mockReturnValue(newActivityType);
      mockActivityTypeRepository.save.mockResolvedValue(newActivityType);

      const result = await service.create(multiRoleDto);

      expect(result.applicable_roles).toEqual(['Worker', 'Linmas']);
    });
  });

  describe('update', () => {
    const updateActivityTypeDto: UpdateActivityTypeDto = {
      name: 'Penyiraman Updated',
      description: 'Updated description',
    };

    it('should update an activity type', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue({ ...mockWorkerActivity });
      const updatedActivityType = { ...mockWorkerActivity, ...updateActivityTypeDto };
      mockActivityTypeRepository.save.mockResolvedValue(updatedActivityType);

      const result = await service.update(mockWorkerActivity.id, updateActivityTypeDto);

      expect(result).toEqual(updatedActivityType);
      expect(mockActivityTypeRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if activity type not found', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateActivityTypeDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new code already exists', async () => {
      const updateWithCode: UpdateActivityTypeDto = { code: 'SECURITY_PATROL' };

      mockActivityTypeRepository.findOne
        .mockResolvedValueOnce({ ...mockWorkerActivity }) // initial findOne by id
        .mockResolvedValueOnce({ ...mockLinmasActivity }); // code uniqueness check - conflict

      await expect(service.update(mockWorkerActivity.id, updateWithCode)).rejects.toThrow(
        ConflictException,
      );

      // Reset mocks and test again for error message
      mockActivityTypeRepository.findOne
        .mockResolvedValueOnce({ ...mockWorkerActivity })
        .mockResolvedValueOnce({ ...mockLinmasActivity });

      await expect(service.update(mockWorkerActivity.id, updateWithCode)).rejects.toThrow(
        `Activity type with code "${updateWithCode.code}" already exists`,
      );
    });

    it('should allow updating with same code (no change)', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue({ ...mockWorkerActivity });
      mockActivityTypeRepository.save.mockResolvedValue(mockWorkerActivity);

      const updateWithSameCode: UpdateActivityTypeDto = { code: 'WATERING' };

      const result = await service.update(mockWorkerActivity.id, updateWithSameCode);

      expect(result).toEqual(mockWorkerActivity);
    });

    it('should update applicable roles', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue({ ...mockWorkerActivity });
      const updateWithRoles: UpdateActivityTypeDto = {
        applicable_roles: ['Worker', 'Linmas'],
      };
      const updatedActivityType = { ...mockWorkerActivity, ...updateWithRoles };
      mockActivityTypeRepository.save.mockResolvedValue(updatedActivityType);

      const result = await service.update(mockWorkerActivity.id, updateWithRoles);

      expect(result.applicable_roles).toEqual(['Worker', 'Linmas']);
    });
  });

  describe('remove', () => {
    it('should soft delete an activity type', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockWorkerActivity);
      mockActivityTypeRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockWorkerActivity.id);

      expect(mockActivityTypeRepository.softDelete).toHaveBeenCalledWith(mockWorkerActivity.id);
    });

    it('should throw NotFoundException if activity type not found', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('should return true when activity type exists and is active', async () => {
      mockActivityTypeRepository.count.mockResolvedValue(1);

      const result = await service.exists(mockWorkerActivity.id);

      expect(result).toBe(true);
      expect(mockActivityTypeRepository.count).toHaveBeenCalledWith({
        where: { id: mockWorkerActivity.id, is_active: true },
      });
    });

    it('should return false when activity type does not exist', async () => {
      mockActivityTypeRepository.count.mockResolvedValue(0);

      const result = await service.exists('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('canRolePerformActivity', () => {
    it('should return true when Worker can perform Worker activity', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockWorkerActivity);

      const result = await service.canRolePerformActivity(mockWorkerActivity.id, 'Worker');

      expect(result).toBe(true);
    });

    it('should return false when Linmas cannot perform Worker-only activity', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockWorkerActivity);

      const result = await service.canRolePerformActivity(mockWorkerActivity.id, 'Linmas');

      expect(result).toBe(false);
    });

    it('should return true for shared activity regardless of role', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(mockSharedActivity);

      const workerResult = await service.canRolePerformActivity(mockSharedActivity.id, 'Worker');
      const linmasResult = await service.canRolePerformActivity(mockSharedActivity.id, 'Linmas');

      expect(workerResult).toBe(true);
      expect(linmasResult).toBe(true);
    });

    it('should throw NotFoundException if activity type not found', async () => {
      mockActivityTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.canRolePerformActivity('non-existent-id', 'Worker')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
