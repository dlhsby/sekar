import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';

describe('AuthService', () => {
  let module: TestingModule;
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: '$2b$10$hashedpassword',
    full_name: 'Test User',
    role: UserRole.SATGAS,
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
    verify: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
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

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

    it('should throw ApiException with AUTH_INVALID_CREDENTIALS code when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await service.login(loginDto);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
        expect(error.message).toContain('Invalid credentials');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_ACCOUNT_INACTIVE code when user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      try {
        await service.login(loginDto);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_ACCOUNT_INACTIVE);
        expect(error.message).toBe('User account is inactive');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_INVALID_CREDENTIALS code when password is incorrect', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      try {
        await service.login(loginDto);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
        expect(error.message).toContain('Invalid credentials');
        expect(error.getStatus()).toBe(401);
      }
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

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid.refresh.token';
    const mockPayload = {
      sub: mockUser.id,
      type: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    beforeEach(() => {
      // Setup mockJwtService to handle both sign and verify
      mockJwtService.sign = jest.fn().mockReturnValue('new.mock.token');
      mockJwtService.verify = jest.fn().mockResolvedValue(mockPayload);
    });

    it('should successfully refresh tokens and return new access and refresh tokens', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshToken(mockRefreshToken);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.username).toBe(mockUser.username);
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2); // Once for access, once for refresh
    });

    it('should throw ApiException with AUTH_TOKEN_INVALID when token type is not refresh', async () => {
      const invalidPayload = { ...mockPayload, type: 'access' as const };
      mockJwtService.verify = jest.fn().mockResolvedValue(invalidPayload);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
        expect(error.message).toContain('Invalid token type');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_USER_NOT_FOUND when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_USER_NOT_FOUND);
        expect(error.message).toContain('User not found');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_ACCOUNT_INACTIVE when user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_ACCOUNT_INACTIVE);
        expect(error.message).toContain('User account is inactive');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_TOKEN_EXPIRED when refresh token has expired', async () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      mockJwtService.verify = jest.fn().mockRejectedValue(expiredError);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_TOKEN_EXPIRED);
        expect(error.message).toContain('Refresh token has expired');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_TOKEN_INVALID when token is malformed', async () => {
      const jwtError = new Error('invalid token');
      jwtError.name = 'JsonWebTokenError';
      mockJwtService.verify = jest.fn().mockRejectedValue(jwtError);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
        expect(error.message).toContain('Invalid refresh token');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_TOKEN_INVALID when unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockJwtService.verify = jest.fn().mockRejectedValue(unexpectedError);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
        expect(error.message).toContain('Token refresh failed');
        expect(error.getStatus()).toBe(401);
      }
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

    it('should throw ApiException with AUTH_USER_NOT_FOUND code when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await service.validateUser(payload);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_USER_NOT_FOUND);
        expect(error.message).toContain('User not found');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_USER_NOT_FOUND when user is inactive', async () => {
      // When user is inactive, findOne with is_active: true returns null
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await service.validateUser(payload);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_USER_NOT_FOUND);
        expect(error.message).toContain('User not found or inactive');
      }
    });
  });

  describe('logout', () => {
    it('should log the logout event', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.logout(mockUser.id);

      expect(logSpy).toHaveBeenCalledWith(`User ${mockUser.id} logged out`);
    });

    it('should complete without errors', async () => {
      await expect(service.logout(mockUser.id)).resolves.not.toThrow();
    });
  });
});
