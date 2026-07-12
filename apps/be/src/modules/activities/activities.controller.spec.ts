import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivitiesFilterDto } from './dto/activities-filter.dto';
import { Activity } from './entities/activity.entity';
import { UserRole } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

describe('ActivitiesController', () => {
  let module: TestingModule;
  let controller: ActivitiesController;
  let service: jest.Mocked<ActivitiesService>;

  const mockUser = {
    id: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'satgas1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
    location_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    rayon_id: 'rayon-uuid-1',
  };

  const mockActivity: any = {
    id: 'activity-uuid-1',
    user_id: mockUser.id,
    shift_id: 'shift-uuid-1',
    location_id: mockUser.location_id,
    activity_type_id: 'activity-type-uuid-1',
    description: 'Penyiraman tanaman area Taman Bungkul',
    photo_urls: ['https://s3.amazonaws.com/activities/photo1.jpg?presigned=true'],
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    created_at: new Date('2026-01-09T09:00:00Z'),
    updated_at: new Date('2026-01-09T09:00:00Z'),
    user: mockUser,
    shift: {
      id: 'shift-uuid-1',
      worker_id: mockUser.id,
      location_id: mockUser.location_id,
    },
  };

  const mockService = {
    createActivity: jest.fn(),
    findAllPaginated: jest.fn(),
    findMyActivities: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    service = module.get(ActivitiesService) as jest.Mocked<ActivitiesService>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateActivityDto = {
      activity_type_id: 'activity-type-uuid-1',
      description: 'Penyiraman tanaman area Taman Bungkul',
      photo_urls: ['https://s3.amazonaws.com/activities/photo1.jpg'],
      gps_lat: -7.2905,
      gps_lng: 112.7398,
    };

    it('should create an activity for SATGAS', async () => {
      mockService.createActivity.mockResolvedValue(mockActivity);

      const result = await controller.create(createDto, mockUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.createActivity).toHaveBeenCalledWith(mockUser.id, mockUser.role, createDto);
    });

    it('should create an activity for LINMAS', async () => {
      const linmasUser = { ...mockUser, role: UserRole.LINMAS };
      mockService.createActivity.mockResolvedValue(mockActivity);

      const result = await controller.create(createDto, linmasUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.createActivity).toHaveBeenCalledWith(
        linmasUser.id,
        linmasUser.role,
        createDto,
      );
    });

    it('should create an activity for KORLAP', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      mockService.createActivity.mockResolvedValue(mockActivity);

      const result = await controller.create(createDto, korlapUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.createActivity).toHaveBeenCalledWith(
        korlapUser.id,
        korlapUser.role,
        createDto,
      );
    });

    it('should create an activity for ADMIN_RAYON', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_RAYON };
      mockService.createActivity.mockResolvedValue(mockActivity);

      const result = await controller.create(createDto, adminDataUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.createActivity).toHaveBeenCalledWith(
        adminDataUser.id,
        adminDataUser.role,
        createDto,
      );
    });

    it('should handle activity creation with multiple photos', async () => {
      const dtoWithMultiplePhotos = {
        ...createDto,
        photo_urls: [
          'https://s3.amazonaws.com/activities/photo1.jpg',
          'https://s3.amazonaws.com/activities/photo2.jpg',
          'https://s3.amazonaws.com/activities/photo3.jpg',
        ],
      };
      mockService.createActivity.mockResolvedValue({
        ...mockActivity,
        photo_urls: dtoWithMultiplePhotos.photo_urls,
      });

      const result = await controller.create(dtoWithMultiplePhotos, mockUser as any);

      expect(result.photo_urls).toHaveLength(3);
    });

    it('should pass user ID and role to service', async () => {
      mockService.createActivity.mockResolvedValue(mockActivity);

      await controller.create(createDto, mockUser as any);

      expect(service.createActivity).toHaveBeenCalledWith(
        expect.stringMatching(/^user-uuid-/),
        UserRole.SATGAS,
        expect.any(Object),
      );
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = new PaginatedResponseDto([mockActivity], 1, 1, 50);

    it('should return paginated activities for SATGAS (own activities)', async () => {
      const filterDto: ActivitiesFilterDto = {
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto, mockUser as any);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAllPaginated).toHaveBeenCalledWith(
        {
          user_id: undefined,
          shift_id: undefined,
          from_date: undefined,
          to_date: undefined,
        },
        mockUser,
        1,
        50,
      );
    });

    it('should return paginated activities for KORLAP (area-scoped)', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      const filterDto: ActivitiesFilterDto = {
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto, korlapUser as any);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAllPaginated).toHaveBeenCalledWith(expect.any(Object), korlapUser, 1, 50);
    });

    it('should return paginated activities for KEPALA_RAYON (rayon-scoped)', async () => {
      const kepalaRayonUser = { ...mockUser, role: UserRole.KEPALA_RAYON };
      const filterDto: ActivitiesFilterDto = {
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto, kepalaRayonUser as any);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAllPaginated).toHaveBeenCalledWith(
        expect.any(Object),
        kepalaRayonUser,
        1,
        50,
      );
    });

    it('should return all activities for ADMIN_SYSTEM (city-wide)', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN_SYSTEM };
      const filterDto: ActivitiesFilterDto = {
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(filterDto, adminUser as any);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAllPaginated).toHaveBeenCalledWith(expect.any(Object), adminUser, 1, 50);
    });

    it('should apply user_id filter when provided', async () => {
      const filterDto: ActivitiesFilterDto = {
        user_id: 'specific-user-uuid',
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(filterDto, mockUser as any);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'specific-user-uuid' }),
        mockUser,
        1,
        50,
      );
    });

    it('should apply shift_id filter when provided', async () => {
      const filterDto: ActivitiesFilterDto = {
        shift_id: 'specific-shift-uuid',
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(filterDto, mockUser as any);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ shift_id: 'specific-shift-uuid' }),
        mockUser,
        1,
        50,
      );
    });

    it('should apply date range filters when provided', async () => {
      const filterDto: ActivitiesFilterDto = {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
        page: 1,
        limit: 50,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(filterDto, mockUser as any);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          from_date: '2026-01-01',
          to_date: '2026-01-31',
        }),
        mockUser,
        1,
        50,
      );
    });

    it('should handle custom pagination parameters', async () => {
      const filterDto: ActivitiesFilterDto = {
        page: 2,
        limit: 20,
      };
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(filterDto, mockUser as any);

      expect(service.findAllPaginated).toHaveBeenCalledWith(expect.any(Object), mockUser, 2, 20);
    });

    it('should use default pagination when not provided', async () => {
      const filterDto: ActivitiesFilterDto = {};
      mockService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(filterDto, mockUser as any);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        expect.any(Object),
        mockUser,
        undefined, // Default page will be handled by service
        undefined, // Default limit will be handled by service
      );
    });
  });

  describe('getMyActivities', () => {
    it('should return user own activities without date filter', async () => {
      mockService.findMyActivities.mockResolvedValue([mockActivity]);

      const result = await controller.getMyActivities(undefined, mockUser as any);

      expect(result).toEqual([mockActivity]);
      expect(service.findMyActivities).toHaveBeenCalledWith(mockUser.id, undefined);
    });

    it('should return user own activities with date filter', async () => {
      const date = '2026-01-09';
      mockService.findMyActivities.mockResolvedValue([mockActivity]);

      const result = await controller.getMyActivities(date, mockUser as any);

      expect(result).toEqual([mockActivity]);
      expect(service.findMyActivities).toHaveBeenCalledWith(mockUser.id, date);
    });

    it('should work for SATGAS role', async () => {
      mockService.findMyActivities.mockResolvedValue([mockActivity]);

      const result = await controller.getMyActivities(undefined, mockUser as any);

      expect(result).toHaveLength(1);
    });

    it('should work for LINMAS role', async () => {
      const linmasUser = { ...mockUser, role: UserRole.LINMAS };
      mockService.findMyActivities.mockResolvedValue([mockActivity]);

      const result = await controller.getMyActivities(undefined, linmasUser as any);

      expect(result).toHaveLength(1);
    });

    it('should work for KORLAP role', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      mockService.findMyActivities.mockResolvedValue([mockActivity]);

      const result = await controller.getMyActivities(undefined, korlapUser as any);

      expect(result).toHaveLength(1);
    });

    it('should work for ADMIN_RAYON role', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_RAYON };
      mockService.findMyActivities.mockResolvedValue([mockActivity]);

      const result = await controller.getMyActivities(undefined, adminDataUser as any);

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return activity by ID for owner (SATGAS)', async () => {
      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(mockActivity.id, mockUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.findOne).toHaveBeenCalledWith(mockActivity.id, mockUser);
    });

    it('should return activity by ID for KORLAP (area-scoped)', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(mockActivity.id, korlapUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.findOne).toHaveBeenCalledWith(mockActivity.id, korlapUser);
    });

    it('should return activity by ID for KEPALA_RAYON (rayon-scoped)', async () => {
      const kepalaRayonUser = { ...mockUser, role: UserRole.KEPALA_RAYON };
      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(mockActivity.id, kepalaRayonUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.findOne).toHaveBeenCalledWith(mockActivity.id, kepalaRayonUser);
    });

    it('should return activity by ID for ADMIN_SYSTEM (no scope restriction)', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN_SYSTEM };
      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(mockActivity.id, adminUser as any);

      expect(result).toEqual(mockActivity);
      expect(service.findOne).toHaveBeenCalledWith(mockActivity.id, adminUser);
    });

    it('should return activity by ID for MANAGEMENT', async () => {
      const topMgmtUser = { ...mockUser, role: UserRole.MANAGEMENT };
      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(mockActivity.id, topMgmtUser as any);

      expect(result).toEqual(mockActivity);
    });

    it('should return activity by ID for SUPERADMIN', async () => {
      const superadminUser = { ...mockUser, role: UserRole.SUPERADMIN };
      mockService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(mockActivity.id, superadminUser as any);

      expect(result).toEqual(mockActivity);
    });
  });

  describe('update', () => {
    const updateDto: UpdateActivityDto = {
      description: 'Updated description',
      photo_urls: ['https://s3.amazonaws.com/activities/new-photo.jpg'],
    };

    it('should update activity for SATGAS (own activity)', async () => {
      const updatedActivity = { ...mockActivity, ...updateDto };
      mockService.update.mockResolvedValue(updatedActivity);

      const result = await controller.update(mockActivity.id, updateDto, mockUser as any);

      expect(result).toEqual(updatedActivity);
      expect(service.update).toHaveBeenCalledWith(mockActivity.id, updateDto, mockUser.id);
    });

    it('should update activity for LINMAS', async () => {
      const linmasUser = { ...mockUser, role: UserRole.LINMAS };
      const updatedActivity = { ...mockActivity, ...updateDto };
      mockService.update.mockResolvedValue(updatedActivity);

      const result = await controller.update(mockActivity.id, updateDto, linmasUser as any);

      expect(result).toEqual(updatedActivity);
      expect(service.update).toHaveBeenCalledWith(mockActivity.id, updateDto, linmasUser.id);
    });

    it('should update activity for KORLAP', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      const updatedActivity = { ...mockActivity, ...updateDto };
      mockService.update.mockResolvedValue(updatedActivity);

      const result = await controller.update(mockActivity.id, updateDto, korlapUser as any);

      expect(result).toEqual(updatedActivity);
      expect(service.update).toHaveBeenCalledWith(mockActivity.id, updateDto, korlapUser.id);
    });

    it('should update activity for ADMIN_RAYON', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_RAYON };
      const updatedActivity = { ...mockActivity, ...updateDto };
      mockService.update.mockResolvedValue(updatedActivity);

      const result = await controller.update(mockActivity.id, updateDto, adminDataUser as any);

      expect(result).toEqual(updatedActivity);
      expect(service.update).toHaveBeenCalledWith(mockActivity.id, updateDto, adminDataUser.id);
    });

    it('should update only description', async () => {
      const partialUpdateDto = { description: 'New description' };
      const updatedActivity = { ...mockActivity, description: partialUpdateDto.description };
      mockService.update.mockResolvedValue(updatedActivity);

      const result = await controller.update(mockActivity.id, partialUpdateDto, mockUser as any);

      expect(result.description).toBe(partialUpdateDto.description);
    });

    it('should update only photo_urls', async () => {
      const partialUpdateDto = { photo_urls: ['https://s3.amazonaws.com/new.jpg'] };
      const updatedActivity = { ...mockActivity, photo_urls: partialUpdateDto.photo_urls };
      mockService.update.mockResolvedValue(updatedActivity);

      const result = await controller.update(mockActivity.id, partialUpdateDto, mockUser as any);

      expect(result.photo_urls).toEqual(partialUpdateDto.photo_urls);
    });
  });

  describe('remove', () => {
    it('should delete activity for ADMIN_SYSTEM', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN_SYSTEM };
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockActivity.id);

      expect(service.remove).toHaveBeenCalledWith(mockActivity.id);
    });

    it('should delete activity for SUPERADMIN', async () => {
      const superadminUser = { ...mockUser, role: UserRole.SUPERADMIN };
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockActivity.id);

      expect(service.remove).toHaveBeenCalledWith(mockActivity.id);
    });

    it('should return void on successful deletion', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockActivity.id);

      expect(result).toBeUndefined();
    });
  });

  describe('Role Guard Integration', () => {
    it('should allow ACTIVITY_SUBMITTERS to create activities', async () => {
      // ACTIVITY_SUBMITTERS = [SATGAS, LINMAS, KORLAP, ADMIN_RAYON]
      const roles = [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP, UserRole.ADMIN_RAYON];

      for (const role of roles) {
        const user = { ...mockUser, role };
        mockService.createActivity.mockResolvedValue(mockActivity);

        const createDto: CreateActivityDto = {
          activity_type_id: 'activity-type-uuid-1',
          description: 'Test activity',
          photo_urls: ['https://s3.amazonaws.com/photo.jpg'],
        };

        const result = await controller.create(createDto, user as any);
        expect(result).toBeDefined();
      }
    });

    it('should allow MONITORING_AREA roles to view activities', async () => {
      // MONITORING_AREA = [KORLAP, KEPALA_RAYON, MANAGEMENT, ADMIN_SYSTEM, SUPERADMIN]
      const roles = [
        UserRole.KORLAP,
        UserRole.KEPALA_RAYON,
        UserRole.MANAGEMENT,
        UserRole.ADMIN_SYSTEM,
        UserRole.SUPERADMIN,
      ];

      for (const role of roles) {
        const user = { ...mockUser, role };
        mockService.findOne.mockResolvedValue(mockActivity);

        const result = await controller.findOne(mockActivity.id, user as any);
        expect(result).toBeDefined();
      }
    });

    it('should allow USER_MANAGERS to delete activities', async () => {
      // USER_MANAGERS = [ADMIN_SYSTEM, SUPERADMIN]
      const roles = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN];

      for (const role of roles) {
        mockService.remove.mockResolvedValue(undefined);

        await controller.remove(mockActivity.id);
        expect(service.remove).toHaveBeenCalledWith(mockActivity.id);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle activities with no photos', async () => {
      const activityWithoutPhotos = { ...mockActivity, photo_urls: [] };
      mockService.findOne.mockResolvedValue(activityWithoutPhotos);

      const result = await controller.findOne(activityWithoutPhotos.id, mockUser as any);

      expect(result.photo_urls).toEqual([]);
    });

    it('should handle activities with optional GPS coordinates', async () => {
      const activityWithoutGPS = { ...mockActivity, gps_lat: null, gps_lng: null };
      mockService.findOne.mockResolvedValue(activityWithoutGPS);

      const result = await controller.findOne(activityWithoutGPS.id, mockUser as any);

      expect(result.gps_lat).toBeNull();
      expect(result.gps_lng).toBeNull();
    });

    it('should handle empty filter parameters', async () => {
      const emptyFilter: ActivitiesFilterDto = {};
      mockService.findAllPaginated.mockResolvedValue(new PaginatedResponseDto([], 0, 1, 50));

      const result = await controller.findAll(emptyFilter, mockUser as any);

      expect(result.meta.total).toBe(0);
    });

    it('should handle pagination with zero results', async () => {
      const filterDto: ActivitiesFilterDto = { page: 1, limit: 50 };
      mockService.findAllPaginated.mockResolvedValue(new PaginatedResponseDto([], 0, 1, 50));

      const result = await controller.findAll(filterDto, mockUser as any);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});
