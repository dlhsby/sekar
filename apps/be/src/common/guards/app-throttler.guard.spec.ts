import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';
import { AppThrottlerGuard } from './app-throttler.guard';

/**
 * Verifies the runtime limit substitution (ADR-049): login/changePassword by
 * handler name, global by the module-default heuristic, and NO clobbering of a
 * route-level @Throttle.
 */
describe('AppThrottlerGuard', () => {
  const SYS: Record<string, number> = {
    'ratelimit.login_per_min': 7,
    'auth.change_password_throttle_max': 2,
    'auth.change_password_throttle_ttl_ms': 30000,
    'ratelimit.global_per_min': 250,
  };

  const makeReq = (handlerName: string, limit: number, ttl = 60000): ThrottlerRequest =>
    ({
      context: { getHandler: () => ({ name: handlerName }) },
      limit,
      ttl,
      throttler: {},
      blockDuration: 0,
      getTracker: jest.fn(),
      generateKey: jest.fn(),
    }) as unknown as ThrottlerRequest;

  let guard: AppThrottlerGuard;
  let superSpy: jest.SpyInstance;

  beforeEach(() => {
    guard = new AppThrottlerGuard({ throttlers: [] } as never, {} as never, {} as never);
    (guard as unknown as { systemConfig: unknown }).systemConfig = {
      getNumber: (k: string, def: number) => SYS[k] ?? def,
    };
    (guard as unknown as { throttlers: unknown }).throttlers = [{ limit: 100 }];
    superSpy = jest
      .spyOn(
        ThrottlerGuard.prototype as unknown as { handleRequest: () => Promise<boolean> },
        'handleRequest',
      )
      .mockResolvedValue(true);
  });
  afterEach(() => superSpy.mockRestore());

  const callHandle = (req: ThrottlerRequest) =>
    (
      guard as unknown as { handleRequest: (r: ThrottlerRequest) => Promise<boolean> }
    ).handleRequest(req);

  it('substitutes the login limit by handler name', async () => {
    await callHandle(makeReq('login', 5));
    expect(superSpy).toHaveBeenCalledWith(expect.objectContaining({ limit: 7 }));
  });

  it('substitutes change-password limit + ttl by handler name', async () => {
    await callHandle(makeReq('changePassword', 3, 60000));
    expect(superSpy).toHaveBeenCalledWith(expect.objectContaining({ limit: 2, ttl: 30000 }));
  });

  it('substitutes the global limit when the incoming limit is the module default', async () => {
    await callHandle(makeReq('listUsers', 100));
    expect(superSpy).toHaveBeenCalledWith(expect.objectContaining({ limit: 250 }));
  });

  it('does NOT clobber a route-level @Throttle (limit differs from the module default)', async () => {
    await callHandle(makeReq('refresh', 10));
    expect(superSpy).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });
});
