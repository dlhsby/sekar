import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusCalculatorService, StatusInput } from './status-calculator.service';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import { User } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';
import { LocationStaffRequirement } from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { EventsGateway } from '../../../gateways/events.gateway';

describe('StatusCalculatorService', () => {
  let service: StatusCalculatorService;
  let trackingRepository: any;
  let cacheService: any;
  let eventsGateway: any;
  let userRepository: any;
  let areaRepository: any;
  let staffRequirementRepository: any;

  const defaultThresholds: StatusThresholds = {
    active_max_age_seconds: 300,
    location_ping_interval_seconds: 60,
    late_grace_seconds: 900,
  };

  beforeEach(async () => {
    trackingRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      upsert: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };

    cacheService = {
      getThresholds: jest.fn().mockResolvedValue(defaultThresholds),
      getGeofencing: jest
        .fn()
        .mockResolvedValue({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
      getAreaBoundary: jest.fn().mockResolvedValue(null),
      // 5.4e: geofence is scope-generic. Route 'location' to the existing
      // getAreaBoundary mock so its per-test overrides still drive lokasi checks;
      // region/rayon boundaries default to null (fail-open) unless a test sets them.
      getBoundary: jest.fn((scope: string, id: string) =>
        scope === 'location'
          ? (cacheService.getAreaBoundary as jest.Mock)(id)
          : Promise.resolve(null),
      ),
    };

    eventsGateway = {
      emitUserStatusChanged: jest.fn(),
      emitUserLeftArea: jest.fn(),
      emitUserEnteredArea: jest.fn(),
      emitUserLocation: jest.fn(),
      emitAreaStaffingChanged: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    areaRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    staffRequirementRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusCalculatorService,
        { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Location), useValue: areaRepository },
        {
          provide: getRepositoryToken(LocationStaffRequirement),
          useValue: staffRequirementRepository,
        },
        { provide: MonitoringCacheService, useValue: cacheService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<StatusCalculatorService>(StatusCalculatorService);
  });

  describe('calculateAxes', () => {
    const now = new Date('2026-03-04T10:00:00Z');

    const testCases = [
      {
        name: 'absent (not clocked in)',
        input: { hasActiveShift: false, lastLocationAt: null, isWithinArea: true },
        expectedActivity: 'absent',
        expectedLocation: 'unknown',
      },
      {
        name: 'offline + unknown (clocked in, no fix has ever arrived)',
        input: { hasActiveShift: true, lastLocationAt: null, isWithinArea: true },
        expectedActivity: 'offline',
        expectedLocation: 'unknown',
      },
      {
        name: 'aktif + dalam_area (fresh fix, inside)',
        input: {
          hasActiveShift: true,
          lastLocationAt: new Date('2026-03-04T09:57:00Z'), // 3 min ago
          isWithinArea: true,
        },
        expectedActivity: 'aktif',
        expectedLocation: 'dalam_area',
      },
      {
        name: 'aktif + luar_area (fresh fix, outside)',
        input: {
          hasActiveShift: true,
          lastLocationAt: new Date('2026-03-04T09:57:00Z'), // 3 min ago
          isWithinArea: false,
        },
        expectedActivity: 'aktif',
        expectedLocation: 'luar_area',
      },
      {
        // The axis survives going offline: the last known position is precisely
        // what a supervisor needs when someone stops reporting.
        name: 'offline + dalam_area (stale fix, last seen inside)',
        input: {
          hasActiveShift: true,
          lastLocationAt: new Date('2026-03-04T09:48:00Z'), // 12 min ago
          isWithinArea: true,
        },
        expectedActivity: 'offline',
        expectedLocation: 'dalam_area',
      },
      {
        name: 'offline + luar_area (stale fix, last seen outside)',
        input: {
          hasActiveShift: true,
          lastLocationAt: new Date('2026-03-04T09:40:00Z'), // 20 min ago
          isWithinArea: false,
        },
        expectedActivity: 'offline',
        expectedLocation: 'luar_area',
      },
      {
        name: 'offline + dalam_area (very stale — there is no separate "missing" any more)',
        input: {
          hasActiveShift: true,
          lastLocationAt: new Date('2026-03-04T08:30:00Z'), // 90 min ago
          isWithinArea: true,
        },
        expectedActivity: 'offline',
        expectedLocation: 'dalam_area',
      },
    ];

    testCases.forEach(({ name, input, expectedActivity, expectedLocation }) => {
      it(`should return ${expectedActivity}/${expectedLocation} when ${name}`, () => {
        const result = service.calculateAxes(input, defaultThresholds, now);
        expect(result.activity).toBe(expectedActivity);
        expect(result.location).toBe(expectedLocation);
      });
    });
  });

  describe('calculateStatus (pure function)', () => {
    const now = new Date('2026-03-04T10:00:00Z');

    it('returns ABSENT when not clocked in', () => {
      const input: StatusInput = {
        hasActiveShift: false,
        lastLocationAt: null,
        isWithinArea: true,
      };
      // Not clocked in is ABSENT now. This is the inversion: it used to be OFFLINE,
      // and OFFLINE now means the opposite (clocked in, but unreachable).
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.ABSENT);
    });

    it('returns OFFLINE when clocked in but no location has ever arrived', () => {
      const input: StatusInput = { hasActiveShift: true, lastLocationAt: null, isWithinArea: true };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.OFFLINE);
    });

    it('returns ACTIVE when the location is fresh', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:57:00Z'), // 3 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.ACTIVE);
    });

    it('returns ACTIVE for a fresh location OUTSIDE the area — outside is an axis, not a status', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:57:00Z'), // 3 min ago
        isWithinArea: false,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.ACTIVE);
    });

    it('returns OFFLINE once the location ages past active_max_age_sec', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:48:00Z'), // 12 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.OFFLINE);
    });

    it('still returns OFFLINE far past the retired missing threshold — there is no MISSING', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T08:30:00Z'), // 90 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.OFFLINE);
    });

    it('treats the threshold as inclusive — exactly active_max_age_sec is still ACTIVE', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:55:00Z'), // exactly 300 s ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.ACTIVE);
    });

    it('respects a custom active_max_age_seconds', () => {
      const customThresholds: StatusThresholds = {
        active_max_age_seconds: 60,
        location_ping_interval_seconds: 60,
        late_grace_seconds: 900,
      };
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:58:00Z'), // 2 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, customThresholds, now)).toBe(TrackingStatus.OFFLINE);
    });
  });

  describe('onClockIn', () => {
    it('should upsert tracking status to ACTIVE', async () => {
      await service.onClockIn('user-1', 'shift-1', 'area-1', 'sd-1');

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          shift_id: 'shift-1',
          location_id: 'area-1',
          shift_definition_id: 'sd-1',
          status: TrackingStatus.ACTIVE,
          is_within_area: true,
        }),
        ['user_id'],
      );
    });

    it('should check boundary when GPS coords provided', async () => {
      // Mock boundary - polygon that contains the clock-in point
      cacheService.getAreaBoundary.mockResolvedValue([
        [
          [112.73, -7.28],
          [112.76, -7.28],
          [112.76, -7.31],
          [112.73, -7.31],
          [112.73, -7.28],
        ],
      ]);

      await service.onClockIn('user-1', 'shift-1', 'area-1', 'sd-1', -7.29, 112.74);

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_within_area: true,
        }),
        ['user_id'],
      );
    });

    it('should set is_within_area false when clock-in outside boundary', async () => {
      // Mock boundary - polygon that does NOT contain the clock-in point
      cacheService.getAreaBoundary.mockResolvedValue([
        [
          [112.73, -7.28],
          [112.735, -7.28],
          [112.735, -7.285],
          [112.73, -7.285],
          [112.73, -7.28],
        ],
      ]);

      await service.onClockIn('user-1', 'shift-1', 'area-1', 'sd-1', -7.5, 112.9);

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_within_area: false,
        }),
        ['user_id'],
      );
    });

    it('should default is_within_area to true when no GPS coords provided', async () => {
      await service.onClockIn('user-1', 'shift-1', 'area-1', 'sd-1');

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_within_area: true,
        }),
        ['user_id'],
      );
    });
  });

  describe('onClockOut', () => {
    it('should set status to ABSENT (not clocked in), not OFFLINE', async () => {
      // Guards the 5→3 inversion: OFFLINE now means "clocked in but unreachable",
      // so a clocked-out worker must be ABSENT — the same value calculateStatus
      // returns for !hasActiveShift. Writing OFFLINE here read as "unreachable".
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        status: TrackingStatus.ACTIVE,
        location_id: 'area-1',
      });

      await service.onClockOut('user-1');

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          shift_id: null,
          status: TrackingStatus.ABSENT,
        }),
        ['user_id'],
      );
    });
  });

  describe('onLocationPing', () => {
    it('should update location and status', async () => {
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: null,
        status: TrackingStatus.OFFLINE,
        is_within_area: true,
        last_latitude: null,
        last_longitude: null,
        last_accuracy_meters: null,
        last_battery_level: null,
        last_location_at: null,
        updated_at: new Date(),
      });

      await service.onLocationPing('user-1', -7.29, 112.74, 10, 85, new Date());

      expect(trackingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_latitude: -7.29,
          last_longitude: 112.74,
          last_battery_level: 85,
          status: TrackingStatus.ACTIVE,
        }),
      );
    });

    it('should skip if no active shift', async () => {
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: null,
      });

      await service.onLocationPing('user-1', -7.29, 112.74, 10, 85, new Date());

      expect(trackingRepository.save).not.toHaveBeenCalled();
    });

    it('should broadcast user-left-area via WebSocket when transitioning outside', async () => {
      const mockUser = { id: 'user-1', full_name: 'Test User', role: 'satgas' };
      const mockArea = { id: 'area-1', name: 'Test Location', rayon_id: 'rayon-1' };

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_latitude: -7.29,
        last_longitude: 112.74,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        updated_at: new Date(),
      });

      // Mock boundary check to return a polygon that excludes the new point
      cacheService.getAreaBoundary.mockResolvedValue([
        [
          [112.73, -7.28],
          [112.735, -7.28],
          [112.735, -7.285],
          [112.73, -7.285],
          [112.73, -7.28],
        ],
      ]);

      userRepository.findOne.mockResolvedValue(mockUser);
      areaRepository.findOne.mockResolvedValue(mockArea);

      await service.onLocationPing('user-1', -7.5, 112.9, 10, 80, new Date());

      expect(eventsGateway.emitUserLeftArea).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', location_id: 'area-1' }),
      );
    });

    it('stays within-area when outside primary but inside a task-based area (ADR-013 §5)', async () => {
      // Worker assigned to area-1 (primary) + area-2 (task_based).
      (service as unknown as { userAreasService: unknown }).userAreasService = {
        getEffectiveLocations: jest.fn().mockResolvedValue([{ id: 'area-1' }, { id: 'area-2' }]),
      };

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_latitude: -7.29,
        last_longitude: 112.74,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        updated_at: new Date(),
      });

      // area-1 excludes the ping; area-2 (the task area) contains it.
      cacheService.getAreaBoundary.mockImplementation((locationId: string) =>
        Promise.resolve(
          locationId === 'area-2'
            ? [
                [
                  [112.89, -7.49],
                  [112.91, -7.49],
                  [112.91, -7.51],
                  [112.89, -7.51],
                  [112.89, -7.49],
                ],
              ]
            : [
                [
                  [112.73, -7.28],
                  [112.735, -7.28],
                  [112.735, -7.285],
                  [112.73, -7.285],
                  [112.73, -7.28],
                ],
              ],
        ),
      );
      userRepository.findOne.mockResolvedValue({ id: 'user-1', full_name: 'T', role: 'satgas' });
      areaRepository.findOne.mockResolvedValue({ id: 'area-1', name: 'A', rayon_id: 'r1' });

      await service.onLocationPing('user-1', -7.5, 112.9, 10, 80, new Date());

      expect(trackingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_within_area: true }),
      );
      expect(eventsGateway.emitUserLeftArea).not.toHaveBeenCalled();
    });

    it('a MOBILE crew outside its clock-in lokasi but inside its kawasan stays within-area (5.4e)', async () => {
      // No lokasi assignment (empty roster + no user_areas); the occurrence is
      // region-scoped, so the geofence is the KAWASAN polygon, not the lokasi.
      (service as unknown as { userAreasService: unknown }).userAreasService = undefined;
      (service as unknown as { dailySchedulesService: unknown }).dailySchedulesService = {
        getActiveAreasForDay: jest.fn().mockResolvedValue([]),
        findByUserAndDate: jest.fn().mockResolvedValue({ region_id: 'region-1' }),
      };
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_latitude: -7.29,
        last_longitude: 112.74,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        updated_at: new Date(),
      });
      // area-1 (clock-in lokasi) excludes the ping; region-1 (kawasan) contains it.
      cacheService.getBoundary.mockImplementation((scope: string, id: string) =>
        Promise.resolve(
          scope === 'region' && id === 'region-1'
            ? [
                [
                  [112.8, -7.4],
                  [113.0, -7.4],
                  [113.0, -7.6],
                  [112.8, -7.6],
                  [112.8, -7.4],
                ],
              ]
            : [
                [
                  [112.73, -7.28],
                  [112.735, -7.28],
                  [112.735, -7.285],
                  [112.73, -7.285],
                  [112.73, -7.28],
                ],
              ],
        ),
      );
      userRepository.findOne.mockResolvedValue({ id: 'user-1', full_name: 'M', role: 'satgas' });
      areaRepository.findOne.mockResolvedValue({ id: 'area-1', name: 'A', rayon_id: 'r1' });

      await service.onLocationPing('user-1', -7.5, 112.9, 10, 80, new Date());

      expect(trackingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_within_area: true }),
      );
      expect(eventsGateway.emitUserLeftArea).not.toHaveBeenCalled();
    });
  });

  describe('recalculate', () => {
    it('should return null for unknown user', async () => {
      trackingRepository.findOne.mockResolvedValue(null);
      const result = await service.recalculate('unknown');
      expect(result).toBeNull();
    });

    it('should broadcast status change via WebSocket', async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const mockUser = { id: 'user-1', full_name: 'Test User', role: 'satgas' };

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_location_at: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
        last_latitude: -7.29,
        last_longitude: 112.74,
        updated_at: fiveMinAgo,
      });

      trackingRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));
      userRepository.findOne.mockResolvedValue(mockUser);
      areaRepository.findOne.mockResolvedValue(null);

      const result = await service.recalculate('user-1');

      expect(result?.status).toBe(TrackingStatus.OFFLINE);
      expect(eventsGateway.emitUserStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          previous_status: TrackingStatus.ACTIVE,
          new_status: TrackingStatus.OFFLINE,
        }),
      );
    });

    it('should not broadcast when status unchanged', async () => {
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_location_at: new Date(), // just now
        updated_at: new Date(),
      });

      await service.recalculate('user-1');

      expect(eventsGateway.emitUserStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('Phase 4-3 (M2) missing-worker alert', () => {
    const buildWithNotifications = async (sendToUser: jest.Mock) => {
      const { NotificationsService } = await import('../../notifications/notifications.service');
      const mod = await Test.createTestingModule({
        providers: [
          StatusCalculatorService,
          { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepository },
          { provide: getRepositoryToken(User), useValue: userRepository },
          { provide: getRepositoryToken(Location), useValue: areaRepository },
          {
            provide: getRepositoryToken(LocationStaffRequirement),
            useValue: staffRequirementRepository,
          },
          { provide: MonitoringCacheService, useValue: cacheService },
          { provide: EventsGateway, useValue: eventsGateway },
          { provide: NotificationsService, useValue: { sendToUser } },
        ],
      }).compile();
      return mod.get(StatusCalculatorService);
    };

    it('notifies korlap users in the worker’s area when status flips to MISSING', async () => {
      const sendToUser = jest.fn().mockResolvedValue({});
      const svc = await buildWithNotifications(sendToUser);

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_location_at: new Date(Date.now() - 2 * 3600 * 1000), // 2h ago → MISSING
        updated_at: new Date(),
      });
      trackingRepository.save.mockImplementation((e: any) => Promise.resolve(e));
      // First find: worker. Second find query is for korlap (uses find() not findOne).
      userRepository.findOne.mockResolvedValue({ id: 'user-1', full_name: 'Bob the Worker' });
      userRepository.find = jest.fn().mockResolvedValue([{ id: 'korlap-1' }, { id: 'korlap-2' }]);

      const result = await svc.recalculate('user-1');
      expect(result?.status).toBe(TrackingStatus.OFFLINE);

      // Flush the void-promise notify call.
      await Promise.resolve();
      await Promise.resolve();

      expect(sendToUser).toHaveBeenCalledTimes(2);
      expect(sendToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'korlap-1',
          type: 'missing_worker_alert',
          data: { worker_user_id: 'user-1', location_id: 'area-1' },
        }),
      );
    });

    it('does NOT notify when the worker was already OFFLINE', async () => {
      const sendToUser = jest.fn().mockResolvedValue({});
      const svc = await buildWithNotifications(sendToUser);

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: 'area-1',
        status: TrackingStatus.OFFLINE, // already unreachable
        is_within_area: true,
        last_location_at: new Date(Date.now() - 2 * 3600 * 1000),
        updated_at: new Date(),
      });
      trackingRepository.save.mockImplementation((e: any) => Promise.resolve(e));
      userRepository.find = jest.fn();

      await svc.recalculate('user-1');
      await Promise.resolve();

      expect(sendToUser).not.toHaveBeenCalled();
      expect(userRepository.find).not.toHaveBeenCalled();
    });

    it('is a no-op when locationId is null', async () => {
      const sendToUser = jest.fn();
      const svc = await buildWithNotifications(sendToUser);

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        location_id: null,
        status: TrackingStatus.ACTIVE,
        is_within_area: true,
        last_location_at: new Date(Date.now() - 2 * 3600 * 1000),
        updated_at: new Date(),
      });
      trackingRepository.save.mockImplementation((e: any) => Promise.resolve(e));
      userRepository.findOne.mockResolvedValue({ id: 'user-1', full_name: 'Bob' });
      userRepository.find = jest.fn();

      await svc.recalculate('user-1');
      await Promise.resolve();

      expect(sendToUser).not.toHaveBeenCalled();
    });

    // ---- Phase 4-3 (§C1 #8) hardening: kepala_rayon recipients + Redis dedup ----

    const buildWithNotificationsAndRedis = async (
      sendToUser: jest.Mock,
      setResult: 'OK' | null,
    ) => {
      const { NotificationsService } = await import('../../notifications/notifications.service');
      const { RedisService } = await import('../../../common/services/redis.service');
      const mod = await Test.createTestingModule({
        providers: [
          StatusCalculatorService,
          { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepository },
          { provide: getRepositoryToken(User), useValue: userRepository },
          { provide: getRepositoryToken(Location), useValue: areaRepository },
          {
            provide: getRepositoryToken(LocationStaffRequirement),
            useValue: staffRequirementRepository,
          },
          { provide: MonitoringCacheService, useValue: cacheService },
          { provide: EventsGateway, useValue: eventsGateway },
          { provide: NotificationsService, useValue: { sendToUser } },
          {
            provide: RedisService,
            useValue: { getClient: () => ({ set: jest.fn().mockResolvedValue(setResult) }) },
          },
        ],
      }).compile();
      return mod.get(StatusCalculatorService);
    };

    it('notifies kepala_rayon of the rayon in addition to korlap', async () => {
      const sendToUser = jest.fn().mockResolvedValue({});
      const svc = await buildWithNotificationsAndRedis(sendToUser, 'OK');

      userRepository.findOne.mockResolvedValue({ id: 'user-1', full_name: 'Bob' });
      userRepository.find = jest
        .fn()
        .mockResolvedValueOnce([{ id: 'korlap-1' }]) // korlap (area)
        .mockResolvedValueOnce([{ id: 'kepala-1' }]); // kepala_rayon (rayon)

      await svc.notifyMissingWorker('user-1', 'area-1', 'rayon-1');

      const recipients = sendToUser.mock.calls.map((c) => c[0].user_id).sort();
      expect(recipients).toEqual(['kepala-1', 'korlap-1']);
    });

    it('suppresses the alert when the per-day dedup slot is already claimed', async () => {
      const sendToUser = jest.fn();
      const svc = await buildWithNotificationsAndRedis(sendToUser, null); // SET NX → null

      userRepository.findOne.mockResolvedValue({ id: 'user-1', full_name: 'Bob' });
      userRepository.find = jest.fn().mockResolvedValue([{ id: 'korlap-1' }]);

      await svc.notifyMissingWorker('user-1', 'area-1', 'rayon-1');

      expect(sendToUser).not.toHaveBeenCalled();
    });
  });
});
