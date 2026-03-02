import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create a new user
   * @param createUserDto User creation data
   * @returns Created user entity
   * @throws ConflictException if username already exists
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, full_name, role } = createUserDto;

    this.logger.log(`Creating new user: ${username}`);

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      this.logger.warn(`User creation failed: Username already exists - ${username}`);
      throw new ConflictException('Username already exists');
    }

    const password_hash = await this.authService.hashPassword(password);

    const user = this.userRepository.create({
      username,
      password_hash,
      full_name,
      role,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created successfully: ${username} (ID: ${savedUser.id})`);

    return savedUser;
  }

  /**
   * Find all users (without sensitive data)
   * @returns Array of users
   */
  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    return this.userRepository.find({
      select: [
        'id',
        'username',
        'full_name',
        'role',
        'is_active',
        'area_id',
        'rayon_id',
        'created_at',
      ],
    });
  }

  /**
   * Find users by roles
   * @param roles Array of user roles to filter by
   * @returns Array of users with specified roles
   */
  async findByRoles(roles: string[]): Promise<User[]> {
    this.logger.log(`Fetching users by roles: ${roles.join(', ')}`);
    return this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.full_name', 'user.role', 'user.is_active'])
      .where('user.role IN (:...roles)', { roles })
      .andWhere('user.is_active = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Find all users with pagination (without sensitive data)
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Paginated users
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 50,
    requestingUser?: User,
  ): Promise<PaginatedResponseDto<User>> {
    this.logger.log(`Fetching users with pagination: page=${page}, limit=${limit}`);

    // Rayon-scoped roles see only users in their rayon
    if (
      requestingUser &&
      (requestingUser.role === UserRole.ADMIN_DATA ||
        requestingUser.role === UserRole.KEPALA_RAYON) &&
      requestingUser.rayon_id
    ) {
      const qb = this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.area', 'area')
        .select([
          'user.id',
          'user.username',
          'user.full_name',
          'user.role',
          'user.is_active',
          'user.area_id',
          'user.rayon_id',
          'user.created_at',
        ])
        .where('area.rayon_id = :rayonId', { rayonId: requestingUser.rayon_id })
        .orderBy('user.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      return new PaginatedResponseDto(data, total, page, limit);
    }

    const [data, total] = await this.userRepository.findAndCount({
      select: [
        'id',
        'username',
        'full_name',
        'role',
        'is_active',
        'area_id',
        'rayon_id',
        'created_at',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Find user by ID
   * @param id User ID (UUID)
   * @returns User entity
   * @throws NotFoundException if user not found
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'full_name',
        'role',
        'is_active',
        'area_id',
        'rayon_id',
        'created_at',
        'updated_at',
      ],
    });

    if (!user) {
      this.logger.warn(`User not found: ID ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find user by username
   * @param username Username to search for
   * @returns User entity or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  /**
   * Update user information
   * @param id User ID (UUID)
   * @param updateUserDto Updated user data
   * @returns Updated user entity
   * @throws NotFoundException if user not found
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user: ID ${id}`);
    const user = await this.findOne(id);

    const { password, ...updateData } = updateUserDto;

    if (password) {
      const password_hash = await this.authService.hashPassword(password);
      Object.assign(user, { ...updateData, password_hash });
      this.logger.log(`Password updated for user: ID ${id}`);
    } else {
      Object.assign(user, updateData);
    }

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User updated successfully: ID ${id}`);

    return savedUser;
  }

  /**
   * Soft delete user (set is_active to false)
   * @param id User ID (UUID)
   * @throws NotFoundException if user not found
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Soft deleting user: ID ${id}`);
    const user = await this.findOne(id);
    user.is_active = false;
    await this.userRepository.save(user);
    this.logger.log(`User soft deleted: ID ${id}`);
  }

  /**
   * Hard delete user (permanently remove from database)
   * For testing purposes only
   * @param id User ID (UUID)
   * @throws NotFoundException if user not found
   */
  async hardRemove(id: string): Promise<void> {
    this.logger.warn(`Hard deleting user: ID ${id}`);
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    this.logger.warn(`User hard deleted: ID ${id}`);
  }

  /**
   * Change user password
   * @param userId User ID (UUID)
   * @param currentPassword Current password for verification
   * @param newPassword New password to set
   * @throws NotFoundException if user not found
   * @throws UnauthorizedException if current password is incorrect
   * @throws BadRequestException if new password is same as current
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    this.logger.log(`Password change attempt for user: ID ${userId}`);

    // Find user with password hash
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'password_hash', 'is_active'],
    });

    if (!user) {
      this.logger.warn(`Password change failed: User not found - ID ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      this.logger.warn(`Password change failed: Incorrect current password - ID ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Ensure new password is different from current (additional check beyond DTO validation)
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      this.logger.warn(`Password change failed: New password same as current - ID ${userId}`);
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update password
    const newPasswordHash = await this.authService.hashPassword(newPassword);
    user.password_hash = newPasswordHash;
    await this.userRepository.save(user);

    this.logger.log(`Password changed successfully for user: ID ${userId}`);
  }
}
