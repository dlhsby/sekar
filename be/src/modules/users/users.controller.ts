import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from './entities/user.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { User } from './entities/user.entity';
import { USER_MANAGERS } from './constants/role-groups';

/**
 * User Management Controller
 *
 * Handles HTTP requests related to user operations including
 * creation, retrieval, updating, and deletion of user records.
 *
 * All endpoints require authentication and specific role permissions.
 */
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user.
   * Only administrators can create users.
   *
   * @route POST /api/users
   * @param createUserDto - User creation data
   * @returns Created user entity (without password)
   * @throws ConflictException if username already exists
   * @throws UnauthorizedException if not admin
   */
  @Post()
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Create new user',
    description:
      'Create a new user account. Only accessible by administrators. Username must be unique.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully.',
    schema: {
      example: {
        id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
        username: 'satgas4',
        full_name: 'Pekerja Empat',
        role: 'satgas',
        is_active: true,
        created_at: '2026-01-07T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username already exists.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Username already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Admin role required.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request. Validation failed.',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Get all users with pagination.
   * Accessible by administrators and supervisors.
   *
   * @route GET /api/users
   * @param paginationDto - Pagination parameters (page, limit)
   * @returns Paginated users (without passwords)
   */
  @Get()
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA)
  @ApiOperation({
    summary: 'Get all users with pagination',
    description:
      'Retrieve paginated list of all users. Accessible by administrators and supervisors. Passwords are excluded.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users retrieved successfully with pagination.',
    schema: {
      example: {
        data: [
          {
            id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
            username: 'satgas1',
            full_name: 'Pekerja Satu',
            role: 'satgas',
            is_active: true,
            created_at: '2026-01-07T10:00:00.000Z',
          },
          {
            id: '9237ec92-08df-5d7f-b2c5-c2bdf395fb89',
            username: 'supervisor1',
            full_name: 'Supervisor Satu',
            role: 'korlap',
            is_active: true,
            created_at: '2026-01-07T10:00:00.000Z',
          },
        ],
        meta: {
          total: 250,
          page: 1,
          limit: 50,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Admin or Korlap role required.',
  })
  findAll(
    @Query() paginationDto: PaginationDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<User>> {
    return this.usersService.findAllPaginated(paginationDto.page, paginationDto.limit, user);
  }

  /**
   * Get user by ID.
   * Accessible by administrators and supervisors.
   *
   * @route GET /api/users/:id
   * @param id - User UUID
   * @returns User entity (without password)
   * @throws NotFoundException if user not found
   */
  @Get(':id')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA)
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve a specific user by their UUID. Accessible by administrators and supervisors.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully.',
    schema: {
      example: {
        id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
        username: 'satgas1',
        full_name: 'Pekerja Satu',
        role: 'satgas',
        is_active: true,
        created_at: '2026-01-07T10:00:00.000Z',
        updated_at: '2026-01-07T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with ID {id} not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Admin or Korlap role required.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Update authenticated user's own profile.
   * Accessible by all authenticated users. Only allows updating name and phone.
   *
   * @route PATCH /api/users/me
   * @param user - Authenticated user from JWT token
   * @param updateMyProfileDto - Profile data (full_name, phone_number)
   * @returns Updated user entity (without password)
   * @throws NotFoundException if user not found
   * @throws ConflictException if phone number already in use
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update own profile',
    description:
      'Update authenticated user profile. Only full_name and phone_number can be updated. All fields are optional.',
  })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully.',
    schema: {
      example: {
        id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
        username: 'satgas1',
        full_name: 'Pekerja Satu Updated',
        phone_number: '081234567890',
        profile_picture_url: null,
        role: 'satgas',
        is_active: true,
        created_at: '2026-01-07T10:00:00.000Z',
        updated_at: '2026-01-07T11:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone number already in use.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Authentication required.',
  })
  updateOwnProfile(
    @GetUser() user: User,
    @Body() updateMyProfileDto: UpdateMyProfileDto,
  ): Promise<User> {
    return this.usersService.updateOwnProfile(user.id, updateMyProfileDto);
  }

  /**
   * Update user information.
   * Only administrators can update users.
   *
   * @route PATCH /api/users/:id
   * @param id - User UUID
   * @param updateUserDto - Updated user data
   * @returns Updated user entity (without password)
   * @throws NotFoundException if user not found
   */
  @Patch(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Update user',
    description:
      'Update user information. Only accessible by administrators. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully.',
    schema: {
      example: {
        id: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
        username: 'satgas1',
        full_name: 'Pekerja Satu Updated',
        role: 'satgas',
        is_active: true,
        created_at: '2026-01-07T10:00:00.000Z',
        updated_at: '2026-01-07T11:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Admin role required.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request. Validation failed.',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Soft delete user (set is_active to false).
   * Only administrators can delete users.
   *
   * @route DELETE /api/users/:id
   * @param id - User UUID
   * @returns No content
   * @throws NotFoundException if user not found
   */
  @Delete(':id')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Delete user (soft delete)',
    description:
      'Soft delete user by setting is_active to false. Only accessible by administrators. User can no longer login but data is preserved.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully (soft delete).',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized. Admin role required.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  /**
   * Change authenticated user's password.
   * Accessible by all authenticated users (Worker, Supervisor, Admin).
   *
   * @route PATCH /api/users/me/change-password
   * @param user - Authenticated user from JWT token
   * @param changePasswordDto - Current and new password
   * @returns No content (204)
   * @throws UnauthorizedException if current password is incorrect
   * @throws BadRequestException if new password is same as current
   */
  @Post(':id/profile-picture')
  // Phase 4 §G1: file uploads capped at 10/min (per-IP via the global guard).
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Profile picture uploaded' })
  async uploadProfilePicture(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() currentUser: User,
  ): Promise<{ profile_picture_url: string }> {
    const isAdmin = [UserRole.ADMIN_SYSTEM, UserRole.SUPERADMIN].includes(
      currentUser.role as UserRole,
    );
    if (currentUser.id !== id && !isAdmin) {
      throw new ForbiddenException('You can only update your own profile picture');
    }

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    // Store as base64 data URI directly — avoids LocalStack URL accessibility issues on physical devices
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    await this.usersService.updateProfilePicture(id, base64);

    return { profile_picture_url: base64 };
  }

  @Patch('me/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Change password',
    description:
      "Change authenticated user's password. Requires current password for verification. New password must be different from current password.",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password is incorrect.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Current password is incorrect',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or new password same as current.',
    schema: {
      example: {
        statusCode: 400,
        message: 'New password must be different from current password',
        error: 'Bad Request',
      },
    },
  })
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(
      user.id,
      changePasswordDto.current_password,
      changePasswordDto.new_password,
    );
  }
}
