import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: '$2b$10$hashedpassword',
    full_name: 'Test User',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'password123',
    };

    it('should successfully login and return JWT token', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.user.username).toBe(mockUser.username);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: loginDto.username },
      });
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'password123';
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedpassword'));

      const result = await service.hashPassword(password);

      expect(result).toBe('hashedpassword');
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('validateUser', () => {
    const payload = {
      sub: mockUser.id,
      username: mockUser.username,
      role: mockUser.role,
    };

    it('should validate and return user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub, is_active: true },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(payload)).rejects.toThrow(
        'User not found',
      );
    });
  });
});
