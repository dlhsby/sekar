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
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { normalizePhone, isValidIndonesianMobile } from '../../common/utils/phone.util';
import { User } from './entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { USER_MANAGERS } from './constants/role-groups';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { UserValidationService } from './services/user-validation.service';

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
  constructor(
    private readonly usersService: UsersService,
    private readonly userAreasService: UserLocationsService,
    private readonly userValidationService: UserValidationService,
  ) {}

  /**
   * Get the authenticated user's own assigned areas (permanent + task_based).
   * Self-scoped — any authenticated worker can read their own areas (used by
   * the mobile app for multi-area geofencing + the "Jadwal Saya" screen).
   *
   * @route GET /api/users/me/areas
   */
  @Get('me/areas')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get the authenticated user's assigned areas" })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of assigned areas.' })
  getMyAreas(@GetUser() user: User) {
    return this.userAreasService.getEffectiveLocations(user.id);
  }

  /**
   * Live username availability check for the create-user form.
   * Declared before `@Get(':id')` so the literal path wins.
   *
   * @route GET /api/users/check-username?username=
   */
  @Get('check-username')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Check whether a username is available' })
  @ApiQuery({ name: 'username', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: '{ available: boolean }' })
  async checkUsername(@Query('username') username: string): Promise<{ available: boolean }> {
    if (!username || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { available: false };
    }
    return { available: await this.userValidationService.isUsernameAvailable(username) };
  }

  /**
   * Suggest a unique username derived from a full name.
   *
   * @route GET /api/users/suggest-username?full_name=
   */
  @Get('suggest-username')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Suggest a unique username from a full name' })
  @ApiQuery({ name: 'full_name', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: '{ username: string }' })
  async suggestUsername(@Query('full_name') fullName: string): Promise<{ username: string }> {
    return { username: await this.userValidationService.suggestUsername(fullName ?? '') };
  }

  /**
   * Check whether a phone number is available (it doubles as a login identifier,
   * so it must be unique). Declared before `@Get(':id')` so the literal wins.
   *
   * @route GET /api/users/check-phone?phone=&excludeUserId=
   */
  @Get('check-phone')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Check whether a phone number is available' })
  @ApiQuery({ name: 'phone', required: true })
  @ApiQuery({ name: 'excludeUserId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: '{ available: boolean }' })
  async checkPhone(
    @Query('phone') phone: string,
    @Query('excludeUserId') excludeUserId?: string,
  ): Promise<{ available: boolean }> {
    const normalized = normalizePhone(phone ?? '');
    if (!isValidIndonesianMobile(normalized)) {
      return { available: false };
    }
    return {
      available: await this.userValidationService.isPhoneAvailable(normalized, excludeUserId),
    };
  }

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
  create(@Body() createUserDto: CreateUserDto, @GetUser() actor: User) {
    return this.usersService.create(createUserDto, actor);
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
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON)
  @ApiOperation({
    summary: 'Get all users with pagination',
    description:
      'Retrieve paginated list of all users. Accessible by administrators and supervisors. Passwords are excluded.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by name or username (ILIKE)' })
  @ApiQuery({ name: 'roles', required: false, description: 'Comma-separated role codes' })
  @ApiQuery({ name: 'role', required: false, description: 'Single role code' })
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
    @Query() query: FindUsersQueryDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<User>> {
    // `roles` (comma-separated) or a single `role`; used by dropdowns to load
    // only relevant users (e.g. schedulable satgas/linmas/korlap).
    const roleList = query.roles
      ? query.roles
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
      : query.role
        ? [query.role]
        : undefined;
    return this.usersService.findAllPaginated(query.page, query.limit, user, {
      search: query.search,
      roles: roleList,
      isActive: query.is_active === undefined ? undefined : query.is_active === 'true',
    });
  }

  /**
   * Get user by ID.
   * Accessible by administrators and supervisors.
   *
   * @route GET /api/users/:id
   * Get a specific user's permanent assigned areas.
   *
   * Backs the user-management grid's Location column (summary count + slide-over
   * list) and the `useUserAreas` hook. Manager/supervisor access mirrors
   * `GET /users/:id`. Declared before `@Get(':id')` so the sub-path wins.
   *
   * @route GET /api/users/:id/areas
   */
  @Get(':id/areas')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON)
  @ApiOperation({ summary: "Get a user's permanent assigned areas" })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of assigned areas.' })
  async getUserAreas(@Param('id') id: string): Promise<Location[]> {
    const userAreas = await this.userAreasService.getPermanentLocations(id);
    return userAreas
      .map((ua) => ua.area)
      .filter((a): a is Location => Boolean(a))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * @param id - User UUID
   * @returns User entity (without password)
   * @throws NotFoundException if user not found
   */
  @Get(':id')
  @Roles(...USER_MANAGERS, UserRole.KORLAP, UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON)
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() actor: User,
  ) {
    return this.usersService.update(id, updateUserDto, actor);
  }

  /**
   * Admin password reset.
   * Generates a one-time temp password, forces a change on next login, and
   * returns the plaintext password once. Admins never type passwords.
   *
   * @route POST /api/users/:id/reset-password
   */
  @Post(':id/reset-password')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Reset a user password',
    description:
      'Generate a one-time temporary password and force the user to change it on next login. Returns the plaintext password once.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Password reset; temp password returned once.',
    schema: { example: { temp_password: 'X7k9m-Qp2rT' } },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found.' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.usersService.resetPassword(id, actor);
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
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.usersService.remove(id, actor);
  }

  /**
   * Deactivate a user (is_active=false) — distinct from delete; the account is
   * kept and can be reactivated.
   *
   * @route PATCH /api/users/:id/deactivate
   */
  @Patch(':id/deactivate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({
    summary: 'Deactivate user',
    description: 'Set is_active=false. The account is preserved and can be reactivated.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User deactivated.' })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.usersService.deactivate(id, actor);
  }

  /**
   * Reactivate a previously deactivated user (is_active=true).
   *
   * @route PATCH /api/users/:id/activate
   */
  @Patch(':id/activate')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Reactivate user', description: 'Set is_active=true.' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User reactivated.' })
  activate(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.usersService.activate(id, actor);
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
    const isAdmin = [
      UserRole.ADMIN_SYSTEM,
      UserRole.SUPERADMIN,
      UserRole.MANAGEMENT, // full admin_system parity
    ].includes(currentUser.role as UserRole);
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
