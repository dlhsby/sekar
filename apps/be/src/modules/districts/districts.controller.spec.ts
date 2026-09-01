import { Test, TestingModule } from '@nestjs/testing';
import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';
import { District, StaffingLevel } from './entities/district.entity';
import { Location } from '../locations/entities/location.entity';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';

describe('DistrictsController', () => {
  let module: TestingModule;
  let controller: DistrictsController;
  let districtService: DistrictsService;

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

  const mockDistrictsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    isNameAvailable: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findAreasByDistrictId: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [DistrictsController],
      providers: [
        {
          provide: DistrictsService,
          useValue: mockDistrictsService,
        },
      ],
    }).compile();

    controller = module.get<DistrictsController>(DistrictsController);
    districtService = module.get<DistrictsService>(DistrictsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkName', () => {
    it('returns { available: false } for a name shorter than 2 chars without calling the service', async () => {
      const result = await controller.checkName('a');
      expect(result).toEqual({ available: false });
      expect(mockDistrictsService.isNameAvailable).not.toHaveBeenCalled();
    });

    it('delegates to the service (trimmed) and returns its result', async () => {
      mockDistrictsService.isNameAvailable.mockResolvedValue(true);
      const result = await controller.checkName('  District Baru  ', 'exclude-id');
      expect(result).toEqual({ available: true });
      expect(mockDistrictsService.isNameAvailable).toHaveBeenCalledWith(
        'District Baru',
        'exclude-id',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of districts', async () => {
      const districts = [mockDistrict];
      mockDistrictsService.findAll.mockResolvedValue(districts);

      const result = await controller.findAll();

      expect(result).toEqual(districts);
      expect(districtService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no districts exist', async () => {
      mockDistrictsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a district by ID', async () => {
      mockDistrictsService.findOne.mockResolvedValue(mockDistrict);

      const result = await controller.findOne(mockDistrict.id);

      expect(result).toEqual(mockDistrict);
      expect(districtService.findOne).toHaveBeenCalledWith(mockDistrict.id);
    });
  });

  describe('findAreas', () => {
    it('should return areas belonging to a district', async () => {
      const areas = [mockArea];
      mockDistrictsService.findAreasByDistrictId.mockResolvedValue(areas);

      const result = await controller.findAreas(mockDistrict.id);

      expect(result).toEqual(areas);
      expect(districtService.findAreasByDistrictId).toHaveBeenCalledWith(mockDistrict.id);
    });

    it('should return empty array when district has no areas', async () => {
      mockDistrictsService.findAreasByDistrictId.mockResolvedValue([]);

      const result = await controller.findAreas(mockDistrict.id);

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return district statistics', async () => {
      const stats = {
        district: mockDistrict,
        areaCount: 5,
        activeAreaCount: 4,
      };
      mockDistrictsService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(mockDistrict.id);

      expect(result).toEqual(stats);
      expect(districtService.getStats).toHaveBeenCalledWith(mockDistrict.id);
    });
  });

  describe('create', () => {
    it('should create a new district', async () => {
      const createDistrictDto: CreateDistrictDto = {
        name: 'Rayon Utara',
        description: 'Covers northern Surabaya districts',
      };

      const newDistrict = { id: 'new-id', ...createDistrictDto };
      mockDistrictsService.create.mockResolvedValue(newDistrict);

      const result = await controller.create(createDistrictDto);

      expect(result).toEqual(newDistrict);
      expect(districtService.create).toHaveBeenCalledWith(createDistrictDto);
    });
  });

  describe('update', () => {
    it('should update a district', async () => {
      const updateDistrictDto: UpdateDistrictDto = {
        name: 'Rayon Selatan Updated',
        description: 'Updated description',
      };

      const updatedDistrict = { ...mockDistrict, ...updateDistrictDto };
      mockDistrictsService.update.mockResolvedValue(updatedDistrict);

      const result = await controller.update(mockDistrict.id, updateDistrictDto);

      expect(result).toEqual(updatedDistrict);
      expect(districtService.update).toHaveBeenCalledWith(mockDistrict.id, updateDistrictDto);
    });
  });

  describe('remove', () => {
    it('should remove a district', async () => {
      mockDistrictsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockDistrict.id);

      expect(districtService.remove).toHaveBeenCalledWith(mockDistrict.id);
    });
  });
});
