/**
 * Unit tests: connectWithRetry — the backfill's database connection.
 *
 * Why this exists. On 2026-09-02 the staging backfill failed repeatedly with
 *
 *   Error: Connection terminated due to connection timeout
 *
 * exiting non-zero after ~8 seconds. The cause was memory pressure on
 * db.t4g.micro: Postgres kept serving EXISTING pooled connections while
 * refusing NEW ones. The condition was transient — but the script gave up on
 * the first attempt, so a job that had already moved 4,000 photos died at the
 * starting line on every restart.
 *
 * The script is idempotent and keyset-paginated, so retrying is always safe:
 * rewritten rows no longer match the `data:%` predicate.
 */

import { connectWithRetry } from './backfill-inline-photos';

describe('connectWithRetry', () => {
  let timeoutSpy: jest.SpyInstance;
  let delays: number[];

  beforeEach(() => {
    delays = [];
    // Run the backoff immediately but record what it WOULD have waited, so the
    // suite asserts the backoff shape without actually sleeping.
    timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((
      fn: () => void,
      ms?: number,
    ) => {
      delays.push(ms ?? 0);
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as never);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns immediately when the first attempt succeeds', async () => {
    const initialize = jest.fn().mockResolvedValue(undefined);
    await expect(
      connectWithRetry({ initialize } as never, { attempts: 5, baseDelayMs: 10 }),
    ).resolves.toBeUndefined();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(delays).toHaveLength(0);
  });

  it('retries a transient connection timeout and succeeds', async () => {
    const initialize = jest
      .fn()
      .mockRejectedValueOnce(new Error('Connection terminated due to connection timeout'))
      .mockRejectedValueOnce(new Error('Connection terminated due to connection timeout'))
      .mockResolvedValue(undefined);

    await expect(
      connectWithRetry({ initialize } as never, { attempts: 5, baseDelayMs: 10 }),
    ).resolves.toBeUndefined();
    expect(initialize).toHaveBeenCalledTimes(3);
  });

  it('gives up after the configured attempts and rethrows the last error', async () => {
    const initialize = jest
      .fn()
      .mockRejectedValue(new Error('Connection terminated due to connection timeout'));

    await expect(
      connectWithRetry({ initialize } as never, { attempts: 3, baseDelayMs: 10 }),
    ).rejects.toThrow('Connection terminated due to connection timeout');
    expect(initialize).toHaveBeenCalledTimes(3);
    // Waits BETWEEN attempts only — no pointless sleep after the last failure.
    expect(delays).toHaveLength(2);
  });

  it('backs off progressively rather than hammering a struggling instance', async () => {
    // The supervisor that relaunched every ~10s turned a memory-starved
    // instance into a connection storm. Backoff is the point, not just retry.
    const initialize = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(undefined);

    await connectWithRetry({ initialize } as never, { attempts: 5, baseDelayMs: 100 });
    expect(delays).toEqual([100, 200]);
  });
});
