import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AreaTypesService } from './area-types.service';
import { AreaType } from './entities/area-type.entity';
import { Area } from '../areas/entities/area.entity';
import { CreateAreaTypeDto } from './dto/create-area-type.dto';
import { UpdateAreaTypeDto } from './dto/update-area-type.dto';

describe('AreaTypesService', () => {
  let module: TestingModule;
  let service: AreaTypesService;
  let repository: Repository<AreaType>;

  const mockAreaType: AreaType = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    code: 'park',
    name: 'Park',
    description: 'Public park or garden',
    category: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: undefined,
  };

  const mockAreaTypes: AreaType[] = [
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
    {
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      code: 'mini_garden',
      name: 'Mini Garden',
      description: 'Small garden or green space',
      category: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    },
    {
      id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      code: 'street',
      name: 'Street',
      description: 'Street with trees or greenery',
      category: 'PASSIVE',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: undefined,
    },
  ];

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockAreaRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AreaTypesService,
        {
          provide: getRepositoryToken(AreaType),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreaRepository,
        },
      ],
    }).compile();

    service = module.get<AreaTypesService>(AreaTypesService);
    repository = module.get<Repository<AreaType>>(getRepositoryToken(AreaType));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of area types', async () => {
      mockRepository.find.mockResolvedValue(mockAreaTypes);

      const result = await service.findAll();

      expect(result).toEqual(mockAreaTypes);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
      });
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array if no area types exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return an area type by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockAreaType);

      const result = await service.findOne('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(result).toEqual(mockAreaType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      });
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if area type not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        'Area type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found',
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'f5f6a7b8-c9d0-1234-ef01-345678901234' },
      });
    });
  });

  describe('findByCode', () => {
    it('should return an area type by code', async () => {
      mockRepository.findOne.mockResolvedValue(mockAreaType);

      const result = await service.findByCode('park');

      expect(result).toEqual(mockAreaType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'park' },
      });
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if area type code not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode('invalid')).rejects.toThrow(NotFoundException);
      await expect(service.findByCode('invalid')).rejects.toThrow(
        'Area type with code "invalid" not found',
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'invalid' },
      });
    });

    it('should find each predefined area type code', async () => {
      const codes = ['park', 'pedestrian', 'mini_garden', 'street'];

      for (const code of codes) {
        const areaType = mockAreaTypes.find((at) => at.code === code);
        mockRepository.findOne.mockResolvedValue(areaType);

        const result = await service.findByCode(code);

        expect(result).toEqual(areaType);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { code },
        });
      }
    });
  });

  describe('create', () => {
    const createDto: CreateAreaTypeDto = {
      code: 'new_type',
      name: 'New Type',
      description: 'A new type of area',
    };

    const createdAreaType: AreaType = {
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
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(createdAreaType);
      mockRepository.save.mockResolvedValue(createdAreaType);

      const result = await service.create(createDto);

      expect(result).toEqual(createdAreaType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'new_type' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(createdAreaType);
    });

    it('should throw ConflictException if code already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockAreaType);

      await expect(service.create({ ...createDto, code: 'park' })).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create({ ...createDto, code: 'park' })).rejects.toThrow(
        'Area type with code "park" already exists',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAreaTypeDto = {
      name: 'Updated Park',
      description: 'Updated description',
    };

    const updatedAreaType: AreaType = {
      ...mockAreaType,
      name: 'Updated Park',
      description: 'Updated description',
      updated_at: new Date(),
    };

    it('should update an area type', async () => {
      mockRepository.findOne.mockResolvedValue(mockAreaType);
      mockRepository.save.mockResolvedValue(updatedAreaType);

      const result = await service.update('a1b2c3d4-e5f6-7890-abcd-ef1234567890', updateDto);

      expect(result).toEqual(updatedAreaType);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if area type not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('f5f6a7b8-c9d0-1234-ef01-345678901234', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new code already exists', async () => {
      const updateWithCode: UpdateAreaTypeDto = { code: 'pedestrian' };
      const existingPedestrian = mockAreaTypes.find((at) => at.code === 'pedestrian');

      mockRepository.findOne
        .mockResolvedValueOnce(mockAreaType) // First call: find the area type to update
        .mockResolvedValueOnce(existingPedestrian); // Second call: check if code exists

      await expect(
        service.update('a1b2c3d4-e5f6-7890-abcd-ef1234567890', updateWithCode),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to the same code', async () => {
      const updateWithSameCode: UpdateAreaTypeDto = { code: 'park', name: 'Park Updated' };
      const updatedWithSameCode = { ...mockAreaType, name: 'Park Updated' };

      mockRepository.findOne.mockResolvedValue(mockAreaType);
      mockRepository.save.mockResolvedValue(updatedWithSameCode);

      const result = await service.update(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        updateWithSameCode,
      );

      expect(result.name).toBe('Park Updated');
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should soft delete an area type', async () => {
      mockRepository.findOne.mockResolvedValue(mockAreaType);
      mockAreaRepository.count.mockResolvedValue(0);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      });
      expect(mockAreaRepository.count).toHaveBeenCalledWith({
        where: { area_type_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        withDeleted: true,
      });
      expect(mockRepository.softDelete).toHaveBeenCalledWith(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      );
    });

    it('should throw NotFoundException if area type not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if areas reference this type', async () => {
      mockRepository.findOne.mockResolvedValue(mockAreaType);
      mockAreaRepository.count.mockResolvedValue(3);

      await expect(service.remove('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).rejects.toThrow(
        'Cannot delete area type: 3 area(s) reference this type',
      );
    });
  });
});
