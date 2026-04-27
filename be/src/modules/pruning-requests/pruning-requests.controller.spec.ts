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

      const result = await controller.findAll('true', '20', '0', mockStaffKecamatan);

      expect(result).toEqual(requests);
      expect(service.findMine).toHaveBeenCalledWith(mockStaffKecamatan, 20, 0);
    });

    it('should use default pagination when limit/offset not provided', async () => {
      const requests: PruningRequest[] = [mockPruningRequest];
      service.findMine.mockResolvedValue(requests);

      const result = await controller.findAll('true', undefined, undefined, mockStaffKecamatan);

      expect(result).toEqual(requests);
      expect(service.findMine).toHaveBeenCalledWith(mockStaffKecamatan, 20, 0);
    });

    it('should parse custom limit and offset', async () => {
      const requests: PruningRequest[] = [];
      service.findMine.mockResolvedValue(requests);

      await controller.findAll('true', '50', '100', mockStaffKecamatan);

      expect(service.findMine).toHaveBeenCalledWith(
        mockStaffKecamatan,
        50,
        100,
      );
    });

    it('should reject invalid limit', async () => {
      await expect(
        controller.findAll('true', 'invalid', '0', mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', 'invalid', '0', mockStaffKecamatan),
      ).rejects.toThrow('Invalid limit value');
    });

    it('should reject negative limit', async () => {
      await expect(
        controller.findAll('true', '-1', '0', mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', '-1', '0', mockStaffKecamatan),
      ).rejects.toThrow('Invalid limit value');
    });

    it('should reject invalid offset', async () => {
      await expect(
        controller.findAll('true', '20', 'invalid', mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', '20', 'invalid', mockStaffKecamatan),
      ).rejects.toThrow('Invalid offset value');
    });

    it('should reject negative offset', async () => {
      await expect(
        controller.findAll('true', '20', '-1', mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('true', '20', '-1', mockStaffKecamatan),
      ).rejects.toThrow('Invalid offset value');
    });

    it('should reject mine=false (not yet supported)', async () => {
      await expect(
        controller.findAll('false', undefined, undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('false', undefined, undefined, mockStaffKecamatan),
      ).rejects.toThrow(
        'Filtering by rayon_id and status is not yet supported',
      );
    });

    it('should reject no filter specified', async () => {
      await expect(
        controller.findAll(undefined, undefined, undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll(undefined, undefined, undefined, mockStaffKecamatan),
      ).rejects.toThrow(
        'Please specify mine=true to get your submissions',
      );
    });

    it('should reject invalid mine value', async () => {
      await expect(
        controller.findAll('maybe', undefined, undefined, mockStaffKecamatan),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.findAll('maybe', undefined, undefined, mockStaffKecamatan),
      ).rejects.toThrow(
        'Filtering by rayon_id and status is not yet supported',
      );
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
});
