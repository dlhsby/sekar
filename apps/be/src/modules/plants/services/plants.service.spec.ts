import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { PlantSpecies } from '../entities/plant-species.entity';
import { AreaPlant } from '../entities/area-plant.entity';
import { NotablePlant } from '../entities/notable-plant.entity';
import { Area } from '../../areas/entities/area.entity';
import { CreateNotablePlantDto } from '../dto/create-notable-plant.dto';
import { CreatePlantSpeciesDto } from '../dto/create-plant-species.dto';
import { UpdatePlantSpeciesDto } from '../dto/update-plant-species.dto';
import { User, UserRole } from '../../users/entities/user.entity';

describe('PlantsService', () => {
  let module: TestingModule;
  let service: PlantsService;
  let speciesRepository: jest.Mocked<Repository<PlantSpecies>>;
  let areaPlantRepository: jest.Mocked<Repository<AreaPlant>>;
  let notablePlantRepository: jest.Mocked<Repository<NotablePlant>>;
  let areaRepository: jest.Mocked<Repository<Area>>;

  const mockSpecies: PlantSpecies = {
    id: '22222222-2222-2222-2222-222222222201',
    nameId: 'trembesi',
    nameLatin: 'Samanea saman',
    category: 'tree',
    defaultPruningCycleDays: 365,
    notes: 'Rain tree, deciduous',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockArea = {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Taman Bungkul',
    address: 'Jalan Darmo',
    gps_lat: -7.25,
    gps_lng: 112.75,
    radius_meters: 100,
    is_active: true,
    area_type_id: '33333333-3333-3333-3333-333333333301',
    rayon_id: '44444444-4444-4444-4444-444444444401',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  } as Area;

  const mockUser: Partial<User> = {
    id: 'user-id',
    username: 'testuser',
    full_name: 'Test User',
    role: UserRole.KORLAP,
    rayon_id: '44444444-4444-4444-4444-444444444401',
    area_id: '11111111-1111-1111-1111-111111111101',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockAreaPlant: AreaPlant = {
    id: '55555555-5555-5555-5555-555555555501',
    areaId: '11111111-1111-1111-1111-111111111101',
    speciesId: '22222222-2222-2222-2222-222222222201',
    count: 10,
    lastPrunedAt: new Date('2026-03-01'),
    nextDueAt: new Date('2027-03-01'),
    status: 'ok',
    overrideCycleDays: null,
    area: mockArea as Area,
    species: mockSpecies,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockNotablePlant: NotablePlant = {
    id: '66666666-6666-6666-6666-666666666601',
    areaId: '11111111-1111-1111-1111-111111111101',
    speciesId: '22222222-2222-2222-2222-222222222201',
    gpsLat: -7.25,
    gpsLng: 112.75,
    label: 'Heritage Trembesi',
    heritage: true,
    photoUrls: [],
    notes: 'Est. 1950, near power lines',
    area: mockArea as Area,
    species: mockSpecies,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSpeciesRepository = {
    findAndCount: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAreaPlantRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockNotablePlantRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockAreaRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PlantsService,
        {
          provide: getRepositoryToken(PlantSpecies),
          useValue: mockSpeciesRepository,
        },
        {
          provide: getRepositoryToken(AreaPlant),
          useValue: mockAreaPlantRepository,
        },
        {
          provide: getRepositoryToken(NotablePlant),
          useValue: mockNotablePlantRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreaRepository,
        },
      ],
    }).compile();

    service = module.get<PlantsService>(PlantsService);
    speciesRepository = module.get(getRepositoryToken(PlantSpecies)) as jest.Mocked<
      Repository<PlantSpecies>
    >;
    areaPlantRepository = module.get(getRepositoryToken(AreaPlant)) as jest.Mocked<
      Repository<AreaPlant>
    >;
    notablePlantRepository = module.get(getRepositoryToken(NotablePlant)) as jest.Mocked<
      Repository<NotablePlant>
    >;
    areaRepository = module.get(getRepositoryToken(Area)) as jest.Mocked<Repository<Area>>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listSpecies', () => {
    it('should return paginated list of species ordered by name (excluding deleted)', async () => {
      mockSpeciesRepository.findAndCount.mockResolvedValue([[mockSpecies], 1]);

      const result = await service.listSpecies(20, 0);

      expect(result).toEqual({ data: [mockSpecies], total: 1 });
      expect(mockSpeciesRepository.findAndCount).toHaveBeenCalled();
      const callArgs = mockSpeciesRepository.findAndCount.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      expect(callArgs.order).toEqual({ nameId: 'ASC' });
      expect(callArgs.take).toEqual(20);
      expect(callArgs.skip).toEqual(0);
    });

    it('should default limit to 20 and offset to 0', async () => {
      mockSpeciesRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.listSpecies();

      expect(mockSpeciesRepository.findAndCount).toHaveBeenCalled();
      const callArgs = mockSpeciesRepository.findAndCount.mock.calls[0][0];
      expect(callArgs.take).toEqual(20);
      expect(callArgs.skip).toEqual(0);
    });

    it('should cap limit to 50', async () => {
      mockSpeciesRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.listSpecies(100, 0);

      expect(mockSpeciesRepository.findAndCount).toHaveBeenCalled();
      const callArgs = mockSpeciesRepository.findAndCount.mock.calls[0][0];
      expect(callArgs.take).toEqual(50);
    });
  });

  describe('searchSpecies', () => {
    it('should search by name_id case-insensitively using ILIKE', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSpecies]),
      };

      mockSpeciesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchSpecies('trembesi', 20);

      expect(result).toEqual([mockSpecies]);
      expect(mockSpeciesRepository.createQueryBuilder).toHaveBeenCalledWith('species');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('species.deleted_at IS NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'species.name_id ILIKE :q OR species.name_latin ILIKE :q',
        { q: '%trembesi%' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('species.name_id', 'ASC');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should return all species if query is empty', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSpecies]),
      };

      mockSpeciesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchSpecies('', 20);

      expect(result).toEqual([mockSpecies]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('species.deleted_at IS NULL');
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should cap limit to 50', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockSpeciesRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.searchSpecies('test', 100);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  describe('listAreaPlants', () => {
    it('should return area plants with species relation', async () => {
      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockAreaPlantRepository.find.mockResolvedValue([mockAreaPlant]);

      const result = await service.listAreaPlants(mockArea.id);

      expect(result).toEqual([mockAreaPlant]);
      expect(mockAreaRepository.findOne).toHaveBeenCalledWith({ where: { id: mockArea.id } });
      expect(mockAreaPlantRepository.find).toHaveBeenCalledWith({
        where: { areaId: mockArea.id },
        relations: ['species'],
        order: { species: { nameId: 'ASC' } },
      });
    });

    it('should throw NotFoundException if area does not exist', async () => {
      mockAreaRepository.findOne.mockResolvedValue(null);

      await expect(service.listAreaPlants('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.listAreaPlants('non-existent-id')).rejects.toThrow(
        'Area with ID non-existent-id not found',
      );
    });
  });

  describe('listNotablePlants', () => {
    it('should return notable plants with species relation ordered by createdAt DESC', async () => {
      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockNotablePlantRepository.find.mockResolvedValue([mockNotablePlant]);

      const result = await service.listNotablePlants(mockArea.id);

      expect(result).toEqual([mockNotablePlant]);
      expect(mockAreaRepository.findOne).toHaveBeenCalledWith({ where: { id: mockArea.id } });
      expect(mockNotablePlantRepository.find).toHaveBeenCalledWith({
        where: { areaId: mockArea.id },
        relations: ['species'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException if area does not exist', async () => {
      mockAreaRepository.findOne.mockResolvedValue(null);

      await expect(service.listNotablePlants('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNotablePlant', () => {
    const createDto: CreateNotablePlantDto = {
      area_id: '11111111-1111-1111-1111-111111111101',
      species_id: '22222222-2222-2222-2222-222222222201',
      label: 'Heritage Trembesi',
      last_pruned_at: '2026-03-15T10:30:00+07:00',
      notes: 'Est. 1950',
    };

    it('should create a notable plant with valid inputs', async () => {
      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockSpeciesRepository.findOne.mockResolvedValue(mockSpecies);
      mockNotablePlantRepository.create.mockReturnValue(mockNotablePlant);
      mockNotablePlantRepository.save.mockResolvedValue(mockNotablePlant);
      mockNotablePlantRepository.findOne.mockResolvedValue(mockNotablePlant);

      const result = await service.createNotablePlant(createDto, mockUser as User);

      expect(result).toEqual(mockNotablePlant);
      expect(mockAreaRepository.findOne).toHaveBeenCalledWith({ where: { id: mockArea.id } });
      expect(mockSpeciesRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSpecies.id },
      });
      expect(mockNotablePlantRepository.create).toHaveBeenCalled();
      expect(mockNotablePlantRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if area does not exist', async () => {
      mockAreaRepository.findOne.mockResolvedValue(null);

      await expect(service.createNotablePlant(createDto, mockUser as User)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createNotablePlant(createDto, mockUser as User)).rejects.toThrow(
        `Area with ID ${mockArea.id} not found`,
      );
    });

    it('should throw NotFoundException if species does not exist', async () => {
      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockSpeciesRepository.findOne.mockResolvedValue(null);

      await expect(service.createNotablePlant(createDto, mockUser as User)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createNotablePlant(createDto, mockUser as User)).rejects.toThrow(
        `Plant species with ID ${mockSpecies.id} not found`,
      );
    });

    it('should handle optional fields (label, last_pruned_at, notes)', async () => {
      const dtoWithoutOptionals: CreateNotablePlantDto = {
        area_id: '11111111-1111-1111-1111-111111111101',
        species_id: '22222222-2222-2222-2222-222222222201',
      };

      mockAreaRepository.findOne.mockResolvedValue(mockArea);
      mockSpeciesRepository.findOne.mockResolvedValue(mockSpecies);
      const plantWithoutOptionals = { ...mockNotablePlant, label: null, notes: null };
      mockNotablePlantRepository.create.mockReturnValue(plantWithoutOptionals);
      mockNotablePlantRepository.save.mockResolvedValue(plantWithoutOptionals);
      mockNotablePlantRepository.findOne.mockResolvedValue(plantWithoutOptionals);

      const result = await service.createNotablePlant(dtoWithoutOptionals, mockUser as User);

      expect(result.label).toBeNull();
      expect(result.notes).toBeNull();
    });
  });

  describe('createSpecies', () => {
    const createDto: CreatePlantSpeciesDto = {
      nameId: 'Pohon Baru',
      nameLatin: 'Arbor novus',
      category: 'tree',
      defaultPruningCycleDays: 365,
      notes: 'A new species',
    };

    it('should create a plant species with all fields', async () => {
      const createdSpecies = {
        ...mockSpecies,
        id: '33333333-3333-3333-3333-333333333301',
        nameId: 'Pohon Baru',
        deletedAt: null,
      };
      mockSpeciesRepository.findOne.mockResolvedValue(null); // no duplicate
      mockSpeciesRepository.create.mockReturnValue(createdSpecies);
      mockSpeciesRepository.save.mockResolvedValue(createdSpecies);

      const result = await service.createSpecies(createDto);

      expect(result).toEqual(createdSpecies);
      expect(mockSpeciesRepository.findOne).toHaveBeenCalledWith({
        where: { nameId: 'Pohon Baru', deletedAt: expect.anything() },
      });
      expect(mockSpeciesRepository.create).toHaveBeenCalledWith({
        nameId: 'Pohon Baru',
        nameLatin: 'Arbor novus',
        category: 'tree',
        defaultPruningCycleDays: 365,
        notes: 'A new species',
      });
      expect(mockSpeciesRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if nameId already exists', async () => {
      mockSpeciesRepository.findOne.mockResolvedValue(mockSpecies); // duplicate exists

      await expect(service.createSpecies(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createSpecies(createDto)).rejects.toThrow(
        'Plant species with name "Pohon Baru" already exists',
      );
    });

    it('should handle optional fields', async () => {
      const minimalDto: CreatePlantSpeciesDto = { nameId: 'Minimal' };
      const created = {
        ...mockSpecies,
        nameId: 'Minimal',
        nameLatin: null,
        category: 'tree' as const,
        defaultPruningCycleDays: null,
        notes: null,
        deletedAt: null,
      };
      mockSpeciesRepository.findOne.mockResolvedValue(null);
      mockSpeciesRepository.create.mockReturnValue(created);
      mockSpeciesRepository.save.mockResolvedValue(created);

      const result = await service.createSpecies(minimalDto);

      expect(result.nameId).toEqual('Minimal');
      expect(mockSpeciesRepository.create).toHaveBeenCalledWith({
        nameId: 'Minimal',
        nameLatin: null,
        category: 'tree',
        defaultPruningCycleDays: null,
        notes: null,
      });
    });
  });

  describe('updateSpecies', () => {
    const updateDto: UpdatePlantSpeciesDto = {
      nameLatin: 'Updated latin name',
      defaultPruningCycleDays: 180,
    };

    it('should update plant species with valid inputs', async () => {
      const updated = {
        ...mockSpecies,
        nameLatin: 'Updated latin name',
        defaultPruningCycleDays: 180,
        deletedAt: null,
      };
      mockSpeciesRepository.findOne.mockResolvedValue({
        ...mockSpecies,
        deletedAt: null,
      });
      mockSpeciesRepository.save.mockResolvedValue(updated);

      const result = await service.updateSpecies(mockSpecies.id, updateDto);

      expect(result).toEqual(updated);
      expect(mockSpeciesRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSpecies.id, deletedAt: expect.anything() },
      });
      expect(mockSpeciesRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if species does not exist', async () => {
      mockSpeciesRepository.findOne.mockResolvedValue(null);

      await expect(service.updateSpecies('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check for duplicate nameId when updating', async () => {
      const dupNameDto: UpdatePlantSpeciesDto = { nameId: 'Existing Name' };
      const existing = { ...mockSpecies, deletedAt: null };
      mockSpeciesRepository.findOne
        .mockResolvedValueOnce(existing) // first call: find the species to update
        .mockResolvedValueOnce(mockSpecies); // second call: find duplicate

      await expect(service.updateSpecies(mockSpecies.id, dupNameDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow nameId update if not a duplicate', async () => {
      const species = { ...mockSpecies, deletedAt: null };
      const updated = { ...species, nameId: 'New Name' };
      mockSpeciesRepository.findOne
        .mockResolvedValueOnce(species) // find species to update
        .mockResolvedValueOnce(null); // no duplicate
      mockSpeciesRepository.save.mockResolvedValue(updated);

      const result = await service.updateSpecies(mockSpecies.id, { nameId: 'New Name' });

      expect(result.nameId).toEqual('New Name');
      expect(mockSpeciesRepository.save).toHaveBeenCalled();
    });

    it('should update multiple fields independently', async () => {
      const species = { ...mockSpecies, deletedAt: null };
      const updated = {
        ...species,
        nameLatin: 'New Latin',
        category: 'shrub',
        notes: 'Updated notes',
      };
      mockSpeciesRepository.findOne.mockResolvedValue(species);
      mockSpeciesRepository.save.mockResolvedValue(updated);

      await service.updateSpecies(mockSpecies.id, {
        nameLatin: 'New Latin',
        category: 'shrub',
        notes: 'Updated notes',
      });

      expect(mockSpeciesRepository.save).toHaveBeenCalled();
    });
  });

  describe('deleteSpecies', () => {
    it('should soft delete a plant species with no references', async () => {
      const species = { ...mockSpecies, deletedAt: null };
      mockSpeciesRepository.findOne.mockResolvedValue(species);
      mockAreaPlantRepository.count.mockResolvedValue(0);
      mockNotablePlantRepository.count.mockResolvedValue(0);
      mockSpeciesRepository.softRemove.mockResolvedValue(species);

      await service.deleteSpecies(mockSpecies.id);

      expect(mockSpeciesRepository.softRemove).toHaveBeenCalledWith(species);
      expect(mockAreaPlantRepository.count).toHaveBeenCalledWith({
        where: { speciesId: mockSpecies.id },
      });
      expect(mockNotablePlantRepository.count).toHaveBeenCalledWith({
        where: { speciesId: mockSpecies.id },
      });
    });

    it('should throw NotFoundException if species does not exist', async () => {
      mockSpeciesRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteSpecies('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if species is referenced by area_plants', async () => {
      const species = { ...mockSpecies, deletedAt: null };
      mockSpeciesRepository.findOne.mockResolvedValue(species);
      mockAreaPlantRepository.count.mockResolvedValue(5); // 5 references

      await expect(service.deleteSpecies(mockSpecies.id)).rejects.toThrow(ConflictException);
      await expect(service.deleteSpecies(mockSpecies.id)).rejects.toThrow(
        'Cannot delete plant species: it is referenced by 5 area inventory record(s)',
      );
    });

    it('should throw ConflictException if species is referenced by notable_plants', async () => {
      const species = { ...mockSpecies, deletedAt: null };
      mockSpeciesRepository.findOne.mockResolvedValue(species);
      mockAreaPlantRepository.count.mockResolvedValue(0);
      mockNotablePlantRepository.count.mockResolvedValue(2); // 2 references

      await expect(service.deleteSpecies(mockSpecies.id)).rejects.toThrow(ConflictException);
      await expect(service.deleteSpecies(mockSpecies.id)).rejects.toThrow(
        'Cannot delete plant species: it is referenced by 2 notable plant record(s)',
      );
    });

    it('should prioritize the area_plants error when both are referenced', async () => {
      // Both referential-integrity checks run concurrently (Promise.all) rather than
      // sequentially — area_plants and notable_plants counts are independent queries
      // with no data dependency, so both always run; area_plants takes priority for
      // which error message is thrown when both are non-zero.
      const species = { ...mockSpecies, deletedAt: null };
      mockSpeciesRepository.findOne.mockResolvedValue(species);
      mockAreaPlantRepository.count.mockResolvedValue(3);
      mockNotablePlantRepository.count.mockResolvedValue(2);

      await expect(service.deleteSpecies(mockSpecies.id)).rejects.toThrow(ConflictException);
      await expect(service.deleteSpecies(mockSpecies.id)).rejects.toThrow(
        'Cannot delete plant species: it is referenced by 3 area inventory record(s)',
      );
      expect(mockNotablePlantRepository.count).toHaveBeenCalled();
    });
  });
});
