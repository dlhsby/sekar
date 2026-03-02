import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenPayload } from './interfaces/refresh-token-payload.interface';
import { AuthConstants } from '../../common/constants/auth.constants';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate user and generate JWT tokens
   * @param loginDto Login credentials
   * @returns Authentication response with access token, refresh token, and user info
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    this.logger.log(`Login attempt for username: ${username}`);

    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found - ${username}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    if (!user.is_active) {
      this.logger.warn(`Login failed: Inactive account - ${username}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_ACCOUNT_INACTIVE,
        'User account is inactive',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${username}`);
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    this.logger.log(`Login successful for user: ${username} (${user.role})`);

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

      // Verify and decode the refresh token
      const payload = await this.jwtService.verify<RefreshTokenPayload>(refreshToken);

      // Validate token type
      if (payload.type !== 'refresh') {
        this.logger.warn('Token refresh failed: Invalid token type');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_TOKEN_INVALID,
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
        },
      };
    } catch (error) {
      // Handle JWT verification errors
      if (error.name === 'TokenExpiredError') {
        this.logger.warn('Token refresh failed: Refresh token expired');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_TOKEN_EXPIRED,
          'Refresh token has expired',
        );
      }

      if (error.name === 'JsonWebTokenError') {
        this.logger.warn('Token refresh failed: Invalid refresh token');
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          ApiErrorCode.AUTH_TOKEN_INVALID,
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
        ApiErrorCode.AUTH_TOKEN_INVALID,
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
  async logout(userId: string): Promise<void> {
    this.logger.log(`User ${userId} logged out`);
    // Future: Add token to blacklist for immediate invalidation
    // Future: Clear refresh token from database if stored
  }
}
