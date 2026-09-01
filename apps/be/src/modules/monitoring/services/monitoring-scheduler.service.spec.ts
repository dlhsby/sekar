import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MonitoringSchedulerService } from './monitoring-scheduler.service';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { StatusCalculatorService } from './status-calculator.service';
import { MonitoringCacheService } from './monitoring-cache.service';

describe('MonitoringSchedulerService', () => {
  let service: MonitoringSchedulerService;
  let trackingRepository: any;
  let statusCalculator: any;
  let cacheService: any;
  let staleSessionRows: any[];

  beforeEach(async () => {
    staleSessionRows = [];
    trackingRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        const qb: any = {
          innerJoin: jest.fn(() => qb),
          leftJoin: jest.fn(() => qb),
          where: jest.fn(() => qb),
          andWhere: jest.fn(() => qb),
          select: jest.fn(() => qb),
          addSelect: jest.fn(() => qb),
          getRawMany: jest.fn(async () => staleSessionRows),
        };
        return qb;
      }),
    };

    statusCalculator = {
      recalculate: jest.fn(),
      onClockOut: jest.fn(),
    };

    cacheService = {
      getThresholds: jest.fn().mockResolvedValue({
        active_max_age_seconds: 300,
        inactive_threshold_seconds: 900,
        missing_threshold_seconds: 3600,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringSchedulerService,
        { provide: getRepositoryToken(UserTrackingStatus), useValue: trackingRepository },
        { provide: StatusCalculatorService, useValue: statusCalculator },
        { provide: MonitoringCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<MonitoringSchedulerService>(MonitoringSchedulerService);
  });

  describe('reevaluateStaleStatuses', () => {
    it('should skip when no stale users', async () => {
      trackingRepository.find.mockResolvedValue([]);

      await service.reevaluateStaleStatuses();

      expect(statusCalculator.recalculate).not.toHaveBeenCalled();
    });

    it('should recalculate each stale user', async () => {
      const staleUsers = [
        { user_id: 'user-1', status: TrackingStatus.ACTIVE },
        { user_id: 'user-2', status: TrackingStatus.OFFLINE },
      ];
      trackingRepository.find.mockResolvedValue(staleUsers);

      statusCalculator.recalculate.mockImplementation((userId: string) =>
        Promise.resolve({
          user_id: userId,
          status: userId === 'user-1' ? TrackingStatus.OFFLINE : TrackingStatus.OFFLINE,
        }),
      );

      await service.reevaluateStaleStatuses();

      expect(statusCalculator.recalculate).toHaveBeenCalledTimes(2);
      expect(statusCalculator.recalculate).toHaveBeenCalledWith('user-1');
      expect(statusCalculator.recalculate).toHaveBeenCalledWith('user-2');
    });

    it('should handle recalculate returning null', async () => {
      trackingRepository.find.mockResolvedValue([
        { user_id: 'user-1', status: TrackingStatus.ACTIVE },
      ]);
      statusCalculator.recalculate.mockResolvedValue(null);

      await service.reevaluateStaleStatuses();

      expect(statusCalculator.recalculate).toHaveBeenCalledTimes(1);
    });

    it('should batch limit to 50 users', async () => {
      trackingRepository.find.mockResolvedValue([]);

      await service.reevaluateStaleStatuses();

      expect(trackingRepository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
    });
  });

  describe('endStaleSessions', () => {
    // Shift 1 on 2026-08-04, 60-minute grace. Window closes 16:00 on its own day.
    const SHIFT_1 = {
      service_day: '2026-08-04',
      end_time: '15:00:00',
      crosses_midnight: false,
      cutoff_grace_min: 60,
    };
    // Shift 3 spans midnight: starts 21:00, ends 05:00 the NEXT day.
    const SHIFT_3 = {
      service_day: '2026-08-04',
      end_time: '05:00:00',
      crosses_midnight: true,
      cutoff_grace_min: 60,
    };

    it('releases a row whose shift is already clocked out', async () => {
      staleSessionRows = [
        { user_id: 'u1', clock_out_time: new Date('2026-08-04T08:00:00Z'), ...SHIFT_1 },
      ];

      await expect(service.endStaleSessions(new Date('2026-08-04T09:00:00Z'))).resolves.toBe(1);
      expect(statusCalculator.onClockOut).toHaveBeenCalledWith('u1');
    });

    it('releases an open shift once its window plus grace has passed', async () => {
      staleSessionRows = [{ user_id: 'u1', clock_out_time: null, ...SHIFT_1 }];

      await expect(service.endStaleSessions(new Date('2026-08-06T09:00:00Z'))).resolves.toBe(1);
    });

    it('leaves an open shift alone while it is still running', async () => {
      staleSessionRows = [{ user_id: 'u1', clock_out_time: null, ...SHIFT_1 }];

      await expect(service.endStaleSessions(new Date('2026-08-04T10:00:00Z'))).resolves.toBe(0);
      expect(statusCalculator.onClockOut).not.toHaveBeenCalled();
    });

    // The regression a date-based check would cause: a night-shift worker is
    // mid-shift at 00:30 and must not be swept off the map at midnight.
    it('keeps a cross-midnight shift live after midnight', async () => {
      staleSessionRows = [{ user_id: 'u1', clock_out_time: null, ...SHIFT_3 }];

      await expect(service.endStaleSessions(new Date('2026-08-05T00:30:00Z'))).resolves.toBe(0);
      expect(statusCalculator.onClockOut).not.toHaveBeenCalled();
    });

    it('releases a cross-midnight shift once its next-day window closes', async () => {
      staleSessionRows = [{ user_id: 'u1', clock_out_time: null, ...SHIFT_3 }];

      await expect(service.endStaleSessions(new Date('2026-08-05T18:00:00Z'))).resolves.toBe(1);
    });

    it('accepts a Date service_day from the driver', async () => {
      staleSessionRows = [
        { user_id: 'u1', clock_out_time: null, ...SHIFT_1, service_day: new Date('2026-08-04') },
      ];

      await expect(service.endStaleSessions(new Date('2026-08-06T09:00:00Z'))).resolves.toBe(1);
    });

    // A session with no shift definition has no window to judge, so leaving it
    // open is the safe default — a live worker must never vanish off the map
    // because of missing reference data.
    it('leaves an open session with no shift definition alone', async () => {
      staleSessionRows = [
        {
          user_id: 'u1',
          clock_out_time: null,
          service_day: '2026-08-04',
          end_time: null,
          crosses_midnight: null,
          cutoff_grace_min: null,
        },
      ];

      await expect(service.endStaleSessions(new Date('2026-08-06T09:00:00Z'))).resolves.toBe(0);
    });

    it('does nothing when every session is still live', async () => {
      staleSessionRows = [];

      await expect(service.endStaleSessions()).resolves.toBe(0);
      expect(statusCalculator.onClockOut).not.toHaveBeenCalled();
    });
  });
});
