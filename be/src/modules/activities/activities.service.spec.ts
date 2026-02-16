import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { HttpStatus, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { S3Service } from '../../shared/services/s3.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { UserRole } from '../users/entities/user.entity';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';

describe('ActivitiesService', () => {
  let module: TestingModule;
  let service: ActivitiesService;
  let activitiesRepo: jest.Mocked<Repository<Activity>>;
  let shiftsRepo: jest.Mocked<Repository<Shift>>;
  let activityTypeRepo: jest.Mocked<Repository<ActivityType>>;
  let s3Service: jest.Mocked<S3Service>;

  const mockUser = {
    id: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'satgas1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
    area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    rayon_id: 'rayon-uuid-1',
  };

  const mockActivityType = {
    id: 'activity-type-uuid-1',
    name: 'Penyiraman',
    description: 'Watering plants',
    applicable_roles: [UserRole.SATGAS, UserRole.LINMAS],
    is_active: true,
  };

  const mockActiveShift: any = {
    id: 'shift-uuid-5e6f7a8b-c9d0-1234-ef01-345678901234',
    worker_id: mockUser.id,
    area_id: mockUser.area_id,
    area: {
      id: mockUser.area_id,
      name: 'Taman Bungkul',
      rayon_id: 'rayon-uuid-1',
    },
    clock_in_time: new Date('2026-01-09T08:00:00Z'),
    clock_out_time: null,
  };

  const mockActivity: any = {
    id: 'activity-uuid-1',
    user_id: mockUser.id,
    shift_id: mockActiveShift.id,
    area_id: mockUser.area_id,
    activity_type_id: mockActivityType.id,
    description: 'Penyiraman tanaman area Taman Bungkul',
    photo_urls: ['https://s3.amazonaws.com/activities/photo1.jpg'],
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    created_at: new Date('2026-01-09T09:00:00Z'),
    updated_at: new Date('2026-01-09T09:00:00Z'),
    user: mockUser,
    shift: mockActiveShift,
  };

  const mockActivitiesRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockShiftsRepo = {
    findOne: jest.fn(),
  };

  const mockActivityTypeRepo = {
    findOne: jest.fn(),
  };

  const mockS3Service = {
    convertToPresignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockActivitiesRepo,
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftsRepo,
        },
        {
          provide: getRepositoryToken(ActivityType),
          useValue: mockActivityTypeRepo,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    activitiesRepo = module.get(getRepositoryToken(Activity)) as jest.Mocked<Repository<Activity>>;
    shiftsRepo = module.get(getRepositoryToken(Shift)) as jest.Mocked<Repository<Shift>>;
    activityTypeRepo = module.get(getRepositoryToken(ActivityType)) as jest.Mocked<Repository<ActivityType>>;
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;

    // Reset S3 mock implementation to avoid appending to same string reference
    mockS3Service.convertToPresignedUrl.mockImplementation((url) => Promise.resolve(`presigned-${url}`));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('createActivity', () => {
    const createDto: CreateActivityDto = {
      activity_type_id: mockActivityType.id,
      description: 'Penyiraman tanaman area Taman Bungkul',
      photo_urls: ['https://s3.amazonaws.com/activities/photo1.jpg'],
      gps_lat: -7.2905,
      gps_lng: 112.7398,
    };

    it('should successfully create an activity when all validations pass', async () => {
      mockShiftsRepo.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType as any);
      mockActivitiesRepo.create.mockReturnValue(mockActivity);
      mockActivitiesRepo.save.mockResolvedValue(mockActivity);

      const result = await service.createActivity(mockUser.id, mockUser.role, createDto);

      expect(result).toEqual(mockActivity);
      expect(mockShiftsRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: mockUser.id, clock_out_time: IsNull() },
        relations: ['area'],
      });
      expect(mockActivityTypeRepo.findOne).toHaveBeenCalledWith({
        where: { id: createDto.activity_type_id, is_active: true },
      });
      expect(mockActivitiesRepo.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        shift_id: mockActiveShift.id,
        area_id: mockActiveShift.area_id,
        activity_type_id: createDto.activity_type_id,
        description: createDto.description,
        photo_urls: createDto.photo_urls,
        gps_lat: createDto.gps_lat,
        gps_lng: createDto.gps_lng,
      });
      expect(mockActivitiesRepo.save).toHaveBeenCalledWith(mockActivity);
    });

    it('should throw BadRequestException when no active shift found', async () => {
      mockShiftsRepo.findOne.mockResolvedValue(null);

      await expect(service.createActivity(mockUser.id, mockUser.role, createDto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createActivity(mockUser.id, mockUser.role, createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('No active shift found');
        expect(error.message).toContain('Please clock in first');
      }
    });

    it('should throw NotFoundException when activity type not found', async () => {
      mockShiftsRepo.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepo.findOne.mockResolvedValue(null);

      await expect(service.createActivity(mockUser.id, mockUser.role, createDto)).rejects.toThrow(
        NotFoundException,
      );

      try {
        await service.createActivity(mockUser.id, mockUser.role, createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Activity type not found or inactive');
      }
    });

    it('should throw NotFoundException when activity type is inactive', async () => {
      mockShiftsRepo.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepo.findOne.mockResolvedValue(null); // Returns null because is_active=false in query

      await expect(service.createActivity(mockUser.id, mockUser.role, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when activity type not applicable to user role', async () => {
      mockShiftsRepo.findOne.mockResolvedValue(mockActiveShift);
      const adminOnlyActivityType = {
        ...mockActivityType,
        applicable_roles: [UserRole.ADMIN_SYSTEM],
      };
      mockActivityTypeRepo.findOne.mockResolvedValue(adminOnlyActivityType as any);

      await expect(service.createActivity(mockUser.id, mockUser.role, createDto)).rejects.toThrow(
        ForbiddenException,
      );

      try {
        await service.createActivity(mockUser.id, mockUser.role, createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('not available for your role');
        expect(error.message).toContain(adminOnlyActivityType.name);
      }
    });

    it('should create activity with multiple photos (up to 3)', async () => {
      const dtoWithMultiplePhotos = {
        ...createDto,
        photo_urls: [
          'https://s3.amazonaws.com/activities/photo1.jpg',
          'https://s3.amazonaws.com/activities/photo2.jpg',
          'https://s3.amazonaws.com/activities/photo3.jpg',
        ],
      };

      mockShiftsRepo.findOne.mockResolvedValue(mockActiveShift);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType as any);
      mockActivitiesRepo.create.mockReturnValue({ ...mockActivity, photo_urls: dtoWithMultiplePhotos.photo_urls });
      mockActivitiesRepo.save.mockResolvedValue({ ...mockActivity, photo_urls: dtoWithMultiplePhotos.photo_urls });

      const result = await service.createActivity(mockUser.id, mockUser.role, dtoWithMultiplePhotos);

      expect(result.photo_urls).toHaveLength(3);
    });
  });

  describe('findAllPaginated', () => {
    const mockQueryBuilder: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    beforeEach(() => {
      mockActivitiesRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return paginated activities for SATGAS (only own activities)', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 1]);

      const result = await service.findAllPaginated({}, mockUser as any, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('activity.user_id = :userId', { userId: mockUser.id });
    });

    it('should return paginated activities for KORLAP (area-scoped)', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 5]);

      const result = await service.findAllPaginated({}, korlapUser as any, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('activity.area_id = :areaId', { areaId: korlapUser.area_id });
    });

    it('should return paginated activities for KEPALA_RAYON (rayon-scoped)', async () => {
      const kepalaRayonUser = { ...mockUser, role: UserRole.KEPALA_RAYON };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 10]);

      const result = await service.findAllPaginated({}, kepalaRayonUser as any, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', { rayonId: kepalaRayonUser.rayon_id });
    });

    it('should return all activities for ADMIN_SYSTEM (no scope restriction)', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN_SYSTEM };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 50]);

      const result = await service.findAllPaginated({}, adminUser as any, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(50);
      // Should not have scope-based andWhere calls for admin
    });

    it('should return paginated activities for ADMIN_DATA (rayon-scoped)', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_DATA, rayon_id: 'rayon-uuid-1' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 15]);

      const result = await service.findAllPaginated({}, adminDataUser as any, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', { rayonId: adminDataUser.rayon_id });
    });

    it('should apply date range filter when provided', async () => {
      const filters = {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 1]);

      await service.findAllPaginated(filters, mockUser as any, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.created_at BETWEEN :fromDate AND :toDate',
        {
          fromDate: new Date(filters.from_date),
          toDate: new Date(filters.to_date),
        },
      );
    });

    it('should apply from_date filter only when to_date not provided', async () => {
      const filters = { from_date: '2026-01-01' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 1]);

      await service.findAllPaginated(filters, mockUser as any, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.created_at >= :fromDate',
        { fromDate: new Date(filters.from_date) },
      );
    });

    it('should apply user_id filter when provided', async () => {
      const filters = { user_id: 'specific-user-uuid' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 1]);

      await service.findAllPaginated(filters, mockUser as any, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('activity.user_id = :userId', {
        userId: filters.user_id,
      });
    });

    it('should apply shift_id filter when provided', async () => {
      const filters = { shift_id: 'specific-shift-uuid' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 1]);

      await service.findAllPaginated(filters, mockUser as any, 1, 50);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('activity.shift_id = :shiftId', {
        shiftId: filters.shift_id,
      });
    });

    it('should handle pagination correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockActivity], 100]);

      const result = await service.findAllPaginated({}, mockUser as any, 2, 20);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (page - 1) * limit
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(5); // 100 / 20
    });

    it('should convert photo URLs to presigned URLs', async () => {
      const activityForTest = {
        ...mockActivity,
        photo_urls: ['https://s3.amazonaws.com/activities/photo1.jpg'],
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[activityForTest], 1]);

      const result = await service.findAllPaginated({}, mockUser as any, 1, 50);

      expect(s3Service.convertToPresignedUrl).toHaveBeenCalledWith('https://s3.amazonaws.com/activities/photo1.jpg', 86400);
      expect(result.data[0].photo_urls[0]).toContain('presigned-');
    });
  });

  describe('findMyActivities', () => {
    it('should return all activities for user when no date filter', async () => {
      mockActivitiesRepo.find.mockResolvedValue([mockActivity]);

      const result = await service.findMyActivities(mockUser.id);

      expect(result).toHaveLength(1);
      expect(mockActivitiesRepo.find).toHaveBeenCalledWith({
        where: { user_id: mockUser.id },
        relations: ['user', 'shift', 'shift.area'],
        order: { created_at: 'DESC' },
      });
    });

    it('should return activities filtered by date when date provided', async () => {
      const dateString = '2026-01-09';
      mockActivitiesRepo.find.mockResolvedValue([mockActivity]);

      const result = await service.findMyActivities(mockUser.id, dateString);

      expect(result).toHaveLength(1);
      const findCall = mockActivitiesRepo.find.mock.calls[0][0];
      expect(findCall.where.user_id).toBe(mockUser.id);
      expect(findCall.where.created_at).toBeDefined();
    });

    it('should convert photo URLs to presigned URLs with 24 hour expiry', async () => {
      const activityForTest = {
        ...mockActivity,
        photo_urls: ['https://s3.amazonaws.com/activities/photo1.jpg'],
      };
      mockActivitiesRepo.find.mockResolvedValue([activityForTest]);

      await service.findMyActivities(mockUser.id);

      expect(s3Service.convertToPresignedUrl).toHaveBeenCalledWith('https://s3.amazonaws.com/activities/photo1.jpg', 86400);
    });
  });

  describe('findOne', () => {
    it('should return activity when user owns it (SATGAS)', async () => {
      mockActivitiesRepo.findOne.mockResolvedValue(mockActivity);

      const result = await service.findOne(mockActivity.id, mockUser as any);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockActivity.id);
    });

    it('should throw ApiException when activity not found', async () => {
      mockActivitiesRepo.findOne.mockResolvedValue(null);

      try {
        await service.findOne('nonexistent-id', mockUser as any);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_NOT_FOUND);
      }
    });

    it('should throw ApiException when SATGAS tries to access another user activity', async () => {
      const otherUserActivity = { ...mockActivity, user_id: 'other-user-uuid' };
      mockActivitiesRepo.findOne.mockResolvedValue(otherUserActivity);

      try {
        await service.findOne(mockActivity.id, mockUser as any);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_ACCESS_DENIED);
        expect(error.message).toContain('your own activities');
      }
    });

    it('should allow KORLAP to access activities from their area', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      mockActivitiesRepo.findOne.mockResolvedValue(mockActivity);

      const result = await service.findOne(mockActivity.id, korlapUser as any);

      expect(result).toBeDefined();
    });

    it('should throw ApiException when KORLAP tries to access activity outside their area', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP, area_id: 'different-area-uuid' };
      mockActivitiesRepo.findOne.mockResolvedValue(mockActivity);

      try {
        await service.findOne(mockActivity.id, korlapUser as any);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_ACCESS_DENIED);
        expect(error.message).toContain('assigned area');
      }
    });

    it('should allow KEPALA_RAYON to access activities from their rayon', async () => {
      const kepalaRayonUser = { ...mockUser, role: UserRole.KEPALA_RAYON, rayon_id: 'rayon-uuid-1' };
      const activityWithRayon = {
        ...mockActivity,
        shift: {
          ...mockActiveShift,
          area: { ...mockActiveShift.area, rayon_id: 'rayon-uuid-1' },
        },
      };
      mockActivitiesRepo.findOne.mockResolvedValue(activityWithRayon);

      const result = await service.findOne(mockActivity.id, kepalaRayonUser as any);

      expect(result).toBeDefined();
    });

    it('should throw ApiException when KEPALA_RAYON tries to access activity outside their rayon', async () => {
      const kepalaRayonUser = { ...mockUser, role: UserRole.KEPALA_RAYON, rayon_id: 'different-rayon-uuid' };
      const activityWithRayon = {
        ...mockActivity,
        shift: {
          ...mockActiveShift,
          area: { ...mockActiveShift.area, rayon_id: 'rayon-uuid-1' },
        },
      };
      mockActivitiesRepo.findOne.mockResolvedValue(activityWithRayon);

      try {
        await service.findOne(mockActivity.id, kepalaRayonUser as any);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_ACCESS_DENIED);
        expect(error.message).toContain('assigned rayon');
      }
    });

    it('should allow ADMIN_SYSTEM to access any activity', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN_SYSTEM };
      mockActivitiesRepo.findOne.mockResolvedValue(mockActivity);

      const result = await service.findOne(mockActivity.id, adminUser as any);

      expect(result).toBeDefined();
    });

    it('should allow ADMIN_DATA to access activities from their rayon', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_DATA, rayon_id: 'rayon-uuid-1' };
      const activityWithRayon = {
        ...mockActivity,
        shift: {
          ...mockActiveShift,
          area: { ...mockActiveShift.area, rayon_id: 'rayon-uuid-1' },
        },
      };
      mockActivitiesRepo.findOne.mockResolvedValue(activityWithRayon);

      const result = await service.findOne(mockActivity.id, adminDataUser as any);

      expect(result).toBeDefined();
    });

    it('should throw ApiException when ADMIN_DATA tries to access activity outside their rayon', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_DATA, rayon_id: 'different-rayon-uuid' };
      const activityWithRayon = {
        ...mockActivity,
        shift: {
          ...mockActiveShift,
          area: { ...mockActiveShift.area, rayon_id: 'rayon-uuid-1' },
        },
      };
      mockActivitiesRepo.findOne.mockResolvedValue(activityWithRayon);

      try {
        await service.findOne(mockActivity.id, adminDataUser as any);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_ACCESS_DENIED);
        expect(error.message).toContain('assigned rayon');
      }
    });
  });

  describe('update', () => {
    const updateDto: UpdateActivityDto = {
      description: 'Updated description',
      photo_urls: ['https://s3.amazonaws.com/activities/new-photo.jpg'],
    };

    it('should successfully update activity within 1 hour window', async () => {
      const recentActivity = { ...mockActivity, created_at: new Date(Date.now() - 30 * 60 * 1000) }; // 30 min ago
      mockActivitiesRepo.findOne.mockResolvedValue(recentActivity);
      mockActivitiesRepo.save.mockResolvedValue({ ...recentActivity, ...updateDto });

      const result = await service.update(mockActivity.id, updateDto, mockUser.id);

      expect(result.description).toBe(updateDto.description);
      expect(result.photo_urls).toEqual(updateDto.photo_urls);
    });

    it('should throw ApiException when activity not found', async () => {
      mockActivitiesRepo.findOne.mockResolvedValue(null);

      try {
        await service.update('nonexistent-id', updateDto, mockUser.id);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_NOT_FOUND);
      }
    });

    it('should throw ApiException when user does not own the activity', async () => {
      const otherUserActivity = { ...mockActivity, user_id: 'other-user-uuid' };
      mockActivitiesRepo.findOne.mockResolvedValue(otherUserActivity);

      try {
        await service.update(mockActivity.id, updateDto, mockUser.id);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_ACCESS_DENIED);
        expect(error.message).toContain('your own activities');
      }
    });

    it('should throw ApiException when edit window has expired (>1 hour)', async () => {
      const oldActivity = { ...mockActivity, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) }; // 2 hours ago
      mockActivitiesRepo.findOne.mockResolvedValue(oldActivity);

      try {
        await service.update(mockActivity.id, updateDto, mockUser.id);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_EDIT_WINDOW_CLOSED);
        expect(error.message).toContain('within 1 hour');
      }
    });

    it('should update only description when photo_urls not provided', async () => {
      const recentActivity = { ...mockActivity, created_at: new Date(Date.now() - 30 * 60 * 1000) };
      mockActivitiesRepo.findOne.mockResolvedValue(recentActivity);
      mockActivitiesRepo.save.mockResolvedValue({ ...recentActivity, description: updateDto.description });

      const result = await service.update(mockActivity.id, { description: updateDto.description }, mockUser.id);

      expect(result.description).toBe(updateDto.description);
      expect(mockActivitiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: updateDto.description }),
      );
    });

    it('should update only photo_urls when description not provided', async () => {
      const recentActivity = { ...mockActivity, created_at: new Date(Date.now() - 30 * 60 * 1000) };
      mockActivitiesRepo.findOne.mockResolvedValue(recentActivity);
      mockActivitiesRepo.save.mockResolvedValue({ ...recentActivity, photo_urls: updateDto.photo_urls });

      const result = await service.update(mockActivity.id, { photo_urls: updateDto.photo_urls }, mockUser.id);

      expect(result.photo_urls).toEqual(updateDto.photo_urls);
    });
  });

  describe('remove', () => {
    it('should successfully delete an activity (Admin)', async () => {
      mockActivitiesRepo.findOne.mockResolvedValue(mockActivity);
      mockActivitiesRepo.remove.mockResolvedValue(mockActivity);

      await service.remove(mockActivity.id);

      expect(mockActivitiesRepo.findOne).toHaveBeenCalledWith({ where: { id: mockActivity.id } });
      expect(mockActivitiesRepo.remove).toHaveBeenCalledWith(mockActivity);
    });

    it('should throw ApiException when activity not found', async () => {
      mockActivitiesRepo.findOne.mockResolvedValue(null);

      try {
        await service.remove('nonexistent-id');
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getCode()).toBe(ApiErrorCode.ACTIVITY_NOT_FOUND);
      }
    });
  });

  describe('convertPhotoUrlsToPresigned (private method)', () => {
    it('should convert multiple photo URLs to presigned URLs', async () => {
      const activityWithMultiplePhotos = {
        ...mockActivity,
        photo_urls: [
          'https://s3.amazonaws.com/photo1.jpg',
          'https://s3.amazonaws.com/photo2.jpg',
          'https://s3.amazonaws.com/photo3.jpg',
        ],
      };

      mockActivitiesRepo.findOne.mockResolvedValue(activityWithMultiplePhotos);

      const result = await service.findOne(activityWithMultiplePhotos.id, mockUser as any);

      expect(s3Service.convertToPresignedUrl).toHaveBeenCalledTimes(3);
      expect(result.photo_urls).toHaveLength(3);
      expect(result.photo_urls[0]).toContain('presigned-');
    });

    it('should handle empty photo_urls array gracefully', async () => {
      const activityWithoutPhotos = { ...mockActivity, photo_urls: [] };
      mockActivitiesRepo.findOne.mockResolvedValue(activityWithoutPhotos);

      const result = await service.findOne(activityWithoutPhotos.id, mockUser as any);

      expect(s3Service.convertToPresignedUrl).not.toHaveBeenCalled();
      expect(result.photo_urls).toEqual([]);
    });

    it('should keep original URLs when S3 conversion fails', async () => {
      const originalUrl = 'https://s3.amazonaws.com/photo1.jpg';
      const activityWithPhotos = { ...mockActivity, photo_urls: [originalUrl] };
      mockActivitiesRepo.findOne.mockResolvedValue(activityWithPhotos);
      mockS3Service.convertToPresignedUrl.mockRejectedValue(new Error('S3 error'));

      const result = await service.findOne(activityWithPhotos.id, mockUser as any);

      // Should keep original URLs on error
      expect(result.photo_urls).toEqual([originalUrl]);
    });
  });
});
