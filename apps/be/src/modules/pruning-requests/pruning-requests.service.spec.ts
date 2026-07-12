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
import { PruningRequestFinderService } from './services/pruning-request-finder.service';
import { PruningRequestNotificationsService } from './services/pruning-request-notifications.service';
import { PruningRequestWorkflowService } from './services/pruning-request-workflow.service';
import { PruningRequest } from './entities/pruning-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
import { Task } from '../tasks/entities/task.entity';
import { ServiceCapacityService } from '../service-capacity/service-capacity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

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
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAdminData: User = {
    id: mockAdminId,
    username: 'admin_data_pusat_1',
    password_hash: 'hashed',
    full_name: 'Admin Data',
    phone_number: '081200000002',
    profile_picture_url: null,
    role: UserRole.ADMIN_DATA,
    rayon_id: mockRayonId,
    is_active: true,
    password_must_change: false,
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
    password_must_change: false,
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
    password_must_change: false,
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
    password_must_change: false,
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
    scheduledDate: null,
    expectedYear: null,
    expectedIsoWeek: null,
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
    assignedTaskId: null,
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
        // Real sub-services — behavior is exercised through the façade
        // against the same mocked repositories/services below.
        PruningRequestFinderService,
        PruningRequestNotificationsService,
        PruningRequestWorkflowService,
        {
          provide: getRepositoryToken(PruningRequest),
          useValue: mockPruningRequestRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ServiceCapacityService,
          useValue: mockServiceCapacityService,
        },
        {
          provide: NotificationsService,
          useValue: { sendToUser: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'sat-id', role: 'satgas' }),
          },
        },
      ],
    }).compile();

    service = module.get<PruningRequestsService>(PruningRequestsService);
    pruningRequestRepository = module.get(getRepositoryToken(PruningRequest)) as jest.Mocked<
      Repository<PruningRequest>
    >;
    userRepository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
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

      await expect(service.create(dto, mockStaffKecamatan)).rejects.toThrow(BadRequestException);
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

    // ── ADR-035 amendment 2026-05-01 (week-based booking) ────────────────
    it('stores expected_year + expected_iso_week when submitter picked a week', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: ['k1.jpg', 'k2.jpg', 'k3.jpg'],
        expected_year: 2030,
        expected_iso_week: 20,
        target_count: 5,
      };

      mockPruningRequestRepository.create.mockImplementation((entity) => entity as any);
      mockPruningRequestRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'new-id' } as any),
      );

      const result = await service.create(dto, mockStaffKecamatan);

      expect(result.expectedYear).toBe(2030);
      expect(result.expectedIsoWeek).toBe(20);
      expect(result.expectedDate).toBeNull();
    });

    it('rejects a preferred week that has fully passed', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: ['k1.jpg', 'k2.jpg', 'k3.jpg'],
        expected_year: 2020,
        expected_iso_week: 1,
      };

      await expect(service.create(dto, mockStaffKecamatan)).rejects.toThrow(BadRequestException);
    });

    it('derives the ISO week from a legacy detail_date submission', async () => {
      // 2026-05-04 (Monday) is week 19 of 2026.
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: ['k1.jpg', 'k2.jpg', 'k3.jpg'],
        detail_date: futureDateString(365), // any future date — exercises the derivation path
      };

      mockPruningRequestRepository.create.mockImplementation((entity) => entity as any);
      mockPruningRequestRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'legacy-id' } as any),
      );

      const result = await service.create(dto, mockStaffKecamatan);

      // May 9, 2026 — submit no longer writes `expected_date`; legacy
      // `detail_date` clients still get the ISO week derived for them so
      // the new (expectedYear, expectedIsoWeek) columns are populated.
      expect(result.expectedDate).toBeNull();
      expect(result.expectedYear).not.toBeNull();
      expect(result.expectedIsoWeek).toBeGreaterThanOrEqual(1);
      expect(result.expectedIsoWeek).toBeLessThanOrEqual(53);
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
        relations: ['submitter', 'reviewer', 'rayon'],
        // Audit H1: project list trims joined user rows to public-safe columns.
        select: expect.any(Object),
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
        relations: ['submitter', 'reviewer', 'rayon'],
        // Audit H1: project list trims joined user rows to public-safe columns.
        select: expect.any(Object),
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
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);

      const result = await service.findById(mockRequestId, mockStaffKecamatan);

      expect(result).toEqual(mockPruningRequest);
      expect(mockPruningRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRequestId },
        relations: ['submitter', 'reviewer', 'rayon'],
        // Audit H1: project list trims joined user rows to public-safe columns.
        select: expect.any(Object),
      });
    });

    it('should return request for rayon-scoped admin_data with matching rayon', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);

      const result = await service.findById(mockRequestId, mockAdminData);

      expect(result).toEqual(mockPruningRequest);
    });

    it('should deny access for rayon-scoped admin_data with non-matching rayon', async () => {
      const differentRayonId = 'different-rayon-id-99999999';
      const requestDifferentRayon = {
        ...mockPruningRequest,
        rayonId: 'request-rayon-id-11111111',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(requestDifferentRayon);

      const adminDifferentRayon = {
        ...mockAdminData,
        rayon_id: differentRayonId, // Different from request's rayon
      };

      await expect(service.findById(mockRequestId, adminDifferentRayon)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return request for kepala_rayon with matching rayon', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);

      const result = await service.findById(mockRequestId, mockKepalaRayon);

      expect(result).toEqual(mockPruningRequest);
    });

    it('should return request for superadmin (unrestricted)', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);

      const result = await service.findById(mockRequestId, mockSuperadmin);

      expect(result).toEqual(mockPruningRequest);
    });

    it('should deny access for random user (non-owner, non-admin)', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);

      await expect(service.findById(mockRequestId, mockRandomUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for non-existent request', async () => {
      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id', mockStaffKecamatan)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      const id = 'non-existent-id';
      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(id, mockStaffKecamatan)).rejects.toThrow(
        `Pruning request with ID ${id} not found`,
      );
    });
  });

  describe('review', () => {
    it('should approve a submitted request when schedule is set', async () => {
      const dto = { decision: 'approve' as const, reviewNotes: 'Approved' };
      // May 10, 2026 — `scheduledDate` is now required for approve. The
      // mobile UI already enforces this; the service-level guard mirrors
      // it. Tests that exercise the happy path must seed a scheduledDate.
      const scheduledRequest = {
        ...mockPruningRequest,
        scheduledDate: new Date(futureDateString(7)),
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(scheduledRequest);
      mockPruningRequestRepository.save.mockResolvedValue({
        ...scheduledRequest,
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

    it('should block approve when scheduledDate is null', async () => {
      const dto = { decision: 'approve' as const, reviewNotes: 'Approved' };
      // mockPruningRequest.scheduledDate is null — exercises the May 10
      // backend guard that prevents approved-without-date limbo.
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);

      await expect(service.review(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPruningRequestRepository.save).not.toHaveBeenCalled();
    });

    it('should allow reject without scheduledDate', async () => {
      // Reject path is unaffected by the schedule guard — admins must be
      // able to reject incomplete or invalid requests regardless of
      // whether they bothered to atur jadwal first.
      const dto = { decision: 'reject' as const, reviewNotes: 'Tidak valid' };
      mockPruningRequestRepository.findOne.mockResolvedValue(mockPruningRequest);
      mockPruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        status: 'rejected',
        reviewedBy: mockAdminId,
        reviewedAt: expect.any(Date),
        reviewNotes: 'Tidak valid',
      });

      const result = await service.review(mockRequestId, dto, mockAdminData);

      expect(result.status).toBe('rejected');
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

      await expect(service.review(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject review of already-approved request (conflict)', async () => {
      const dto = { decision: 'reject' as const };
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);

      await expect(service.review(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject review of non-existent request', async () => {
      const dto = { decision: 'approve' as const };
      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.review(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignToTask', () => {
    it('should convert approved request to task (idempotent)', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
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
        title: `Permintaan Perantingan ${approvedRequest.referenceCode}`,
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
                status: 'assigned',
                assignedTaskId: 'task-id',
              });
            }
            return Promise.resolve(mockTask);
          }),
        };
        return cb(mockEntityManager);
      });

      const result = await service.assignToTask(mockRequestId, dto, mockAdminData);

      expect(result.request.status).toBe('assigned');
      expect(mockServiceCapacityService.bookAtomic).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceType: 'pruning',
        }),
      );
    });

    it('should return existing task if already converted (idempotent)', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      const existingTask = { id: 'existing-task-id' };
      const requestWithTask = {
        ...mockPruningRequest,
        status: 'approved',
        assignedTaskId: 'existing-task-id',
      };

      mockPruningRequestRepository.findOne.mockResolvedValue(requestWithTask);
      mockTaskRepository.findOne.mockResolvedValue(existingTask);

      const result = await service.assignToTask(mockRequestId, dto, mockAdminData);

      expect(result.task.id).toBe('existing-task-id');
      expect(mockServiceCapacityService.bookAtomic).not.toHaveBeenCalled();
    });

    it('should deny admin_data convert access for mismatched rayon', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
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

      await expect(service.assignToTask(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject conversion of non-approved request', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
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

      await expect(service.assignToTask(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate capacity booking conflict', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
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

      await expect(service.assignToTask(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        ConflictException,
      );
    });

    // ── ADR-035 amendment 2026-05-01 (auto-pick day inside requested week) ──
    it('auto-picks the first day of the requested week when scheduledDate is omitted', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        // scheduledDate intentionally omitted
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      // Pick a far-future ISO week so candidate days are all in the future.
      const futureYear = new Date().getFullYear() + 2;
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
        rayonId: mockRayonId,
        expectedYear: futureYear,
        expectedIsoWeek: 25,
        expectedDate: null,
        scheduledDate: null,
      };

      const mockTask = {
        id: 'auto-task-id',
        title: `Permintaan Perantingan ${approvedRequest.referenceCode}`,
      };

      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);
      mockServiceCapacityService.bookAtomic.mockResolvedValue({ id: 'cap-id' });
      mockDataSource.transaction.mockImplementation(async (cb) => {
        const mockEntityManager = {
          create: jest.fn().mockReturnValue(mockTask),
          save: jest.fn().mockImplementation((entity) => {
            if (entity.referenceCode) {
              return Promise.resolve({
                ...entity,
                status: 'assigned',
                assignedTaskId: 'auto-task-id',
              });
            }
            return Promise.resolve(mockTask);
          }),
        };
        return cb(mockEntityManager);
      });

      const result = await service.assignToTask(mockRequestId, dto, mockAdminData);

      expect(mockServiceCapacityService.bookAtomic).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceType: 'pruning',
          year: futureYear,
          isoWeek: 25,
        }),
      );
      // May 9, 2026 — assignToTask now writes the admin-confirmed day to
      // `scheduled_date`, not the legacy `expected_date` column.
      expect(result.request.scheduledDate).toBeInstanceOf(Date);
    });

    it('rejects auto-pick when request has no week and admin omits scheduledDate', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved',
        rayonId: mockRayonId,
        expectedYear: null,
        expectedIsoWeek: null,
        expectedDate: null,
        scheduledDate: null,
      };
      mockPruningRequestRepository.findOne.mockResolvedValue(approvedRequest);

      await expect(service.assignToTask(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject conversion of non-existent request', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      mockPruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.assignToTask(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated list of all requests for top_management', async () => {
      const requests = [mockPruningRequest];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        // Audit H1: findAll now also calls leftJoin + addSelect to project
        // safe user columns on submitter/reviewer; mocks include those too.
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([requests, 1]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

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
        // Audit H1: findAll now also calls leftJoin + addSelect to project
        // safe user columns on submitter/reviewer; mocks include those too.
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPruningRequest], 1]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(mockAdminData, {
        page: 1,
        limit: 20,
      });

      // Since no status filter is provided, should call where (not andWhere)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pr.rayonId = :rayonId', {
        rayonId: mockRayonId,
      });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('pr.rayonId = :rayonId', {
        rayonId: mockRayonId,
      });
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        // Audit H1: findAll now also calls leftJoin + addSelect to project
        // safe user columns on submitter/reviewer; mocks include those too.
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPruningRequest], 1]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(mockSuperadmin, {
        status: 'approved',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pr.status = :status', {
        status: 'approved',
      });
    });

    it('should apply pagination correctly', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        // Audit H1: findAll now also calls leftJoin + addSelect to project
        // safe user columns on submitter/reviewer; mocks include those too.
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 100]),
      };

      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

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
        // Audit H1: findAll now also calls leftJoin + addSelect to project
        // safe user columns on submitter/reviewer; mocks include those too.
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(mockSuperadmin, {
        from: '2026-04-01',
        to: '2026-04-30',
        page: 1,
        limit: 20,
      });

      const fromCalls = mockQueryBuilder.andWhere.mock.calls.filter(([clause]: [string]) =>
        clause.includes(':from'),
      );
      const toCalls = mockQueryBuilder.andWhere.mock.calls.filter(([clause]: [string]) =>
        clause.includes(':to'),
      );
      expect(fromCalls.length).toBe(1);
      expect(toCalls.length).toBe(1);
    });

    it('should use where (not andWhere) for rayon filter when no status filter', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        // Audit H1: findAll now also calls leftJoin + addSelect to project
        // safe user columns on submitter/reviewer; mocks include those too.
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockPruningRequestRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll(mockAdminData, { page: 1, limit: 20 });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pr.rayonId = :rayonId', {
        rayonId: mockRayonId,
      });
    });
  });

  describe('assignToTask edge cases', () => {
    it('should reject conversion when request has no rayonId', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
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

      await expect(service.assignToTask(mockRequestId, dto, mockSuperadmin)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rethrow non-ConflictException errors from bookAtomic', async () => {
      const dto = {
        locationId: '11111111-1111-1111-1111-111111111101',
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

      await expect(service.assignToTask(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        'Database connection lost',
      );
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

      // May 9, 2026 — Atur Jadwal reschedule now writes `scheduled_date`.
      // The DTO field name (`expectedDate`) is API-stable for back-compat.
      expect(result.scheduledDate).toEqual(new Date(futureIso));
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException for admin_data on different rayon', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        rayonId: 'other-rayon-id',
        status: 'submitted',
      });

      await expect(
        service.reschedule(mockRequestId, { expectedDate: futureIso }, mockAdminData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when status is done', async () => {
      // May 10, 2026 (late+1) — `in_progress` was added to the whitelist;
      // the remaining blocked statuses are `done`, `rejected`, `cancelled`.
      // Done work is terminal and reschedule there is conceptually wrong.
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        status: 'done',
      });

      await expect(
        service.reschedule(mockRequestId, { expectedDate: futureIso }, mockKepalaRayon),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when status is rejected', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        status: 'rejected',
      });

      await expect(
        service.reschedule(mockRequestId, { expectedDate: futureIso }, mockKepalaRayon),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for past date', async () => {
      pruningRequestRepository.findOne.mockResolvedValue({
        ...mockPruningRequest,
        status: 'submitted',
      });

      await expect(
        service.reschedule(mockRequestId, { expectedDate: '2020-01-01' }, mockKepalaRayon),
      ).rejects.toThrow(BadRequestException);
    });

    // ─── Assigned-status cascade (May 10, 2026) ─────────────────────────
    describe('assigned cascade', () => {
      const taskId = 'task-uuid-1';
      const baseAssigned = () => ({
        ...mockPruningRequest,
        status: 'assigned' as const,
        assignedTaskId: taskId,
        scheduledDate: new Date(futureDateString(7)),
      });
      const linkedTask = () => ({
        id: taskId,
        title: 'Permintaan Perantingan PR-XYZ',
        assigned_to: 'sat-id',
        deadline: new Date(futureDateString(7)),
      });

      beforeEach(() => {
        // Transaction manager stub: `tm.save` and `tm.save(Entity, data)`
        // both delegate to a single mock so we can spy on calls.
        const tmSave = jest.fn().mockImplementation((arg1, arg2) => {
          if (arg2 !== undefined) return Promise.resolve(arg2);
          return Promise.resolve(arg1);
        });
        mockDataSource.transaction.mockImplementation(async (cb: any) => cb({ save: tmSave }));
        mockTaskRepository.findOne.mockResolvedValue(linkedTask());
      });

      it('rebooks capacity + bumps task deadline when ISO week changes', async () => {
        // Old date is 7 days ahead; pick 14 days ahead to force a different
        // ISO week. fixed-offset arithmetic only — never use `new Date()`.
        const newDate = new Date(futureDateString(14));
        const newIso = newDate.toISOString().slice(0, 10);

        pruningRequestRepository.findOne.mockResolvedValue(baseAssigned() as any);
        mockServiceCapacityService.bookAtomic.mockResolvedValue({});
        mockServiceCapacityService.releaseAtomic.mockResolvedValue({});

        const result = await service.reschedule(
          mockRequestId,
          { expectedDate: newIso },
          mockKepalaRayon,
        );

        expect(result.scheduledDate).toEqual(new Date(newIso));
        expect(mockServiceCapacityService.bookAtomic).toHaveBeenCalledWith(
          expect.objectContaining({ serviceType: 'pruning', units: 1 }),
        );
        expect(mockServiceCapacityService.releaseAtomic).toHaveBeenCalledWith(
          expect.objectContaining({ serviceType: 'pruning', units: 1 }),
        );
      });

      it('skips capacity rebook when staying within the same ISO week', async () => {
        // Old date and new date one day apart inside the same ISO week.
        const oldDate = new Date('2026-08-12'); // Wed, ISO 2026-W33
        const newDate = new Date('2026-08-14'); // Fri, same week
        pruningRequestRepository.findOne.mockResolvedValue({
          ...baseAssigned(),
          scheduledDate: oldDate,
        } as any);
        mockServiceCapacityService.bookAtomic.mockResolvedValue({});
        mockServiceCapacityService.releaseAtomic.mockResolvedValue({});

        await service.reschedule(
          mockRequestId,
          { expectedDate: newDate.toISOString().slice(0, 10) },
          mockKepalaRayon,
        );

        expect(mockServiceCapacityService.bookAtomic).not.toHaveBeenCalled();
        expect(mockServiceCapacityService.releaseAtomic).not.toHaveBeenCalled();
      });

      it('aborts before releasing old capacity when new week is full', async () => {
        const newDate = new Date(futureDateString(14));
        pruningRequestRepository.findOne.mockResolvedValue(baseAssigned() as any);
        mockServiceCapacityService.bookAtomic.mockRejectedValue(
          new ConflictException('Capacity exceeded'),
        );

        await expect(
          service.reschedule(
            mockRequestId,
            { expectedDate: newDate.toISOString().slice(0, 10) },
            mockKepalaRayon,
          ),
        ).rejects.toThrow(ConflictException);

        // Old booking must stay intact — release should NEVER fire when
        // the new booking failed.
        expect(mockServiceCapacityService.releaseAtomic).not.toHaveBeenCalled();
      });

      it('runs the same cascade when status is in_progress', async () => {
        // May 10 (late+1) — in_progress joined the whitelist. The cascade
        // path keys on `assignedTaskId` (the FK is set as soon as the
        // task is created) rather than the status, so in_progress runs
        // through the same rebook + deadline + audit + push code.
        const newDate = new Date(futureDateString(14));
        const inProgressRequest = {
          ...baseAssigned(),
          status: 'in_progress' as const,
        };
        pruningRequestRepository.findOne.mockResolvedValue(inProgressRequest as any);
        mockServiceCapacityService.bookAtomic.mockResolvedValue({});
        mockServiceCapacityService.releaseAtomic.mockResolvedValue({});

        const result = await service.reschedule(
          mockRequestId,
          { expectedDate: newDate.toISOString().slice(0, 10) },
          mockKepalaRayon,
        );

        expect(result.scheduledDate).toEqual(new Date(newDate.toISOString().slice(0, 10)));
        expect(mockServiceCapacityService.bookAtomic).toHaveBeenCalled();
      });

      it('falls back to non-cascading update when linked task is missing', async () => {
        // Defensive path — request says assigned but the FK no longer
        // resolves. Reschedule should still succeed (don't strand the
        // admin) but capacity rebook is skipped.
        const newDate = new Date(futureDateString(14));
        pruningRequestRepository.findOne.mockResolvedValue(baseAssigned() as any);
        mockTaskRepository.findOne.mockResolvedValue(null);

        const result = await service.reschedule(
          mockRequestId,
          { expectedDate: newDate.toISOString().slice(0, 10) },
          mockKepalaRayon,
        );

        expect(result.scheduledDate).toEqual(new Date(newDate.toISOString().slice(0, 10)));
        expect(mockServiceCapacityService.bookAtomic).not.toHaveBeenCalled();
      });
    });
  });

  // May 10, 2026 — cancel rules. Whitelist of cancellable statuses closes
  // the previous blacklist holes (rejected / converted / in_progress).
  describe('cancel', () => {
    const submitter = { ...mockStaffKecamatan } as User;
    const baseSave = (status: string) => ({
      ...mockPruningRequest,
      status,
      submittedBy: submitter.id,
    });

    it('lets the submitter cancel a `submitted` request', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('submitted') as any);
      pruningRequestRepository.save.mockImplementation((req) => Promise.resolve(req as any));

      const result = await service.cancel(mockRequestId, submitter, 'changed mind');

      expect(result.status).toBe('cancelled');
      expect(result.notes).toContain('[Dibatalkan] changed mind');
    });

    it('lets the submitter cancel a `under_review` request', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('under_review') as any);
      pruningRequestRepository.save.mockImplementation((req) => Promise.resolve(req as any));

      const result = await service.cancel(mockRequestId, submitter);
      expect(result.status).toBe('cancelled');
    });

    it('lets the submitter cancel an `approved` request', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('approved') as any);
      pruningRequestRepository.save.mockImplementation((req) => Promise.resolve(req as any));

      const result = await service.cancel(mockRequestId, submitter);
      expect(result.status).toBe('cancelled');
    });

    it('blocks cancel when status is `rejected`', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('rejected') as any);
      await expect(service.cancel(mockRequestId, submitter)).rejects.toThrow(ConflictException);
    });

    it('blocks cancel when status is `converted` (task already exists)', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('assigned') as any);
      await expect(service.cancel(mockRequestId, submitter)).rejects.toThrow(ConflictException);
    });

    it('blocks cancel when status is `in_progress`', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('in_progress') as any);
      await expect(service.cancel(mockRequestId, submitter)).rejects.toThrow(ConflictException);
    });

    it('blocks cancel when status is `done`', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('done') as any);
      await expect(service.cancel(mockRequestId, submitter)).rejects.toThrow(ConflictException);
    });

    it('blocks cancel when status is already `cancelled`', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('cancelled') as any);
      await expect(service.cancel(mockRequestId, submitter)).rejects.toThrow(ConflictException);
    });

    it('forbids non-submitter, non-admin from cancelling', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(baseSave('submitted') as any);
      await expect(service.cancel(mockRequestId, mockRandomUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when request missing', async () => {
      pruningRequestRepository.findOne.mockResolvedValue(null);
      await expect(service.cancel(mockRequestId, submitter)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const baseSave = (overrides = {}) => ({
      ...mockPruningRequest,
      ...overrides,
    });

    it('should update address when provided', async () => {
      const newAddress = 'Jalan Gatot Subroto No. 456, Surabaya';
      const dto = { address: newAddress };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        address: newAddress,
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.address).toEqual(newAddress);
      expect(pruningRequestRepository.save).toHaveBeenCalled();
      const savedArg = pruningRequestRepository.save.mock.calls[0][0];
      expect(savedArg.address).toEqual(newAddress);
    });

    it('should update notes when provided', async () => {
      const newNotes = 'Updated notes with new information';
      const dto = { notes: newNotes };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        notes: newNotes,
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.notes).toEqual(newNotes);
      const savedArg = pruningRequestRepository.save.mock.calls[0][0];
      expect(savedArg.notes).toEqual(newNotes);
    });

    it('should update tree details when provided', async () => {
      const dto = {
        treeCount: 20,
        treeHeightEstimate: '8-10 meter',
        treeDiameterEstimate: '40-60 cm',
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        ...dto,
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.treeCount).toEqual(20);
      expect(result.treeHeightEstimate).toEqual('8-10 meter');
      expect(result.treeDiameterEstimate).toEqual('40-60 cm');
    });

    it('should update requester contact information', async () => {
      const dto = {
        requesterName: 'Sinta Wijaya',
        requesterPhone: '081234567891',
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        ...dto,
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.requesterName).toEqual('Sinta Wijaya');
      expect(result.requesterPhone).toEqual('081234567891');
    });

    it('should update RT leader contact information', async () => {
      const dto = {
        rtLeaderName: 'Ibu Sari',
        rtLeaderPhone: '081298765433',
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        ...dto,
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.rtLeaderName).toEqual('Ibu Sari');
      expect(result.rtLeaderPhone).toEqual('081298765433');
    });

    it('should update multiple fields simultaneously', async () => {
      const dto = {
        address: 'Jalan Gatot Subroto No. 456, Surabaya',
        notes: 'Updated info',
        treeCount: 25,
        requesterName: 'New Requester',
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        ...dto,
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.address).toEqual(dto.address);
      expect(result.notes).toEqual(dto.notes);
      expect(result.treeCount).toEqual(dto.treeCount);
      expect(result.requesterName).toEqual(dto.requesterName);
    });

    it('should clear fields when passed empty strings or null values', async () => {
      const dto = {
        notes: '',
        treeHeightEstimate: '',
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        notes: '',
        treeHeightEstimate: '',
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result.notes).toEqual('');
      expect(result.treeHeightEstimate).toEqual('');
    });

    it('should not modify fields not in the DTO', async () => {
      const dto = { address: 'New Address' };
      const originalRequest = baseSave({
        notes: 'Original notes',
        treeCount: 15,
      });
      pruningRequestRepository.findOne.mockResolvedValue(originalRequest as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...originalRequest,
        address: 'New Address',
      });

      await service.update(mockRequestId, dto, mockAdminData);

      const savedArg = pruningRequestRepository.save.mock.calls[0][0];
      // Original fields should be preserved
      expect(savedArg.notes).toEqual('Original notes');
      expect(savedArg.treeCount).toEqual(15);
      // Modified field should be updated
      expect(savedArg.address).toEqual('New Address');
    });

    it('should allow admin_data with matching rayon', async () => {
      const dto = { address: 'New Address' };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        address: 'New Address',
      });

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result).toBeDefined();
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should deny admin_data with different rayon', async () => {
      const dto = { address: 'New Address' };
      const adminDifferentRayon = {
        ...mockAdminData,
        rayon_id: 'different-rayon-id',
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);

      await expect(service.update(mockRequestId, dto, adminDifferentRayon)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow kepala_rayon regardless of rayon', async () => {
      const dto = { address: 'New Address' };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        address: 'New Address',
      });

      const result = await service.update(mockRequestId, dto, mockKepalaRayon);

      expect(result).toBeDefined();
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should allow superadmin regardless of rayon', async () => {
      const dto = { address: 'New Address' };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        address: 'New Address',
      });

      const result = await service.update(mockRequestId, dto, mockSuperadmin);

      expect(result).toBeDefined();
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should allow top_management regardless of rayon', async () => {
      const dto = { address: 'New Address' };
      const topMgmt: User = {
        ...mockAdminData,
        id: '88888888-8888-8888-8888-888888888801',
        username: 'top_mgmt',
        role: UserRole.TOP_MANAGEMENT,
      };
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...mockPruningRequest,
        address: 'New Address',
      });

      const result = await service.update(mockRequestId, dto, topMgmt);

      expect(result).toBeDefined();
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when request not found', async () => {
      const dto = { address: 'New Address' };
      pruningRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockRequestId, dto, mockAdminData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should preserve status and other immutable fields', async () => {
      const dto = { address: 'New Address' };
      const originalRequest = baseSave({
        status: 'submitted',
        referenceCode: 'PR-1704067200000-abc12345',
      });
      pruningRequestRepository.findOne.mockResolvedValue(originalRequest as any);
      pruningRequestRepository.save.mockResolvedValue({
        ...originalRequest,
        address: 'New Address',
      });

      await service.update(mockRequestId, dto, mockAdminData);

      const savedArg = pruningRequestRepository.save.mock.calls[0][0];
      // Immutable fields should not change
      expect(savedArg.status).toEqual('submitted');
      expect(savedArg.referenceCode).toEqual('PR-1704067200000-abc12345');
    });

    it('should handle empty DTO (no-op update)', async () => {
      const dto = {};
      pruningRequestRepository.findOne.mockResolvedValue(baseSave() as any);
      pruningRequestRepository.save.mockResolvedValue(mockPruningRequest);

      const result = await service.update(mockRequestId, dto, mockAdminData);

      expect(result).toEqual(mockPruningRequest);
      // Still called, but with unchanged request
      expect(pruningRequestRepository.save).toHaveBeenCalled();
    });
  });
});
