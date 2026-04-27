import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequest } from './entities/pruning-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';

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

  const mockPruningRequestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
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
        detail_date: '2026-04-28',
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
        detail_date: '2026-04-26', // Past date
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
        detail_date: '2026-04-28',
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
});
