import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';
import { User } from '../users/entities/user.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { NotFoundException } from '@nestjs/common';

describe('LocationsController', () => {
  let module: TestingModule;
  let controller: LocationsController;
  let service: LocationsService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockAreaType = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    code: 'park',
    name: 'Park',
    description: 'Public park or garden',
    category: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: undefined,
  };

  const mockArea: Location = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    location_type_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    locationType: mockAreaType,
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
    address: 'Jl. Taman Bungkul, Darmo, Surabaya',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockBoundaryResponse = {
    location_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    boundary_polygon: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [112.7388, -7.2905],
          [112.7395, -7.2905],
          [112.7395, -7.291],
          [112.7388, -7.291],
          [112.7388, -7.2905],
        ],
      ],
    },
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
    coverage_area: 4250.5,
  };

  const mockLocationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getBoundary: jest.fn(),
    updateBoundary: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
    service = module.get<LocationsService>(LocationsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createAreaDto: CreateLocationDto = {
      name: 'Taman Bungkul',
      location_type_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      radius_meters: 100,
      address: 'Jl. Taman Bungkul, Darmo, Surabaya',
    };

    it('should create an area', async () => {
      mockLocationsService.create.mockResolvedValue(mockArea);

      const result = await controller.create(createAreaDto);

      expect(result).toEqual(mockArea);
      expect(service.create).toHaveBeenCalledWith(createAreaDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    const mockRequester = {
      id: 'u1',
      username: 'superadmin',
      role: 'superadmin',
      rayon_id: null,
    } as any;

    it('should return an array of areas', async () => {
      mockLocationsService.findAll.mockResolvedValue([mockArea]);

      const result = await controller.findAll(mockRequester);

      expect(result).toEqual([mockArea]);
      expect(service.findAll).toHaveBeenCalledWith(mockRequester, undefined, false);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should filter areas by area type', async () => {
      mockLocationsService.findAll.mockResolvedValue([mockArea]);

      const result = await controller.findAll(mockRequester, 'park');

      expect(result).toEqual([mockArea]);
      expect(service.findAll).toHaveBeenCalledWith(mockRequester, 'park', false);
    });

    it('should pass includeInactive=true when include_inactive=true', async () => {
      mockLocationsService.findAll.mockResolvedValue([mockArea]);

      await controller.findAll(mockRequester, undefined, undefined, undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith(mockRequester, undefined, true);
    });
  });

  describe('findOne', () => {
    it('should return a single area', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockArea);

      const result = await controller.findOne('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(result).toEqual(mockArea);
      expect(service.findOne).toHaveBeenCalledWith('c3d4e5f6-a7b8-9012-cdef-123456789012');
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockLocationsService.findOne.mockRejectedValue(
        new NotFoundException(`Location with ID ${invalidUUID} not found`),
      );

      await expect(controller.findOne(invalidUUID)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(invalidUUID)).rejects.toThrow(
        `Location with ID ${invalidUUID} not found`,
      );
    });
  });

  describe('update', () => {
    const updateAreaDto: UpdateLocationDto = {
      name: 'Updated Name',
    };

    it('should update an area', async () => {
      const updatedArea = { ...mockArea, ...updateAreaDto };
      mockLocationsService.update.mockResolvedValue(updatedArea);

      const result = await controller.update('c3d4e5f6-a7b8-9012-cdef-123456789012', updateAreaDto);

      expect(result).toEqual(updatedArea);
      expect(service.update).toHaveBeenCalledWith(
        'c3d4e5f6-a7b8-9012-cdef-123456789012',
        updateAreaDto,
      );
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockLocationsService.update.mockRejectedValue(
        new NotFoundException(`Location with ID ${invalidUUID} not found`),
      );

      await expect(controller.update(invalidUUID, updateAreaDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an area', async () => {
      mockLocationsService.remove.mockResolvedValue(undefined);

      await controller.remove('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(service.remove).toHaveBeenCalledWith('c3d4e5f6-a7b8-9012-cdef-123456789012');
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockLocationsService.remove.mockRejectedValue(
        new NotFoundException(`Location with ID ${invalidUUID} not found`),
      );

      await expect(controller.remove(invalidUUID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoundary', () => {
    it('should return boundary response', async () => {
      mockLocationsService.getBoundary.mockResolvedValue(mockBoundaryResponse);

      const result = await controller.getBoundary(mockArea.id);

      expect(result).toEqual(mockBoundaryResponse);
      expect(service.getBoundary).toHaveBeenCalledWith(mockArea.id);
    });

    it('should throw NotFoundException when area not found', async () => {
      mockLocationsService.getBoundary.mockRejectedValue(
        new NotFoundException('Location not found'),
      );

      await expect(controller.getBoundary('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBoundary', () => {
    const validDto = {
      boundary_polygon: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [112.7388, -7.2905],
            [112.7395, -7.2905],
            [112.7395, -7.291],
            [112.7388, -7.291],
            [112.7388, -7.2905],
          ],
        ],
      },
    };

    it('should update and return boundary', async () => {
      mockLocationsService.updateBoundary.mockResolvedValue(mockBoundaryResponse);

      const result = await controller.updateBoundary(mockArea.id, validDto);

      expect(result).toEqual(mockBoundaryResponse);
      expect(service.updateBoundary).toHaveBeenCalledWith(mockArea.id, validDto);
    });

    it('should throw BadRequestException on invalid polygon', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockLocationsService.updateBoundary.mockRejectedValue(
        new BadRequestException('Invalid polygon: ring must be closed'),
      );

      await expect(controller.updateBoundary(mockArea.id, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
