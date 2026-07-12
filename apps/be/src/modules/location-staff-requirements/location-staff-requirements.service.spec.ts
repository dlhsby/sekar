import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import {
  LocationStaffRequirement,
  DayType,
  StaffRole,
} from './entities/location-staff-requirement.entity';
import { LocationsService } from '../locations/locations.service';
import { ShiftDefinitionsService } from '../shift-definitions/shift-definitions.service';
import { CreateLocationStaffRequirementDto } from './dto/create-location-staff-requirement.dto';
import { UpdateLocationStaffRequirementDto } from './dto/update-location-staff-requirement.dto';

describe('LocationStaffRequirementsService', () => {
  let module: TestingModule;
  let service: LocationStaffRequirementsService;
  let requirementRepository: jest.Mocked<Repository<LocationStaffRequirement>>;
  let locationsService: jest.Mocked<LocationsService>;
  let shiftDefinitionsService: jest.Mocked<ShiftDefinitionsService>;

  const mockShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Shift 1',
    code: 'SHIFT1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
  };

  const mockArea = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    is_active: true,
  };

  const mockRequirementWorker: LocationStaffRequirement = {
    id: '44444444-4444-4444-4444-444444444401',
    location_id: mockArea.id,
    shift_definition_id: mockShiftDefinition.id,
    role: StaffRole.SATGAS,
    required_count: 6,
    day_type: DayType.WEEKDAY,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    area: mockArea as any,
    shiftDefinition: mockShiftDefinition as any,
  };

  const mockRequirementLinmas: LocationStaffRequirement = {
    id: '44444444-4444-4444-4444-444444444402',
    location_id: mockArea.id,
    shift_definition_id: mockShiftDefinition.id,
    role: StaffRole.LINMAS,
    required_count: 2,
    day_type: DayType.WEEKDAY,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    area: mockArea as any,
    shiftDefinition: mockShiftDefinition as any,
  };

  const mockRequirementRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockLocationsService = {
    findOne: jest.fn(),
  };

  const mockShiftDefinitionsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        LocationStaffRequirementsService,
        {
          provide: getRepositoryToken(LocationStaffRequirement),
          useValue: mockRequirementRepository,
        },
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
        {
          provide: ShiftDefinitionsService,
          useValue: mockShiftDefinitionsService,
        },
      ],
    }).compile();

    service = module.get<LocationStaffRequirementsService>(LocationStaffRequirementsService);
    requirementRepository = module.get(getRepositoryToken(LocationStaffRequirement));
    locationsService = module.get(LocationsService) as jest.Mocked<LocationsService>;
    shiftDefinitionsService = module.get(
      ShiftDefinitionsService,
    ) as jest.Mocked<ShiftDefinitionsService>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByAreaId', () => {
    it('should return all staff requirements for an area', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockArea);
      const requirements = [mockRequirementWorker, mockRequirementLinmas];
      mockRequirementRepository.find.mockResolvedValue(requirements);

      const result = await service.findByAreaId(mockArea.id);

      expect(result).toEqual(requirements);
      expect(mockLocationsService.findOne).toHaveBeenCalledWith(mockArea.id);
      expect(mockRequirementRepository.find).toHaveBeenCalledWith({
        where: { location_id: mockArea.id },
        relations: ['shiftDefinition'],
        order: { day_type: 'ASC', role: 'ASC' },
      });
    });

    it('should throw NotFoundException if area not found', async () => {
      mockLocationsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.findByAreaId('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when area has no requirements', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockArea);
      mockRequirementRepository.find.mockResolvedValue([]);

      const result = await service.findByAreaId(mockArea.id);

      expect(result).toEqual([]);
    });
  });

  describe('findByAreaAndShift', () => {
    it('should return requirements for a specific area and shift', async () => {
      const requirements = [mockRequirementWorker, mockRequirementLinmas];
      mockRequirementRepository.find.mockResolvedValue(requirements);

      const result = await service.findByAreaAndShift(mockArea.id, mockShiftDefinition.id);

      expect(result).toEqual(requirements);
      expect(mockRequirementRepository.find).toHaveBeenCalledWith({
        where: {
          location_id: mockArea.id,
          shift_definition_id: mockShiftDefinition.id,
        },
        relations: ['shiftDefinition'],
        order: { role: 'ASC' },
      });
    });

    it('should filter by day type when provided', async () => {
      mockRequirementRepository.find.mockResolvedValue([mockRequirementWorker]);

      const result = await service.findByAreaAndShift(
        mockArea.id,
        mockShiftDefinition.id,
        DayType.WEEKDAY,
      );

      expect(result).toEqual([mockRequirementWorker]);
      expect(mockRequirementRepository.find).toHaveBeenCalledWith({
        where: {
          location_id: mockArea.id,
          shift_definition_id: mockShiftDefinition.id,
          day_type: DayType.WEEKDAY,
        },
        relations: ['shiftDefinition'],
        order: { role: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a staff requirement by ID', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(mockRequirementWorker);

      const result = await service.findOne(mockRequirementWorker.id);

      expect(result).toEqual(mockRequirementWorker);
      expect(mockRequirementRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRequirementWorker.id },
        relations: ['area', 'shiftDefinition'],
      });
    });

    it('should throw NotFoundException if requirement not found', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Staff requirement with ID non-existent-id not found',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateLocationStaffRequirementDto = {
      location_id: mockArea.id,
      shift_definition_id: mockShiftDefinition.id,
      role: StaffRole.SATGAS,
      required_count: 6,
      day_type: DayType.WEEKDAY,
    };

    it('should successfully create a staff requirement', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);
      mockRequirementRepository.findOne.mockResolvedValue(null);
      mockRequirementRepository.create.mockReturnValue(mockRequirementWorker);
      mockRequirementRepository.save.mockResolvedValue(mockRequirementWorker);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRequirementWorker);
      expect(mockLocationsService.findOne).toHaveBeenCalledWith(createDto.location_id);
      expect(mockShiftDefinitionsService.findOne).toHaveBeenCalledWith(
        createDto.shift_definition_id,
      );
    });

    it('should default day_type to WEEKDAY when not provided', async () => {
      const dtoWithoutDayType: CreateLocationStaffRequirementDto = {
        location_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        role: StaffRole.SATGAS,
        required_count: 6,
      };

      mockLocationsService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);
      mockRequirementRepository.findOne.mockResolvedValue(null);
      mockRequirementRepository.create.mockReturnValue(mockRequirementWorker);
      mockRequirementRepository.save.mockResolvedValue(mockRequirementWorker);

      await service.create(dtoWithoutDayType);

      expect(mockRequirementRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutDayType,
        day_type: DayType.WEEKDAY,
      });
    });

    it('should throw NotFoundException if area not found', async () => {
      mockLocationsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if shift definition not found', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if requirement already exists', async () => {
      mockLocationsService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShiftDefinition);
      mockRequirementRepository.findOne.mockResolvedValue(mockRequirementWorker);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Staff requirement already exists for this area, shift, role, and day type combination',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateLocationStaffRequirementDto = {
      required_count: 8,
    };

    it('should update a staff requirement', async () => {
      mockRequirementRepository.findOne.mockResolvedValue({ ...mockRequirementWorker });
      const updatedRequirement = { ...mockRequirementWorker, required_count: 8 };
      mockRequirementRepository.save.mockResolvedValue(updatedRequirement);

      const result = await service.update(mockRequirementWorker.id, updateDto);

      expect(result.required_count).toBe(8);
      expect(mockRequirementRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if requirement not found', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when changing to duplicate role/day_type combination', async () => {
      mockRequirementRepository.findOne
        .mockResolvedValueOnce(mockRequirementWorker) // initial findOne
        .mockResolvedValueOnce({ ...mockRequirementLinmas }); // uniqueness check

      const updateWithRole: UpdateLocationStaffRequirementDto = { role: StaffRole.LINMAS };

      await expect(service.update(mockRequirementWorker.id, updateWithRole)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating with same role (no change)', async () => {
      mockRequirementRepository.findOne.mockResolvedValue({ ...mockRequirementWorker });
      mockRequirementRepository.save.mockResolvedValue(mockRequirementWorker);

      const updateWithSameRole: UpdateLocationStaffRequirementDto = { role: StaffRole.SATGAS };

      const result = await service.update(mockRequirementWorker.id, updateWithSameRole);

      expect(result).toEqual(mockRequirementWorker);
    });
  });

  describe('remove', () => {
    it('should soft delete a staff requirement', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(mockRequirementWorker);
      mockRequirementRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockRequirementWorker.id);

      expect(mockRequirementRepository.softDelete).toHaveBeenCalledWith(mockRequirementWorker.id);
    });

    it('should throw NotFoundException if requirement not found', async () => {
      mockRequirementRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRequirementsSummary', () => {
    it('should return requirements summary for an area', async () => {
      const requirements = [mockRequirementWorker, mockRequirementLinmas];
      mockRequirementRepository.find.mockResolvedValue(requirements);

      const result = await service.getRequirementsSummary(mockArea.id, DayType.WEEKDAY);

      expect(result.locationId).toBe(mockArea.id);
      expect(result.dayType).toBe(DayType.WEEKDAY);
      expect(result.shifts).toHaveLength(1);
      expect(result.shifts[0].workerCount).toBe(6);
      expect(result.shifts[0].linmasCount).toBe(2);
      expect(result.totalWorkers).toBe(6);
      expect(result.totalLinmas).toBe(2);
    });

    it('should default to WEEKDAY day type when not provided', async () => {
      mockRequirementRepository.find.mockResolvedValue([]);

      await service.getRequirementsSummary(mockArea.id);

      expect(mockRequirementRepository.find).toHaveBeenCalledWith({
        where: { location_id: mockArea.id, day_type: DayType.WEEKDAY },
        relations: ['shiftDefinition'],
      });
    });

    it('should return empty summary when area has no requirements', async () => {
      mockRequirementRepository.find.mockResolvedValue([]);

      const result = await service.getRequirementsSummary(mockArea.id, DayType.WEEKDAY);

      expect(result.shifts).toEqual([]);
      expect(result.totalWorkers).toBe(0);
      expect(result.totalLinmas).toBe(0);
    });

    it('should aggregate requirements by shift', async () => {
      const shift2 = { ...mockShiftDefinition, id: 'shift-2-id', name: 'Shift 2' };
      const reqShift2Worker = {
        ...mockRequirementWorker,
        id: 'new-id',
        shift_definition_id: shift2.id,
        required_count: 4,
        shiftDefinition: shift2,
      };

      const requirements = [mockRequirementWorker, mockRequirementLinmas, reqShift2Worker];
      mockRequirementRepository.find.mockResolvedValue(requirements);

      const result = await service.getRequirementsSummary(mockArea.id, DayType.WEEKDAY);

      expect(result.shifts).toHaveLength(2);
      expect(result.totalWorkers).toBe(10); // 6 + 4
      expect(result.totalLinmas).toBe(2);
    });
  });
});
