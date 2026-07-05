import { Test, TestingModule } from '@nestjs/testing';
import { SpecialDayOverridesController } from './special-day-overrides.controller';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverride, SpecialDayType } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SpecialDayOverridesController', () => {
  let controller: SpecialDayOverridesController;
  let service: SpecialDayOverridesService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockSpecialDay: SpecialDayOverride = {
    id: '66666666-6666-6666-6666-666666666601',
    date: new Date('2026-08-17'),
    day_type: SpecialDayType.HOLIDAY,
    name: 'Hari Kemerdekaan',
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSpecialDayOverrideDto = {
      date: '2026-08-17',
      day_type: SpecialDayType.HOLIDAY,
      name: 'Hari Kemerdekaan',
    };

    it('should create a special day override', async () => {
      mockService.create.mockResolvedValue(mockSpecialDay);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockSpecialDay);
    });

    it('should throw ConflictException if date already exists', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException(`Special day override for date ${createDto.date} already exists`),
      );

      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all special day overrides without filters', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockService.findAll.mockResolvedValue(mockSpecialDays);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockSpecialDays);
    });

    it('should return special day overrides with date range filter', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockService.findAll.mockResolvedValue(mockSpecialDays);

      const result = await controller.findAll('2026-08-01', '2026-08-31');

      expect(service.findAll).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
      expect(result).toEqual(mockSpecialDays);
    });

    it('should return special day overrides with start date only', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockService.findAll.mockResolvedValue(mockSpecialDays);

      const result = await controller.findAll('2026-08-01');

      expect(service.findAll).toHaveBeenCalledWith('2026-08-01', undefined);
      expect(result).toEqual(mockSpecialDays);
    });

    it('should return special day overrides with end date only', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockService.findAll.mockResolvedValue(mockSpecialDays);

      const result = await controller.findAll(undefined, '2026-08-31');

      expect(service.findAll).toHaveBeenCalledWith(undefined, '2026-08-31');
      expect(result).toEqual(mockSpecialDays);
    });
  });

  describe('findOne', () => {
    it('should return a special day override by ID', async () => {
      mockService.findOne.mockResolvedValue(mockSpecialDay);

      const result = await controller.findOne(mockSpecialDay.id);

      expect(service.findOne).toHaveBeenCalledWith(mockSpecialDay.id);
      expect(result).toEqual(mockSpecialDay);
    });

    it('should throw NotFoundException if special day override not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Special day override with ID non-existent-id not found`),
      );

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSpecialDayOverrideDto = {
      name: 'Updated Name',
    };

    it('should update a special day override', async () => {
      const updatedSpecialDay = { ...mockSpecialDay, ...updateDto };
      mockService.update.mockResolvedValue(updatedSpecialDay);

      const result = await controller.update(mockSpecialDay.id, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockSpecialDay.id, updateDto);
      expect(result).toEqual(updatedSpecialDay);
    });

    it('should throw NotFoundException if special day override not found', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Special day override with ID non-existent-id not found`),
      );

      await expect(controller.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new date already exists', async () => {
      const updateDtoWithDate: UpdateSpecialDayOverrideDto = {
        date: '2026-08-18',
      };
      mockService.update.mockRejectedValue(
        new ConflictException(
          `Special day override for date ${updateDtoWithDate.date} already exists`,
        ),
      );

      await expect(controller.update(mockSpecialDay.id, updateDtoWithDate)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a special day override', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockSpecialDay.id);

      expect(service.remove).toHaveBeenCalledWith(mockSpecialDay.id);
    });

    it('should throw NotFoundException if special day override not found', async () => {
      mockService.remove.mockRejectedValue(
        new NotFoundException(`Special day override with ID non-existent-id not found`),
      );

      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
