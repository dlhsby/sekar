import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PlantsController } from './plants.controller';
import { PlantsService } from './services/plants.service';
import { PlantSpecies } from './entities/plant-species.entity';
import { AreaPlant } from './entities/area-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { Area } from '../areas/entities/area.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateNotablePlantDto } from './dto/create-notable-plant.dto';
import { SearchSpeciesDto } from './dto/search-species.dto';

describe('PlantsController', () => {
  let module: TestingModule;
  let controller: PlantsController;
  let plantsService: jest.Mocked<PlantsService>;

  const mockSpecies: PlantSpecies = {
    id: '22222222-2222-2222-2222-222222222201',
    nameId: 'trembesi',
    nameLatin: 'Samanea saman',
    category: 'tree',
    defaultPruningCycleDays: 365,
    notes: 'Rain tree, deciduous',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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
    notes: 'Est. 1950',
    area: mockArea as Area,
    species: mockSpecies,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPlantsService = {
    listSpecies: jest.fn(),
    searchSpecies: jest.fn(),
    listAreaPlants: jest.fn(),
    listNotablePlants: jest.fn(),
    createNotablePlant: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [PlantsController],
      providers: [
        {
          provide: PlantsService,
          useValue: mockPlantsService,
        },
      ],
    }).compile();

    controller = module.get<PlantsController>(PlantsController);
    plantsService = module.get(PlantsService) as jest.Mocked<PlantsService>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listSpecies', () => {
    it('should return paginated species list with default values', async () => {
      const mockResult = { data: [mockSpecies], total: 1 };
      plantsService.listSpecies.mockResolvedValue(mockResult);

      const result = await controller.listSpecies(undefined, undefined);

      expect(result).toEqual(mockResult);
      expect(plantsService.listSpecies).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass limit and offset to service', async () => {
      const mockResult = { data: [mockSpecies], total: 1 };
      plantsService.listSpecies.mockResolvedValue(mockResult);

      await controller.listSpecies(20, 0);

      expect(plantsService.listSpecies).toHaveBeenCalledWith(20, 0);
    });
  });

  describe('searchSpecies', () => {
    it('should search species with query and limit', async () => {
      plantsService.searchSpecies.mockResolvedValue([mockSpecies]);

      const dto: SearchSpeciesDto = { q: 'trembesi', limit: 20 };
      const result = await controller.searchSpecies(dto);

      expect(result).toEqual([mockSpecies]);
      expect(plantsService.searchSpecies).toHaveBeenCalledWith('trembesi', 20);
    });

    it('should use default limit of 20 if not provided', async () => {
      plantsService.searchSpecies.mockResolvedValue([mockSpecies]);

      const dto: SearchSpeciesDto = { q: 'trembesi' };
      await controller.searchSpecies(dto);

      expect(plantsService.searchSpecies).toHaveBeenCalledWith('trembesi', 20);
    });

    it('should handle empty search query', async () => {
      plantsService.searchSpecies.mockResolvedValue([]);

      const dto: SearchSpeciesDto = { q: undefined, limit: 20 };
      await controller.searchSpecies(dto);

      expect(plantsService.searchSpecies).toHaveBeenCalledWith('', 20);
    });
  });

  describe('listAreaPlants', () => {
    it('should return area plants for a given area', async () => {
      plantsService.listAreaPlants.mockResolvedValue([mockAreaPlant]);

      const result = await controller.listAreaPlants(mockArea.id);

      expect(result).toEqual([mockAreaPlant]);
      expect(plantsService.listAreaPlants).toHaveBeenCalledWith(mockArea.id);
    });

    it('should return empty array when no plants exist in area', async () => {
      plantsService.listAreaPlants.mockResolvedValue([]);

      const result = await controller.listAreaPlants(mockArea.id);

      expect(result).toEqual([]);
    });
  });

  describe('listNotablePlants', () => {
    it('should return notable plants for a given area', async () => {
      plantsService.listNotablePlants.mockResolvedValue([mockNotablePlant]);

      const result = await controller.listNotablePlants(mockArea.id);

      expect(result).toEqual([mockNotablePlant]);
      expect(plantsService.listNotablePlants).toHaveBeenCalledWith(mockArea.id);
    });

    it('should return empty array when no notable plants exist', async () => {
      plantsService.listNotablePlants.mockResolvedValue([]);

      const result = await controller.listNotablePlants(mockArea.id);

      expect(result).toEqual([]);
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
      plantsService.createNotablePlant.mockResolvedValue(mockNotablePlant);

      const result = await controller.createNotablePlant(mockArea.id, createDto, mockUser as User);

      expect(result).toEqual(mockNotablePlant);
      expect(plantsService.createNotablePlant).toHaveBeenCalledWith(createDto, mockUser);
    });

    it('should throw BadRequestException if path ID does not match body area_id', async () => {
      const dtoWithDifferentAreaId = {
        ...createDto,
        area_id: '99999999-9999-9999-9999-999999999999',
      };

      await expect(
        controller.createNotablePlant(mockArea.id, dtoWithDifferentAreaId, mockUser as User),
      ).rejects.toThrow(BadRequestException);

      expect(plantsService.createNotablePlant).not.toHaveBeenCalled();
    });

    it('should pass user context to service', async () => {
      plantsService.createNotablePlant.mockResolvedValue(mockNotablePlant);

      await controller.createNotablePlant(mockArea.id, createDto, mockUser as User);

      const callArgs = plantsService.createNotablePlant.mock.calls[0];
      expect(callArgs[1]).toEqual(mockUser);
    });
  });
});
