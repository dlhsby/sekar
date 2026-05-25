import * as Sentry from '@sentry/react-native';
import { captureException, initSentry } from '../sentry';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((cb: (scope: unknown) => void) => {
    const scope = { setUser: jest.fn(), setTag: jest.fn() };
    cb(scope);
  }),
}));

describe('crashReporting/sentry (mobile)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SENTRY_DSN_MOBILE;
    delete process.env.SENTRY_RELEASE;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
  });

  it('initSentry no-ops without DSN', () => {
    expect(initSentry()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initSentry initializes with DSN', () => {
    process.env.SENTRY_DSN_MOBILE = 'https://abc@sentry.io/1';
    process.env.SENTRY_RELEASE = 'sekar-mobile@1.0.0+1';
    process.env.SENTRY_ENVIRONMENT = 'staging';

    expect(initSentry()).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://abc@sentry.io/1',
        release: 'sekar-mobile@1.0.0+1',
        environment: 'staging',
        tracesSampleRate: 0.1,
      }),
    );
  });

  it('initSentry falls back to 0.1 when traces rate env is non-numeric', () => {
    process.env.SENTRY_DSN_MOBILE = 'https://abc@sentry.io/1';
    process.env.SENTRY_TRACES_SAMPLE_RATE = 'not-a-number';
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ tracesSampleRate: 0.1 }),
    );
  });

  it('captureException no-ops without DSN', () => {
    captureException(new Error('boom'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('captureException attaches context tags', () => {
    process.env.SENTRY_DSN_MOBILE = 'https://abc@sentry.io/1';
    const err = new Error('boom');
    captureException(err, { userId: 'u-1', role: 'satgas', screen: 'Home' });
    expect(Sentry.withScope).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
