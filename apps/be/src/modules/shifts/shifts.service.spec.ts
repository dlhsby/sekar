import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { AttendancePunch } from './entities/attendance-punch.entity';
import { PunchLabel } from './enums/punch-label.enum';
import { AttendanceDerivationService } from './services/attendance-derivation.service';
import { ShiftAttributionService } from './services/shift-attribution.service';
import { LocationsService } from '../locations/locations.service';
import { S3Service } from '../../shared/services/s3.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { UserRole } from '../users/entities/user.entity';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { StatusCalculatorService } from '../monitoring/services/status-calculator.service';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit/audit.service';
import { UserLocationsService } from '../user-locations/user-locations.service';
import { SystemConfigService } from '../settings/services/system-config.service';
import { SchedulesService } from '../schedules/schedules.service';

describe('ShiftsService', () => {
  let module: TestingModule;
  let service: ShiftsService;

  const mockUser = {
    id: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'user1',
    role: UserRole.SATGAS,
    full_name: 'User One',
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    is_active: true,
  };

  const mockShift: any = {
    id: 'shift-uuid-5e6f7a8b-c9d0-1234-ef01-345678901234',
    user_id: mockUser.id,
    user: mockUser as any,
    location_id: mockArea.id,
    area: mockArea as any,
    shift_definition_id: null,
    clock_in_time: new Date('2026-01-09T08:00:00Z'),
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://s3.amazonaws.com/photo.jpg',
    clock_in_outside_boundary: false,
    clock_out_time: null,
    clock_out_gps_lat: null,
    clock_out_gps_lng: null,
    clock_out_outside_boundary: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  // ADR-055: punch stream the derivation reads. Set per-test; the punch repo's
  // query builder returns it from getMany and no-ops the idempotent insert.
  let mockPunches: any[] = [];
  const makePunchQB = () => {
    const qb: any = {};
    for (const m of ['insert', 'into', 'values', 'orIgnore', 'where', 'andWhere', 'orderBy']) {
      qb[m] = jest.fn(() => qb);
    }
    qb.execute = jest.fn().mockResolvedValue({});
    qb.getMany = jest.fn().mockImplementation(() => Promise.resolve(mockPunches));
    return qb;
  };
  const mockPunchRepository = {
    createQueryBuilder: jest.fn(() => makePunchQB()),
  };
  // Real derivation — it is pure, so the service tests exercise the true logic.
  const derivation = new AttendanceDerivationService();

  // Shift query builder used by findSessionRow (getOne) / findMyAttendanceForDate (getMany).
  const makeShiftQB = (getOneResult: any = null, getManyResult: any[] = []) => {
    const qb: any = {};
    for (const m of [
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'leftJoinAndSelect',
      'select',
      'skip',
      'take',
    ]) {
      qb[m] = jest.fn(() => qb);
    }
    qb.getOne = jest.fn().mockResolvedValue(getOneResult);
    qb.getMany = jest.fn().mockResolvedValue(getManyResult);
    return qb;
  };

  const mockAreasService = {
    findOne: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    generateKey: jest.fn(),
  };

  const mockUserAreasService = {
    getEffectiveLocations: jest.fn().mockResolvedValue([]),
  };

  const mockShiftDefinitionRepo = {
    find: jest.fn(),
  };

  const mockStatusCalculator = {
    onClockIn: jest.fn().mockResolvedValue(undefined),
    onClockOut: jest.fn().mockResolvedValue(undefined),
  };

  // ADR-049 runtime config; by default echoes the caller's fallback (so the
  // min-shift-duration behaves as the 5-min default unless a test overrides it).
  const mockSystemConfig = {
    getNumber: jest.fn((_key: string, fallback: number) => fallback),
  };

  // Daily roster provider. Defaults keep existing tests on the legacy path
  // (empty areas, no rostered shift, no attribution candidates → fallback).
  const mockSchedulesService = {
    getActiveAreasNow: jest.fn().mockResolvedValue([]),
    getShiftForDay: jest.fn().mockResolvedValue(null),
    getAttributionCandidates: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AttendancePunch),
          useValue: mockPunchRepository,
        },
        {
          provide: AttendanceDerivationService,
          useValue: derivation,
        },
        {
          provide: ShiftAttributionService,
          useValue: new ShiftAttributionService(),
        },
        {
          provide: getRepositoryToken(ShiftDefinition),
          useValue: mockShiftDefinitionRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: UserLocationsService,
          useValue: mockUserAreasService,
        },
        {
          provide: LocationsService,
          useValue: mockAreasService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: StatusCalculatorService,
          useValue: mockStatusCalculator,
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: SystemConfigService,
          useValue: mockSystemConfig,
        },
        {
          provide: SchedulesService,
          useValue: mockSchedulesService,
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getActiveArea', () => {
    it('should return area from the worker effective areas when one exists', async () => {
      mockUserAreasService.getEffectiveLocations.mockResolvedValue([mockArea as any]);

      // No GPS → primary fallback; userRepo has no primary so first candidate wins.
      const result = await service.getActiveArea(mockUser.id);

      expect(result).toEqual(mockArea);
      expect(mockUserAreasService.getEffectiveLocations).toHaveBeenCalled();
    });

    it('should return null when the worker has no assigned area (ad-hoc)', async () => {
      mockUserAreasService.getEffectiveLocations.mockResolvedValue([]);

      const result = await service.getActiveArea(mockUser.id);

      expect(result).toBeNull();
    });

    it('should pick the GPS-containing area among several candidates', async () => {
      const near = { id: 'near', gps_lat: -7.29, gps_lng: 112.74 };
      const far = { id: 'far', gps_lat: -7.9, gps_lng: 112.9 };
      mockUserAreasService.getEffectiveLocations.mockResolvedValue([near as any, far as any]);

      const result = await service.getActiveArea(mockUser.id, -7.29, 112.74);

      expect(result).toEqual(near);
    });
  });

  describe('findCurrentShiftDefinition', () => {
    const mockShiftDefs = [
      {
        id: 'sd-1',
        name: 'Shift 1',
        code: 'SHIFT1',
        start_time: '06:00:00',
        end_time: '15:00:00',
        crosses_midnight: false,
        is_active: true,
      },
      {
        id: 'sd-2',
        name: 'Shift 2',
        code: 'SHIFT2',
        start_time: '15:00:00',
        end_time: '23:00:00',
        crosses_midnight: false,
        is_active: true,
      },
      {
        id: 'sd-3',
        name: 'Shift 3',
        code: 'SHIFT3',
        start_time: '21:00:00',
        end_time: '05:00:00',
        crosses_midnight: true,
        is_active: true,
      },
    ];

    it('should return matching shift definition for current time', async () => {
      mockShiftDefinitionRepo.find.mockResolvedValue(mockShiftDefs as any);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-09T10:00:00'));

      const result = await service.findCurrentShiftDefinition();

      expect(result).toEqual(mockShiftDefs[0]); // Shift 1: 06:00-15:00
      jest.useRealTimers();
    });

    it('should return null when no shift definition matches', async () => {
      const nonMidnightDefs = mockShiftDefs.filter((d) => !d.crosses_midnight);
      mockShiftDefinitionRepo.find.mockResolvedValue(nonMidnightDefs as any);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-09T23:30:00'));

      const result = await service.findCurrentShiftDefinition();

      expect(result).toBeNull();
      jest.useRealTimers();
    });

    it('should match crosses_midnight shift definition', async () => {
      mockShiftDefinitionRepo.find.mockResolvedValue(mockShiftDefs as any);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-09T03:00:00'));

      const result = await service.findCurrentShiftDefinition();

      expect(result).toEqual(mockShiftDefs[2]); // Shift 3: 21:00-05:00
      jest.useRealTimers();
    });
  });

  describe('clockIn (punch model, ADR-055)', () => {
    const clockInDto: ClockInDto = {
      location_id: mockArea.id,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    };

    const inPunch = (extra: any = {}) => ({
      label: PunchLabel.CLOCK_IN,
      punched_at: new Date('2026-01-09T08:00:00Z'),
      location_id: mockArea.id,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      outside_boundary: false,
      ...extra,
    });

    // No existing session row → projectSession creates one; save echoes it with an id.
    const arrangeNewSession = (punches: any[], existing: any = null) => {
      mockPunches = punches;
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB(existing));
      mockRepository.create.mockImplementation((r: any) => r);
      mockRepository.save.mockImplementation((r: any) =>
        Promise.resolve({ id: 'session-1', ...r }),
      );
    };

    it('appends a clock-in punch and returns the projected OPEN session', async () => {
      mockAreasService.findOne.mockResolvedValue(mockArea);
      arrangeNewSession([inPunch()]);

      const result = await service.clockIn(mockUser.id, clockInDto);

      expect(result.id).toBe('session-1');
      expect(result.clock_out_time).toBeFalsy(); // open
      expect(result.location_id).toBe(mockArea.id);
      expect(mockAreasService.findOne).toHaveBeenCalledWith(mockArea.id);
      // a punch was inserted idempotently (orIgnore) and the session was rebuilt from punches
      expect(mockPunchRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('auto-detects the area when location_id is not provided', async () => {
      mockAreasService.findOne.mockReset();
      mockUserAreasService.getEffectiveLocations.mockResolvedValue([mockArea as any]);
      arrangeNewSession([inPunch()]);

      const result = await service.clockIn(mockUser.id, {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: clockInDto.selfie_photo,
      } as any);

      expect(result.id).toBe('session-1');
      expect(mockUserAreasService.getEffectiveLocations).toHaveBeenCalled();
      expect(mockAreasService.findOne).not.toHaveBeenCalled();
    });

    it('allows an ad-hoc clock-in with no assigned area', async () => {
      mockAreasService.findOne.mockReset();
      mockUserAreasService.getEffectiveLocations.mockResolvedValue([]);
      arrangeNewSession([inPunch({ location_id: null })]);

      const result = await service.clockIn(mockUser.id, {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: clockInDto.selfie_photo,
      } as any);

      expect(result.location_id).toBeNull();
    });

    it('NO LONGER throws when a session is already open — a re-entry reopens the SAME row', async () => {
      // ADR-055: SHIFT_ALREADY_ACTIVE is gone. An open session row exists; the new
      // clock-in must reopen it (same id), not raise.
      const openRow = { ...mockShift, id: 'session-1', clock_out_time: null };
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockPunches = [inPunch()];
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB(openRow));
      mockRepository.save.mockImplementation((r: any) => Promise.resolve({ ...openRow, ...r }));

      const result = await service.clockIn(mockUser.id, clockInDto);

      expect(result.id).toBe('session-1'); // same session reopened, no throw
    });

    it('emits statusCalculator.onClockIn with the derived session id (open state)', async () => {
      mockAreasService.findOne.mockResolvedValue(mockArea);
      arrangeNewSession([inPunch()]);

      await service.clockIn(mockUser.id, clockInDto);

      expect(mockStatusCalculator.onClockIn).toHaveBeenCalledWith(
        mockUser.id,
        'session-1',
        mockArea.id,
        null,
        clockInDto.gps_lat,
        clockInDto.gps_lng,
      );
    });

    it('CONTINUES an already-open session across midnight — no second open row (review #1)', async () => {
      // Open Shift-3 session started 2026-07-24 21:00 WIB (14:00Z); a redundant/re-entry
      // clock-in just after midnight must reuse its key, not compute today's service_day.
      const openRow = {
        ...mockShift,
        id: 'session-open',
        clock_in_time: new Date('2026-07-24T14:00:00Z'),
        clock_out_time: null,
        shift_definition_id: 'sd-3',
        is_overtime: false,
      };
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockRepository.findOne.mockResolvedValue(openRow); // findOpenSessionRow → open row
      mockPunches = [
        inPunch({ punched_at: new Date('2026-07-24T14:00:00Z'), shift_definition_id: 'sd-3' }),
        inPunch({ punched_at: new Date('2026-07-24T17:30:00Z'), shift_definition_id: 'sd-3' }), // 00:30 WIB next day
      ];
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB(openRow)); // findSessionRow → same row
      mockRepository.save.mockImplementation((r: any) => Promise.resolve({ ...openRow, ...r }));

      const result = await service.clockIn(mockUser.id, clockInDto);

      expect(result.id).toBe('session-open'); // same session, not a duplicate
      expect(result.clock_out_time).toBeFalsy(); // still open
      // reused the open session's shift → did NOT recompute via shift-definition lookup
      expect(mockShiftDefinitionRepo.find).not.toHaveBeenCalled();
      expect(mockStatusCalculator.onClockIn).toHaveBeenCalledWith(
        mockUser.id,
        'session-open',
        mockArea.id,
        'sd-3',
        clockInDto.gps_lat,
        clockInDto.gps_lng,
      );
    });

    it('reopening a closed session CLEARS clock-out fields to null, not stale (review #3)', async () => {
      const closedRow = {
        ...mockShift,
        id: 'session-x',
        clock_out_time: new Date('2026-01-09T12:00:00Z'),
        clock_out_photo_url: 'old-out.jpg',
        clock_out_gps_lat: 1,
        clock_out_gps_lng: 2,
      };
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockRepository.findOne.mockResolvedValue(null); // no open session → fresh path
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockPunches = [
        inPunch({ punched_at: new Date('2026-01-09T08:00:00Z') }),
        {
          label: PunchLabel.CLOCK_OUT,
          punched_at: new Date('2026-01-09T12:00:00Z'),
          location_id: mockArea.id,
          gps_lat: 1,
          gps_lng: 2,
          outside_boundary: false,
        },
        inPunch({ punched_at: new Date('2026-01-09T13:00:00Z') }), // re-entry → open again
      ];
      let saved: any;
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB(closedRow));
      mockRepository.save.mockImplementation((r: any) => {
        saved = r;
        return Promise.resolve(r);
      });

      await service.clockIn(mockUser.id, clockInDto);

      expect(saved.clock_out_time).toBeNull(); // reopened
      expect(saved.clock_out_photo_url).toBeNull(); // NOT 'old-out.jpg' (would be stale if undefined)
      expect(saved.clock_out_gps_lat).toBeNull();
      expect(saved.clock_out_gps_lng).toBeNull();
    });

    it('attributes a fresh clock-in via the ADR-055 window resolver (shift + service-day)', async () => {
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockRepository.findOne.mockResolvedValue(null); // no open session → fresh path
      // A wide-window candidate so resolveBest matches regardless of the real clock.
      mockSchedulesService.getAttributionCandidates.mockResolvedValueOnce([
        {
          shift_definition_id: 'sd-window',
          service_day: '2026-01-01',
          start_time: '00:00',
          end_time: '23:59',
          crosses_midnight: false,
          early_window_min: 100_000_000, // ~190y — always in window regardless of the real clock
          cutoff_grace_min: 100_000_000,
        },
      ]);
      mockPunches = [inPunch({ shift_definition_id: 'sd-window' })];
      let saved: any;
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB(null));
      mockRepository.create.mockImplementation((r: any) => r);
      mockRepository.save.mockImplementation((r: any) => {
        saved = r;
        return Promise.resolve({ id: 'session-1', ...r });
      });

      await service.clockIn(mockUser.id, clockInDto);

      expect(mockSchedulesService.getAttributionCandidates).toHaveBeenCalledWith(mockUser.id);
      expect(saved.shift_definition_id).toBe('sd-window'); // attributed shift, not the time-match fallback
      // The EXPLICIT service_day comes from attribution — may differ from the
      // clock-in's WIB date (the crux of the night-shift-past-midnight fix).
      expect(saved.service_day).toBe('2026-01-01');
    });

    it('honors an EXPLICIT picker shift choice over auto-attribution (ADR-055)', async () => {
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockRepository.findOne.mockResolvedValue(null); // no open session
      mockPunches = [inPunch({ shift_definition_id: 'sd-picked' })];
      let saved: any;
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB(null));
      mockRepository.create.mockImplementation((r: any) => r);
      mockRepository.save.mockImplementation((r: any) => {
        saved = r;
        return Promise.resolve({ id: 'session-1', ...r });
      });

      await service.clockIn(mockUser.id, {
        ...clockInDto,
        shift_definition_id: 'sd-picked',
        service_day: '2026-07-24',
      } as any);

      expect(saved.shift_definition_id).toBe('sd-picked');
      expect(saved.service_day).toBe('2026-07-24');
      // explicit choice short-circuits attribution
      expect(mockSchedulesService.getAttributionCandidates).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentAttendance (ADR-055 Phase 3)', () => {
    it('returns the open session + ranked shift options (is_default on the best)', async () => {
      const openRow = {
        ...mockShift,
        id: 'session-open',
        service_day: '2026-07-25',
        clock_in_time: new Date('2026-07-25T00:00:00Z'),
        shift_definition_id: 'sd-1',
      };
      mockRepository.findOne.mockResolvedValue(openRow); // findOpenSessionRow
      mockSchedulesService.getAttributionCandidates.mockResolvedValueOnce([
        {
          shift_definition_id: 'sd-1',
          service_day: '2026-07-25',
          start_time: '06:00',
          end_time: '15:00',
          crosses_midnight: false,
          early_window_min: 100_000_000,
          cutoff_grace_min: 100_000_000,
          shift_name: 'Shift 1',
          shift_code: 'SHIFT1',
        },
      ]);

      const result = await service.getCurrentAttendance(mockUser.id);

      expect(result.open_session).toMatchObject({
        id: 'session-open',
        service_day: '2026-07-25',
        shift_definition_id: 'sd-1',
      });
      expect(result.options).toHaveLength(1);
      expect(result.options[0]).toMatchObject({
        shift_definition_id: 'sd-1',
        shift_name: 'Shift 1',
        is_default: true,
      });
    });

    it('returns open_session null when nothing is clocked in', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockSchedulesService.getAttributionCandidates.mockResolvedValueOnce([]);

      const result = await service.getCurrentAttendance(mockUser.id);

      expect(result.open_session).toBeNull();
      expect(result.options).toEqual([]);
    });
  });

  describe('clockOut (punch model, ADR-055)', () => {
    const clockOutDto: ClockOutDto = {
      gps_lat: -7.2906,
      gps_lng: 112.7399,
    };

    const openRow = {
      ...mockShift,
      id: 'session-1',
      clock_in_time: new Date('2026-01-09T08:00:00Z'),
      clock_out_time: null,
      is_overtime: false,
      shift_definition_id: null,
      location_id: mockArea.id,
      area: mockArea,
    };

    const closedPunches = [
      {
        label: PunchLabel.CLOCK_IN,
        punched_at: new Date('2026-01-09T08:00:00Z'),
        location_id: mockArea.id,
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        outside_boundary: false,
      },
      {
        label: PunchLabel.CLOCK_OUT,
        punched_at: new Date('2026-01-09T16:00:00Z'),
        location_id: mockArea.id,
        gps_lat: -7.2906,
        gps_lng: 112.7399,
        outside_boundary: false,
      },
    ];

    it('closes the session, returns the projected closed row, emits onClockOut', async () => {
      mockPunches = closedPunches;
      mockRepository.findOne.mockResolvedValue({ ...openRow });
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB({ ...openRow }));
      mockRepository.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await service.clockOut(mockUser.id, clockOutDto);

      expect(result.clock_out_time).toBeTruthy();
      expect(result.clock_out_gps_lat).toBe(clockOutDto.gps_lat);
      expect(mockStatusCalculator.onClockOut).toHaveBeenCalledWith(mockUser.id);
    });

    it('throws SHIFT_NOT_ACTIVE when there is no open session (clock-out needs a clock-in)', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.clockOut(mockUser.id, clockOutDto)).rejects.toThrow(ApiException);
      try {
        await service.clockOut(mockUser.id, clockOutDto);
      } catch (error: any) {
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_NOT_ACTIVE);
        expect(error.message).toContain('No active shift found');
      }
    });

    it('enforces the minimum shift duration, measured from the open clock-in', async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      mockPunches = [
        {
          label: PunchLabel.CLOCK_IN,
          punched_at: oneMinuteAgo,
          location_id: mockArea.id,
          gps_lat: -7.29,
          gps_lng: 112.73,
          outside_boundary: false,
        },
      ];
      mockRepository.findOne.mockResolvedValue({ ...openRow, clock_in_time: oneMinuteAgo });

      await expect(service.clockOut(mockUser.id, clockOutDto)).rejects.toThrow(ApiException);
      try {
        await service.clockOut(mockUser.id, clockOutDto);
      } catch (error: any) {
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_DURATION_TOO_SHORT);
      }
    });

    it('min-duration = 0 DISABLES the guard (settings-configurable off)', async () => {
      mockSystemConfig.getNumber.mockReturnValueOnce(0); // schedule.min_shift_duration_min = 0
      const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
      mockPunches = [
        {
          label: PunchLabel.CLOCK_IN,
          punched_at: tenSecondsAgo,
          location_id: mockArea.id,
          gps_lat: -7.29,
          gps_lng: 112.73,
          outside_boundary: false,
        },
        {
          label: PunchLabel.CLOCK_OUT,
          punched_at: new Date(),
          location_id: mockArea.id,
          gps_lat: -7.2906,
          gps_lng: 112.7399,
          outside_boundary: false,
        },
      ];
      mockRepository.findOne.mockResolvedValue({ ...openRow, clock_in_time: tenSecondsAgo });
      mockRepository.createQueryBuilder.mockReturnValue(makeShiftQB({ ...openRow }));
      mockRepository.save.mockImplementation((r: any) => Promise.resolve(r));

      // A 10-second segment would normally be rejected; with 0 it clocks out fine.
      const result = await service.clockOut(mockUser.id, clockOutDto);
      expect(result.clock_out_time).toBeTruthy();
    });
  });
  describe('findActiveShift', () => {
    it('should return active shift if exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      const result = await service.findActiveShift(mockUser.id);

      expect(result).toEqual(mockShift);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: mockUser.id, clock_out_time: IsNull() },
        relations: ['area', 'area.locationType', 'user', 'shift_definition'],
      });
    });

    it('should return null if no active shift', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findActiveShift(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return shift by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      const result = await service.findOne(mockShift.id);

      expect(result).toEqual(mockShift);
    });

    it('should throw ApiException with SHIFT_NOT_FOUND if shift not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      try {
        await service.findOne('nonexistent-id');
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_NOT_FOUND);
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('findByUserId', () => {
    it('should return shifts for user', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findByUserId(mockUser.id);

      expect(result).toEqual([mockShift]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: mockUser.id },
        relations: ['area', 'area.locationType', 'shift_definition'],
        order: { clock_in_time: 'DESC' },
        take: 50,
      });
    });
  });

  describe('findByAreaId', () => {
    it('should return shifts for area', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findByAreaId(mockArea.id);

      expect(result).toEqual([mockShift]);
    });
  });

  describe('calculateHoursWorked', () => {
    it('should calculate hours correctly with clock-out time', () => {
      const clockIn = new Date('2026-01-09T08:00:00Z');
      const clockOut = new Date('2026-01-09T16:00:00Z');

      const result = service.calculateHoursWorked(clockIn, clockOut);

      expect(result).toBe(8);
    });

    it('should use current time if clock-out is null', () => {
      const clockIn = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const result = service.calculateHoursWorked(clockIn, null);

      expect(result).toBeGreaterThan(1.9);
      expect(result).toBeLessThan(2.1);
    });
  });

  describe('findAllActiveShifts', () => {
    it('should return all active shifts', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findAllActiveShifts();

      expect(result).toEqual([mockShift]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { clock_out_time: IsNull() },
        relations: ['user', 'area', 'area.locationType'],
        order: { clock_in_time: 'ASC' },
      });
    });
  });

  describe('findAllActiveShiftsPaginated', () => {
    it('should return paginated active shifts with default values', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockShift], 1]);

      const result = await service.findAllActiveShiftsPaginated();

      expect(result.data).toEqual([mockShift]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { clock_out_time: IsNull() },
        relations: ['user', 'area', 'area.locationType'],
        order: { clock_in_time: 'ASC' },
        skip: 0,
        take: 50,
      });
    });

    it('should return paginated active shifts with custom page and limit', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockShift], 10]);

      const result = await service.findAllActiveShiftsPaginated(2, 5);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(2);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { clock_out_time: IsNull() },
        relations: ['user', 'area', 'area.locationType'],
        order: { clock_in_time: 'ASC' },
        skip: 5,
        take: 5,
      });
    });

    it('should return empty array when no active shifts', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllActiveShiftsPaginated();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findMyAttendanceDays', () => {
    const sd1 = { start_time: '06:00:00', crosses_midnight: false };
    const sd3 = { start_time: '21:00:00', crosses_midnight: true };

    // Returned clock-in DESC, as the repository would. Day A = 2026-06-22 WIB
    // (two shifts), day B = 2026-06-21 WIB (one night shift clocked in 20:00Z =
    // 03:00 WIB next day → still files under its clock-in WIB day 2026-06-22? no:
    // 2026-06-21T20:00Z + 7h = 2026-06-22T03:00 → WIB day 2026-06-22).
    const dayShifts: any[] = [
      // 2026-06-22 WIB, second shift (afternoon) — active (no clock-out)
      {
        id: 's3',
        clock_in_time: new Date('2026-06-22T08:00:00Z'),
        clock_out_time: null,
        shift_definition: sd1,
        is_overtime: false,
      },
      // 2026-06-22 WIB, first/earliest shift — completed 1h
      {
        id: 's2',
        clock_in_time: new Date('2026-06-22T01:00:00Z'),
        clock_out_time: new Date('2026-06-22T02:00:00Z'),
        shift_definition: sd1,
        is_overtime: false,
      },
      // 2026-06-21T20:00Z = 2026-06-22T03:00 WIB → also day 2026-06-22? It is.
      // Use a clearly-earlier instant for a distinct earlier day (2026-06-20 WIB).
      {
        id: 's1',
        clock_in_time: new Date('2026-06-20T15:00:00Z'),
        clock_out_time: new Date('2026-06-20T23:00:00Z'),
        shift_definition: sd3,
        is_overtime: false,
      },
    ];

    it('groups regular shifts by WIB day, newest day first, with summary fields', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const now = new Date('2026-06-22T09:00:00Z'); // 1h into the active shift

      const result = await service.findMyAttendanceDays(mockUser.id, { page: 1, limit: 20 }, now);

      // Only excludes overtime via the query filter:
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: mockUser.id, is_overtime: false } }),
      );

      expect(result.meta.total).toBe(2);
      expect(result.data).toHaveLength(2);

      const [today, earlier] = result.data;
      expect(today.date).toBe('2026-06-22');
      expect(today.shift_count).toBe(2);
      expect(today.first_clock_in).toBe('2026-06-22T01:00:00.000Z'); // earliest
      expect(today.last_clock_out).toBe('2026-06-22T02:00:00.000Z'); // only completed clock-out
      expect(today.has_active).toBe(true);
      // 60 min (completed) + 60 min (active up to `now`) = 120
      expect(today.total_worked_minutes).toBe(120);
      expect(today.scheduled_start_time).toBe('06:00:00');
      expect(today.crosses_midnight).toBe(false);

      expect(earlier.date).toBe('2026-06-20');
      expect(earlier.has_active).toBe(false);
      expect(earlier.last_clock_out).toBe('2026-06-20T23:00:00.000Z');
      expect(earlier.total_worked_minutes).toBe(480);
      expect(earlier.crosses_midnight).toBe(true);
    });

    it('paginates by distinct day', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { page: 2, limit: 1 },
        new Date('2026-06-22T09:00:00Z'),
      );

      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe('2026-06-20'); // second page = older day
    });

    it('returns empty when the user has no regular shifts', async () => {
      mockRepository.find.mockResolvedValue([]);
      const result = await service.findMyAttendanceDays(mockUser.id);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('computes is_late in WIB (08:00 WIB clock-in vs 06:00 scheduled = late)', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        {},
        new Date('2026-06-22T09:00:00Z'),
      );
      // 2026-06-22 day: first clock-in 01:00Z = 08:00 WIB, scheduled 06:00 → late.
      expect(result.data[0].is_late).toBe(true);
      // 2026-06-20 night shift (sd3 21:00 crosses midnight): clock-in 22:00 WIB → late.
      expect(result.data[1].is_late).toBe(true);
    });

    it('filters by status=late', async () => {
      // Make the older day on-time by giving it a permissive schedule.
      const onTimeNight = {
        ...dayShifts[2],
        shift_definition: { start_time: '23:30:00', crosses_midnight: true },
      };
      mockRepository.find.mockResolvedValue([dayShifts[0], dayShifts[1], onTimeNight]);

      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { status: 'late' },
        new Date('2026-06-22T09:00:00Z'),
      );
      expect(result.data.map((d) => d.date)).toEqual(['2026-06-22']);
    });

    it('filters by date range (inclusive)', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { from_date: '2026-06-21', to_date: '2026-06-22' },
        new Date('2026-06-22T09:00:00Z'),
      );
      expect(result.data.map((d) => d.date)).toEqual(['2026-06-22']);
    });

    it('sorts ascending when sort_dir=asc', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { sort_dir: 'asc' },
        new Date('2026-06-22T09:00:00Z'),
      );
      expect(result.data.map((d) => d.date)).toEqual(['2026-06-20', '2026-06-22']);
    });
  });

  describe('findMyAttendanceForDate', () => {
    it('queries the day in WIB, excludes overtime/soft-deleted, newest first', async () => {
      const expected = [{ id: 's2' }, { id: 's1' }];
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expected),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMyAttendanceForDate(mockUser.id, '2026-06-22');

      expect(result).toBe(expected);
      expect(qb.where).toHaveBeenCalledWith('shift.user_id = :userId', { userId: mockUser.id });
      expect(qb.andWhere).toHaveBeenCalledWith('shift.is_overtime = false');
      expect(qb.andWhere).toHaveBeenCalledWith(
        "DATE(shift.clock_in_time AT TIME ZONE 'Asia/Jakarta') = :date",
        { date: '2026-06-22' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('shift.clock_in_time', 'DESC');
    });
  });
});
