import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusCalculatorService, StatusInput } from './status-calculator.service';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { AreaStaffRequirement } from '../../area-staff-requirements/entities/area-staff-requirement.entity';
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
    inactive_threshold_seconds: 900,
    missing_threshold_seconds: 3600,
    location_ping_interval_seconds: 60,
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
        { provide: getRepositoryToken(Area), useValue: areaRepository },
        { provide: getRepositoryToken(AreaStaffRequirement), useValue: staffRequirementRepository },
        { provide: MonitoringCacheService, useValue: cacheService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<StatusCalculatorService>(StatusCalculatorService);
  });

  describe('calculateStatus (pure function)', () => {
    const now = new Date('2026-03-04T10:00:00Z');

    it('should return OFFLINE when no active shift', () => {
      const input: StatusInput = {
        hasActiveShift: false,
        lastLocationAt: null,
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.OFFLINE);
    });

    it('should return MISSING when active shift but no location (SVC-3 fix)', () => {
      const input: StatusInput = { hasActiveShift: true, lastLocationAt: null, isWithinArea: true };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.MISSING);
    });

    it('should return ACTIVE when location is fresh and within area', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:57:00Z'), // 3 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.ACTIVE);
    });

    it('should return OUTSIDE_AREA when location is fresh but outside area', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:57:00Z'), // 3 min ago
        isWithinArea: false,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(
        TrackingStatus.OUTSIDE_AREA,
      );
    });

    it('should return INACTIVE when location age exceeds active threshold but below inactive', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:48:00Z'), // 12 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.INACTIVE);
    });

    it('should return MISSING when location age exceeds missing threshold', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T08:30:00Z'), // 90 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.MISSING);
    });

    it('should return INACTIVE when between inactive and missing thresholds', () => {
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:40:00Z'), // 20 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.INACTIVE);
    });

    it('should respect custom thresholds', () => {
      const customThresholds: StatusThresholds = {
        active_max_age_seconds: 60,
        inactive_threshold_seconds: 120,
        missing_threshold_seconds: 300,
        location_ping_interval_seconds: 60,
      };
      const input: StatusInput = {
        hasActiveShift: true,
        lastLocationAt: new Date('2026-03-04T09:58:00Z'), // 2 min ago
        isWithinArea: true,
      };
      expect(service.calculateStatus(input, customThresholds, now)).toBe(TrackingStatus.INACTIVE);
    });
  });

  describe('onClockIn', () => {
    it('should upsert tracking status to ACTIVE', async () => {
      await service.onClockIn('user-1', 'shift-1', 'area-1', 'sd-1');

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          shift_id: 'shift-1',
          area_id: 'area-1',
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
    it('should set status to OFFLINE', async () => {
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        status: TrackingStatus.ACTIVE,
        area_id: 'area-1',
      });

      await service.onClockOut('user-1');

      expect(trackingRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          shift_id: null,
          status: TrackingStatus.OFFLINE,
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
        area_id: null,
        status: TrackingStatus.INACTIVE,
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
      const mockArea = { id: 'area-1', name: 'Test Area', rayon_id: 'rayon-1' };

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        area_id: 'area-1',
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
        expect.objectContaining({ user_id: 'user-1', area_id: 'area-1' }),
      );
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
        area_id: 'area-1',
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

      expect(result?.status).toBe(TrackingStatus.INACTIVE);
      expect(eventsGateway.emitUserStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          previous_status: TrackingStatus.ACTIVE,
          new_status: TrackingStatus.INACTIVE,
        }),
      );
    });

    it('should not broadcast when status unchanged', async () => {
      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        area_id: 'area-1',
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
          { provide: getRepositoryToken(Area), useValue: areaRepository },
          {
            provide: getRepositoryToken(AreaStaffRequirement),
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
        area_id: 'area-1',
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
      expect(result?.status).toBe(TrackingStatus.MISSING);

      // Flush the void-promise notify call.
      await Promise.resolve();
      await Promise.resolve();

      expect(sendToUser).toHaveBeenCalledTimes(2);
      expect(sendToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'korlap-1',
          type: 'missing_worker_alert',
          data: { worker_user_id: 'user-1', area_id: 'area-1' },
        }),
      );
    });

    it('does NOT notify when status was already MISSING', async () => {
      const sendToUser = jest.fn().mockResolvedValue({});
      const svc = await buildWithNotifications(sendToUser);

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        area_id: 'area-1',
        status: TrackingStatus.MISSING, // already MISSING
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

    it('is a no-op when areaId is null', async () => {
      const sendToUser = jest.fn();
      const svc = await buildWithNotifications(sendToUser);

      trackingRepository.findOne.mockResolvedValue({
        user_id: 'user-1',
        shift_id: 'shift-1',
        area_id: null,
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
  });
});
