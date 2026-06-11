import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { LocationSummaryCron } from './location-summary.cron';

describe('LocationSummaryCron', () => {
  let cron: LocationSummaryCron;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationSummaryCron, { provide: getDataSourceToken(), useValue: dataSource }],
    }).compile();

    cron = module.get(LocationSummaryCron);
  });

  describe('summarizeDateRange', () => {
    it('should insert grouped aggregates with ON CONFLICT DO NOTHING and return the count', async () => {
      const inserted = await cron.summarizeDateRange('2026-06-01', '2026-06-09', true);

      expect(inserted).toBe(2);
      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO location_daily_summaries');
      expect(sql).toContain("AT TIME ZONE 'Asia/Jakarta'");
      expect(sql).toContain('ON CONFLICT ON CONSTRAINT uq_location_summary_user_date DO NOTHING');
      expect(params).toEqual(['2026-06-01', '2026-06-09', true]);
    });
  });

  describe('summarizeYesterday', () => {
    it("should summarize yesterday's WIB date as a non-backfilled row", async () => {
      await cron.summarizeYesterday();

      const [, params] = dataSource.query.mock.calls[0];
      const expectedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      expect(params).toEqual([expectedYesterday, expectedYesterday, false]);
    });

    it('should swallow errors (cron must not crash the app)', async () => {
      dataSource.query.mockRejectedValue(new Error('db down'));
      await expect(cron.summarizeYesterday()).resolves.toBeUndefined();
    });
  });
});
