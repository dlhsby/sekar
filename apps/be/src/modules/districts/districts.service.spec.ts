import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiException } from '../../common/exceptions/api.exception';
import { DistrictsService } from './districts.service';
import { District, StaffingLevel } from './entities/district.entity';
import { Location } from '../locations/entities/location.entity';
import { Region } from '../regions/entities/region.entity';
import { User } from '../users/entities/user.entity';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';

describe('DistrictsService', () => {
  let module: TestingModule;
  let service: DistrictsService;
  let districtRepository: jest.Mocked<Repository<District>>;
  let areaRepository: jest.Mocked<Repository<Location>>;

  const mockDistrict: District = {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Rayon Selatan',
    description: 'Covers southern Surabaya districts',
    staffing_level: StaffingLevel.REGION,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockArea: Partial<Location> = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Taman Bungkul',
    district_id: mockDistrict.id,
    is_active: true,
  };

  const mockDistrictRepository = {
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

  // deactivate() guards on active children/users before flipping the flag.
  const mockRegionRepository = { count: jest.fn() };
  const mockUserRepository = { count: jest.fn() };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DistrictsService,
        {
          provide: getRepositoryToken(District),
          useValue: mockDistrictRepository,
        },
        {
          provide: getRepositoryToken(Region),
          useValue: mockRegionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: mockAreaRepository,
        },
      ],
    }).compile();

    service = module.get<DistrictsService>(DistrictsService);
    districtRepository = module.get(getRepositoryToken(District)) as jest.Mocked<
      Repository<District>
    >;
    areaRepository = module.get(getRepositoryToken(Location)) as jest.Mocked<Repository<Location>>;
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
    it('should return an array of districts ordered by name', async () => {
      const districts = [mockDistrict];
      mockDistrictRepository.find.mockResolvedValue(districts);

      const result = await service.findAll();

      expect(result).toEqual(districts);
      // Active-only by default: pickers and filters must not offer a
      // deactivated district.
      expect(mockDistrictRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { name: 'ASC' },
      });
    });

    it('should include deactivated districts when asked (admin management grid)', async () => {
      mockDistrictRepository.find.mockResolvedValue([mockDistrict]);

      await service.findAll(true);

      expect(mockDistrictRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no districts exist', async () => {
      mockDistrictRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a district by ID', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);

      const result = await service.findOne(mockDistrict.id);

      expect(result).toEqual(mockDistrict);
      expect(mockDistrictRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDistrict.id },
      });
    });

    it('should throw NotFoundException if district not found', async () => {
      const id = 'non-existent-id';
      mockDistrictRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(`District with ID ${id} not found`);
    });
  });

  describe('isNameAvailable', () => {
    it('returns true when the name is unused', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(null);
      expect(await service.isNameAvailable('District Baru')).toBe(true);
    });

    it('returns false when the name is taken by another district', async () => {
      mockDistrictRepository.findOne.mockResolvedValue({ id: 'other' });
      expect(await service.isNameAvailable('Rayon Utara')).toBe(false);
    });

    it('returns true when the name belongs to the excluded district (edit)', async () => {
      mockDistrictRepository.findOne.mockResolvedValue({ id: 'self' });
      expect(await service.isNameAvailable('Rayon Utara', 'self')).toBe(true);
    });
  });

  describe('create', () => {
    const createDistrictDto: CreateDistrictDto = {
      name: 'Rayon Utara',
      description: 'Covers northern Surabaya districts',
    };

    it('should successfully create a district', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(null);
      const newDistrict = { id: 'new-id', ...createDistrictDto };
      mockDistrictRepository.create.mockReturnValue(newDistrict);
      mockDistrictRepository.save.mockResolvedValue(newDistrict);

      const result = await service.create(createDistrictDto);

      expect(result).toEqual(newDistrict);
      expect(mockDistrictRepository.create).toHaveBeenCalledWith(createDistrictDto);
      expect(mockDistrictRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if name already exists', async () => {
      mockDistrictRepository.findOne.mockResolvedValueOnce(mockDistrict); // name check

      const duplicateNameDto: CreateDistrictDto = {
        name: 'Rayon Selatan',
      };

      await expect(service.create(duplicateNameDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a district with description only', async () => {
      const updateDto: UpdateDistrictDto = {
        description: 'Updated description',
      };
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict });
      const updatedDistrict = { ...mockDistrict, ...updateDto };
      mockDistrictRepository.save.mockResolvedValue(updatedDistrict);

      const result = await service.update(mockDistrict.id, updateDto);

      expect(result).toEqual(updatedDistrict);
      expect(mockDistrictRepository.save).toHaveBeenCalled();
    });

    it('persists boundary_polygon (admin correction of the KMZ outline)', async () => {
      // Valid Surabaya-bounds polygon — boundary writes are now validated.
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [112.7, -7.3],
            [112.8, -7.2],
            [112.9, -7.3],
            [112.7, -7.3],
          ],
        ],
      };
      const updateDto: UpdateDistrictDto = { boundary_polygon: polygon };
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict });
      mockDistrictRepository.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.update(mockDistrict.id, updateDto);

      expect(result.boundary_polygon).toEqual(polygon);
      expect(mockDistrictRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ boundary_polygon: polygon }),
      );
    });

    it('rejects a structurally invalid boundary polygon', async () => {
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict });
      await expect(
        service.update(mockDistrict.id, {
          boundary_polygon: { type: 'Polygon', coordinates: [[]] },
        } as UpdateDistrictDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should update a district with new name', async () => {
      const updateDto: UpdateDistrictDto = {
        name: 'Rayon Selatan Updated',
      };
      mockDistrictRepository.findOne
        .mockResolvedValueOnce({ ...mockDistrict }) // initial findOne by id
        .mockResolvedValueOnce(null); // name uniqueness check - no conflict
      const updatedDistrict = { ...mockDistrict, ...updateDto };
      mockDistrictRepository.save.mockResolvedValue(updatedDistrict);

      const result = await service.update(mockDistrict.id, updateDto);

      expect(result).toEqual(updatedDistrict);
      expect(mockDistrictRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if district not found', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', { description: 'test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      const updateWithName: UpdateDistrictDto = { name: 'Rayon Utara' };

      // No code update, so only 2 findOne calls: by id, then by name
      mockDistrictRepository.findOne
        .mockResolvedValueOnce({ ...mockDistrict }) // initial findOne by id
        .mockResolvedValueOnce({ ...mockDistrict, id: 'other-id', name: 'Rayon Utara' }); // name uniqueness check - conflict

      await expect(service.update(mockDistrict.id, updateWithName)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a district', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.count.mockResolvedValue(0);
      mockDistrictRepository.softRemove.mockResolvedValue(mockDistrict);

      await service.remove(mockDistrict.id);

      expect(mockDistrictRepository.softRemove).toHaveBeenCalledWith(mockDistrict);
    });

    it('should throw NotFoundException if district not found', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if areas reference this district', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.count.mockResolvedValue(3);

      await expect(service.remove(mockDistrict.id)).rejects.toThrow(BadRequestException);
      await expect(service.remove(mockDistrict.id)).rejects.toThrow(
        'Cannot delete district: 3 area(s) reference this district',
      );
    });

    it('should throw BadRequestException if regions reference this district (ADR-045)', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.count.mockResolvedValue(0);
      mockDistrictRepository.manager.query.mockResolvedValueOnce([{ count: 2 }]);

      await expect(service.remove(mockDistrict.id)).rejects.toThrow(
        'Cannot delete district: 2 region(s) reference this district',
      );
    });
  });

  describe('findAreasByDistrictId', () => {
    it('should return areas belonging to a district', async () => {
      const areas = [mockArea];
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.find.mockResolvedValue(areas);

      const result = await service.findAreasByDistrictId(mockDistrict.id);

      expect(result).toEqual(areas);
      expect(mockAreaRepository.find).toHaveBeenCalledWith({
        where: { district_id: mockDistrict.id, is_active: true },
        relations: ['locationType'],
        order: { name: 'ASC' },
      });
    });

    it('should throw NotFoundException if district not found', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(null);

      await expect(service.findAreasByDistrictId('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array when district has no areas', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.find.mockResolvedValue([]);

      const result = await service.findAreasByDistrictId(mockDistrict.id);

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return district statistics', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.count
        .mockResolvedValueOnce(5) // total area count
        .mockResolvedValueOnce(4); // active area count

      const result = await service.getStats(mockDistrict.id);

      expect(result).toEqual({
        district: mockDistrict,
        areaCount: 5,
        activeAreaCount: 4,
      });
      expect(mockAreaRepository.count).toHaveBeenCalledTimes(2);
      expect(mockAreaRepository.count).toHaveBeenNthCalledWith(1, {
        where: { district_id: mockDistrict.id },
      });
      expect(mockAreaRepository.count).toHaveBeenNthCalledWith(2, {
        where: { district_id: mockDistrict.id, is_active: true },
      });
    });

    it('should throw NotFoundException if district not found', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(null);

      await expect(service.getStats('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return zero counts when district has no areas', async () => {
      mockDistrictRepository.findOne.mockResolvedValue(mockDistrict);
      mockAreaRepository.count.mockResolvedValue(0);

      const result = await service.getStats(mockDistrict.id);

      expect(result.areaCount).toBe(0);
      expect(result.activeAreaCount).toBe(0);
    });
  });

  describe('deactivate', () => {
    /** No active children and no assigned staff — safe to retire. */
    const noBlockers = () => {
      mockRegionRepository.count.mockResolvedValue(0);
      mockAreaRepository.count.mockResolvedValue(0);
      mockUserRepository.count.mockResolvedValue(0);
    };

    beforeEach(() => {
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict, is_active: true });
      mockDistrictRepository.save.mockImplementation((r: District) => Promise.resolve(r));
    });

    it('deactivates a district that nothing still depends on', async () => {
      noBlockers();

      const result = await service.deactivate(mockDistrict.id);

      expect(result.is_active).toBe(false);
      expect(mockDistrictRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it.each([
      ['region', () => mockRegionRepository.count.mockResolvedValue(2), /2 active region/],
      ['location', () => mockAreaRepository.count.mockResolvedValue(3), /3 active location/],
      ['user', () => mockUserRepository.count.mockResolvedValue(4), /4 active user/],
    ])(
      'refuses while an active %s still references it, and says how many',
      async (_label, arrange, message) => {
        noBlockers();
        arrange();

        await expect(service.deactivate(mockDistrict.id)).rejects.toThrow(ApiException);
        await expect(service.deactivate(mockDistrict.id)).rejects.toThrow(message);
        // The flag must survive a refused deactivation.
        expect(mockDistrictRepository.save).not.toHaveBeenCalled();
      },
    );

    it('reports every blocker at once, not just the first', async () => {
      mockRegionRepository.count.mockResolvedValue(1);
      mockAreaRepository.count.mockResolvedValue(1);
      mockUserRepository.count.mockResolvedValue(1);

      await expect(service.deactivate(mockDistrict.id)).rejects.toThrow(
        /1 active region\(s\), 1 active location\(s\), 1 active user\(s\)/,
      );
    });

    it('carries the error code the frontends localize on (not just prose)', async () => {
      noBlockers();
      mockRegionRepository.count.mockResolvedValue(1);

      // The message stays English-canonical; `code` is the contract.
      await expect(service.deactivate(mockDistrict.id)).rejects.toMatchObject({
        code: 'RAYON_DEACTIVATE_IN_USE',
      });
    });

    it('is a no-op on an already-deactivated district (no guard, no write)', async () => {
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict, is_active: false });

      const result = await service.deactivate(mockDistrict.id);

      expect(result.is_active).toBe(false);
      expect(mockRegionRepository.count).not.toHaveBeenCalled();
      expect(mockDistrictRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('reactivates a deactivated district without any guard', async () => {
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict, is_active: false });
      mockDistrictRepository.save.mockImplementation((r: District) => Promise.resolve(r));

      const result = await service.activate(mockDistrict.id);

      expect(result.is_active).toBe(true);
      // Reactivating must never be blocked by children — that would strand the
      // district in the deactivated state.
      expect(mockRegionRepository.count).not.toHaveBeenCalled();
    });

    it('is a no-op on an already-active district', async () => {
      mockDistrictRepository.findOne.mockResolvedValue({ ...mockDistrict, is_active: true });

      await service.activate(mockDistrict.id);

      expect(mockDistrictRepository.save).not.toHaveBeenCalled();
    });
  });
});
