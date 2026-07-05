import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { SlowQueryInterceptor } from './slow-query.interceptor';

describe('SlowQueryInterceptor', () => {
  let req: any;
  let context: ExecutionContext;
  let handler: CallHandler;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let nowSpy: jest.SpyInstance;

  const buildContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    req = { method: 'GET', originalUrl: '/api/v1/tasks' };
    context = buildContext();
    handler = { handle: () => of({ ok: true }) };
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    nowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const run = (interceptor: SlowQueryInterceptor): Promise<void> =>
    new Promise((resolve, reject) => {
      interceptor.intercept(context, handler).subscribe({ next: () => resolve(), error: reject });
    });

  it('stays silent for fast requests under the warn threshold', async () => {
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(120);
    await run(new SlowQueryInterceptor());
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('warns for requests over the warn threshold (>500ms)', async () => {
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(750);
    await run(new SlowQueryInterceptor());
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('GET /api/v1/tasks');
    expect(warnSpy.mock.calls[0][0]).toContain('750');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('errors for requests over the error threshold (>2000ms)', async () => {
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(2500);
    await run(new SlowQueryInterceptor());
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('2500');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('honors configurable thresholds from env vars', async () => {
    const original = process.env.SLOW_REQUEST_WARN_MS;
    process.env.SLOW_REQUEST_WARN_MS = '100';
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(150);
    await run(new SlowQueryInterceptor());
    expect(warnSpy).toHaveBeenCalledTimes(1);
    process.env.SLOW_REQUEST_WARN_MS = original;
  });
});
