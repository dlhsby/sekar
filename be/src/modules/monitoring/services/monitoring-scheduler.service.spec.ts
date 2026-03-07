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

  beforeEach(async () => {
    trackingRepository = {
      find: jest.fn(),
    };

    statusCalculator = {
      recalculate: jest.fn(),
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
        { user_id: 'user-2', status: TrackingStatus.INACTIVE },
      ];
      trackingRepository.find.mockResolvedValue(staleUsers);

      statusCalculator.recalculate.mockImplementation((userId: string) =>
        Promise.resolve({
          user_id: userId,
          status: userId === 'user-1' ? TrackingStatus.INACTIVE : TrackingStatus.INACTIVE,
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

      expect(trackingRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });
});
