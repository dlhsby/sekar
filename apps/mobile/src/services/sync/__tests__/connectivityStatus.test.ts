import { ConnectivityMonitor } from '../connectivityStatus';

// Capture NetInfo subscribers so the spec can drive them deterministically.
type NetInfoListener = (state: { isConnected: boolean }) => void;
const netInfoListeners: NetInfoListener[] = [];

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (cb: NetInfoListener) => {
      netInfoListeners.push(cb);
      return () => {
        const i = netInfoListeners.indexOf(cb);
        if (i >= 0) netInfoListeners.splice(i, 1);
      };
    },
  },
}));

const emitNetInfo = (connected: boolean) => {
  netInfoListeners.forEach((l) => l({ isConnected: connected }));
};

// Flush microtasks so cascaded await chains (fetch → res.json → setStatus → listeners)
// settle before the assertion runs.
const flushPromises = async (ticks = 6) => {
  for (let i = 0; i < ticks; i++) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const okHealth = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'ok' }),
  } as Response);

const degradedHealth = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'degraded' }),
  } as Response);

const non2xxHealth = () =>
  Promise.resolve({
    ok: false,
    status: 503,
    json: () => Promise.resolve({ status: 'degraded' }),
  } as Response);

describe('ConnectivityMonitor', () => {
  beforeEach(() => {
    netInfoListeners.length = 0;
  });

  it('starts ONLINE when NetInfo is connected and health is ok', async () => {
    const fetchFn = jest.fn(okHealth) as unknown as typeof fetch;
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn,
    });
    const events: string[] = [];
    monitor.subscribe((s) => events.push(s.status));

    monitor.start();
    // Flush microtasks for the async evaluate()
    await flushPromises();

    expect(events).toEqual(['ONLINE']);
    expect(fetchFn).toHaveBeenCalledWith(
      'http://test/health/ready',
      expect.objectContaining({ method: 'GET' }),
    );
    monitor.stop();
  });

  it('transitions to NO_INTERNET when NetInfo reports disconnected', async () => {
    const fetchFn = jest.fn(okHealth) as unknown as typeof fetch;
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn,
    });
    const events: string[] = [];
    monitor.subscribe((s) => events.push(s.status));
    monitor.start();
    await flushPromises();

    emitNetInfo(false);
    await flushPromises();

    expect(events).toContain('NO_INTERNET');
    expect(monitor.snapshot().status).toBe('NO_INTERNET');
    monitor.stop();
  });

  it('transitions to SERVER_UNREACHABLE when health returns non-2xx', async () => {
    const fetchFn = jest.fn(non2xxHealth) as unknown as typeof fetch;
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn,
    });
    monitor.start();
    await flushPromises();

    expect(monitor.snapshot().status).toBe('SERVER_UNREACHABLE');
    expect(monitor.snapshot().lastHealthError).toMatch(/health 503/);
    monitor.stop();
  });

  it('treats degraded health body as SERVER_UNREACHABLE', async () => {
    const fetchFn = jest.fn(degradedHealth) as unknown as typeof fetch;
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn,
    });
    monitor.start();
    await flushPromises();

    expect(monitor.snapshot().status).toBe('SERVER_UNREACHABLE');
    monitor.stop();
  });

  it('treats fetch rejection as SERVER_UNREACHABLE', async () => {
    const fetchFn = jest.fn(() => Promise.reject(new Error('timeout')));
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    monitor.start();
    await flushPromises();

    expect(monitor.snapshot().status).toBe('SERVER_UNREACHABLE');
    expect(monitor.snapshot().lastHealthError).toMatch(/timeout/);
    monitor.stop();
  });

  it('subscribe yields the current snapshot immediately', () => {
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn: jest.fn(okHealth) as unknown as typeof fetch,
    });
    const snap = jest.fn();
    monitor.subscribe(snap);
    expect(snap).toHaveBeenCalledTimes(1);
    expect(snap.mock.calls[0][0].status).toBe('ONLINE');
  });

  it('refresh() forces a re-evaluation', async () => {
    let healthOk = true;
    const fetchFn = jest.fn(() => (healthOk ? okHealth() : non2xxHealth()));
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    monitor.start();
    await flushPromises();
    expect(monitor.snapshot().status).toBe('ONLINE');

    healthOk = false;
    await monitor.refresh();
    await Promise.resolve();
    expect(monitor.snapshot().status).toBe('SERVER_UNREACHABLE');
    monitor.stop();
  });

  it('stop() is idempotent', () => {
    const monitor = new ConnectivityMonitor({
      healthUrl: 'http://test/health/ready',
      fetchFn: jest.fn(okHealth) as unknown as typeof fetch,
    });
    monitor.start();
    monitor.stop();
    expect(() => monitor.stop()).not.toThrow();
  });
});
