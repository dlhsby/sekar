import * as Sentry from '@sentry/node';
import { captureException, initSentry } from './sentry';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: jest.fn((cb: (scope: unknown) => void) => {
    const scope = {
      setUser: jest.fn(),
      setTag: jest.fn(),
    };
    cb(scope);
  }),
}));

jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(() => ({})),
}));

describe('Sentry wrapper', () => {
  const origDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    jest.clearAllMocks();
    if (origDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = origDsn;
    delete process.env.SENTRY_RELEASE;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
  });

  describe('initSentry', () => {
    it('is a no-op when SENTRY_DSN is unset', () => {
      delete process.env.SENTRY_DSN;
      expect(initSentry()).toBe(false);
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('initializes when SENTRY_DSN is present', () => {
      process.env.SENTRY_DSN = 'https://abc@sentry.io/1';
      process.env.SENTRY_RELEASE = 'sekar-be@1.0.0';
      process.env.SENTRY_ENVIRONMENT = 'staging';

      expect(initSentry()).toBe(true);
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://abc@sentry.io/1',
          release: 'sekar-be@1.0.0',
          environment: 'staging',
          tracesSampleRate: 0.1,
        }),
      );
    });

    it('falls back to 0.1 traces rate when env value is non-numeric', () => {
      process.env.SENTRY_DSN = 'https://abc@sentry.io/1';
      process.env.SENTRY_TRACES_SAMPLE_RATE = 'not-a-number';
      initSentry();
      expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ tracesSampleRate: 0.1 }));
    });

    it('uses NODE_ENV when SENTRY_ENVIRONMENT is unset', () => {
      process.env.SENTRY_DSN = 'https://abc@sentry.io/1';
      delete process.env.SENTRY_ENVIRONMENT;
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      try {
        initSentry();
        expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'test' }));
      } finally {
        process.env.NODE_ENV = origNodeEnv;
      }
    });
  });

  describe('captureException', () => {
    it('is a no-op when SENTRY_DSN is unset', () => {
      delete process.env.SENTRY_DSN;
      captureException(new Error('boom'));
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('captures with user + tags when DSN present and context given', () => {
      process.env.SENTRY_DSN = 'https://abc@sentry.io/1';
      const err = new Error('boom');
      captureException(err, {
        userId: 'u-1',
        role: 'satgas',
        requestId: 'rq-1',
        route: '/api/v1/x',
      });
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    it('captures without context when none provided', () => {
      process.env.SENTRY_DSN = 'https://abc@sentry.io/1';
      const err = new Error('boom');
      captureException(err);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });
  });
});
