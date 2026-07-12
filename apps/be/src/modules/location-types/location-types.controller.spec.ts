import { Test, TestingModule } from '@nestjs/testing';
import { LocationTypesController } from './location-types.controller';
import { LocationTypesService } from './location-types.service';
import { LocationType } from './entities/location-type.entity';
import { CreateLocationTypeDto } from './dto/create-location-type.dto';
import { UpdateLocationTypeDto } from './dto/update-location-type.dto';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('LocationTypesController', () => {
  let module: TestingModule;
  let controller: LocationTypesController;
  let service: LocationTypesService;

  const mockAreaType: LocationType = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    code: 'park',
    name: 'Park',
    description: 'Public park or garden',
    category: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: undefined,
  };

  const mockAreaTypes: LocationType[] = [
    mockAreaType,
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      code: 'pedestrian',
      name: 'Pedestrian Zone',
      description: 'Pedestrian walkway with trees',
      category: 'PASSIVE',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    },
  ];

  const mockLocationTypesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [LocationTypesController],
      providers: [
        {
          provide: LocationTypesService,
          useValue: mockLocationTypesService,
        },
      ],
    }).compile();

    controller = module.get<LocationTypesController>(LocationTypesController);
    service = module.get<LocationTypesService>(LocationTypesService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of area types', async () => {
      mockLocationTypesService.findAll.mockResolvedValue(mockAreaTypes);

      const result = await controller.findAll();

      expect(result).toEqual(mockAreaTypes);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no area types exist', async () => {
      mockLocationTypesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a single area type', async () => {
      mockLocationTypesService.findOne.mockResolvedValue(mockAreaType);

      const result = await controller.findOne('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(result).toEqual(mockAreaType);
      expect(service.findOne).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area type not found', async () => {
      mockLocationTypesService.findOne.mockRejectedValue(
        new NotFoundException(
          'Location type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found',
        ),
      );

      await expect(controller.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        'Location type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found',
      );
      expect(service.findOne).toHaveBeenCalledWith('f5f6a7b8-c9d0-1234-ef01-345678901234');
    });

    it('should call service with correct ID', async () => {
      mockLocationTypesService.findOne.mockResolvedValue(mockAreaType);

      await controller.findOne('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(service.findOne).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });
  });

  describe('create', () => {
    const createDto: CreateLocationTypeDto = {
      code: 'new_type',
      name: 'New Type',
      description: 'A new type of area',
    };

    const createdAreaType: LocationType = {
      id: 'e5f6a7b8-c9d0-1234-ef01-567890123456',
      code: 'new_type',
      name: 'New Type',
      description: 'A new type of area',
      category: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    };

    it('should create a new area type', async () => {
      mockLocationTypesService.create.mockResolvedValue(createdAreaType);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdAreaType);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if code already exists', async () => {
      mockLocationTypesService.create.mockRejectedValue(
        new ConflictException('Location type with code "park" already exists'),
      );

      await expect(controller.create({ ...createDto, code: 'park' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateLocationTypeDto = {
      name: 'Updated Park',
      description: 'Updated description',
    };

    const updatedAreaType: LocationType = {
      ...mockAreaType,
      name: 'Updated Park',
      description: 'Updated description',
    };

    it('should update an area type', async () => {
      mockLocationTypesService.update.mockResolvedValue(updatedAreaType);

      const result = await controller.update('a1b2c3d4-e5f6-7890-abcd-ef1234567890', updateDto);

      expect(result).toEqual(updatedAreaType);
      expect(service.update).toHaveBeenCalledWith(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        updateDto,
      );
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if area type not found', async () => {
      mockLocationTypesService.update.mockRejectedValue(
        new NotFoundException(
          'Location type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found',
        ),
      );

      await expect(
        controller.update('f5f6a7b8-c9d0-1234-ef01-345678901234', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new code already exists', async () => {
      mockLocationTypesService.update.mockRejectedValue(
        new ConflictException('Location type with code "pedestrian" already exists'),
      );

      await expect(
        controller.update('a1b2c3d4-e5f6-7890-abcd-ef1234567890', { code: 'pedestrian' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete an area type', async () => {
      mockLocationTypesService.remove.mockResolvedValue(undefined);

      await controller.remove('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(service.remove).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if area type not found', async () => {
      mockLocationTypesService.remove.mockRejectedValue(
        new NotFoundException(
          'Location type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found',
        ),
      );

      await expect(controller.remove('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if areas reference this type', async () => {
      mockLocationTypesService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete area type: 3 area(s) reference this type'),
      );

      await expect(controller.remove('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
