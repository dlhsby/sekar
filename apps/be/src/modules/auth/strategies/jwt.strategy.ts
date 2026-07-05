import { Injectable, HttpStatus } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ApiException } from '../../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../../common/enums/api-error-codes.enum';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET environment variable is required. Application cannot start without it.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      // Phase 4-7 (M2): need the raw token to enforce the revocation blacklist.
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User> {
    // Phase 4-7 (M2): reject access tokens revoked via logout or refresh rotation.
    // Fail-open (Redis down → not blacklisted) is intentional, matching AuthService.
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token && (await this.authService.isTokenBlacklisted(token))) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_TOKEN_INVALID,
        'Token has been revoked',
      );
    }

    const { sub } = payload;
    const user = await this.userRepository.findOne({
      where: { id: sub, is_active: true },
    });

    if (!user) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_USER_NOT_FOUND,
        'User not found or inactive',
      );
    }

    return user;
  }
}
