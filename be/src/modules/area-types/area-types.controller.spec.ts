import { Test, TestingModule } from '@nestjs/testing';
import { AreaTypesController } from './area-types.controller';
import { AreaTypesService } from './area-types.service';
import { AreaType } from './entities/area-type.entity';
import { NotFoundException } from '@nestjs/common';

describe('AreaTypesController', () => {
  let controller: AreaTypesController;
  let service: AreaTypesService;

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
  ];

  const mockAreaTypesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreaTypesController],
      providers: [
        {
          provide: AreaTypesService,
          useValue: mockAreaTypesService,
        },
      ],
    }).compile();

    controller = module.get<AreaTypesController>(AreaTypesController);
    service = module.get<AreaTypesService>(AreaTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of area types', async () => {
      mockAreaTypesService.findAll.mockResolvedValue(mockAreaTypes);

      const result = await controller.findAll();

      expect(result).toEqual(mockAreaTypes);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no area types exist', async () => {
      mockAreaTypesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a single area type', async () => {
      mockAreaTypesService.findOne.mockResolvedValue(mockAreaType);

      const result = await controller.findOne('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(result).toEqual(mockAreaType);
      expect(service.findOne).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when area type not found', async () => {
      mockAreaTypesService.findOne.mockRejectedValue(
        new NotFoundException('Area type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found'),
      );

      await expect(controller.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(NotFoundException);
      await expect(controller.findOne('f5f6a7b8-c9d0-1234-ef01-345678901234')).rejects.toThrow(
        'Area type with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found',
      );
      expect(service.findOne).toHaveBeenCalledWith('f5f6a7b8-c9d0-1234-ef01-345678901234');
    });

    it('should call service with correct ID', async () => {
      mockAreaTypesService.findOne.mockResolvedValue(mockAreaType);

      await controller.findOne('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(service.findOne).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });
  });
});
