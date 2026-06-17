// puppeteer-core ships ESM that jest does not transform (transformIgnorePatterns
// excludes node_modules); stub it so the reporting.service → pdf.generator import
// chain loads in unit tests without parsing the real package.
jest.mock('puppeteer-core', () => ({}));

import { Test, TestingModule } from '@nestjs/testing';
import { ReportCleanupCron } from './report-cleanup.cron';
import { ReportingService } from '../reporting.service';

describe('ReportCleanupCron', () => {
  let cron: ReportCleanupCron;
  let mockReportingService: { deleteOldReports: jest.Mock };

  beforeEach(async () => {
    mockReportingService = {
      deleteOldReports: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCleanupCron,
        { provide: ReportingService, useValue: mockReportingService },
      ],
    }).compile();

    cron = module.get<ReportCleanupCron>(ReportCleanupCron);
  });

  describe('run', () => {
    it('deletes reports older than 90 days', async () => {
      mockReportingService.deleteOldReports.mockResolvedValue(5);

      await cron.run();

      expect(mockReportingService.deleteOldReports).toHaveBeenCalledWith(90);
    });

    it('handles a zero-deletion run without throwing', async () => {
      mockReportingService.deleteOldReports.mockResolvedValue(0);

      await expect(cron.run()).resolves.toBeUndefined();
      expect(mockReportingService.deleteOldReports).toHaveBeenCalledWith(90);
    });

    it('swallows service errors (logged, not rethrown) so the schedule survives', async () => {
      mockReportingService.deleteOldReports.mockRejectedValue(new Error('S3 down'));

      await expect(cron.run()).resolves.toBeUndefined();
      expect(mockReportingService.deleteOldReports).toHaveBeenCalledWith(90);
    });
  });
});
