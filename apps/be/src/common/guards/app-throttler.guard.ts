import { Injectable, Inject } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';
import { SystemConfigService } from '../../modules/settings/services/system-config.service';

/**
 * Global rate-limit guard that resolves limits from SystemConfigService at
 * request time (DB → env → default, ADR-049), so operators can tune them in
 * System Settings without a restart. Falls back to the statically-configured
 * throttler limits on any resolution error.
 *
 * Substitution is targeted to avoid clobbering route-specific `@Throttle`:
 *   - `login`          → `ratelimit.login_per_min` (limit) + `auth.login_throttle_ttl_ms` (window)
 *   - `changePassword` → `auth.change_password_throttle_max` / `_ttl_ms`
 *   - everything else  → `ratelimit.global_per_min` (limit) + `ratelimit.global_ttl_ms`
 *     (window), but each ONLY when the incoming value still equals the module
 *     default (i.e. no route-level `@Throttle` override such as `refresh`'s
 *     10/min set it) — limit and window are guarded independently.
 *
 * Uses property injection so the parent's constructor DI (options, storage,
 * reflector) is inherited unchanged (same pattern as UserThrottlerGuard).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  @Inject(SystemConfigService)
  private readonly systemConfig!: SystemConfigService;

  protected handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    let { limit, ttl } = requestProps;
    try {
      const handler = requestProps.context.getHandler()?.name;
      if (handler === 'login') {
        limit = this.systemConfig.getNumber('ratelimit.login_per_min', limit);
        ttl = this.systemConfig.getNumber('auth.login_throttle_ttl_ms', ttl);
      } else if (handler === 'changePassword') {
        limit = this.systemConfig.getNumber('auth.change_password_throttle_max', limit);
        ttl = this.systemConfig.getNumber('auth.change_password_throttle_ttl_ms', ttl);
      } else {
        const moduleLimit = this.throttlers?.[0]?.limit;
        const moduleTtl = this.throttlers?.[0]?.ttl;
        // Limit and window are guarded independently so a route that overrides
        // only one of them still gets the runtime value for the other.
        if (typeof moduleLimit === 'number' && limit === moduleLimit) {
          limit = this.systemConfig.getNumber('ratelimit.global_per_min', limit);
        }
        if (typeof moduleTtl === 'number' && ttl === moduleTtl) {
          ttl = this.systemConfig.getNumber('ratelimit.global_ttl_ms', ttl);
        }
      }
    } catch {
      // Keep the statically-configured limits if resolution fails.
    }
    return super.handleRequest({ ...requestProps, limit, ttl });
  }
}
