import { RequestIdMiddleware, REQUEST_ID_HEADER } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    req = { headers: {} };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('generates a UUID v4 request id when no header is present', () => {
    middleware.use(req, res, next);

    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses an incoming X-Request-ID header verbatim', () => {
    req.headers['x-request-id'] = 'client-supplied-id-123';

    middleware.use(req, res, next);

    expect(req.requestId).toBe('client-supplied-id-123');
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'client-supplied-id-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('mirrors the resolved id back onto the request headers for downstream readers', () => {
    middleware.use(req, res, next);

    // http-exception.filter reads request.headers['x-request-id'] for Sentry tagging
    expect(req.headers['x-request-id']).toBe(req.requestId);
  });
});
