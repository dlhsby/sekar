import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';

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
      select: ['id', 'username', 'full_name', 'role', 'is_active', 'created_at'],
    });
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
      select: ['id', 'username', 'full_name', 'role', 'is_active', 'created_at', 'updated_at'],
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
}
