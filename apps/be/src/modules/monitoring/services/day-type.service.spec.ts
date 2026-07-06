import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DayTypeService } from './day-type.service';
import { MonitoringCacheService, DayTypeEnum } from './monitoring-cache.service';
import {
  SpecialDayOverride,
  SpecialDayType,
} from '../../special-day-overrides/entities/special-day-override.entity';
import { DayType } from '../../area-staff-requirements/entities/area-staff-requirement.entity';

describe('DayTypeService', () => {
  let service: DayTypeService;
  let specialDayOverrideRepo: jest.Mocked<{ findOne: jest.Mock }>;
  let cacheService: jest.Mocked<Pick<MonitoringCacheService, 'setLoaders' | 'getDayType'>>;

  beforeEach(async () => {
    specialDayOverrideRepo = {
      findOne: jest.fn(),
    };

    cacheService = {
      setLoaders: jest.fn(),
      getDayType: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DayTypeService,
        {
          provide: getRepositoryToken(SpecialDayOverride),
          useValue: specialDayOverrideRepo,
        },
        {
          provide: MonitoringCacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get<DayTypeService>(DayTypeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // resolveDayType — weekday / weekend baseline (no override in DB)
  // ---------------------------------------------------------------------------

  describe('getCurrentDayType — no override in database', () => {
    it('should return WEEKDAY for a Monday when no override exists', async () => {
      // 2026-03-02 is a Monday (getDay() === 1)
      const monday = new Date('2026-03-02T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentDayType(monday);

      expect(result).toBe(DayType.WEEKDAY);
    });

    it('should return WEEKDAY for a Friday when no override exists', async () => {
      // 2026-03-06 is a Friday (getDay() === 5)
      const friday = new Date('2026-03-06T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentDayType(friday);

      expect(result).toBe(DayType.WEEKDAY);
    });

    it('should return WEEKEND for a Saturday when no override exists', async () => {
      // 2026-03-07 is a Saturday (getDay() === 6)
      const saturday = new Date('2026-03-07T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentDayType(saturday);

      expect(result).toBe(DayType.WEEKEND);
    });

    it('should return WEEKEND for a Sunday when no override exists', async () => {
      // 2026-03-08 is a Sunday (getDay() === 0)
      const sunday = new Date('2026-03-08T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentDayType(sunday);

      expect(result).toBe(DayType.WEEKEND);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveDayType — special-day overrides
  // ---------------------------------------------------------------------------

  describe('getCurrentDayType — with special-day override', () => {
    it('should return HOLIDAY when a HOLIDAY override exists for the date', async () => {
      // 2026-08-17 is Hari Kemerdekaan — falls on a Monday but overridden as HOLIDAY
      const date = new Date('2026-08-17T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue({
        id: 'override-1',
        date: new Date('2026-08-17'),
        day_type: SpecialDayType.HOLIDAY,
        name: 'Hari Kemerdekaan',
        created_at: new Date(),
      } as SpecialDayOverride);

      const result = await service.getCurrentDayType(date);

      expect(result).toBe(DayType.HOLIDAY);
    });

    it('should return HOLIDAY when a SPECIAL override exists for the date', async () => {
      // A Tuesday marked SPECIAL should resolve to HOLIDAY staffing rules
      const date = new Date('2026-05-05T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue({
        id: 'override-2',
        date: new Date('2026-05-05'),
        day_type: SpecialDayType.SPECIAL,
        name: 'Hari Jadi Kota Surabaya',
        created_at: new Date(),
      } as SpecialDayOverride);

      const result = await service.getCurrentDayType(date);

      expect(result).toBe(DayType.HOLIDAY);
    });

    it('should return WEEKEND when a WEEKEND override exists for the date', async () => {
      // A Monday that has been declared a substitute holiday weekend
      const date = new Date('2026-03-02T08:00:00Z');
      specialDayOverrideRepo.findOne.mockResolvedValue({
        id: 'override-3',
        date: new Date('2026-03-02'),
        day_type: SpecialDayType.WEEKEND,
        name: 'Cuti Bersama',
        created_at: new Date(),
      } as SpecialDayOverride);

      const result = await service.getCurrentDayType(date);

      expect(result).toBe(DayType.WEEKEND);
    });
  });

  // ---------------------------------------------------------------------------
  // Cache path — no date argument
  // ---------------------------------------------------------------------------

  describe('getCurrentDayType — cache behaviour', () => {
    it('should use cacheService.getDayType when no date is provided', async () => {
      cacheService.getDayType.mockResolvedValue(DayTypeEnum.WEEKDAY);

      const result = await service.getCurrentDayType();

      expect(cacheService.getDayType).toHaveBeenCalledTimes(1);
      // DB must NOT be queried when reading from cache
      expect(specialDayOverrideRepo.findOne).not.toHaveBeenCalled();
      expect(result).toBe(DayTypeEnum.WEEKDAY as unknown as DayType);
    });

    it('should bypass cache and query the database when a date is explicitly provided', async () => {
      const date = new Date('2026-03-06T08:00:00Z'); // Friday
      specialDayOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentDayType(date);

      expect(cacheService.getDayType).not.toHaveBeenCalled();
      expect(specialDayOverrideRepo.findOne).toHaveBeenCalledTimes(1);
      expect(result).toBe(DayType.WEEKDAY);
    });
  });

  // ---------------------------------------------------------------------------
  // getDayTypeLabel
  // ---------------------------------------------------------------------------

  describe('getDayTypeLabel', () => {
    it('should return "Hari Kerja" for WEEKDAY', () => {
      expect(service.getDayTypeLabel(DayType.WEEKDAY)).toBe('Hari Kerja');
    });

    it('should return "Akhir Pekan" for WEEKEND', () => {
      expect(service.getDayTypeLabel(DayType.WEEKEND)).toBe('Akhir Pekan');
    });

    it('should return "Hari Libur" for HOLIDAY', () => {
      expect(service.getDayTypeLabel(DayType.HOLIDAY)).toBe('Hari Libur');
    });

    it('should fall back to the raw value for an unknown DayType', () => {
      // Simulates a future enum value that the label map does not yet cover
      const unknownType = 'UNKNOWN' as DayType;
      expect(service.getDayTypeLabel(unknownType)).toBe('UNKNOWN');
    });
  });

  // ---------------------------------------------------------------------------
  // onModuleInit — cache loader registration
  // ---------------------------------------------------------------------------

  describe('onModuleInit', () => {
    it('should register a dayType loader with cacheService on module init', () => {
      service.onModuleInit();

      expect(cacheService.setLoaders).toHaveBeenCalledWith(
        expect.objectContaining({
          dayType: expect.any(Function),
        }),
      );
    });

    it('should register exactly one loader key (dayType) without extra loaders', () => {
      service.onModuleInit();

      const [loaders] = (cacheService.setLoaders as jest.Mock).mock.calls[0];
      expect(Object.keys(loaders)).toEqual(['dayType']);
    });
  });

  // ---------------------------------------------------------------------------
  // loadDayType — resolves today's date
  // ---------------------------------------------------------------------------

  describe('loadDayType', () => {
    it('should call resolveDayType with today and return the matching DayTypeEnum', async () => {
      // Freeze time so we know the expected day-of-week
      const fixedNow = new Date('2026-03-04T06:00:00Z'); // Wednesday
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      specialDayOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.loadDayType();

      // Wednesday is a weekday — no override — expect WEEKDAY
      expect(result).toBe(DayType.WEEKDAY as unknown as DayTypeEnum);
      expect(specialDayOverrideRepo.findOne).toHaveBeenCalledTimes(1);

      // Verify the date string passed to findOne matches today
      const callArg = specialDayOverrideRepo.findOne.mock.calls[0][0];
      expect(callArg).toEqual({ where: { date: '2026-03-04' } });

      jest.useRealTimers();
    });

    it('should return HOLIDAY DayTypeEnum when today has a HOLIDAY override', async () => {
      const fixedNow = new Date('2026-08-17T06:00:00Z'); // Hari Kemerdekaan
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      specialDayOverrideRepo.findOne.mockResolvedValue({
        id: 'override-99',
        date: new Date('2026-08-17'),
        day_type: SpecialDayType.HOLIDAY,
        name: 'Hari Kemerdekaan',
        created_at: new Date(),
      } as SpecialDayOverride);

      const result = await service.loadDayType();

      expect(result).toBe(DayType.HOLIDAY as unknown as DayTypeEnum);

      jest.useRealTimers();
    });
  });
});
