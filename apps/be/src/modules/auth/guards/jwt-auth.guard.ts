import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ApiException } from '../../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../../common/enums/api-error-codes.enum';
import { User } from '../../users/entities/user.entity';

/**
 * Routes an account MUST still reach while `password_must_change` is set, so it
 * can complete (change-password) or escape (logout) the forced reset, and so
 * clients can keep polling identity (`/auth/me`). Matched by path suffix to be
 * agnostic of the global `/api/v1` prefix.
 */
const PASSWORD_CHANGE_ALLOWLIST = ['/auth/change-password', '/auth/me', '/auth/logout'];

/**
 * JWT guard with forced-password-reset enforcement.
 *
 * Beyond standard JWT validation, this blocks (403) any authenticated request
 * from an account whose `password_must_change` flag is set — except the
 * allowlisted auth routes above. This is the server-side backstop for the
 * forced-reset flow that the web/mobile clients already enforce, so a direct
 * API caller cannot bypass it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = User>(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    // Preserve the base strategy's auth-failure handling (throws on no user).
    const result = super.handleRequest(err, user, info, context, status) as User;

    if (result?.password_must_change) {
      const req = context.switchToHttp().getRequest<Request>();
      const path = req.path || req.url || '';
      const allowed = PASSWORD_CHANGE_ALLOWLIST.some((suffix) => path.endsWith(suffix));
      if (!allowed) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.AUTH_PASSWORD_CHANGE_REQUIRED,
          'Anda harus mengganti kata sandi sebelum melanjutkan.',
        );
      }
    }

    return result as TUser;
  }
}
