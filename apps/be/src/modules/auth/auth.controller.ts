import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { RolePermissionsService } from '../rbac/services/role-permissions.service';

/**
 * Authentication Controller
 *
 * Handles HTTP requests related to user authentication including
 * login and retrieving current user information.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Location)
    private readonly areaRepository: Repository<Location>,
    private readonly userAreasService: UserLocationsService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  /**
   * User login endpoint.
   * Authenticates user and returns JWT token.
   * Rate limited to 5 attempts per minute to prevent brute force attacks.
   *
   * @route POST /api/auth/login
   * @param loginDto - Login credentials (username and password)
   * @returns AuthResponseDto containing JWT token and user information
   * @throws UnauthorizedException if credentials are invalid
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Env-driven so dev/e2e can raise or disable the limit (default 5/min for prod safety).
  @Throttle({
    default: {
      limit: parseInt(process.env.AUTH_LOGIN_THROTTLE_LIMIT || '5', 10),
      ttl: parseInt(process.env.AUTH_LOGIN_THROTTLE_TTL || '60000', 10),
    },
  })
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with username and password. Returns JWT token for API access. Rate limited to 5 attempts per minute.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns JWT token and user information.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid credentials or inactive account.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed.',
    schema: {
      example: {
        statusCode: 400,
        message: ['username is required', 'password must be at least 6 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Rate limit exceeded (5 attempts per minute).',
    schema: {
      example: {
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Refresh access token using a valid refresh token.
   * Returns new access token and refresh token.
   *
   * @route POST /api/auth/refresh
   * @param refreshTokenDto - Contains the refresh token
   * @returns AuthResponseDto containing new tokens and user information
   * @throws UnauthorizedException if refresh token is invalid or expired
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute to prevent brute-force
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtain a new access token using a valid refresh token. Both access and refresh tokens will be rotated for enhanced security.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description:
      'Token refresh successful. Returns new access token, refresh token, and user information.',
    type: AuthResponseDto,
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
          username: 'satgas1',
          full_name: 'Pekerja Satu',
          role: 'satgas',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or expired refresh token.',
    schema: {
      example: {
        statusCode: 401,
        code: 'AUTH_INVALID_TOKEN',
        message: 'Invalid refresh token',
        timestamp: '2026-01-16T10:30:00.000Z',
        path: '/api/v1/auth/refresh',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed.',
    schema: {
      example: {
        statusCode: 400,
        message: ['refresh_token is required', 'refresh_token must be a string'],
        error: 'Bad Request',
      },
    },
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  /**
   * Logout user and invalidate session.
   * Client must clear tokens locally after calling this endpoint.
   *
   * @route POST /api/auth/logout
   * @param user - Current authenticated user (injected from JWT)
   * @returns Success message
   * @throws UnauthorizedException if token is invalid or missing
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout the currently authenticated user. Client must clear tokens locally after this call.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful.',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing JWT token.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiBody({ type: LogoutDto })
  async logout(
    @GetUser() user: User,
    @Body() dto: LogoutDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<{ message: string }> {
    // Phase 4-7 (M2): logout now requires `{ refresh_token }` so both tokens
    // can be blacklisted. Access token is extracted from the bearer header.
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    await this.authService.logout(user.id, accessToken, dto.refresh_token);
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({
    default: {
      limit: parseInt(process.env.AUTH_CHANGE_PASSWORD_THROTTLE_LIMIT || '3', 10),
      ttl: parseInt(process.env.AUTH_CHANGE_PASSWORD_THROTTLE_TTL || '60000', 10),
    },
  })
  @ApiOperation({
    summary: 'Change password',
    description:
      "Change the authenticated user's password. Used for both voluntary change and the forced flow after admin reset (ADR-041, Phase 4-7). Returns new access + refresh tokens — client must replace local tokens with these. Clears `password_must_change`.",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed; new token pair returned.' })
  @ApiResponse({ status: 401, description: 'Old password incorrect or session invalid.' })
  async changePassword(
    @GetUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    return this.authService.changePassword(user.id, dto);
  }

  /**
   * Get current authenticated user information.
   *
   * @route GET /api/auth/me
   * @param user - Current authenticated user (injected from JWT)
   * @returns Partial user information (excludes password)
   * @throws UnauthorizedException if token is invalid or missing
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieve information about the currently authenticated user from JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully.',
    schema: {
      example: {
        id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
        username: 'satgas1',
        full_name: 'Pekerja Satu',
        phone_number: '081234567890',
        profile_picture_url: null,
        role: 'satgas',
        created_at: '2026-01-07T10:00:00.000Z',
        password_must_change: false,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing JWT token.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  async getMe(@GetUser() user: User): Promise<MeResponseDto> {
    const userData: MeResponseDto = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      phone_number: user.phone_number || null,
      profile_picture_url: user.profile_picture_url || null,
      role: user.role,
      location_id: user.location_id || null,
      rayon_id: user.rayon_id || null,
      kecamatan_id: user.kecamatan_id || null,
      kecamatan_name: user.kecamatan_name || null,
      created_at: user.created_at,
      password_must_change: user.password_must_change ?? false,
      permissions: await this.rolePermissions.getRolePermissionKeys(user.role),
    };

    // Include area info for field roles
    // Phase 2C: Check both User.location_id (korlap permanent assignment)
    // and active Schedule (satgas/linmas date-based assignment)
    if (user.location_id) {
      // Korlap with permanent area assignment
      userData.location_id = user.location_id;
      userData.rayon_id = user.rayon_id ?? null;

      // Fetch full area details for clock-in/out
      const area = await this.areaRepository.findOne({
        where: { id: user.location_id },
        relations: ['areaType'],
      });
      if (area) {
        userData.assigned_area = {
          id: area.id,
          name: area.name,
          gps_lat: area.gps_lat,
          gps_lng: area.gps_lng,
          radius_meters: area.radius_meters,
          boundary_polygon: area.boundary_polygon || null,
          area_type: area.areaType ? { id: area.areaType.id, name: area.areaType.name } : null,
        };
      }
    } else {
      // Satgas/Linmas: resolve the assigned area from the worker's effective
      // areas (permanent user_areas ∪ task-based). ADR-013 made the user the
      // source of truth, replacing the legacy date-based schedules lookup.
      const effective = await this.userAreasService.getEffectiveLocations(user.id);
      const primary = effective[0];
      if (primary) {
        const area = await this.areaRepository.findOne({
          where: { id: primary.id },
          relations: ['areaType'],
        });
        if (area) {
          userData.location_id = area.id;
          userData.assigned_area = {
            id: area.id,
            name: area.name,
            gps_lat: area.gps_lat,
            gps_lng: area.gps_lng,
            radius_meters: area.radius_meters,
            boundary_polygon: area.boundary_polygon || null,
            area_type: area.areaType ? { id: area.areaType.id, name: area.areaType.name } : null,
          };
        }
      }
    }

    return userData;
  }
}
