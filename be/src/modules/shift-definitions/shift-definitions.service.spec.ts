import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ShiftDefinitionsService } from './shift-definitions.service';
import { ShiftDefinition } from './entities/shift-definition.entity';

describe('ShiftDefinitionsService', () => {
  let module: TestingModule;
  let service: ShiftDefinitionsService;
  let shiftDefinitionRepository: jest.Mocked<Repository<ShiftDefinition>>;

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

  const mockShiftDefinitionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ShiftDefinitionsService,
        {
          provide: getRepositoryToken(ShiftDefinition),
          useValue: mockShiftDefinitionRepository,
        },
      ],
    }).compile();

    service = module.get<ShiftDefinitionsService>(ShiftDefinitionsService);
    shiftDefinitionRepository = module.get(getRepositoryToken(ShiftDefinition));
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
    it('should return an array of active shift definitions ordered by start time', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      const result = await service.findAll();

      expect(result).toEqual(shifts);
      expect(mockShiftDefinitionRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { start_time: 'ASC' },
      });
    });

    it('should return empty array when no shifts exist', async () => {
      mockShiftDefinitionRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a shift definition by ID', async () => {
      mockShiftDefinitionRepository.findOne.mockResolvedValue(mockShift1);

      const result = await service.findOne(mockShift1.id);

      expect(result).toEqual(mockShift1);
      expect(mockShiftDefinitionRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockShift1.id, is_active: true },
      });
    });

    it('should throw NotFoundException if shift definition not found', async () => {
      const id = 'non-existent-id';
      mockShiftDefinitionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(`Shift definition with ID ${id} not found`);
    });
  });

  describe('findByCode', () => {
    it('should return a shift definition by code', async () => {
      mockShiftDefinitionRepository.findOne.mockResolvedValue(mockShift1);

      const result = await service.findByCode('SHIFT1');

      expect(result).toEqual(mockShift1);
      expect(mockShiftDefinitionRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'SHIFT1', is_active: true },
      });
    });

    it('should throw NotFoundException if shift definition with code not found', async () => {
      const code = 'NONEXISTENT';
      mockShiftDefinitionRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode(code)).rejects.toThrow(NotFoundException);
      await expect(service.findByCode(code)).rejects.toThrow(
        `Shift definition with code "${code}" not found`,
      );
    });
  });

  describe('exists', () => {
    it('should return true when shift definition exists', async () => {
      mockShiftDefinitionRepository.count.mockResolvedValue(1);

      const result = await service.exists(mockShift1.id);

      expect(result).toBe(true);
      expect(mockShiftDefinitionRepository.count).toHaveBeenCalledWith({
        where: { id: mockShift1.id, is_active: true },
      });
    });

    it('should return false when shift definition does not exist', async () => {
      mockShiftDefinitionRepository.count.mockResolvedValue(0);

      const result = await service.exists('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getCurrentShift', () => {
    it('should return Shift 1 when current time is between 06:00 and 15:00', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      // Mock Date to return 10:00:00
      const mockDate = new Date('2024-01-15T10:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentShift();

      expect(result).toEqual(mockShift1);
    });

    it('should return Shift 2 when current time is between 15:00 and 23:00', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      // Mock Date to return 18:00:00
      const mockDate = new Date('2024-01-15T18:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentShift();

      expect(result).toEqual(mockShift2);
    });

    it('should return Shift 2 at 22:00 (Shift 2 ends at 23:00)', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      // Mock Date to return 22:00:00 - Shift 2 is still active (15:00-23:00)
      const mockDate = new Date('2024-01-15T22:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentShift();

      // At 22:00, Shift 2 is still active (ends at 23:00)
      expect(result).toEqual(mockShift2);
    });

    it('should return Shift 3 when current time is after 23:00', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      // Mock Date to return 23:30:00 - Shift 2 has ended, Shift 3 is active
      const mockDate = new Date('2024-01-15T23:30:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentShift();

      expect(result).toEqual(mockShift3);
    });

    it('should return Shift 3 when current time is before 05:00 (crosses midnight)', async () => {
      const shifts = [mockShift1, mockShift2, mockShift3];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      // Mock Date to return 03:00:00
      const mockDate = new Date('2024-01-15T03:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentShift();

      expect(result).toEqual(mockShift3);
    });

    it('should return null when current time is outside all shift hours', async () => {
      const shifts = [mockShift1, mockShift2];
      mockShiftDefinitionRepository.find.mockResolvedValue(shifts);

      // Mock Date to return 05:30:00 (between shift 3 and shift 1)
      const mockDate = new Date('2024-01-15T05:30:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentShift();

      expect(result).toBeNull();
    });

    it('should return null when no shifts are defined', async () => {
      mockShiftDefinitionRepository.find.mockResolvedValue([]);

      const result = await service.getCurrentShift();

      expect(result).toBeNull();
    });
  });
});
