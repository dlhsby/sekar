import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let req: any;
  let res: any;
  let context: ExecutionContext;
  let handler: CallHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    req = {
      method: 'POST',
      originalUrl: '/api/v1/shifts/clock-in',
      headers: { 'x-request-id': 'req-123', 'user-agent': 'SekarMobile/1.0' },
      requestId: 'req-123',
      user: { id: 'user-uuid', role: 'satgas' },
      body: { password: 'secret', latitude: -7.25, longitude: 112.75 },
    };
    res = { statusCode: 201 };
    context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
    handler = { handle: () => of({ ok: true }) };
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('logs one structured line per request with the required fields', (done) => {
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const payload = JSON.parse(logSpy.mock.calls[0][0]);
        expect(payload).toMatchObject({
          requestId: 'req-123',
          method: 'POST',
          url: '/api/v1/shifts/clock-in',
          userId: 'user-uuid',
          role: 'satgas',
          statusCode: 201,
          userAgent: 'SekarMobile/1.0',
        });
        expect(typeof payload.responseTime).toBe('number');
        expect(typeof payload.timestamp).toBe('string');
        done();
      },
      error: done,
    });
  });

  it('never logs request bodies / PII (passwords, GPS)', (done) => {
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        const raw = logSpy.mock.calls[0][0];
        expect(raw).not.toContain('secret');
        expect(raw).not.toContain('112.75');
        expect(raw).not.toContain('body');
        done();
      },
      error: done,
    });
  });

  it('skips logging for health probe endpoints', (done) => {
    req.originalUrl = '/api/v1/health/live';
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(logSpy).not.toHaveBeenCalled();
        done();
      },
      error: done,
    });
  });

  it('falls back gracefully when there is no authenticated user', (done) => {
    delete req.user;
    interceptor.intercept(context, handler).subscribe({
      next: () => {
        const payload = JSON.parse(logSpy.mock.calls[0][0]);
        expect(payload.userId).toBeUndefined();
        expect(payload.role).toBeUndefined();
        done();
      },
      error: done,
    });
  });
});
