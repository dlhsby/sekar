import { Test, TestingModule } from '@nestjs/testing';
import { LocationStaffRequirementsController } from './location-staff-requirements.controller';
import { LocationStaffRequirementsService } from './location-staff-requirements.service';
import {
  LocationStaffRequirement,
  DayType,
  StaffRole,
} from './entities/location-staff-requirement.entity';
import { CreateLocationStaffRequirementDto } from './dto/create-location-staff-requirement.dto';
import { UpdateLocationStaffRequirementDto } from './dto/update-location-staff-requirement.dto';

describe('LocationStaffRequirementsController', () => {
  let module: TestingModule;
  let controller: LocationStaffRequirementsController;
  let staffRequirementsService: LocationStaffRequirementsService;

  const mockShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Shift 1',
    code: 'SHIFT1',
    start_time: '06:00:00',
    end_time: '15:00:00',
  };

  const mockArea = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
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

  const mockStaffRequirementsService = {
    findByAreaId: jest.fn(),
    findByAreaAndShift: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getRequirementsSummary: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [LocationStaffRequirementsController],
      providers: [
        {
          provide: LocationStaffRequirementsService,
          useValue: mockStaffRequirementsService,
        },
      ],
    }).compile();

    controller = module.get<LocationStaffRequirementsController>(
      LocationStaffRequirementsController,
    );
    staffRequirementsService = module.get<LocationStaffRequirementsService>(
      LocationStaffRequirementsService,
    );
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByArea', () => {
    it('should return all staff requirements for an area', async () => {
      const requirements = [mockRequirementWorker, mockRequirementLinmas];
      mockStaffRequirementsService.findByAreaId.mockResolvedValue(requirements);

      const result = await controller.findByArea(mockArea.id);

      expect(result).toEqual(requirements);
      expect(staffRequirementsService.findByAreaId).toHaveBeenCalledWith(mockArea.id);
    });

    it('should return empty array when area has no requirements', async () => {
      mockStaffRequirementsService.findByAreaId.mockResolvedValue([]);

      const result = await controller.findByArea(mockArea.id);

      expect(result).toEqual([]);
    });
  });

  describe('getSummary', () => {
    it('should return requirements summary for an area', async () => {
      const summary = {
        locationId: mockArea.id,
        dayType: DayType.WEEKDAY,
        shifts: [
          {
            shiftDefinitionId: mockShiftDefinition.id,
            shiftName: 'Shift 1',
            workerCount: 6,
            linmasCount: 2,
          },
        ],
        totalWorkers: 6,
        totalLinmas: 2,
      };
      mockStaffRequirementsService.getRequirementsSummary.mockResolvedValue(summary);

      const result = await controller.getSummary(mockArea.id, DayType.WEEKDAY);

      expect(result).toEqual(summary);
      expect(staffRequirementsService.getRequirementsSummary).toHaveBeenCalledWith(
        mockArea.id,
        DayType.WEEKDAY,
      );
    });

    it('should return summary without day type filter', async () => {
      const summary = {
        locationId: mockArea.id,
        dayType: DayType.WEEKDAY,
        shifts: [],
        totalWorkers: 0,
        totalLinmas: 0,
      };
      mockStaffRequirementsService.getRequirementsSummary.mockResolvedValue(summary);

      const result = await controller.getSummary(mockArea.id);

      expect(result).toEqual(summary);
      expect(staffRequirementsService.getRequirementsSummary).toHaveBeenCalledWith(
        mockArea.id,
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('should return a staff requirement by ID', async () => {
      mockStaffRequirementsService.findOne.mockResolvedValue(mockRequirementWorker);

      const result = await controller.findOne(mockRequirementWorker.id);

      expect(result).toEqual(mockRequirementWorker);
      expect(staffRequirementsService.findOne).toHaveBeenCalledWith(mockRequirementWorker.id);
    });
  });

  describe('create', () => {
    it('should create a new staff requirement', async () => {
      const createDto: CreateLocationStaffRequirementDto = {
        location_id: 'will-be-overridden', // Should be overridden by URL param
        shift_definition_id: mockShiftDefinition.id,
        role: StaffRole.SATGAS,
        required_count: 6,
        day_type: DayType.WEEKDAY,
      };

      mockStaffRequirementsService.create.mockResolvedValue(mockRequirementWorker);

      const result = await controller.create(mockArea.id, createDto);

      expect(result).toEqual(mockRequirementWorker);
      expect(staffRequirementsService.create).toHaveBeenCalledWith({
        ...createDto,
        location_id: mockArea.id, // location_id should be taken from URL
      });
    });
  });

  describe('update', () => {
    it('should update a staff requirement', async () => {
      const updateDto: UpdateLocationStaffRequirementDto = {
        required_count: 8,
      };

      const updatedRequirement = { ...mockRequirementWorker, required_count: 8 };
      mockStaffRequirementsService.update.mockResolvedValue(updatedRequirement);

      const result = await controller.update(mockRequirementWorker.id, updateDto);

      expect(result.required_count).toBe(8);
      expect(staffRequirementsService.update).toHaveBeenCalledWith(
        mockRequirementWorker.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a staff requirement', async () => {
      mockStaffRequirementsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockRequirementWorker.id);

      expect(staffRequirementsService.remove).toHaveBeenCalledWith(mockRequirementWorker.id);
    });
  });
});
