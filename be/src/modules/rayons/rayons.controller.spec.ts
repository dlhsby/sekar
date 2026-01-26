import { Test, TestingModule } from '@nestjs/testing';
import { RayonsController } from './rayons.controller';
import { RayonsService } from './rayons.service';
import { Rayon } from './entities/rayon.entity';
import { Area } from '../areas/entities/area.entity';
import { CreateRayonDto } from './dto/create-rayon.dto';
import { UpdateRayonDto } from './dto/update-rayon.dto';

describe('RayonsController', () => {
  let module: TestingModule;
  let controller: RayonsController;
  let rayonsService: RayonsService;

  const mockRayon: Rayon = {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Rayon Selatan',
    code: 'SELATAN',
    description: 'Covers southern Surabaya districts',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockArea: Partial<Area> = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Taman Bungkul',
    rayon_id: mockRayon.id,
    is_active: true,
  };

  const mockRayonsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAreasByRayonId: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [RayonsController],
      providers: [
        {
          provide: RayonsService,
          useValue: mockRayonsService,
        },
      ],
    }).compile();

    controller = module.get<RayonsController>(RayonsController);
    rayonsService = module.get<RayonsService>(RayonsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of rayons', async () => {
      const rayons = [mockRayon];
      mockRayonsService.findAll.mockResolvedValue(rayons);

      const result = await controller.findAll();

      expect(result).toEqual(rayons);
      expect(rayonsService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no rayons exist', async () => {
      mockRayonsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a rayon by ID', async () => {
      mockRayonsService.findOne.mockResolvedValue(mockRayon);

      const result = await controller.findOne(mockRayon.id);

      expect(result).toEqual(mockRayon);
      expect(rayonsService.findOne).toHaveBeenCalledWith(mockRayon.id);
    });
  });

  describe('findAreas', () => {
    it('should return areas belonging to a rayon', async () => {
      const areas = [mockArea];
      mockRayonsService.findAreasByRayonId.mockResolvedValue(areas);

      const result = await controller.findAreas(mockRayon.id);

      expect(result).toEqual(areas);
      expect(rayonsService.findAreasByRayonId).toHaveBeenCalledWith(mockRayon.id);
    });

    it('should return empty array when rayon has no areas', async () => {
      mockRayonsService.findAreasByRayonId.mockResolvedValue([]);

      const result = await controller.findAreas(mockRayon.id);

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return rayon statistics', async () => {
      const stats = {
        rayon: mockRayon,
        areaCount: 5,
        activeAreaCount: 4,
      };
      mockRayonsService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(mockRayon.id);

      expect(result).toEqual(stats);
      expect(rayonsService.getStats).toHaveBeenCalledWith(mockRayon.id);
    });
  });

  describe('create', () => {
    it('should create a new rayon', async () => {
      const createRayonDto: CreateRayonDto = {
        code: 'UTARA',
        name: 'Rayon Utara',
        description: 'Covers northern Surabaya districts',
      };

      const newRayon = { id: 'new-id', ...createRayonDto };
      mockRayonsService.create.mockResolvedValue(newRayon);

      const result = await controller.create(createRayonDto);

      expect(result).toEqual(newRayon);
      expect(rayonsService.create).toHaveBeenCalledWith(createRayonDto);
    });
  });

  describe('update', () => {
    it('should update a rayon', async () => {
      const updateRayonDto: UpdateRayonDto = {
        name: 'Rayon Selatan Updated',
        description: 'Updated description',
      };

      const updatedRayon = { ...mockRayon, ...updateRayonDto };
      mockRayonsService.update.mockResolvedValue(updatedRayon);

      const result = await controller.update(mockRayon.id, updateRayonDto);

      expect(result).toEqual(updatedRayon);
      expect(rayonsService.update).toHaveBeenCalledWith(mockRayon.id, updateRayonDto);
    });
  });

  describe('remove', () => {
    it('should remove a rayon', async () => {
      mockRayonsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockRayon.id);

      expect(rayonsService.remove).toHaveBeenCalledWith(mockRayon.id);
    });
  });
});
