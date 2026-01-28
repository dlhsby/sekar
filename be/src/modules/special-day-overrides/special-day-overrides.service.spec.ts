import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverride, SpecialDayType } from './entities/special-day-override.entity';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';

describe('SpecialDayOverridesService', () => {
  let service: SpecialDayOverridesService;
  let repository: Repository<SpecialDayOverride>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
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

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSpecialDayOverrideDto = {
      date: '2026-08-17',
      day_type: SpecialDayType.HOLIDAY,
      name: 'Hari Kemerdekaan',
    };

    it('should create a special day override successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSpecialDay);
      mockRepository.save.mockResolvedValue(mockSpecialDay);

      const result = await service.create(createDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { date: new Date(createDto.date) },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockSpecialDay);
      expect(result).toEqual(mockSpecialDay);
    });

    it('should throw ConflictException if date already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecialDay);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all special day overrides without filters', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockRepository.find.mockResolvedValue(mockSpecialDays);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { date: 'ASC' },
      });
      expect(result).toEqual(mockSpecialDays);
    });

    it('should filter by start and end date', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockRepository.find.mockResolvedValue(mockSpecialDays);

      const result = await service.findAll('2026-08-01', '2026-08-31');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          date: Between(new Date('2026-08-01'), new Date('2026-08-31')),
        },
        order: { date: 'ASC' },
      });
      expect(result).toEqual(mockSpecialDays);
    });

    it('should filter by start date only', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockRepository.find.mockResolvedValue(mockSpecialDays);

      const result = await service.findAll('2026-08-01');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          date: Between(new Date('2026-08-01'), new Date('2100-12-31')),
        },
        order: { date: 'ASC' },
      });
      expect(result).toEqual(mockSpecialDays);
    });

    it('should filter by end date only', async () => {
      const mockSpecialDays = [mockSpecialDay];
      mockRepository.find.mockResolvedValue(mockSpecialDays);

      const result = await service.findAll(undefined, '2026-08-31');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          date: Between(new Date('1900-01-01'), new Date('2026-08-31')),
        },
        order: { date: 'ASC' },
      });
      expect(result).toEqual(mockSpecialDays);
    });
  });

  describe('findOne', () => {
    it('should return a special day override by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecialDay);

      const result = await service.findOne(mockSpecialDay.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSpecialDay.id },
      });
      expect(result).toEqual(mockSpecialDay);
    });

    it('should throw NotFoundException if special day override not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByDate', () => {
    it('should return a special day override by date', async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecialDay);

      const result = await service.findByDate('2026-08-17');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { date: new Date('2026-08-17') },
      });
      expect(result).toEqual(mockSpecialDay);
    });

    it('should return null if no special day override found for date', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByDate('2026-08-18');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateSpecialDayOverrideDto = {
      name: 'Updated Name',
    };

    it('should update a special day override successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecialDay);
      mockRepository.save.mockResolvedValue({ ...mockSpecialDay, ...updateDto });

      const result = await service.update(mockSpecialDay.id, updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSpecialDay.id },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException if special day override not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new date already exists', async () => {
      const existingSpecialDay = { ...mockSpecialDay };
      const conflictingSpecialDay = { ...mockSpecialDay, id: 'different-id' };
      
      mockRepository.findOne
        .mockResolvedValueOnce(existingSpecialDay) // First call for findOne(id)
        .mockResolvedValueOnce(conflictingSpecialDay); // Second call for date conflict check

      const updateDtoWithDate: UpdateSpecialDayOverrideDto = {
        date: '2026-08-18',
      };

      await expect(service.update(mockSpecialDay.id, updateDtoWithDate)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should allow updating the same date', async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecialDay);
      mockRepository.save.mockResolvedValue({ ...mockSpecialDay, ...updateDto });

      const updateDtoWithSameDate: UpdateSpecialDayOverrideDto = {
        date: '2026-08-17', // Same date
        name: 'Updated Name',
      };

      const result = await service.update(mockSpecialDay.id, updateDtoWithSameDate);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a special day override successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockSpecialDay);
      mockRepository.remove.mockResolvedValue(mockSpecialDay);

      await service.remove(mockSpecialDay.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSpecialDay.id },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockSpecialDay);
    });

    it('should throw NotFoundException if special day override not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });
});
