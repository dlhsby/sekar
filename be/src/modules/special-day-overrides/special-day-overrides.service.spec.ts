import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverride, SpecialDayType } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';

describe('SpecialDayOverridesService', () => {
  let module: TestingModule;
  let service: SpecialDayOverridesService;
  let repository: Repository<SpecialDayOverride>;

  const mockHoliday: SpecialDayOverride = {
    id: '66666666-6666-6666-6666-666666666601',
    date: new Date('2026-08-17'),
    day_type: SpecialDayType.HOLIDAY,
    name: 'Hari Kemerdekaan',
    created_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockWeekend: SpecialDayOverride = {
    id: '66666666-6666-6666-6666-666666666602',
    date: new Date('2026-01-03'),
    day_type: SpecialDayType.WEEKEND,
    name: undefined,
    created_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockSpecialDay: SpecialDayOverride = {
    id: '66666666-6666-6666-6666-666666666603',
    date: new Date('2026-12-25'),
    day_type: SpecialDayType.SPECIAL,
    name: 'Hari Natal',
    created_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SpecialDayOverridesService,
        {
          provide: getRepositoryToken(SpecialDayOverride),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SpecialDayOverridesService>(SpecialDayOverridesService);
    repository = module.get<Repository<SpecialDayOverride>>(getRepositoryToken(SpecialDayOverride));
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
    it('should return all special day overrides when no date filter', async () => {
      const overrides = [mockHoliday, mockWeekend, mockSpecialDay];
      mockRepository.find.mockResolvedValue(overrides);

      const result = await service.findAll();

      expect(result).toEqual(overrides);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { date: 'ASC' },
      });
    });

    it('should filter by date range when both startDate and endDate provided', async () => {
      mockRepository.find.mockResolvedValue([mockHoliday]);

      const startDate = '2026-08-01';
      const endDate = '2026-08-31';
      const result = await service.findAll(startDate, endDate);

      expect(result).toEqual([mockHoliday]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          date: Between(new Date(startDate), new Date(endDate)),
        },
        order: { date: 'ASC' },
      });
    });

    it('should filter by start date only when startDate provided', async () => {
      mockRepository.find.mockResolvedValue([mockHoliday, mockSpecialDay]);

      const startDate = '2026-08-01';
      const result = await service.findAll(startDate, undefined);

      expect(result).toEqual([mockHoliday, mockSpecialDay]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          date: MoreThanOrEqual(new Date(startDate)),
        },
        order: { date: 'ASC' },
      });
    });

    it('should filter by end date only when endDate provided', async () => {
      mockRepository.find.mockResolvedValue([mockWeekend]);

      const endDate = '2026-06-01';
      const result = await service.findAll(undefined, endDate);

      expect(result).toEqual([mockWeekend]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          date: LessThanOrEqual(new Date(endDate)),
        },
        order: { date: 'ASC' },
      });
    });

    it('should return empty array when no overrides exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a special day override by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);

      const result = await service.findOne(mockHoliday.id);

      expect(result).toEqual(mockHoliday);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockHoliday.id },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      const id = 'non-existent-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        `Special day override with ID ${id} not found`,
      );
    });
  });

  describe('findByDate', () => {
    it('should return a special day override by date string', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);

      const result = await service.findByDate('2026-08-17');

      expect(result).toEqual(mockHoliday);
    });

    it('should return a special day override by Date object', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);

      const result = await service.findByDate(new Date('2026-08-17'));

      expect(result).toEqual(mockHoliday);
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByDate('2026-01-01');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createDto: CreateSpecialDayOverrideDto = {
      date: '2026-05-01',
      day_type: SpecialDayType.HOLIDAY,
      name: 'Hari Buruh',
    };

    it('should successfully create a special day override', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const newOverride = { id: 'new-id', ...createDto, date: new Date(createDto.date) };
      mockRepository.create.mockReturnValue(newOverride);
      mockRepository.save.mockResolvedValue(newOverride);

      const result = await service.create(createDto);

      expect(result).toEqual(newOverride);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        date: new Date(createDto.date),
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if date already has override', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);

      const duplicateDateDto: CreateSpecialDayOverrideDto = {
        date: '2026-08-17',
        day_type: SpecialDayType.SPECIAL,
        name: 'Duplicate',
      };

      await expect(service.create(duplicateDateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(duplicateDateDto)).rejects.toThrow(
        `Special day override for date ${duplicateDateDto.date} already exists`,
      );
    });

    it('should create override without name', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const dtoWithoutName: CreateSpecialDayOverrideDto = {
        date: '2026-06-01',
        day_type: SpecialDayType.WEEKEND,
      };
      const newOverride = { id: 'new-id', ...dtoWithoutName, date: new Date(dtoWithoutName.date) };
      mockRepository.create.mockReturnValue(newOverride);
      mockRepository.save.mockResolvedValue(newOverride);

      const result = await service.create(dtoWithoutName);

      expect(result).toEqual(newOverride);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSpecialDayOverrideDto = {
      name: 'Hari Kemerdekaan Indonesia',
    };

    it('should update a special day override', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockHoliday });
      const updatedOverride = { ...mockHoliday, ...updateDto };
      mockRepository.save.mockResolvedValue(updatedOverride);

      const result = await service.update(mockHoliday.id, updateDto);

      expect(result).toEqual(updatedOverride);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new date already has override', async () => {
      const updateWithDate: UpdateSpecialDayOverrideDto = { date: '2026-01-03' };

      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockHoliday }) // findOne by id
        .mockResolvedValueOnce({ ...mockWeekend }); // findByDate - conflict

      await expect(service.update(mockHoliday.id, updateWithDate)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating with same date (no change)', async () => {
      const updateWithSameDate: UpdateSpecialDayOverrideDto = { date: '2026-08-17' };

      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockHoliday }) // findOne by id
        .mockResolvedValueOnce({ ...mockHoliday }); // findByDate - same record
      mockRepository.save.mockResolvedValue(mockHoliday);

      const result = await service.update(mockHoliday.id, updateWithSameDate);

      expect(result).toEqual(mockHoliday);
    });

    it('should update day_type', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockHoliday });
      const updateWithDayType: UpdateSpecialDayOverrideDto = { day_type: SpecialDayType.SPECIAL };
      const updatedOverride = { ...mockHoliday, ...updateWithDayType };
      mockRepository.save.mockResolvedValue(updatedOverride);

      const result = await service.update(mockHoliday.id, updateWithDayType);

      expect(result.day_type).toEqual(SpecialDayType.SPECIAL);
    });
  });

  describe('remove', () => {
    it('should delete a special day override', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(mockHoliday.id);

      expect(mockRepository.delete).toHaveBeenCalledWith(mockHoliday.id);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('isSpecialDay', () => {
    it('should return true when date has an override', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);

      const result = await service.isSpecialDay('2026-08-17');

      expect(result).toBe(true);
    });

    it('should return false when date has no override', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.isSpecialDay('2026-01-01');

      expect(result).toBe(false);
    });

    it('should work with Date object', async () => {
      mockRepository.findOne.mockResolvedValue(mockHoliday);

      const result = await service.isSpecialDay(new Date('2026-08-17'));

      expect(result).toBe(true);
    });
  });
});
