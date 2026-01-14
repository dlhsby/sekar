import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AreaTypesService } from './area-types.service';
import { AreaType } from './entities/area-type.entity';

describe('AreaTypesService', () => {
  let service: AreaTypesService;
  let repository: Repository<AreaType>;

  const mockAreaType: AreaType = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    code: 'park',
    name: 'Park',
    description: 'Public park or garden',
    created_at: new Date(),
  };

  const mockAreaTypes: AreaType[] = [
    mockAreaType,
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      code: 'pedestrian',
      name: 'Pedestrian Zone',
      description: 'Pedestrian walkway with trees',
      created_at: new Date(),
    },
    {
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      code: 'mini_garden',
      name: 'Mini Garden',
      description: 'Small garden or green space',
      created_at: new Date(),
    },
    {
      id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      code: 'street',
      name: 'Street',
      description: 'Street with trees or greenery',
      created_at: new Date(),
    },
  ];

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaTypesService,
        {
          provide: getRepositoryToken(AreaType),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AreaTypesService>(AreaTypesService);
    repository = module.get<Repository<AreaType>>(
      getRepositoryToken(AreaType),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      await expect(service.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(NotFoundException);
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

      await expect(service.findByCode('invalid')).rejects.toThrow(
        NotFoundException,
      );
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
});
