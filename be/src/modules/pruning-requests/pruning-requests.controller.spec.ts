import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PruningRequestsController } from './pruning-requests.controller';
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequest } from './entities/pruning-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';

describe('PruningRequestsController', () => {
  let module: TestingModule;
  let controller: PruningRequestsController;
  let service: jest.Mocked<PruningRequestsService>;

  const mockUserId = '33333333-3333-3333-3333-333333333301';
  const mockRequestId = '11111111-1111-1111-1111-111111111101';
  const mockRayonId = '22222222-2222-2222-2222-222222222201';

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

  const mockPruningRequest: PruningRequest = {
    id: mockRequestId,
    referenceCode: 'PR-1704067200000-abc12345',
    submittedBy: mockUserId,
    kecamatanName: 'Kecamatan Staff',
    address: 'Jalan Darmo No. 123, Surabaya',
    gpsLat: -7.254883,
    gpsLng: 112.748899,
    expectedDate: new Date('2026-04-28'),
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

  const mockPruningRequestsService = {
    create: jest.fn(),
    findMine: jest.fn(),
    findById: jest.fn(),
    review: jest.fn(),
    convertToTask: jest.fn(),
    reschedule: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [PruningRequestsController],
      providers: [
        {
          provide: PruningRequestsService,
          useValue: mockPruningRequestsService,
        },
      ],
    }).compile();

    controller = module.get<PruningRequestsController>(
      PruningRequestsController,
    );
    service = module.get(PruningRequestsService) as jest.Mocked<
      PruningRequestsService
    >;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a pruning request', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: [
          'pruning-requests/20260427-abc123-1.jpg',
          'pruning-requests/20260427-abc123-2.jpg',
          'pruning-requests/20260427-abc123-3.jpg',
        ],
        detail_date: '2026-04-28',
        target_count: 15,
        notes: 'Urgent: trees blocking the street',
        rayon_id: mockRayonId,
      };

      service.create.mockResolvedValue(mockPruningRequest);

      const result = await controller.create(dto, mockStaffKecamatan);

      expect(result).toEqual(mockPruningRequest);
      expect(service.create).toHaveBeenCalledWith(dto, mockStaffKecamatan);
    });

    it('should pass through service exceptions', async () => {
      const dto: CreatePruningRequestDto = {
        address: 'Jalan Darmo No. 123, Surabaya',
        lat: -7.254883,
        lng: 112.748899,
        photo_keys: [
          'pruning-requests/20260427-abc123-1.jpg',
          'pruning-requests/20260427-abc123-2.jpg',
          'pruning-requests/20260427-abc123-3.jpg',
        ],
        detail_date: '2026-04-26', // Past date
        target_count: 15,
      };

      service.create.mockRejectedValue(
        new BadRequestException('Detail date must be today or in the future'),
      );

      await expect(controller.create(dto, mockStaffKecamatan)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return user\'s requests when mine=true', async () => {
      const requests: PruningRequest[] = [mockPruningRequest];
      service.findMine.mockResolvedValue(requests);

      const result = await controller.findAll('true', '20', '0', undefined, mockStaffKecamatan);

      expect(result).toEqual(requests);
      expect(service.findMine).toHaveBeenCalledWith(mockStaffKecamatan, 20, 0);
    });

    it('should use default pagination when limit/offset not provided', async () => {
      const requests: PruningRequest[] = [mockPruningRequest];
      service.findMine.mockResolvedValue(requests);

      const result = await controller.findAll('true', undefined, undefined, undefined, mockStaffKecamatan);

      expect(result).toEqual(requests);
      expect(service.findMine).toHaveBeenCalledWith(mockStaffKecamatan, 20, 0);
    });

    it('should parse custom limit and offset', async () => {
      const requests: PruningRequest[] = [];
      service.findMine.mockResolvedValue(requests);

      await controller.findAll('true', '50', '100', undefined, mockStaffKecamatan);

      expect(service.findMine).toHaveBeenCalledWith(
        mockStaffKecamatan,
        50,
        100,
      );
    });

    it('should reject invalid limit', async () => {
      await expect(
        controller.findAll('true', 'invalid', '0', undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', 'invalid', '0', undefined, mockStaffKecamatan),
      ).rejects.toThrow('Invalid limit value');
    });

    it('should reject negative limit', async () => {
      await expect(
        controller.findAll('true', '-1', '0', undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', '-1', '0', undefined, mockStaffKecamatan),
      ).rejects.toThrow('Invalid limit value');
    });

    it('should reject invalid offset', async () => {
      await expect(
        controller.findAll('true', '20', 'invalid', undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', '20', 'invalid', undefined, mockStaffKecamatan),
      ).rejects.toThrow('Invalid offset value');
    });

    it('should reject negative offset', async () => {
      await expect(
        controller.findAll('true', '20', '-1', undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', '20', '-1', undefined, mockStaffKecamatan),
      ).rejects.toThrow('Invalid offset value');
    });

    it('should call findAll when mine=false', async () => {
      service.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll('false', undefined, undefined, {}, mockStaffKecamatan);

      expect(service.findAll).toHaveBeenCalled();
    });

    it('should call findAll when no filter specified', async () => {
      service.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll(undefined, undefined, undefined, {}, mockStaffKecamatan);

      expect(service.findAll).toHaveBeenCalled();
    });

    it('should reject invalid mine value', async () => {
      await expect(
        controller.findAll('maybe', undefined, undefined, {}, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('maybe', undefined, undefined, {}, mockStaffKecamatan),
      ).rejects.toThrow('mine parameter must be true, false, or omitted');
    });
  });

  describe('findOne', () => {
    it('should return a single pruning request by ID', async () => {
      service.findById.mockResolvedValue(mockPruningRequest);

      const result = await controller.findOne(mockRequestId, mockStaffKecamatan);

      expect(result).toEqual(mockPruningRequest);
      expect(service.findById).toHaveBeenCalledWith(mockRequestId, mockStaffKecamatan);
    });

    it('should pass through service exceptions', async () => {
      service.findById.mockRejectedValue(
        new Error('Not found'),
      );

      await expect(
        controller.findOne(mockRequestId, mockStaffKecamatan),
      ).rejects.toThrow();
    });
  });

  describe('review', () => {
    it('should approve a pruning request', async () => {
      const dto = { decision: 'approve' as const, reviewNotes: 'Approved' };
      const updated: PruningRequest = {
        ...mockPruningRequest,
        status: 'approved',
        reviewedBy: mockUserId,
        reviewedAt: new Date(),
        reviewNotes: 'Approved',
      };
      service.review.mockResolvedValue(updated);

      const result = await controller.review(mockRequestId, dto, mockStaffKecamatan);

      expect(result.status).toBe('approved');
      expect(service.review).toHaveBeenCalledWith(mockRequestId, dto, mockStaffKecamatan);
    });

    it('should reject a pruning request', async () => {
      const dto = { decision: 'reject' as const, reviewNotes: 'Not eligible' };
      const updated: PruningRequest = {
        ...mockPruningRequest,
        status: 'rejected',
        reviewedBy: mockUserId,
        reviewedAt: new Date(),
        reviewNotes: 'Not eligible',
      };
      service.review.mockResolvedValue(updated);

      const result = await controller.review(mockRequestId, dto, mockStaffKecamatan);

      expect(result.status).toBe('rejected');
      expect(service.review).toHaveBeenCalled();
    });

    it('should pass through service exceptions', async () => {
      const dto = { decision: 'approve' as const };
      service.review.mockRejectedValue(
        new Error('Not reviewable'),
      );

      await expect(
        controller.review(mockRequestId, dto, mockStaffKecamatan),
      ).rejects.toThrow();
    });
  });

  describe('convertToTask', () => {
    it('should convert approved request to task', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
        units: 15,
      };

      const mockTask = {
        id: 'task-id',
        title: `Pruning Request ${mockPruningRequest.referenceCode}`,
      };

      const updated: PruningRequest = {
        ...mockPruningRequest,
        status: 'converted',
        convertedTaskId: 'task-id',
      };

      service.convertToTask.mockResolvedValue({
        request: updated,
        task: mockTask as any,
      });

      const result = await controller.convertToTask(
        mockRequestId,
        dto,
        mockStaffKecamatan,
      );

      expect(result.request.status).toBe('converted');
      expect(result.task.id).toBe('task-id');
      expect(service.convertToTask).toHaveBeenCalledWith(
        mockRequestId,
        dto,
        mockStaffKecamatan,
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
      const request: PruningRequest = {
        ...mockPruningRequest,
        status: 'converted',
        convertedTaskId: 'existing-task-id',
      };

      service.convertToTask.mockResolvedValue({
        request,
        task: existingTask as any,
      });

      const result = await controller.convertToTask(
        mockRequestId,
        dto,
        mockStaffKecamatan,
      );

      expect(result.task.id).toBe('existing-task-id');
    });

    it('should pass through service exceptions', async () => {
      const dto = {
        areaId: '11111111-1111-1111-1111-111111111101',
        assignedTo: '33333333-3333-3333-3333-333333333301',
        scheduledDate: '2026-04-28',
        caseType: 'GT' as const,
        pruningAction: 'PM' as const,
      };

      service.convertToTask.mockRejectedValue(
        new Error('Cannot convert'),
      );

      await expect(
        controller.convertToTask(mockRequestId, dto, mockStaffKecamatan),
      ).rejects.toThrow();
    });
  });

  describe('reschedule', () => {
    it('should delegate to service.reschedule', async () => {
      const dto = { expectedDate: '2026-05-12' };
      const updated: PruningRequest = {
        ...mockPruningRequest,
        expectedDate: new Date('2026-05-12'),
      };
      service.reschedule.mockResolvedValue(updated);

      const result = await controller.reschedule(
        mockRequestId,
        dto,
        mockStaffKecamatan,
      );

      expect(result.expectedDate).toEqual(new Date('2026-05-12'));
      expect(service.reschedule).toHaveBeenCalledWith(
        mockRequestId,
        dto,
        mockStaffKecamatan,
      );
    });

    it('should pass through service exceptions', async () => {
      service.reschedule.mockRejectedValue(new Error('Cannot reschedule'));
      await expect(
        controller.reschedule(mockRequestId, { expectedDate: '2026-05-12' }, mockStaffKecamatan),
      ).rejects.toThrow();
    });
  });

  describe('findAll (admin list)', () => {
    it('should return paginated list of all requests', async () => {
      const requests = [mockPruningRequest];
      service.findAll.mockResolvedValue({
        items: requests,
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        {},
        mockStaffKecamatan,
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const query = { status: 'approved', page: 1, limit: 20 };
      service.findAll.mockResolvedValue({
        items: [mockPruningRequest],
        total: 1,
        page: 1,
        limit: 20,
      });

      await controller.findAll(
        undefined,
        undefined,
        undefined,
        query,
        mockStaffKecamatan,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        mockStaffKecamatan,
        expect.objectContaining({ status: 'approved' }),
      );
    });

    it('should apply pagination', async () => {
      const query = { page: 2, limit: 10 };
      service.findAll.mockResolvedValue({
        items: [],
        total: 100,
        page: 2,
        limit: 10,
      });

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        query,
        mockStaffKecamatan,
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should reject invalid mine parameter', async () => {
      await expect(
        controller.findAll(
          'invalid',
          undefined,
          undefined,
          {},
          mockStaffKecamatan,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
