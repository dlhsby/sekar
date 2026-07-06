import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { LocationRetentionCron, LOCATION_RETENTION_DAYS } from './location-retention.cron';
import { LocationSummaryCron } from './location-summary.cron';

describe('LocationRetentionCron', () => {
  let cron: LocationRetentionCron;
  let dataSource: { query: jest.Mock };
  let summaryCron: { summarizeDateRange: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([[], 5]) };
    summaryCron = { summarizeDateRange: jest.fn().mockResolvedValue(3) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationRetentionCron,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: LocationSummaryCron, useValue: summaryCron },
      ],
    }).compile();

    cron = module.get(LocationRetentionCron);
  });

  it('should backfill summaries before deleting old logs', async () => {
    const callOrder: string[] = [];
    summaryCron.summarizeDateRange.mockImplementation(async () => {
      callOrder.push('backfill');
      return 3;
    });
    dataSource.query.mockImplementation(async () => {
      callOrder.push('delete');
      return [[], 5];
    });

    await cron.purgeOldLocationLogs();

    expect(callOrder).toEqual(['backfill', 'delete']);
  });

  it('should backfill as is_backfilled=true up to the day before the cutoff', async () => {
    await cron.purgeOldLocationLogs();

    const [from, to, isBackfilled] = summaryCron.summarizeDateRange.mock.calls[0];
    expect(from).toBe('1970-01-01');
    expect(isBackfilled).toBe(true);
    // `to` is the day before the 90-day cutoff date
    const cutoffMs = Date.now() - LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expectedCutoff = new Date(cutoffMs + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(to < expectedCutoff).toBe(true);
  });

  it('should delete logs older than the 90-day WIB cutoff instant', async () => {
    await cron.purgeOldLocationLogs();

    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toContain('DELETE FROM location_logs WHERE logged_at < $1');
    const cutoff = new Date(params[0]);
    const approxExpected = Date.now() - LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    // Cutoff is midnight WIB of (today - 90d): within 24h of the raw subtraction
    expect(Math.abs(cutoff.getTime() - approxExpected)).toBeLessThan(24 * 60 * 60 * 1000 + 1);
  });

  it('should swallow errors (cron must not crash the app)', async () => {
    summaryCron.summarizeDateRange.mockRejectedValue(new Error('db down'));
    await expect(cron.purgeOldLocationLogs()).resolves.toBeUndefined();
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
