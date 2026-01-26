import { Test, TestingModule } from '@nestjs/testing';
import { SpecialDayOverridesController } from './special-day-overrides.controller';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverride, SpecialDayType } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('SpecialDayOverridesController', () => {
  let module: TestingModule;
  let controller: SpecialDayOverridesController;
  let service: SpecialDayOverridesService;

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

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SpecialDayOverridesController],
      providers: [
        {
          provide: SpecialDayOverridesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SpecialDayOverridesController>(SpecialDayOverridesController);
    service = module.get<SpecialDayOverridesService>(SpecialDayOverridesService);
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
    it('should return all special day overrides without filters', async () => {
      const overrides = [mockHoliday, mockWeekend];
      mockService.findAll.mockResolvedValue(overrides);

      const result = await controller.findAll();

      expect(result).toEqual(overrides);
      expect(mockService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass date range filters to service', async () => {
      const overrides = [mockHoliday];
      mockService.findAll.mockResolvedValue(overrides);

      const result = await controller.findAll('2026-08-01', '2026-08-31');

      expect(result).toEqual(overrides);
      expect(mockService.findAll).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
    });

    it('should pass only startDate filter', async () => {
      mockService.findAll.mockResolvedValue([mockHoliday]);

      await controller.findAll('2026-08-01', undefined);

      expect(mockService.findAll).toHaveBeenCalledWith('2026-08-01', undefined);
    });

    it('should pass only endDate filter', async () => {
      mockService.findAll.mockResolvedValue([mockWeekend]);

      await controller.findAll(undefined, '2026-06-01');

      expect(mockService.findAll).toHaveBeenCalledWith(undefined, '2026-06-01');
    });
  });

  describe('findOne', () => {
    it('should return a special day override by ID', async () => {
      mockService.findOne.mockResolvedValue(mockHoliday);

      const result = await controller.findOne(mockHoliday.id);

      expect(result).toEqual(mockHoliday);
      expect(mockService.findOne).toHaveBeenCalledWith(mockHoliday.id);
    });

    it('should throw NotFoundException when not found', async () => {
      const id = 'non-existent-id';
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Special day override with ID ${id} not found`),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateSpecialDayOverrideDto = {
      date: '2026-05-01',
      day_type: SpecialDayType.HOLIDAY,
      name: 'Hari Buruh',
    };

    it('should create a new special day override', async () => {
      const newOverride = { id: 'new-id', ...createDto, date: new Date(createDto.date) };
      mockService.create.mockResolvedValue(newOverride);

      const result = await controller.create(createDto);

      expect(result).toEqual(newOverride);
      expect(mockService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException when date already exists', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException(`Special day override for date ${createDto.date} already exists`),
      );

      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSpecialDayOverrideDto = {
      name: 'Hari Kemerdekaan Indonesia',
    };

    it('should update a special day override', async () => {
      const updatedOverride = { ...mockHoliday, ...updateDto };
      mockService.update.mockResolvedValue(updatedOverride);

      const result = await controller.update(mockHoliday.id, updateDto);

      expect(result).toEqual(updatedOverride);
      expect(mockService.update).toHaveBeenCalledWith(mockHoliday.id, updateDto);
    });

    it('should throw NotFoundException when not found', async () => {
      const id = 'non-existent-id';
      mockService.update.mockRejectedValue(
        new NotFoundException(`Special day override with ID ${id} not found`),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing date', async () => {
      const updateWithDate: UpdateSpecialDayOverrideDto = { date: '2026-01-03' };
      mockService.update.mockRejectedValue(
        new ConflictException(
          `Special day override for date ${updateWithDate.date} already exists`,
        ),
      );

      await expect(controller.update(mockHoliday.id, updateWithDate)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a special day override', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockHoliday.id);

      expect(mockService.remove).toHaveBeenCalledWith(mockHoliday.id);
    });

    it('should throw NotFoundException when not found', async () => {
      const id = 'non-existent-id';
      mockService.remove.mockRejectedValue(
        new NotFoundException(`Special day override with ID ${id} not found`),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
