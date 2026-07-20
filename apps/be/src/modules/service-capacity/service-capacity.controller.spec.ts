import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ServiceCapacityController } from './service-capacity.controller';
import { ServiceCapacityService } from './service-capacity.service';
import { ServiceCapacity } from './entities/service-capacity.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('ServiceCapacityController', () => {
  let module: TestingModule;
  let controller: ServiceCapacityController;
  let service: jest.Mocked<ServiceCapacityService>;

  const mockDistrictId = 'district-11111111-1111-1111-1111-111111111111';
  const mockYear = 2026;
  const mockServiceType = 'pruning';

  const mockCapacity: ServiceCapacity = {
    id: 'cap-11111111-1111-1111-1111-111111111111',
    districtId: mockDistrictId,
    year: mockYear,
    isoWeek: 20,
    serviceType: mockServiceType,
    capacityUnits: 50,
    bookedUnits: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminData: User = {
    id: 'user-11111111-1111-1111-1111-111111111111',
    username: 'admin_rayon_pusat_1',
    password_hash: 'hash',
    full_name: 'Admin Data',
    phone_number: '081200000001',
    profile_picture_url: null,
    role: UserRole.ADMIN_RAYON,
    district_id: mockDistrictId,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockKepalaDistrict: User = {
    id: 'user-22222222-2222-2222-2222-222222222222',
    username: 'kepala_rayon1',
    password_hash: 'hash',
    full_name: 'Kepala Rayon',
    phone_number: '081200000002',
    profile_picture_url: null,
    role: UserRole.KEPALA_RAYON,
    district_id: mockDistrictId,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTopManagement: User = {
    id: 'user-33333333-3333-3333-3333-333333333333',
    username: 'top_mgmt1',
    password_hash: 'hash',
    full_name: 'Top Management',
    phone_number: '081200000003',
    profile_picture_url: null,
    role: UserRole.MANAGEMENT,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSuperadmin: User = {
    id: 'user-44444444-4444-4444-4444-444444444444',
    username: 'superadmin1',
    password_hash: 'hash',
    full_name: 'Superadmin',
    phone_number: '081200000004',
    profile_picture_url: null,
    role: UserRole.SUPERADMIN,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockStaffKecamatan: User = {
    id: 'user-55555555-5555-5555-5555-555555555555',
    username: 'staff_kec1',
    password_hash: 'hash',
    full_name: 'Staff Kecamatan',
    phone_number: '081200000005',
    profile_picture_url: null,
    role: UserRole.STAFF_KECAMATAN,
    district_id: mockDistrictId,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockService = {
    findCalendar: jest.fn(),
    upsertCapacity: jest.fn(),
    bookAtomic: jest.fn(),
    releaseAtomic: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ServiceCapacityController],
      providers: [
        {
          provide: ServiceCapacityService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ServiceCapacityController>(ServiceCapacityController);
    service = module.get(ServiceCapacityService) as jest.Mocked<ServiceCapacityService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /districts/:districtId/capacity', () => {
    it('should return calendar for admin_rayon in own district', async () => {
      mockService.findCalendar.mockResolvedValue([mockCapacity]);

      const result = await controller.findCalendar(
        mockDistrictId,
        {
          year: mockYear,
        },
        mockAdminData,
      );

      expect(result).toEqual([mockCapacity]);
      expect(service.findCalendar).toHaveBeenCalledWith({
        districtId: mockDistrictId,
        year: mockYear,
      });
    });

    it('should throw ForbiddenException for admin_rayon cross-district access', async () => {
      const otherDistrictId = 'district-99999999-9999-9999-9999-999999999999';

      await expect(
        controller.findCalendar(otherDistrictId, { year: mockYear }, mockAdminData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow kepala_rayon access any district', async () => {
      mockService.findCalendar.mockResolvedValue([mockCapacity]);

      const result = await controller.findCalendar(
        mockDistrictId,
        {
          year: mockYear,
        },
        mockKepalaDistrict,
      );

      expect(result).toEqual([mockCapacity]);
    });

    it('should allow management access any district', async () => {
      mockService.findCalendar.mockResolvedValue([mockCapacity]);

      const result = await controller.findCalendar(
        mockDistrictId,
        {
          year: mockYear,
        },
        mockTopManagement,
      );

      expect(result).toEqual([mockCapacity]);
    });

    it('should allow superadmin access any district', async () => {
      mockService.findCalendar.mockResolvedValue([mockCapacity]);

      const result = await controller.findCalendar(
        mockDistrictId,
        {
          year: mockYear,
        },
        mockSuperadmin,
      );

      expect(result).toEqual([mockCapacity]);
    });

    it('should allow staff_kecamatan to read own district', async () => {
      mockService.findCalendar.mockResolvedValue([mockCapacity]);

      const result = await controller.findCalendar(
        mockDistrictId,
        { year: mockYear },
        mockStaffKecamatan,
      );

      expect(result).toEqual([mockCapacity]);
    });

    it('should throw ForbiddenException for staff_kecamatan cross-district access', async () => {
      const otherDistrictId = 'district-99999999-9999-9999-9999-999999999999';

      await expect(
        controller.findCalendar(otherDistrictId, { year: mockYear }, mockStaffKecamatan),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass through query filters', async () => {
      mockService.findCalendar.mockResolvedValue([mockCapacity]);

      await controller.findCalendar(
        mockDistrictId,
        {
          year: mockYear,
          fromWeek: 15,
          toWeek: 25,
          serviceType: mockServiceType,
        },
        mockKepalaDistrict,
      );

      expect(service.findCalendar).toHaveBeenCalledWith({
        districtId: mockDistrictId,
        year: mockYear,
        fromWeek: 15,
        toWeek: 25,
        serviceType: mockServiceType,
      });
    });
  });

  describe('PUT /districts/:districtId/capacity', () => {
    it('should upsert capacity for kepala_rayon', async () => {
      mockService.upsertCapacity.mockResolvedValue(mockCapacity);

      const result = await controller.upsertCapacity(mockDistrictId, {
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        capacityUnits: 50,
      });

      expect(result).toEqual(mockCapacity);
      expect(service.upsertCapacity).toHaveBeenCalledWith({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        capacityUnits: 50,
      });
    });

    it('should allow management to upsert', async () => {
      mockService.upsertCapacity.mockResolvedValue(mockCapacity);

      const result = await controller.upsertCapacity(mockDistrictId, {
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        capacityUnits: 50,
      });

      expect(result).toEqual(mockCapacity);
    });

    it('should allow superadmin to upsert', async () => {
      mockService.upsertCapacity.mockResolvedValue(mockCapacity);

      const result = await controller.upsertCapacity(mockDistrictId, {
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        capacityUnits: 50,
      });

      expect(result).toEqual(mockCapacity);
    });
  });

  describe('POST /districts/:districtId/capacity/book', () => {
    it('should book capacity for kepala_rayon', async () => {
      const booked = { ...mockCapacity, bookedUnits: 15 };
      mockService.bookAtomic.mockResolvedValue(booked);

      const result = await controller.bookCapacity(mockDistrictId, {
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        units: 5,
      });

      expect(result.bookedUnits).toBe(15);
      expect(service.bookAtomic).toHaveBeenCalledWith({
        districtId: mockDistrictId,
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        units: 5,
      });
    });

    it('should allow management to book', async () => {
      const booked = { ...mockCapacity, bookedUnits: 15 };
      mockService.bookAtomic.mockResolvedValue(booked);

      const result = await controller.bookCapacity(mockDistrictId, {
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        units: 5,
      });

      expect(result.bookedUnits).toBe(15);
    });

    it('should allow superadmin to book', async () => {
      const booked = { ...mockCapacity, bookedUnits: 15 };
      mockService.bookAtomic.mockResolvedValue(booked);

      const result = await controller.bookCapacity(mockDistrictId, {
        year: mockYear,
        isoWeek: 20,
        serviceType: mockServiceType,
        units: 5,
      });

      expect(result.bookedUnits).toBe(15);
    });
  });
});
