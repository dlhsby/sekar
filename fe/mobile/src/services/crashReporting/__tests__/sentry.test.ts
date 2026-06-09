// @env config is build-inlined by react-native-dotenv (SENTRY_DSN_MOBILE empty in
// the test env), so the DSN path is exercised via initSentry overrides. Each case
// re-requires the module so its internal `enabled` flag starts fresh.
const mockSentry = {
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((cb: (scope: unknown) => void) => {
    const scope = { setUser: jest.fn(), setTag: jest.fn() };
    cb(scope);
  }),
};

function fresh() {
  jest.resetModules();
  jest.doMock('@sentry/react-native', () => mockSentry);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../sentry') as typeof import('../sentry');
}

describe('crashReporting/sentry (mobile)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initSentry no-ops without a DSN', () => {
    const { initSentry } = fresh();
    expect(initSentry()).toBe(false);
    expect(mockSentry.init).not.toHaveBeenCalled();
  });

  it('initSentry initializes with a DSN', () => {
    const { initSentry } = fresh();
    expect(
      initSentry({
        dsn: 'https://abc@sentry.io/1',
        release: 'sekar-mobile@1.0.0+1',
        environment: 'staging',
      }),
    ).toBe(true);
    expect(mockSentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://abc@sentry.io/1',
        release: 'sekar-mobile@1.0.0+1',
        environment: 'staging',
        tracesSampleRate: 0.1,
      }),
    );
  });

  it('initSentry defaults environment + traces rate when only a DSN is given', () => {
    const { initSentry } = fresh();
    initSentry({ dsn: 'https://abc@sentry.io/1' });
    expect(mockSentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'development', tracesSampleRate: 0.1 }),
    );
  });

  it('captureException no-ops before init', () => {
    const { captureException } = fresh();
    captureException(new Error('boom'));
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('captureException attaches context tags after init', () => {
    const { initSentry, captureException } = fresh();
    initSentry({ dsn: 'https://abc@sentry.io/1' });
    const err = new Error('boom');
    captureException(err, { userId: 'u-1', role: 'satgas', screen: 'Home' });
    expect(mockSentry.withScope).toHaveBeenCalled();
    expect(mockSentry.captureException).toHaveBeenCalledWith(err);
  });
});
