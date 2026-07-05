import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/** Canonical header used to correlate a request across logs, Sentry, and clients. */
export const REQUEST_ID_HEADER = 'X-Request-ID';

/** Request augmented with the resolved correlation id. */
export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Request ID Middleware (Phase 4 §B2)
 *
 * Resolves a correlation id for every request: reuse an incoming `X-Request-ID`
 * header when present (e.g. set by an upstream proxy / mobile client), otherwise
 * generate a UUID v4. The id is attached to the request object, mirrored back onto
 * `request.headers['x-request-id']` (where `http-exception.filter` reads it for
 * Sentry tagging), and echoed on the response header so clients can correlate too.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();

    req.requestId = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
