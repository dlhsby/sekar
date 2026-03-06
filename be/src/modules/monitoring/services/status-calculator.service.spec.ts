import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatusCalculatorService, StatusInput } from './status-calculator.service';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { MonitoringCacheService, StatusThresholds } from './monitoring-cache.service';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { EventsGateway } from '../../../gateways/events.gateway';

describe('StatusCalculatorService', () => {
  let service: StatusCalculatorService;
  let trackingRepository: any;
  let cacheService: any;
  let eventsGateway: any;
  let userRepository: any;
  let areaRepository: any;

  const defaultThresholds: StatusThresholds = {
    active_max_age_seconds: 300,
    inactive_threshold_seconds: 900,
    missing_threshold_seconds: 3600,
  };

  beforeEach(async () => {
    trackingRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      upsert: jest.fn(),
    };

    cacheService = {
      getThresholds: jest.fn().mockResolvedValue(defaultThresholds),
      getGeofencing: jest.fn().mockResolvedValue({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
      getAreaBoundary: jest.fn().mockResolvedValue(null),
    };

    eventsGateway = {
      emitUserStatusChanged: jest.fn(),
      emitUserLeftArea: jest.fn(),
      emitUserEnteredArea: jest.fn(),
      emitUserLocation: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    areaRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusCalculatorService,
        { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Area), useValue: areaRepository },
        { provide: MonitoringCacheService, useValue: cacheService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<StatusCalculatorService>(StatusCalculatorService);
  });

  describe('calculateStatus (pure function)', () => {
    const now = new Date('2026-03-04T10:00:00Z');

    it('should return OFFLINE when no active shift', () => {
      const input: StatusInput = { hasActiveShift: false, lastLocationAt: null, isWithinArea: true };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.OFFLINE);
    });

    it('should return INACTIVE when active shift but no location', () => {
      const input: StatusInput = { hasActiveShift: true, lastLocationAt: null, isWithinArea: true };
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.INACTIVE);
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
      expect(service.calculateStatus(input, defaultThresholds, now)).toBe(TrackingStatus.OUTSIDE_AREA);
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

      await service.onLocationPing(
        'user-1', -7.29, 112.74, 10, 85, new Date(),
      );

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
        [[112.73, -7.28], [112.735, -7.28], [112.735, -7.285], [112.73, -7.285], [112.73, -7.28]],
      ]);

      userRepository.findOne.mockResolvedValue(mockUser);
      areaRepository.findOne.mockResolvedValue(mockArea);

      await service.onLocationPing(
        'user-1', -7.5, 112.9, 10, 80, new Date(),
      );

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
});
