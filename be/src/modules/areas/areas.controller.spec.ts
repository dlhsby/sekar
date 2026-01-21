import { Test, TestingModule } from '@nestjs/testing';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { NotFoundException } from '@nestjs/common';

describe('AreasController', () => {
  let module: TestingModule;
  let controller: AreasController;
  let service: AreasService;

  const mockAreaType = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    code: 'park',
    name: 'Park',
    description: 'Public park or garden',
    created_at: new Date(),
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

  const mockAreasService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
    it('should return an array of areas', async () => {
      mockAreasService.findAll.mockResolvedValue([mockArea]);

      const result = await controller.findAll();

      expect(result).toEqual([mockArea]);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should filter areas by area type', async () => {
      mockAreasService.findAll.mockResolvedValue([mockArea]);

      const result = await controller.findAll('park');

      expect(result).toEqual([mockArea]);
      expect(service.findAll).toHaveBeenCalledWith('park');
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
});
