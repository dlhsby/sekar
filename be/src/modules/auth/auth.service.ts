import { Injectable, Logger, HttpStatus, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenPayload } from './interfaces/refresh-token-payload.interface';
import { AuthConstants } from '../../common/constants/auth.constants';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    // Phase 4-7 (M2): Optional so existing unit tests (which don't provide
    // Redis) keep working. Prod wires RedisService via CommonModule.
    @Optional() private readonly redis?: RedisService,
  ) {}

  // ─── Phase 4-7 helpers ────────────────────────────────────────────────

  /** sha256 hash of a JWT — never store raw tokens in Redis. */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Blacklist a token until its natural expiry. Computes remaining lifetime
   * from the token's `exp` claim so the Redis key auto-expires — no manual
   * cleanup. Best-effort: Redis errors are logged but do not block the call
   * (fails open to avoid lockouts during Redis blips).
   */
  private async blacklistToken(token: string): Promise<void> {
    if (!this.redis) return;
    try {
      const decoded = this.jwtService.decode(token) as { exp?: number } | null;
      if (!decoded?.exp) return;
      const ttlSec = Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
      const key = `auth:blacklist:${this.hashToken(token)}`;
      await this.redis.getClient().set(key, '1', 'EX', ttlSec);
    } catch (err) {
      this.logger.warn(`blacklistToken failed: ${(err as Error).message}`);
    }
  }

  /** Check whether a token hash has been blacklisted. Fail-open. */
  private async isBlacklisted(token: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const key = `auth:blacklist:${this.hashToken(token)}`;
      const v = await this.redis.getClient().get(key);
      return v !== null;
    } catch (err) {
      this.logger.warn(`isBlacklisted check failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Authenticate user and generate JWT tokens
   * @param loginDto Login credentials
   * @returns Authentication response with access token, refresh token, and user info
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const identifier = loginDto.identifier;
    const password = loginDto.password;

    this.logger.log(`Login attempt for identifier: ${identifier}`);

    // Detect if identifier looks like a phone number
    const isPhone = /^[+0]/.test(identifier);

    let user: User | null = null;
    if (isPhone) {
      user = await this.userRepository.findOne({
        where: { phone_number: identifier },
      });
    } else {
      user = await this.userRepository.findOne({
        where: { username: identifier },
      });
    }

    // Fallback: try the other lookup method
    if (!user) {
      user = await this.userRepository.findOne({
        where: isPhone ? { username: identifier } : { phone_number: identifier },
      });
    }

    if (!user) {
      this.logger.warn(`Login failed: User not found - ${identifier}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    if (!user.is_active) {
      this.logger.warn(`Login failed: Inactive account - ${identifier}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_ACCOUNT_INACTIVE,
        'User account is inactive',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${identifier}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    this.logger.log(`Login successful for user: ${user.username} (${user.role})`);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        area_id: user.area_id || null,
        rayon_id: user.rayon_id || null,
        kecamatan_id: user.kecamatan_id || null,
        kecamatan_name: user.kecamatan_name || null,
        phone_number: user.phone_number || null,
        profile_picture_url: user.profile_picture_url || null,
        password_must_change: user.password_must_change ?? false,
      },
    };
  }

  /**
   * Hash password using bcrypt
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AuthConstants.BCRYPT_SALT_ROUNDS);
  }

  /**
   * Validate user from JWT payload
   * @param payload JWT payload containing user information
   * @returns User entity
   * @throws UnauthorizedException if user not found or inactive
   */
  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, is_active: true },
    });

    if (!user) {
      this.logger.warn(`Token validation failed: User not found - ID: ${payload.sub}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_USER_NOT_FOUND,
        'User not found or inactive',
      );
    }

    return user;
  }

  /**
   * Refresh access token using a valid refresh token
   * @param refreshToken Refresh token from login response
   * @returns New access token and refresh token with user info
   * @throws UnauthorizedException if refresh token is invalid or expired
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      this.logger.log('Token refresh attempt');

      // Phase 4-7 (M2): blacklist check BEFORE verify — even a structurally
      // valid token must be rejected if it's been rotated or logged out.
      if (await this.isBlacklisted(refreshToken)) {
        this.logger.warn('Token refresh rejected: refresh token blacklisted');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_REFRESH_INVALID,
          'Refresh token has been invalidated',
        );
      }

      // Verify and decode the refresh token
      const payload = await this.jwtService.verify<RefreshTokenPayload>(refreshToken);

      // Validate token type
      if (payload.type !== 'refresh') {
        this.logger.warn('Token refresh failed: Invalid token type');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_REFRESH_INVALID,
          'Invalid token type',
        );
      }

      // Find and validate user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`Token refresh failed: User not found - ID: ${payload.sub}`);
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_USER_NOT_FOUND,
          'User not found',
        );
      }

      if (!user.is_active) {
        this.logger.warn(`Token refresh failed: Inactive account - ID: ${payload.sub}`);
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_ACCOUNT_INACTIVE,
          'User account is inactive',
        );
      }

      // Phase 4-7 (M2): single-use enforcement — blacklist the *old* refresh
      // token BEFORE issuing new ones. Order matters: if issuing throws, the
      // old token is already invalidated. That's the conservative direction.
      await this.blacklistToken(refreshToken);

      // Generate new tokens
      const accessToken = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);

      this.logger.log(`Token refresh successful for user: ${user.username} (${user.role})`);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          area_id: user.area_id || null,
          rayon_id: user.rayon_id || null,
          kecamatan_id: user.kecamatan_id || null,
          kecamatan_name: user.kecamatan_name || null,
          phone_number: user.phone_number || null,
          profile_picture_url: user.profile_picture_url || null,
          password_must_change: user.password_must_change ?? false,
        },
      };
    } catch (error) {
      // Handle JWT verification errors
      if (error.name === 'TokenExpiredError') {
        this.logger.warn('Token refresh failed: Refresh token expired');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_REFRESH_EXPIRED,
          'Refresh token has expired',
        );
      }

      if (error.name === 'JsonWebTokenError') {
        this.logger.warn('Token refresh failed: Invalid refresh token');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_REFRESH_INVALID,
          'Invalid refresh token',
        );
      }

      // Re-throw ApiException errors
      if (error instanceof ApiException) {
        throw error;
      }

      // Handle unexpected errors
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_REFRESH_INVALID,
        'Token refresh failed',
      );
    }
  }

  /**
   * Generate short-lived access token for API authentication
   * @param user User entity
   * @returns JWT access token (15 minutes expiration)
   */
  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as any,
    });
  }

  /**
   * Generate long-lived refresh token for obtaining new access tokens
   * @param user User entity
   * @returns JWT refresh token (7 days expiration)
   */
  private async generateRefreshToken(user: User): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
    });
  }

  /**
   * Logout user and invalidate session
   * Note: With stateless JWT, client must clear tokens locally.
   * This endpoint provides audit logging and future token blacklist support.
   * @param userId User ID from JWT
   */
  async logout(userId: string, accessToken?: string, refreshToken?: string): Promise<void> {
    this.logger.log(`User ${userId} logged out`);
    // Phase 4-7 (M2): blacklist BOTH tokens until their natural expiry so the
    // access token cannot be reused and the refresh token cannot rotate.
    if (accessToken) await this.blacklistToken(accessToken);
    if (refreshToken) await this.blacklistToken(refreshToken);
  }

  /**
   * Public blacklist probe used by `JwtStrategy` to reject revoked access
   * tokens before they reach controllers.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.isBlacklisted(token);
  }

  /**
   * Phase 4-7 (M3a, ADR-041): change password.
   *
   * Used both as a voluntary self-service action and as the forced flow after
   * an admin reset (when `password_must_change=true`). On success:
   *   - Persist the new hash.
   *   - Clear `password_must_change`.
   *   - Rotate the token pair (mirrors `refreshToken()` semantics) — issue a
   *     fresh access + refresh, return both. Caller MUST replace local tokens.
   *
   * Failure modes:
   *   - Old password mismatch → `AUTH_INVALID_CREDENTIALS` (401).
   *   - User not found / inactive → `AUTH_USER_NOT_FOUND` / `AUTH_ACCOUNT_INACTIVE`.
   */
  async changePassword(
    userId: string,
    dto: { old_password: string; new_password: string },
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_USER_NOT_FOUND,
        'User not found',
      );
    }
    if (!user.is_active) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_ACCOUNT_INACTIVE,
        'User account is inactive',
      );
    }

    const ok = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!ok) {
      this.logger.warn(`changePassword failed: wrong old password for ${user.username}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        'Old password is incorrect',
      );
    }

    user.password_hash = await this.hashPassword(dto.new_password);
    user.password_must_change = false;
    await this.userRepository.save(user);
    this.logger.log(`Password changed for ${user.username}`);

    // Rotate the token pair so the existing session (which now has stale
    // `password_must_change=true` in claims, if it was encoded) is replaced.
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        area_id: user.area_id || null,
        rayon_id: user.rayon_id || null,
        kecamatan_id: user.kecamatan_id || null,
        kecamatan_name: user.kecamatan_name || null,
        phone_number: user.phone_number || null,
        profile_picture_url: user.profile_picture_url || null,
        password_must_change: false,
      },
    };
  }
}
