import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlantsController } from './plants.controller';
import { PlantsService } from './services/plants.service';
import { PlantSpecies } from './entities/plant-species.entity';
import { LocationPlant } from './entities/location-plant.entity';
import { NotablePlant } from './entities/notable-plant.entity';
import { Location } from '../locations/entities/location.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateNotablePlantDto } from './dto/create-notable-plant.dto';
import { CreatePlantSpeciesDto } from './dto/create-plant-species.dto';
import { UpdatePlantSpeciesDto } from './dto/update-plant-species.dto';
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
    location_type_id: '33333333-3333-3333-3333-333333333301',
    rayon_id: '44444444-4444-4444-4444-444444444401',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  } as Location;

  const mockUser: Partial<User> = {
    id: 'user-id',
    username: 'testuser',
    full_name: 'Test User',
    role: UserRole.KORLAP,
    rayon_id: '44444444-4444-4444-4444-444444444401',
    location_id: '11111111-1111-1111-1111-111111111101',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockAreaPlant: LocationPlant = {
    id: '55555555-5555-5555-5555-555555555501',
    locationId: '11111111-1111-1111-1111-111111111101',
    speciesId: '22222222-2222-2222-2222-222222222201',
    count: 10,
    lastPrunedAt: new Date('2026-03-01'),
    nextDueAt: new Date('2027-03-01'),
    status: 'ok',
    overrideCycleDays: null,
    area: mockArea as Location,
    species: mockSpecies,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockNotablePlant: NotablePlant = {
    id: '66666666-6666-6666-6666-666666666601',
    locationId: '11111111-1111-1111-1111-111111111101',
    speciesId: '22222222-2222-2222-2222-222222222201',
    gpsLat: -7.25,
    gpsLng: 112.75,
    label: 'Heritage Trembesi',
    heritage: true,
    photoUrls: [],
    notes: 'Est. 1950',
    area: mockArea as Location,
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
    createSpecies: jest.fn(),
    updateSpecies: jest.fn(),
    deleteSpecies: jest.fn(),
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
      location_id: '11111111-1111-1111-1111-111111111101',
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

    it('should throw BadRequestException if path ID does not match body location_id', async () => {
      const dtoWithDifferentAreaId = {
        ...createDto,
        location_id: '99999999-9999-9999-9999-999999999999',
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

  describe('createSpecies', () => {
    const createDto: CreatePlantSpeciesDto = {
      nameId: 'Trembesi Baru',
      nameLatin: 'Samanea saman',
      category: 'tree',
      defaultPruningCycleDays: 365,
      notes: 'Rain tree',
    };

    it('should create a plant species with valid inputs', async () => {
      const createdSpecies = { ...mockSpecies, id: '33333333-3333-3333-3333-333333333301' };
      plantsService.createSpecies.mockResolvedValue(createdSpecies);

      const result = await controller.createSpecies(createDto);

      expect(result).toEqual(createdSpecies);
      expect(plantsService.createSpecies).toHaveBeenCalledWith(createDto);
    });

    it('should pass through service errors', async () => {
      plantsService.createSpecies.mockRejectedValue(
        new BadRequestException('Duplicate species name'),
      );

      await expect(controller.createSpecies(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should create species with optional fields undefined', async () => {
      const minimalDto: CreatePlantSpeciesDto = { nameId: 'Pohon Baru' };
      const created = {
        id: '33333333-3333-3333-3333-333333333301',
        nameId: 'Pohon Baru',
        nameLatin: null,
        category: 'tree' as const,
        defaultPruningCycleDays: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      plantsService.createSpecies.mockResolvedValue(created);

      const result = await controller.createSpecies(minimalDto);

      expect(result.nameId).toEqual('Pohon Baru');
      expect(plantsService.createSpecies).toHaveBeenCalledWith(minimalDto);
    });
  });

  describe('updateSpecies', () => {
    const updateDto: UpdatePlantSpeciesDto = {
      nameLatin: 'Samanea saman updated',
      defaultPruningCycleDays: 180,
    };

    it('should update a plant species with valid inputs', async () => {
      const updated = { ...mockSpecies, nameLatin: 'Samanea saman updated' };
      plantsService.updateSpecies.mockResolvedValue(updated);

      const result = await controller.updateSpecies(mockSpecies.id, updateDto);

      expect(result).toEqual(updated);
      expect(plantsService.updateSpecies).toHaveBeenCalledWith(mockSpecies.id, updateDto);
    });

    it('should throw NotFoundException when species does not exist', async () => {
      plantsService.updateSpecies.mockRejectedValue(
        new NotFoundException('Plant species not found'),
      );

      await expect(
        controller.updateSpecies('99999999-9999-9999-9999-999999999999', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on duplicate nameId', async () => {
      const dupDto: UpdatePlantSpeciesDto = { nameId: 'Existing Name' };
      plantsService.updateSpecies.mockRejectedValue(
        new BadRequestException('Plant species with name already exists'),
      );

      await expect(controller.updateSpecies(mockSpecies.id, dupDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass partial updates to service', async () => {
      const partialDto: UpdatePlantSpeciesDto = { notes: 'Updated notes' };
      plantsService.updateSpecies.mockResolvedValue(mockSpecies);

      await controller.updateSpecies(mockSpecies.id, partialDto);

      expect(plantsService.updateSpecies).toHaveBeenCalledWith(mockSpecies.id, partialDto);
    });
  });

  describe('deleteSpecies', () => {
    it('should delete a plant species', async () => {
      plantsService.deleteSpecies.mockResolvedValue(undefined);

      await controller.deleteSpecies(mockSpecies.id);

      expect(plantsService.deleteSpecies).toHaveBeenCalledWith(mockSpecies.id);
    });

    it('should throw NotFoundException when species does not exist', async () => {
      plantsService.deleteSpecies.mockRejectedValue(
        new NotFoundException('Plant species not found'),
      );

      await expect(
        controller.deleteSpecies('99999999-9999-9999-9999-999999999999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when species is in use', async () => {
      plantsService.deleteSpecies.mockRejectedValue(
        new ConflictException('Cannot delete: referenced by 5 area inventory records'),
      );

      await expect(controller.deleteSpecies(mockSpecies.id)).rejects.toThrow(ConflictException);
    });

    it('should call service with correct species ID', async () => {
      plantsService.deleteSpecies.mockResolvedValue(undefined);

      await controller.deleteSpecies(mockSpecies.id);

      expect(plantsService.deleteSpecies).toHaveBeenCalledTimes(1);
      expect(plantsService.deleteSpecies).toHaveBeenCalledWith(mockSpecies.id);
    });
  });
});
