import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';
import { User } from '../users/entities/user.entity';
import { AreaTypesService } from '../area-types/area-types.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

describe('AreasService', () => {
  let module: TestingModule;
  let service: AreasService;
  let repository: Repository<Area>;
  let areaTypesService: AreaTypesService;

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

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAreaTypesService = {
    findOne: jest.fn(),
    findByCode: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AreasService,
        {
          provide: getRepositoryToken(Area),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AreaTypesService,
          useValue: mockAreaTypesService,
        },
      ],
    }).compile();

    service = module.get<AreasService>(AreasService);
    repository = module.get<Repository<Area>>(getRepositoryToken(Area));
    areaTypesService = module.get<AreaTypesService>(AreaTypesService);
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

    it('should create an area successfully', async () => {
      mockAreaTypesService.findOne.mockResolvedValue(mockAreaType);
      mockRepository.create.mockReturnValue(mockArea);
      mockRepository.save.mockResolvedValue(mockArea);

      const result = await service.create(createAreaDto);

      expect(result).toEqual(mockArea);
      expect(areaTypesService.findOne).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(repository.create).toHaveBeenCalledWith(createAreaDto);
      expect(repository.save).toHaveBeenCalledWith(mockArea);
    });

    it('should throw NotFoundException if area_type_id is invalid', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockAreaTypesService.findOne.mockRejectedValue(
        new NotFoundException(`Area type with ID ${invalidUUID} not found`),
      );

      await expect(service.create({ ...createAreaDto, area_type_id: invalidUUID })).rejects.toThrow(
        NotFoundException,
      );
      expect(areaTypesService.findOne).toHaveBeenCalledWith(invalidUUID);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const cityUser = { id: 'u1', username: 'sa', role: 'superadmin', rayon_id: null } as any;
    const rayonUser = {
      id: 'u2',
      username: 'korlap_pusat_1',
      role: 'korlap',
      rayon_id: 'rayon-pusat-uuid',
    } as any;

    const makeQB = () => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockArea]),
    });

    it('should return all active areas for city roles without filter', async () => {
      const qb = makeQB();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(cityUser);

      expect(result).toEqual([mockArea]);
      expect(qb.andWhere).toHaveBeenCalledWith('area.is_active = :isActive', { isActive: true });
    });

    it('should filter areas by area type code', async () => {
      const qb = makeQB();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(cityUser, 'park');

      expect(result).toEqual([mockArea]);
      expect(qb.andWhere).toHaveBeenCalledWith('areaType.code = :areaType', { areaType: 'park' });
    });

    it('should include deactivated areas when includeInactive is true', async () => {
      const qb = makeQB();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(cityUser, undefined, true);

      expect(qb.andWhere).not.toHaveBeenCalledWith('area.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should scope by rayon_id for rayon-scoped roles', async () => {
      const qb = makeQB();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(rayonUser);

      expect(qb.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', {
        rayonId: 'rayon-pusat-uuid',
      });
    });

    it('should return empty array for rayon-scoped user without rayon_id', async () => {
      const orphanUser = { ...rayonUser, rayon_id: null };
      const qb = makeQB();
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(orphanUser);

      expect(result).toEqual([]);
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an area by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockArea);

      const result = await service.findOne('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(result).toEqual(mockArea);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'c3d4e5f6-a7b8-9012-cdef-123456789012' },
        relations: ['rayon'],
      });
    });

    it('should return an inactive area (not filtered — direct ID lookup, not a browse query)', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockArea, is_active: false });

      const result = await service.findOne('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(result.is_active).toBe(false);
    });

    it('should throw NotFoundException if area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(invalidUUID)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(invalidUUID)).rejects.toThrow(
        `Area with ID ${invalidUUID} not found`,
      );
    });
  });

  describe('update', () => {
    const updateAreaDto: UpdateAreaDto = {
      name: 'Updated Name',
      gps_lat: -7.2906,
    };

    it('should update an area successfully', async () => {
      const updatedArea = { ...mockArea, ...updateAreaDto };
      mockRepository.findOne.mockResolvedValue(mockArea);
      mockRepository.save.mockResolvedValue(updatedArea);

      const result = await service.update('c3d4e5f6-a7b8-9012-cdef-123456789012', updateAreaDto);

      expect(result).toEqual(updatedArea);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(updateAreaDto));
    });

    it('should throw NotFoundException if area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(invalidUUID, updateAreaDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an area successfully (softRemove → deleted_at)', async () => {
      mockRepository.findOne.mockResolvedValue(mockArea);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.softRemove.mockResolvedValue(mockArea);

      await service.remove('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(repository.softRemove).toHaveBeenCalledWith(mockArea);
    });

    it('should throw NotFoundException if area not found', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(invalidUUID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate / activate', () => {
    it('deactivate sets is_active=false', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockArea, is_active: true });
      mockRepository.save.mockResolvedValue({ ...mockArea, is_active: false });

      await service.deactivate('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });

    it('activate sets is_active=true', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockArea, is_active: false });
      mockRepository.save.mockResolvedValue({ ...mockArea, is_active: true });

      await service.activate('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }));
    });
  });

  describe('exists', () => {
    it('should return true if area exists and is active', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await service.exists('c3d4e5f6-a7b8-9012-cdef-123456789012');

      expect(result).toBe(true);
      expect(repository.count).toHaveBeenCalledWith({
        where: { id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', is_active: true },
      });
    });

    it('should return false if area does not exist', async () => {
      const invalidUUID = 'f5f6a7b8-c9d0-1234-ef01-345678901234';
      mockRepository.count.mockResolvedValue(0);

      const result = await service.exists(invalidUUID);

      expect(result).toBe(false);
    });
  });

  describe('getBoundary', () => {
    const areaWithBoundary: Area = {
      ...mockArea,
      boundary_polygon: {
        type: 'Polygon',
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
      coverage_area: 2500.5,
    };

    it('should return boundary response for area with polygon', async () => {
      mockRepository.findOne.mockResolvedValue(areaWithBoundary);

      const result = await service.getBoundary(areaWithBoundary.id);

      expect(result.area_id).toBe(areaWithBoundary.id);
      expect(result.name).toBe(areaWithBoundary.name);
      expect(result.boundary_polygon).toEqual(areaWithBoundary.boundary_polygon);
      expect(result.coverage_area).toBeCloseTo(2500.5);
    });

    it('should return null boundary_polygon when area has no polygon', async () => {
      mockRepository.findOne.mockResolvedValue(mockArea);

      const result = await service.getBoundary(mockArea.id);

      expect(result.boundary_polygon).toBeNull();
      expect(result.coverage_area).toBeNull();
    });

    it('should throw NotFoundException when area not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getBoundary('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBoundary', () => {
    const validPolygon = {
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
    };

    it('should update boundary and compute area when no coverage_area provided', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockArea });
      mockRepository.save.mockImplementation((area) => Promise.resolve({ ...area }));

      const result = await service.updateBoundary(mockArea.id, {
        boundary_polygon: validPolygon,
      });

      expect(result.boundary_polygon).toEqual(validPolygon);
      expect(result.coverage_area).toBeGreaterThan(0);
    });

    it('should use provided coverage_area instead of computing it', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockArea });
      mockRepository.save.mockImplementation((area) => Promise.resolve({ ...area }));

      const result = await service.updateBoundary(mockArea.id, {
        boundary_polygon: validPolygon,
        coverage_area: 9999,
      });

      expect(result.coverage_area).toBeCloseTo(9999);
    });

    it('should throw BadRequestException for invalid polygon', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockArea });

      const invalidPolygon = { type: 'Polygon' as const, coordinates: [] };

      await expect(
        service.updateBoundary(mockArea.id, { boundary_polygon: invalidPolygon as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when area not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateBoundary('non-existent', { boundary_polygon: validPolygon }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
