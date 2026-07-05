import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Per-user rate-limit guard (Phase 4 §G1).
 *
 * The default `ThrottlerGuard` keys limits by IP, which a single user can bypass
 * by rotating IPs (e.g. VPN). For expensive, authenticated endpoints — export
 * (5/min) and CSV-import-commit (3/min) — limits must be keyed by user id so the
 * cap follows the account, not the connection. Falls back to IP for any request
 * without an authenticated user.
 *
 * Apply alongside a `@Throttle({ default: { limit, ttl } })` decorator and
 * `@UseGuards(UserThrottlerGuard)` on the target route handler.
 *
 * Rate-limit matrix (spec §G1):
 *   - File upload (profile picture, import): 10/min — per-IP (default guard suffices)
 *   - Export:                                 5/min — per-user (this guard)
 *   - Bulk ops (CSV import commit):           3/min — per-user (this guard)
 *   - Login:                                  5/min — per-IP (global, auth.controller)
 *   - General API:                          100/min — per-IP (global)
 *
 * NOTE: the export and CSV-import-commit endpoints are introduced in sub-phase 4-5
 * (not yet built). This guard is ready to be attached to them when they land.
 */
/** The subset of the request this guard reads to derive the rate-limit key. */
interface TrackableRequest {
  user?: { id?: string };
  ip?: string;
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: TrackableRequest): Promise<string> {
    return Promise.resolve(req.user?.id ?? req.ip ?? 'unknown');
  }
}
