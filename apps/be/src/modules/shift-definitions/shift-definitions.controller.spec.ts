import { Test, TestingModule } from '@nestjs/testing';
import { ShiftDefinitionsController } from './shift-definitions.controller';
import { ShiftDefinitionsService } from './shift-definitions.service';
import { ShiftDefinition } from './entities/shift-definition.entity';

describe('ShiftDefinitionsController', () => {
  let module: TestingModule;
  let controller: ShiftDefinitionsController;
  let shiftDefinitionsService: ShiftDefinitionsService;

  const mockShift1: ShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Shift 1',
    code: 'SHIFT1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockShift2: ShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Shift 2',
    code: 'SHIFT2',
    start_time: '15:00:00',
    end_time: '23:00:00',
    crosses_midnight: false,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockShift3: ShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Shift 3',
    code: 'SHIFT3',
    start_time: '21:00:00',
    end_time: '05:00:00',
    crosses_midnight: true,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockShiftDefinitionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    getCurrentShift: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ShiftDefinitionsController],
      providers: [
        {
          provide: ShiftDefinitionsService,
          useValue: mockShiftDefinitionsService,
        },
      ],
    }).compile();

    controller = module.get<ShiftDefinitionsController>(ShiftDefinitionsController);
    shiftDefinitionsService = module.get<ShiftDefinitionsService>(ShiftDefinitionsService);
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
    it('should return an array of shift definitions', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionsService.findAll.mockResolvedValue(shifts);

      const result = await controller.findAll();

      expect(result).toEqual(shifts);
      expect(shiftDefinitionsService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no shifts exist', async () => {
      mockShiftDefinitionsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a shift definition by ID', async () => {
      mockShiftDefinitionsService.findOne.mockResolvedValue(mockShift1);

      const result = await controller.findOne(mockShift1.id);

      expect(result).toEqual(mockShift1);
      expect(shiftDefinitionsService.findOne).toHaveBeenCalledWith(mockShift1.id);
    });
  });

  describe('getCurrentShift', () => {
    it('should return the current shift', async () => {
      mockShiftDefinitionsService.getCurrentShift.mockResolvedValue(mockShift1);

      const result = await controller.getCurrentShift();

      expect(result).toEqual(mockShift1);
      expect(shiftDefinitionsService.getCurrentShift).toHaveBeenCalled();
    });

    it('should return null when outside shift hours', async () => {
      mockShiftDefinitionsService.getCurrentShift.mockResolvedValue(null);

      const result = await controller.getCurrentShift();

      expect(result).toBeNull();
    });
  });
});
