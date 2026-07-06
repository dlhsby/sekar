import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';
import { User } from '../users/entities/user.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { NotFoundException } from '@nestjs/common';

describe('AreasController', () => {
  let module: TestingModule;
  let controller: AreasController;
  let service: AreasService;
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

  const mockArea: Area = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    area_type_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    areaType: mockAreaType,
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
    address: 'Jl. Taman Bungkul, Darmo, Surabaya',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockBoundaryResponse = {
    area_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
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

  const mockAreasService = {
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
      controllers: [AreasController],
      providers: [
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
      ],
    }).compile();

    controller = module.get<AreasController>(AreasController);
    service = module.get<AreasService>(AreasService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createAreaDto: CreateAreaDto = {
      name: 'Taman Bungkul',
      area_type_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      radius_meters: 100,
      address: 'Jl. Taman Bungkul, Darmo, Surabaya',
    };

    it('should create an area', async () => {
      mockAreasService.create.mockResolvedValue(mockArea);

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
      mockAreasService.findAll.mockResolvedValue([mockArea]);

      const result = await controller.findAll(mockRequester);

      expect(result).toEqual([mockArea]);
      expect(service.findAll).toHaveBeenCalledWith(mockRequester, undefined, false);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should filter areas by area type', async () => {
      mockAreasService.findAll.mockResolvedValue([mockArea]);

      const result = await controller.findAll(mockRequester, 'park');

      expect(result).toEqual([mockArea]);
      expect(service.findAll).toHaveBeenCalledWith(mockRequester, 'park', false);
    });

    it('should pass includeInactive=true when include_inactive=true', async () => {
      mockAreasService.findAll.mockResolvedValue([mockArea]);

      await controller.findAll(mockRequester, undefined, undefined, undefined, 'true');

      expect(service.findAll).toHaveBeenCalledWith(mockRequester, undefined, true);
    });
  });

  describe('findOne', () => {
    it('should return a single area', async () => {
      mockAreasService.findOne.mockResolvedValue(mockArea);

      const result = await controller.findOne('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(result).toEqual(mockArea);
      expect(service.findOne).toHaveBeenCalledWith('c3d4e5f6-a7b8-9012-cdef-123456789012');
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockAreasService.findOne.mockRejectedValue(
        new NotFoundException(`Area with ID ${invalidUUID} not found`),
      );

      await expect(controller.findOne(invalidUUID)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(invalidUUID)).rejects.toThrow(
        `Area with ID ${invalidUUID} not found`,
      );
    });
  });

  describe('update', () => {
    const updateAreaDto: UpdateAreaDto = {
      name: 'Updated Name',
    };

    it('should update an area', async () => {
      const updatedArea = { ...mockArea, ...updateAreaDto };
      mockAreasService.update.mockResolvedValue(updatedArea);

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
      mockAreasService.update.mockRejectedValue(
        new NotFoundException(`Area with ID ${invalidUUID} not found`),
      );

      await expect(controller.update(invalidUUID, updateAreaDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an area', async () => {
      mockAreasService.remove.mockResolvedValue(undefined);

      await controller.remove('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(service.remove).toHaveBeenCalledWith('c3d4e5f6-a7b8-9012-cdef-123456789012');
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockAreasService.remove.mockRejectedValue(
        new NotFoundException(`Area with ID ${invalidUUID} not found`),
      );

      await expect(controller.remove(invalidUUID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoundary', () => {
    it('should return boundary response', async () => {
      mockAreasService.getBoundary.mockResolvedValue(mockBoundaryResponse);

      const result = await controller.getBoundary(mockArea.id);

      expect(result).toEqual(mockBoundaryResponse);
      expect(service.getBoundary).toHaveBeenCalledWith(mockArea.id);
    });

    it('should throw NotFoundException when area not found', async () => {
      mockAreasService.getBoundary.mockRejectedValue(new NotFoundException('Area not found'));

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
      mockAreasService.updateBoundary.mockResolvedValue(mockBoundaryResponse);

      const result = await controller.updateBoundary(mockArea.id, validDto);

      expect(result).toEqual(mockBoundaryResponse);
      expect(service.updateBoundary).toHaveBeenCalledWith(mockArea.id, validDto);
    });

    it('should throw BadRequestException on invalid polygon', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockAreasService.updateBoundary.mockRejectedValue(
        new BadRequestException('Invalid polygon: ring must be closed'),
      );

      await expect(controller.updateBoundary(mockArea.id, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
