import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsRefreshCron } from './analytics-refresh.cron';
import { AnalyticsService } from '../analytics.service';

describe('AnalyticsRefreshCron', () => {
  let cron: AnalyticsRefreshCron;
  let mockAnalyticsService: any;

  beforeEach(async () => {
    mockAnalyticsService = {
      refreshViews: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRefreshCron,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    cron = module.get<AnalyticsRefreshCron>(AnalyticsRefreshCron);
  });

  describe('refreshAnalyticsViews', () => {
    it('should refresh materialized views', async () => {
      mockAnalyticsService.refreshViews.mockResolvedValue(undefined);

      await cron.refreshAnalyticsViews();

      expect(mockAnalyticsService.refreshViews).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      mockAnalyticsService.refreshViews.mockRejectedValue(new Error('Refresh failed'));

      await cron.refreshAnalyticsViews();

      expect(mockAnalyticsService.refreshViews).toHaveBeenCalled();
    });
  });
});
