import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequest } from './entities/pruning-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';

// Use offsets relative to the test run so fixtures don't rot when the calendar advances.
function futureDateString(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe('PruningRequestsService', () => {
  let module: TestingModule;
  let service: PruningRequestsService;
  let pruningRequestRepository: jest.Mocked<Repository<PruningRequest>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockRequestId = '11111111-1111-1111-1111-111111111101';
  const mockRayonId = '22222222-2222-2222-2222-222222222201';
  const mockUserId = '33333333-3333-3333-3333-333333333301';
  const mockAdminId = '44444444-4444-4444-4444-444444444401';

  const mockStaffKecamatan: User = {
    id: mockUserId,
    username: 'staff_kecamatan1',
    password_hash: 'hashed',
    full_name: 'Kecamatan Staff',
    phone_number: '081200000001',
    profile_picture_url: null,
    role: UserRole.STAFF_KECAMATAN,
    rayon_id: mockRayonId,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAdminData: User = {
    id: mockAdminId,
    username: 'admin_data1',
    password_hash: 'hashed',
    full_name: 'Admin Data',
    phone_number: '081200000002',
    profile_picture_url: null,
    role: UserRole.ADMIN_DATA,
    rayon_id: mockRayonId,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockKepalaRayon: User = {
    id: '55555555-5555-5555-5555-555555555501',
    username: 'kepala_rayon1',
    password_hash: 'hashed',
    full_name: 'Kepala Rayon',
    phone_number: '081200000003',
    profile_picture_url: null,
    role: UserRole.KEPALA_RAYON,
    rayon_id: mockRayonId,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSuperadmin: User = {
    id: '66666666-6666-6666-6666-666666666601',
    username: 'superadmin',
    password_hash: 'hashed',
    full_name: 'Super Admin',
    phone_number: '081200000004',
    profile_picture_url: null,
    role: UserRole.SUPERADMIN,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRandomUser: User = {
    id: '77777777-7777-7777-7777-777777777701',
    username: 'random_user',
    password_hash: 'hashed',
    full_name: 'Random User',
    phone_number: '081200000005',
    profile_picture_url: null,
    role: UserRole.SATGAS,
    rayon_id: 'different-rayon-id',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPruningRequest: PruningRequest = {
    id: mockRequestId,
    referenceCode: 'PR-1704067200000-abc12345',
    submittedBy: mockUserId,
    kecamatanName: 'Kecamatan Staff',
    address: 'Jalan Darmo No. 123, Surabaya',
    gpsLat: -7.254883,
    gpsLng: 112.748899,
    expectedDate: new Date(futureDateString(7)),
    estimatedPlantCount: 15,
    treeCount: 15,
    treeHeightEstimate: '5-7 meter',
    treeDiameterEstimate: '30-40 cm',
    requesterName: 'Budi Santoso',
    requesterPhone: '081234567890',
    rtLeaderName: 'Pak Joko',
    rtLeaderPhone: '081298765432',
    photoUrls: [
      'pruning-requests/20260427-abc123-1.jpg',
      'pruning-requests/20260427-abc123-2.jpg',
      'pruning-requests/20260427-abc123-3.jpg',
    ],
    notes: 'Urgent: trees blocking the street',
    status: 'submitted',
    rayonId: mockRayonId,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    convertedTaskId: null,
    createdAt: new Date('2026-04-27'),
    updatedAt: new Date('2026-04-27'),
  };

  const mockPruningRequestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockServiceCapacityService = {
    bookAtomic: jest.fn(),
    releaseAtomic: jest.fn(),
  };

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PruningRequestsService,
        {
          provide: getRepositoryToken(PruningRequest),
          useValue: mockPruningRequestRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(require('../tasks/entities/task.entity').Task),
          useValue: mockTaskRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: require('../service-capacity/service-capacity.service')
            .ServiceCapacityService,
          useValue: mockServiceCapacityService,
        },
      ],
    }).compile();

    service = module.get<PruningRequestsService>(PruningRequestsService);
    pruningRequestRepository = module.get(
      getRepositoryToken(PruningRequest),
    ) as jest.Mocked<Repository<PruningRequest>>;
    userRepository = module.get(
      getRepositoryToken(User),
    ) as jest.Mocked<Repository<User>>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a pruning request with all fields', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: [
          'pruning-requests/20260427-abc123-1.jpg',
          'pruning-requests/20260427-abc123-2.jpg',
          'pruning-requests/20260427-abc123-3.jpg',
        ],
        detail_date: futureDateString(7),
        target_count: 15,
        notes: 'Urgent: trees blocking the street',
        rayon_id: mockRayonId,
      };

      mockPruningRequestRepository.create.mockReturnValue(mockPruningRequest);
      mockPruningRequestRepository.save.mockResolvedValue(mockPruningRequest);

      const result = await service.create(dto, mockStaffKecamatan);

      expect(result).toEqual(mockPruningRequest);
      expect(mockPruningRequestRepository.create).toHaveBeenCalled();
      expect(mockPruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should reject detail_date in the past', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: [
          'pruning-requests/20260427-abc123-1.jpg',
          'pruning-requests/20260427-abc123-2.jpg',
          'pruning-requests/20260427-abc123-3.jpg',
        ],
        detail_date: futureDateString(-1), // Past date (yesterday)
        target_count: 15,
      };

      await expect(service.create(dto, mockStaffKecamatan)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dto, mockStaffKecamatan)).rejects.toThrow(
        'Detail date must be today or in the future',
      );
    });

    it('should generate unique reference codes', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: [
          'pruning-requests/20260427-abc123-1.jpg',
          'pruning-requests/20260427-abc123-2.jpg',
          'pruning-requests/20260427-abc123-3.jpg',
        ],
        detail_date: futureDateString(7),
        target_count: 15,
      };

      const request1 = { ...mockPruningRequest, id: 'id1' };
      const request2 = { ...mockPruningRequest, id: 'id2' };

      mockPruningRequestRepository.create.mockReturnValueOnce(request1);
      mockPruningRequestRepository.save.mockResolvedValueOnce(request1);

      const result1 = await service.create(dto, mockStaffKecamatan);

      mockPruningRequestRepository.create.mockReturnValueOnce(request2);
      mockPruningRequestRepository.save.mockResolvedValueOnce(request2);

      const result2 = await service.create(dto, mockStaffKecamatan);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('findMine', () => {
    it('should return requests submitted by the user', async () => {
      const requests = [mockPruningRequest];
      mockPruningRequestRepository.find.mockResolvedValue(requests);

      const result = await service.findMine(mockStaffKecamatan);

      expect(result).toEqual(requests);
      expect(mockPruningRequestRepository.find).toHaveBeenCalledWith({
        where: { submittedBy: mockUserId },
        order: { createdAt: 'DESC' },
        take: 20,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      const requests: PruningRequest[] = [];
      mockPruningRequestRepository.find.mockResolvedValue(requests);

      await service.findMine(mockStaffKecamatan, 50, 100);

      expect(mockPruningRequestRepository.find).toHaveBeenCalledWith({
        where: { submittedBy: mockUserId },
        order: { createdAt: 'DESC' },
        take: 50,
        skip: 100,
      });
    });

    it('should return empty array when no requests exist', async () => {
      const emptyRequests: PruningRequest[] = [];
      mockPruningRequestRepository.find.mockResolvedValue(emptyRequests);

      const result = await service.findMine(mockStaffKecamatan);

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return request for owner', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(
        mockPruningRequest,
      );

      const result = await service.findById(mockRequestId, mockStaffKecamatan);

      expect(result).toEqual(mockPruningRequest);
      expect(mockPruningRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRequestId },
      });
    });

    it('should return request for rayon-scoped admin_data with matching rayon', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(
        mockPruningRequest,
      );

      const result = await service.findById(mockRequestId, mockAdminData);

      expect(result).toEqual(mockPruningRequest);
    });

    it('should deny access for rayon-scoped admin_data with non-matching rayon', async () => {
      const differentRayonId = 'different-rayon-id-99999999';
      const requestDifferentRayon = {
        ...mockPruningRequest,
        rayonId: 'request-rayon-id-11111111',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(
        requestDifferentRayon,
      );

      const adminDifferentRayon = {
        ...mockAdminData,
        rayon_id: differentRayonId, // Different from request's rayon
      };

      await expect(
        service.findById(mockRequestId, adminDifferentRayon),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return request for kepala_rayon with matching rayon', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(
        mockPruningRequest,
      );

      const result = await service.findById(mockRequestId, mockKepalaRayon);

      expect(result).toEqual(mockPruningRequest);
    });

    it('should return request for superadmin (unrestricted)', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(
        mockPruningRequest,
      );

      const result = await service.findById(mockRequestId, mockSuperadmin);

      expect(result).toEqual(mockPruningRequest);
    });

    it('should deny access for random user (non-owner, non-admin)', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(
        mockPruningRequest,
      );

      await expect(
        service.findById(mockRequestId, mockRandomUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent request', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById('non-existent-id', mockStaffKecamatan),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      const id = 'non-existent-id';
      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById(id, mockStaffKecamatan),
      ).rejects.toThrow(`Pruning request with ID ${id} not found`);
    });
  });

  describe('review', () => {
    it('should approve a submitted request', async () => {
      const dto = { decision: 'approve' as const, reviewNotes: 'Approved' };
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);
      mockPruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        status: 'approved',
        reviewedBy: mockAdminId,
        reviewedAt: expect.any(Date),
        reviewNotes: 'Approved',
      });

      const result = await service.review(mockRequestId, dto, mockAdminData);

      expect(result.status).toBe('approved');
      expect(result.reviewedBy).toBe(mockAdminId);
      expect(mockPruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should reject a submitted request', async () => {
      const dto = {
        decision: 'reject' as const,
        reviewNotes: 'Does not meet criteria',
      };
      const submittedRequest = {
        ...mockPruningRequest,
        status: 'submitted',
      } as PruningRequest;
      mockPruningRequestRepository.findOne.mockResolvedValue(submittedRequest);
      mockPruningRequestRepository.save.mockResolvedValue({
        ...submittedRequest,
        status: 'rejected',
        reviewedBy: mockAdminId,
        reviewedAt: expect.any(Date),
        reviewNotes: 'Does not meet criteria',
      });

      const result = await service.review(mockRequestId, dto, mockAdminData);

      expect(result.status).toBe('rejected');
      expect(mockPruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should deny admin_data review access for mismatched rayon', async () => {
      const dto = { decision: 'approve' as const };
      const mismatchedRequest = {
        ...mockPruningRequest,
        rayonId: 'different-rayon-id',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(mismatchedRequest);

      await expect(
        service.review(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject review of already-approved request (conflict)', async () => {
      const dto = { decision: 'reject' as const };
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);

      await expect(
        service.review(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject review of non-existent request', async () => {
      const dto = { decision: 'approve' as const };
      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.review(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('convertToTask', () => {
    it('should convert approved request to task (idempotent)', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
        units: 15,
      };

      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
        rayonId: mockRayonId,
      };

      const mockTask = {
        id: 'task-id',
        title: `Pruning Request ${approvedRequest.referenceCode}`,
      };

      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);
      mockServiceCapacityService.bookAtomic.mockResolvedValue({
        id: 'capacity-id',
      });
      mockDataSource.transaction.mockImplementation(async (cb) => {
        const mockEntityManager = {
          create: jest.fn().mockReturnValue(mockTask),
          save: jest.fn().mockImplementation((entity) => {
            // Return the entity with updated status if it's a request
            if (entity.referenceCode) {
              return Promise.resolve({
                ...entity,
                status: 'converted',
                convertedTaskId: 'task-id',
              });
            }
            return Promise.resolve(mockTask);
          }),
        };
        return cb(mockEntityManager);
      });

      const result = await service.convertToTask(mockRequestId, dto, mockAdminData);

      expect(result.request.status).toBe('converted');
      expect(mockServiceCapacityService.bookAtomic).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceType: 'pruning',
        }),
      );
    });

    it('should return existing task if already converted (idempotent)', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      const existingTask = { id: 'existing-task-id' };
      const requestWithTask = {
        ...mockPruningRequest,
        status: 'approved',
        convertedTaskId: 'existing-task-id',
      };

      mockPruningRequestRepository.findOne.mockResolvedValue(requestWithTask);
      mockTaskRepository.findOne.mockResolvedValue(existingTask);

      const result = await service.convertToTask(mockRequestId, dto, mockAdminData);

      expect(result.task.id).toBe('existing-task-id');
      expect(mockServiceCapacityService.bookAtomic).not.toHaveBeenCalled();
    });

    it('should deny admin_data convert access for mismatched rayon', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      const mismatchedRequest = {
        ...mockPruningRequest,
        rayonId: 'different-rayon-id',
        status: 'approved',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(mismatchedRequest);

      await expect(
        service.convertToTask(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject conversion of non-approved request', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      const submittedRequest = {
        ...mockPruningRequest,
        status: 'submitted',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(submittedRequest);

      await expect(
        service.convertToTask(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate capacity booking conflict', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
        rayonId: mockRayonId,
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);
      mockServiceCapacityService.bookAtomic.mockRejectedValue(
        new ConflictException('Capacity exceeded'),
      );
      mockDataSource.transaction.mockImplementation(async (cb) => {
        return cb({});
      });

      await expect(
        service.convertToTask(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject conversion of non-existent request', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.convertToTask(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of all requests for top_management', async () => {
      const requests = [mockPruningRequest];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([requests, 1]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll(mockSuperadmin, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should auto-filter admin_data by their rayon', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockPruningRequest], 1]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll(mockAdminData, {
        page: 1,
        limit: 20,
      });

      // Since no status filter is provided, should call where (not andWhere)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pr.rayonId = :rayonId',
        { rayonId: mockRayonId },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'pr.rayonId = :rayonId',
        { rayonId: mockRayonId },
      );
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockPruningRequest], 1]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll(mockSuperadmin, {
        status: 'approved',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pr.status = :status',
        { status: 'approved' },
      );
    });

    it('should apply pagination correctly', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[], 100]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findAll(mockSuperadmin, {
        page: 3,
        limit: 25,
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);
      expect(result.page).toBe(3);
    });

    it('should apply from/to date range filters', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll(mockSuperadmin, {
        from: '2026-04-01',
        to: '2026-04-30',
        page: 1,
        limit: 20,
      });

      const fromCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        ([clause]: [string]) => clause.includes(':from'),
      );
      const toCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        ([clause]: [string]) => clause.includes(':to'),
      );
      expect(fromCalls.length).toBe(1);
      expect(toCalls.length).toBe(1);
    });

    it('should use where (not andWhere) for rayon filter when no status filter', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await service.findAll(mockAdminData, { page: 1, limit: 20 });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pr.rayonId = :rayonId',
        { rayonId: mockRayonId },
      );
    });
  });

  describe('convertToTask edge cases', () => {
    it('should reject conversion when request has no rayonId', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
        rayonId: null,
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);
      mockDataSource.transaction.mockImplementation(async (cb) => cb({}));

      await expect(
        service.convertToTask(mockRequestId, dto, mockSuperadmin),
      ).rejects.toThrow(ConflictException);
    });

    it('should rethrow non-ConflictException errors from bookAtomic', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
        rayonId: mockRayonId,
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);
      mockServiceCapacityService.bookAtomic.mockRejectedValue(
        new Error('Database connection lost'),
      );
      mockDataSource.transaction.mockImplementation(async (cb) => cb({}));

      await expect(
        service.convertToTask(mockRequestId, dto, mockAdminData),
      ).rejects.toThrow('Database connection lost');
    });
  });

  describe('reschedule', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const futureIso = futureDate.toISOString().slice(0, 10);

    beforeEach(() => {
      pruningRequestRepository.save.mockImplementation(async (r) => r as any);
    });

    it('updates expectedDate for kepala_rayon', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        status: 'submitted',
      });

      const result = await service.reschedule(
        mockRequestId,
        { expectedDate: futureIso },
        mockKepalaRayon,
      );

      expect(result.expectedDate).toEqual(new Date(futureIso));
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException for admin_data on different rayon', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        rayonId: 'other-rayon-id',
        status: 'submitted',
      });

      await expect(
        service.reschedule(
          mockRequestId,
          { expectedDate: futureIso },
          mockAdminData,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when status is converted', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        status: 'converted',
      });

      await expect(
        service.reschedule(
          mockRequestId,
          { expectedDate: futureIso },
          mockKepalaRayon,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for past date', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        status: 'submitted',
      });

      await expect(
        service.reschedule(
          mockRequestId,
          { expectedDate: '2020-01-01' },
          mockKepalaRayon,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when request missing', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reschedule(
          mockRequestId,
          { expectedDate: futureIso },
          mockKepalaRayon,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
