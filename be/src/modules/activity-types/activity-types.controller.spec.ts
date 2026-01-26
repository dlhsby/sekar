import { Test, TestingModule } from '@nestjs/testing';
import { ActivityTypesController } from './activity-types.controller';
import { ActivityTypesService } from './activity-types.service';
import { ActivityType } from './entities/activity-type.entity';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

describe('ActivityTypesController', () => {
  let module: TestingModule;
  let controller: ActivityTypesController;
  let activityTypesService: ActivityTypesService;

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

  const mockActivityTypesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
    canRolePerformActivity: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ActivityTypesController],
      providers: [
        {
          provide: ActivityTypesService,
          useValue: mockActivityTypesService,
        },
      ],
    }).compile();

    controller = module.get<ActivityTypesController>(ActivityTypesController);
    activityTypesService = module.get<ActivityTypesService>(ActivityTypesService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all activity types when no role filter', async () => {
      const activities = [mockWorkerActivity, mockLinmasActivity, mockSharedActivity];
      mockActivityTypesService.findAll.mockResolvedValue(activities);

      const result = await controller.findAll();

      expect(result).toEqual(activities);
      expect(activityTypesService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should return activity types filtered by Worker role', async () => {
      const workerActivities = [mockWorkerActivity, mockSharedActivity];
      mockActivityTypesService.findAll.mockResolvedValue(workerActivities);

      const result = await controller.findAll('Worker');

      expect(result).toEqual(workerActivities);
      expect(activityTypesService.findAll).toHaveBeenCalledWith('Worker');
    });

    it('should return activity types filtered by Linmas role', async () => {
      const linmasActivities = [mockLinmasActivity, mockSharedActivity];
      mockActivityTypesService.findAll.mockResolvedValue(linmasActivities);

      const result = await controller.findAll('Linmas');

      expect(result).toEqual(linmasActivities);
      expect(activityTypesService.findAll).toHaveBeenCalledWith('Linmas');
    });

    it('should return empty array when no activities exist', async () => {
      mockActivityTypesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an activity type by ID', async () => {
      mockActivityTypesService.findOne.mockResolvedValue(mockWorkerActivity);

      const result = await controller.findOne(mockWorkerActivity.id);

      expect(result).toEqual(mockWorkerActivity);
      expect(activityTypesService.findOne).toHaveBeenCalledWith(mockWorkerActivity.id);
    });
  });

  describe('create', () => {
    it('should create a new activity type', async () => {
      const createActivityTypeDto: CreateActivityTypeDto = {
        code: 'PLANTING',
        name: 'Penanaman',
        description: 'Planting new vegetation',
        applicable_roles: ['Worker'],
      };

      const newActivityType = { id: 'new-id', ...createActivityTypeDto };
      mockActivityTypesService.create.mockResolvedValue(newActivityType);

      const result = await controller.create(createActivityTypeDto);

      expect(result).toEqual(newActivityType);
      expect(activityTypesService.create).toHaveBeenCalledWith(createActivityTypeDto);
    });

    it('should create activity type with multiple roles', async () => {
      const multiRoleDto: CreateActivityTypeDto = {
        code: 'SHARED_ACTIVITY',
        name: 'Shared Activity',
        applicable_roles: ['Worker', 'Linmas'],
      };

      const newActivityType = { id: 'new-id', ...multiRoleDto };
      mockActivityTypesService.create.mockResolvedValue(newActivityType);

      const result = await controller.create(multiRoleDto);

      expect(result.applicable_roles).toEqual(['Worker', 'Linmas']);
    });
  });

  describe('update', () => {
    it('should update an activity type', async () => {
      const updateActivityTypeDto: UpdateActivityTypeDto = {
        name: 'Penyiraman Updated',
        description: 'Updated description',
      };

      const updatedActivityType = { ...mockWorkerActivity, ...updateActivityTypeDto };
      mockActivityTypesService.update.mockResolvedValue(updatedActivityType);

      const result = await controller.update(mockWorkerActivity.id, updateActivityTypeDto);

      expect(result).toEqual(updatedActivityType);
      expect(activityTypesService.update).toHaveBeenCalledWith(
        mockWorkerActivity.id,
        updateActivityTypeDto,
      );
    });

    it('should update activity type roles', async () => {
      const updateRolesDto: UpdateActivityTypeDto = {
        applicable_roles: ['Worker', 'Linmas'],
      };

      const updatedActivityType = { ...mockWorkerActivity, ...updateRolesDto };
      mockActivityTypesService.update.mockResolvedValue(updatedActivityType);

      const result = await controller.update(mockWorkerActivity.id, updateRolesDto);

      expect(result.applicable_roles).toEqual(['Worker', 'Linmas']);
    });
  });

  describe('remove', () => {
    it('should remove an activity type', async () => {
      mockActivityTypesService.remove.mockResolvedValue(undefined);

      await controller.remove(mockWorkerActivity.id);

      expect(activityTypesService.remove).toHaveBeenCalledWith(mockWorkerActivity.id);
    });
  });
});
