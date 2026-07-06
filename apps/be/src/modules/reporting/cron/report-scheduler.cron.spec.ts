// puppeteer-core ships ESM that jest does not transform (transformIgnorePatterns
// excludes node_modules); stub it so the reporting.service → pdf.generator import
// chain loads in unit tests without parsing the real package.
jest.mock('puppeteer-core', () => ({}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportSchedulerCron } from './report-scheduler.cron';
import { ReportSchedule } from '../entities/report-schedule.entity';
import { ReportingService } from '../reporting.service';

describe('ReportSchedulerCron', () => {
  let cron: ReportSchedulerCron;
  let mockScheduleRepo: { find: jest.Mock };
  let mockReportingService: { generateFromSchedule: jest.Mock };

  beforeEach(async () => {
    mockScheduleRepo = { find: jest.fn() };
    mockReportingService = { generateFromSchedule: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportSchedulerCron,
        { provide: getRepositoryToken(ReportSchedule), useValue: mockScheduleRepo },
        { provide: ReportingService, useValue: mockReportingService },
      ],
    }).compile();

    cron = module.get<ReportSchedulerCron>(ReportSchedulerCron);
  });

  describe('run', () => {
    it('generates a report for every due schedule', async () => {
      const schedules = [{ id: 's1' }, { id: 's2' }];
      mockScheduleRepo.find.mockResolvedValue(schedules);
      mockReportingService.generateFromSchedule.mockResolvedValue(undefined);

      await cron.run();

      expect(mockScheduleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        }),
      );
      expect(mockReportingService.generateFromSchedule).toHaveBeenCalledTimes(2);
      expect(mockReportingService.generateFromSchedule).toHaveBeenCalledWith(schedules[0]);
      expect(mockReportingService.generateFromSchedule).toHaveBeenCalledWith(schedules[1]);
    });

    it('does nothing when no schedules are due', async () => {
      mockScheduleRepo.find.mockResolvedValue([]);

      await cron.run();

      expect(mockReportingService.generateFromSchedule).not.toHaveBeenCalled();
    });

    it('continues processing the remaining schedules when one fails', async () => {
      mockScheduleRepo.find.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
      mockReportingService.generateFromSchedule
        .mockRejectedValueOnce(new Error('render failed'))
        .mockResolvedValueOnce(undefined);

      await expect(cron.run()).resolves.toBeUndefined();
      expect(mockReportingService.generateFromSchedule).toHaveBeenCalledTimes(2);
    });

    it('swallows a top-level query failure (logged, not rethrown)', async () => {
      mockScheduleRepo.find.mockRejectedValue(new Error('db down'));

      await expect(cron.run()).resolves.toBeUndefined();
      expect(mockReportingService.generateFromSchedule).not.toHaveBeenCalled();
    });
  });
});
