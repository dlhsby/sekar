import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * Authorizes the CI release-publish endpoint with a shared static token sent in
 * the `X-Publish-Token` header, compared against `APP_RELEASE_PUBLISH_TOKEN`.
 *
 * Fails closed: if the token is not configured on the server, every request is
 * rejected (publishing is simply disabled rather than left open).
 */
@Injectable()
export class PublishTokenGuard implements CanActivate {
  private readonly logger = new Logger(PublishTokenGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('APP_RELEASE_PUBLISH_TOKEN');
    if (!expected) {
      this.logger.warn('Rejected publish attempt — APP_RELEASE_PUBLISH_TOKEN is not configured');
      throw new UnauthorizedException('Release publishing is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-publish-token'];
    if (!provided || typeof provided !== 'string') {
      throw new UnauthorizedException('Missing publish token');
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid publish token');
    }
    return true;
  }
}
