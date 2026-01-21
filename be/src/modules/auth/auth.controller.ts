import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { WorkerAssignmentsService } from '../worker-assignments/worker-assignments.service';

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
    private readonly workerAssignmentsService: WorkerAssignmentsService,
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with username and password. Returns JWT token for API access. Rate limited to 5 attempts per minute.',
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtain a new access token using a valid refresh token. Both access and refresh tokens will be rotated for enhanced security.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refresh successful. Returns new access token, refresh token, and user information.',
    type: AuthResponseDto,
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
          username: 'worker1',
          full_name: 'Pekerja Satu',
          role: 'worker',
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
    description: 'Logout the currently authenticated user. Client must clear tokens locally after this call.',
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
  async logout(@GetUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
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
        username: 'worker1',
        full_name: 'Pekerja Satu',
        role: 'worker',
        created_at: '2026-01-07T10:00:00.000Z',
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
  async getMe(@GetUser() user: User): Promise<any> {
    const userData: any = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
    };

    // If user is a worker, include assigned area with full details
    if (user.role === 'worker') {
      const assignment = await this.workerAssignmentsService.getWorkerAssignment(user.id);

      if (assignment && assignment.area) {
        // Ensure GPS coordinates are numbers, not strings
        userData.assigned_area = {
          id: assignment.area.id,
          name: assignment.area.name,
          area_type_id: assignment.area.area_type_id,
          area_type: assignment.area.areaType
            ? {
                id: assignment.area.areaType.id,
                code: assignment.area.areaType.code,
                name: assignment.area.areaType.name,
                description: assignment.area.areaType.description,
              }
            : undefined,
          gps_lat: Number(assignment.area.gps_lat),
          gps_lng: Number(assignment.area.gps_lng),
          radius_meters: Number(assignment.area.radius_meters),
          address: assignment.area.address,
          created_at: assignment.area.created_at,
          updated_at: assignment.area.updated_at,
        };
      }
    }

    return userData;
  }
}
