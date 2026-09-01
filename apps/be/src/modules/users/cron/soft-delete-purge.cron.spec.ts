import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { SoftDeletePurgeCron, SOFT_DELETE_RETENTION_DAYS } from './soft-delete-purge.cron';

describe('SoftDeletePurgeCron', () => {
  let cron: SoftDeletePurgeCron;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let manager: { query: jest.Mock };
  const originalEnv = process.env.ENABLE_HARD_PURGE;

  beforeEach(async () => {
    manager = { query: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest
        .fn()
        .mockImplementation(async (fn: (m: typeof manager) => Promise<void>) => fn(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SoftDeletePurgeCron, { provide: getDataSourceToken(), useValue: dataSource }],
    }).compile();

    cron = module.get(SoftDeletePurgeCron);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ENABLE_HARD_PURGE;
    else process.env.ENABLE_HARD_PURGE = originalEnv;
  });

  it('should do nothing unless ENABLE_HARD_PURGE=true', async () => {
    delete process.env.ENABLE_HARD_PURGE;
    await cron.purgeSoftDeletedUsers();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('should select users soft-deleted more than 180 days ago', async () => {
    process.env.ENABLE_HARD_PURGE = 'true';
    await cron.purgeSoftDeletedUsers();

    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toContain('deleted_at IS NOT NULL AND deleted_at < $1');
    const cutoff = new Date(params[0]);
    const expected = Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(60_000);
  });

  it('should purge each candidate user with dependents inside a transaction', async () => {
    process.env.ENABLE_HARD_PURGE = 'true';
    dataSource.query.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

    await cron.purgeSoftDeletedUsers();

    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    const sqls = manager.query.mock.calls.map((c: [string]) => c[0]);
    expect(sqls.some((s: string) => s.includes('DELETE FROM user_locations'))).toBe(true);
    expect(sqls.some((s: string) => s.includes('DELETE FROM shifts'))).toBe(true);
    expect(sqls.some((s: string) => s.includes('DELETE FROM users WHERE id = $1'))).toBe(true);
  });

  it('should continue with remaining users when one purge fails (FK constraint)', async () => {
    process.env.ENABLE_HARD_PURGE = 'true';
    dataSource.query.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    dataSource.transaction
      .mockRejectedValueOnce(new Error('violates foreign key constraint'))
      .mockImplementation(async (fn: (m: typeof manager) => Promise<void>) => fn(manager));

    await expect(cron.purgeSoftDeletedUsers()).resolves.toBeUndefined();
    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
  });
});
