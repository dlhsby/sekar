import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { StaleStatusSweeperService } from './stale-status-sweeper.service';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';

const mockFind = jest.fn();
const mockSave = jest.fn();

const mockTrackingRepository = {
  find: mockFind,
  save: mockSave,
};

describe('StaleStatusSweeperService', () => {
  let service: StaleStatusSweeperService;

  beforeEach(async () => {
    // Reset calls AND set safe defaults for each test
    mockFind.mockReset().mockResolvedValue([]);
    mockSave.mockReset().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaleStatusSweeperService,
        {
          provide: getRepositoryToken(UserTrackingStatus),
          useValue: mockTrackingRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: number) =>
              key === 'MISSING_THRESHOLD_SECONDS' ? 900 : def,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<StaleStatusSweeperService>(StaleStatusSweeperService);
  });

  describe('sweep', () => {
    it('should do nothing when no stale workers are found', async () => {
      // mockFind default already returns []
      await service.sweep();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should flip ACTIVE workers older than threshold to MISSING', async () => {
      const staleWorker = {
        user_id: 'user-1',
        status: TrackingStatus.ACTIVE,
        last_location_at: new Date(Date.now() - 1000 * 1000), // 1000 s ago
        updated_at: new Date(),
      } as UserTrackingStatus;

      // First call: return stale worker; second call (next page) → []
      mockFind.mockResolvedValueOnce([staleWorker]).mockResolvedValueOnce([]);

      await service.sweep();

      expect(staleWorker.status).toBe(TrackingStatus.MISSING);
      expect(mockSave).toHaveBeenCalledWith([staleWorker]);
    });

    it('should only query for ACTIVE workers (not MISSING/OFFLINE)', async () => {
      // The only call returns [] — just check the where clause
      await service.sweep();

      const [queryArg] = mockFind.mock.calls[0];
      expect(queryArg.where.status).toBe(TrackingStatus.ACTIVE);
    });

    it('should save all flipped workers in a single call', async () => {
      const staleWorkers = Array.from({ length: 5 }, (_, i) => ({
        user_id: `user-${i}`,
        status: TrackingStatus.ACTIVE,
        last_location_at: new Date(Date.now() - 2000 * 1000),
        updated_at: new Date(),
      })) as UserTrackingStatus[];

      // 5 workers < BATCH_SIZE(50), so loop terminates after one find call
      mockFind.mockResolvedValueOnce(staleWorkers);

      await service.sweep();

      expect(mockSave).toHaveBeenCalledTimes(1);
      staleWorkers.forEach((w) => expect(w.status).toBe(TrackingStatus.MISSING));
    });

    it('should set updated_at on each flipped worker to a current timestamp', async () => {
      const originalUpdatedAt = new Date(0); // epoch — far in the past
      const stale = {
        user_id: 'user-time',
        status: TrackingStatus.ACTIVE,
        last_location_at: new Date(Date.now() - 2000 * 1000),
        updated_at: originalUpdatedAt,
      } as UserTrackingStatus;

      mockFind.mockResolvedValueOnce([stale]);

      await service.sweep();

      // updated_at must have been updated to a post-2020 date
      expect(stale.updated_at).not.toBe(originalUpdatedAt);
      expect(stale.updated_at.getFullYear()).toBeGreaterThan(2020);
    });

    it('should use pagination when there are more workers than the batch size', async () => {
      // Simulate exactly 50 workers in batch 1 (= BATCH_SIZE), then 3 in batch 2
      const makeBatch = (n: number, prefix: string) =>
        Array.from({ length: n }, (_, i) => ({
          user_id: `${prefix}-${i}`,
          status: TrackingStatus.ACTIVE,
          last_location_at: new Date(Date.now() - 2000 * 1000),
          updated_at: new Date(),
        })) as UserTrackingStatus[];

      const batch1 = makeBatch(50, 'a');
      const batch2 = makeBatch(3, 'b');

      mockFind
        .mockResolvedValueOnce(batch1)  // offset 0  → 50 workers
        .mockResolvedValueOnce(batch2); // offset 50 → 3 workers, terminates

      await service.sweep();

      // Two find calls and two save calls
      expect(mockFind).toHaveBeenCalledTimes(2);
      expect(mockSave).toHaveBeenCalledTimes(2);
      batch1.forEach((w) => expect(w.status).toBe(TrackingStatus.MISSING));
      batch2.forEach((w) => expect(w.status).toBe(TrackingStatus.MISSING));
    });
  });
});
