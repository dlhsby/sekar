import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthConstants } from '../../common/constants/auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate user and generate JWT token
   * @param loginDto Login credentials
   * @returns Authentication response with token and user info
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
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      this.logger.warn(`Login failed: Inactive account - ${username}`);
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${username}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.log(`Login successful for user: ${username} (${user.role})`);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
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
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
