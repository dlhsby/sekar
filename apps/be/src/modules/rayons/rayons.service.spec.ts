import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RayonsService } from './rayons.service';
import { Rayon } from './entities/rayon.entity';
import { Area } from '../areas/entities/area.entity';
import { CreateRayonDto } from './dto/create-rayon.dto';
import { UpdateRayonDto } from './dto/update-rayon.dto';

describe('RayonsService', () => {
  let module: TestingModule;
  let service: RayonsService;
  let rayonRepository: jest.Mocked<Repository<Rayon>>;
  let areaRepository: jest.Mocked<Repository<Area>>;

  const mockRayon: Rayon = {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Rayon Selatan',
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

  const mockRayonRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    // manager.query used by remove() to count referencing regions (ADR-045).
    manager: { query: jest.fn().mockResolvedValue([{ count: 0 }]) },
  };

  const mockAreaRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RayonsService,
        {
          provide: getRepositoryToken(Rayon),
          useValue: mockRayonRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreaRepository,
        },
      ],
    }).compile();

    service = module.get<RayonsService>(RayonsService);
    rayonRepository = module.get(getRepositoryToken(Rayon)) as jest.Mocked<Repository<Rayon>>;
    areaRepository = module.get(getRepositoryToken(Area)) as jest.Mocked<Repository<Area>>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of rayons ordered by name', async () => {
      const rayons = [mockRayon];
      mockRayonRepository.find.mockResolvedValue(rayons);

      const result = await service.findAll();

      expect(result).toEqual(rayons);
      expect(mockRayonRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no rayons exist', async () => {
      mockRayonRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a rayon by ID', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);

      const result = await service.findOne(mockRayon.id);

      expect(result).toEqual(mockRayon);
      expect(mockRayonRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRayon.id },
      });
    });

    it('should throw NotFoundException if rayon not found', async () => {
      const id = 'non-existent-id';
      mockRayonRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(`Rayon with ID ${id} not found`);
    });
  });

  describe('isNameAvailable', () => {
    it('returns true when the name is unused', async () => {
      mockRayonRepository.findOne.mockResolvedValue(null);
      expect(await service.isNameAvailable('Rayon Baru')).toBe(true);
    });

    it('returns false when the name is taken by another rayon', async () => {
      mockRayonRepository.findOne.mockResolvedValue({ id: 'other' });
      expect(await service.isNameAvailable('Rayon Utara')).toBe(false);
    });

    it('returns true when the name belongs to the excluded rayon (edit)', async () => {
      mockRayonRepository.findOne.mockResolvedValue({ id: 'self' });
      expect(await service.isNameAvailable('Rayon Utara', 'self')).toBe(true);
    });
  });

  describe('create', () => {
    const createRayonDto: CreateRayonDto = {
      name: 'Rayon Utara',
      description: 'Covers northern Surabaya districts',
    };

    it('should successfully create a rayon', async () => {
      mockRayonRepository.findOne.mockResolvedValue(null);
      const newRayon = { id: 'new-id', ...createRayonDto };
      mockRayonRepository.create.mockReturnValue(newRayon);
      mockRayonRepository.save.mockResolvedValue(newRayon);

      const result = await service.create(createRayonDto);

      expect(result).toEqual(newRayon);
      expect(mockRayonRepository.create).toHaveBeenCalledWith(createRayonDto);
      expect(mockRayonRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if name already exists', async () => {
      mockRayonRepository.findOne.mockResolvedValueOnce(mockRayon); // name check

      const duplicateNameDto: CreateRayonDto = {
        name: 'Rayon Selatan',
      };

      await expect(service.create(duplicateNameDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a rayon with description only', async () => {
      const updateDto: UpdateRayonDto = {
        description: 'Updated description',
      };
      mockRayonRepository.findOne.mockResolvedValue({ ...mockRayon });
      const updatedRayon = { ...mockRayon, ...updateDto };
      mockRayonRepository.save.mockResolvedValue(updatedRayon);

      const result = await service.update(mockRayon.id, updateDto);

      expect(result).toEqual(updatedRayon);
      expect(mockRayonRepository.save).toHaveBeenCalled();
    });

    it('persists boundary_polygon (admin correction of the KMZ outline)', async () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [1, 1],
            [2, 2],
            [3, 1],
            [1, 1],
          ],
        ],
      };
      const updateDto: UpdateRayonDto = { boundary_polygon: polygon };
      mockRayonRepository.findOne.mockResolvedValue({ ...mockRayon });
      mockRayonRepository.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.update(mockRayon.id, updateDto);

      expect(result.boundary_polygon).toEqual(polygon);
      expect(mockRayonRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ boundary_polygon: polygon }),
      );
    });

    it('should update a rayon with new name', async () => {
      const updateDto: UpdateRayonDto = {
        name: 'Rayon Selatan Updated',
      };
      mockRayonRepository.findOne
        .mockResolvedValueOnce({ ...mockRayon }) // initial findOne by id
        .mockResolvedValueOnce(null); // name uniqueness check - no conflict
      const updatedRayon = { ...mockRayon, ...updateDto };
      mockRayonRepository.save.mockResolvedValue(updatedRayon);

      const result = await service.update(mockRayon.id, updateDto);

      expect(result).toEqual(updatedRayon);
      expect(mockRayonRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if rayon not found', async () => {
      mockRayonRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', { description: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      const updateWithName: UpdateRayonDto = { name: 'Rayon Utara' };

      // No code update, so only 2 findOne calls: by id, then by name
      mockRayonRepository.findOne
        .mockResolvedValueOnce({ ...mockRayon }) // initial findOne by id
        .mockResolvedValueOnce({ ...mockRayon, id: 'other-id', name: 'Rayon Utara' }); // name uniqueness check - conflict

      await expect(service.update(mockRayon.id, updateWithName)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a rayon', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.count.mockResolvedValue(0);
      mockRayonRepository.softRemove.mockResolvedValue(mockRayon);

      await service.remove(mockRayon.id);

      expect(mockRayonRepository.softRemove).toHaveBeenCalledWith(mockRayon);
    });

    it('should throw NotFoundException if rayon not found', async () => {
      mockRayonRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if areas reference this rayon', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.count.mockResolvedValue(3);

      await expect(service.remove(mockRayon.id)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockRayon.id)).rejects.toThrow(
        'Cannot delete rayon: 3 area(s) reference this rayon',
      );
    });

    it('should throw BadRequestException if regions reference this rayon (ADR-045)', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.count.mockResolvedValue(0);
      mockRayonRepository.manager.query.mockResolvedValueOnce([{ count: 2 }]);

      await expect(service.remove(mockRayon.id)).rejects.toThrow(
        'Cannot delete rayon: 2 region(s) reference this rayon',
      );
    });
  });

  describe('findAreasByRayonId', () => {
    it('should return areas belonging to a rayon', async () => {
      const areas = [mockArea];
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.find.mockResolvedValue(areas);

      const result = await service.findAreasByRayonId(mockRayon.id);

      expect(result).toEqual(areas);
      expect(mockAreaRepository.find).toHaveBeenCalledWith({
        where: { rayon_id: mockRayon.id, is_active: true },
        relations: ['areaType'],
        order: { name: 'ASC' },
      });
    });

    it('should throw NotFoundException if rayon not found', async () => {
      mockRayonRepository.findOne.mockResolvedValue(null);

      await expect(service.findAreasByRayonId('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array when rayon has no areas', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.find.mockResolvedValue([]);

      const result = await service.findAreasByRayonId(mockRayon.id);

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return rayon statistics', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.count
        .mockResolvedValueOnce(5) // total area count
        .mockResolvedValueOnce(4); // active area count

      const result = await service.getStats(mockRayon.id);

      expect(result).toEqual({
        rayon: mockRayon,
        areaCount: 5,
        activeAreaCount: 4,
      });
      expect(mockAreaRepository.count).toHaveBeenCalledTimes(2);
      expect(mockAreaRepository.count).toHaveBeenNthCalledWith(1, {
        where: { rayon_id: mockRayon.id },
      });
      expect(mockAreaRepository.count).toHaveBeenNthCalledWith(2, {
        where: { rayon_id: mockRayon.id, is_active: true },
      });
    });

    it('should throw NotFoundException if rayon not found', async () => {
      mockRayonRepository.findOne.mockResolvedValue(null);

      await expect(service.getStats('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return zero counts when rayon has no areas', async () => {
      mockRayonRepository.findOne.mockResolvedValue(mockRayon);
      mockAreaRepository.count.mockResolvedValue(0);

      const result = await service.getStats(mockRayon.id);

      expect(result.areaCount).toBe(0);
      expect(result.activeAreaCount).toBe(0);
    });
  });
});
