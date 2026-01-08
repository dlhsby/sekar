import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Authentication Controller
 *
 * Handles HTTP requests related to user authentication including
 * login and retrieving current user information.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * User login endpoint.
   * Authenticates user and returns JWT token.
   *
   * @route POST /api/auth/login
   * @param loginDto - Login credentials (username and password)
   * @returns AuthResponseDto containing JWT token and user information
   * @throws UnauthorizedException if credentials are invalid
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with username and password. Returns JWT token for API access.',
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
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
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
    description:
      'Retrieve information about the currently authenticated user from JWT token.',
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
  async getMe(@GetUser() user: User): Promise<Partial<User>> {
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
    };
  }
}
