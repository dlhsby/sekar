import { UserThrottlerGuard } from './user-throttler.guard';

/**
 * UserThrottlerGuard.getTracker is protected; expose it for testing via a subclass
 * that forwards to the protected member.
 */
class TestableGuard extends UserThrottlerGuard {
  public track(req: Record<string, any>): Promise<string> {
    return this.getTracker(req);
  }
}

describe('UserThrottlerGuard', () => {
  let guard: TestableGuard;

  beforeEach(() => {
    guard = Object.create(TestableGuard.prototype) as TestableGuard;
  });

  it('keys the rate limit by authenticated user id when present', async () => {
    const tracker = await guard.track({ user: { id: 'user-uuid' }, ip: '203.0.113.5' });
    expect(tracker).toBe('user-uuid');
  });

  it('falls back to the request IP for unauthenticated requests', async () => {
    const tracker = await guard.track({ ip: '203.0.113.5' });
    expect(tracker).toBe('203.0.113.5');
  });
});
