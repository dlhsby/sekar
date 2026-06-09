import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OfflineSweeperService } from './offline-sweeper.service';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';

describe('OfflineSweeperService', () => {
  let service: OfflineSweeperService;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineSweeperService,
        { provide: getRepositoryToken(UserTrackingStatus), useValue: { query } },
      ],
    }).compile();
    service = module.get(OfflineSweeperService);
  });

  afterEach(() => jest.clearAllMocks());

  it('marks 24h-stale rows OFFLINE excluding users with an open shift', async () => {
    query.mockResolvedValue([[], 3]); // [rows, affectedCount]

    const count = await service.markStaleOffline();

    expect(count).toBe(3);
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual([TrackingStatus.OFFLINE]);
    expect(sql).toContain("INTERVAL '24 hours'");
    expect(sql).toContain('clock_out_time IS NULL');
    expect(sql).toContain('deleted_at IS NULL');
  });

  it('returns 0 when the driver result has no affected count', async () => {
    query.mockResolvedValue(undefined);
    await expect(service.markStaleOffline()).resolves.toBe(0);
  });

  it('sweep swallows errors (never throws out of the cron)', async () => {
    query.mockRejectedValue(new Error('db down'));
    await expect(service.sweep()).resolves.toBeUndefined();
  });
});
