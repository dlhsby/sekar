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
import { RedisService } from '../../common/services/redis.service';

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
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.SATGAS,
    is_active: true,
    password_must_change: false,
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
      identifier: 'testuser',
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
        where: { username: loginDto.identifier },
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

    it('should throw ApiException with AUTH_REFRESH_INVALID when token type is not refresh', async () => {
      const invalidPayload = { ...mockPayload, type: 'access' as const };
      mockJwtService.verify = jest.fn().mockResolvedValue(invalidPayload);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_REFRESH_INVALID);
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

    it('should throw ApiException with AUTH_REFRESH_EXPIRED when refresh token has expired', async () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      mockJwtService.verify = jest.fn().mockRejectedValue(expiredError);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_REFRESH_EXPIRED);
        expect(error.message).toContain('Refresh token has expired');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_REFRESH_INVALID when token is malformed', async () => {
      const jwtError = new Error('invalid token');
      jwtError.name = 'JsonWebTokenError';
      mockJwtService.verify = jest.fn().mockRejectedValue(jwtError);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_REFRESH_INVALID);
        expect(error.message).toContain('Invalid refresh token');
        expect(error.getStatus()).toBe(401);
      }
    });

    it('should throw ApiException with AUTH_REFRESH_INVALID when unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockJwtService.verify = jest.fn().mockRejectedValue(unexpectedError);

      try {
        await service.refreshToken(mockRefreshToken);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_REFRESH_INVALID);
        expect(error.message).toContain('Token refresh failed');
        expect(error.getStatus()).toBe(401);
      }
    });
  });

  describe('Phase 4-7 (M3a) changePassword', () => {
    const dto = { old_password: 'oldpass123', new_password: 'newpass456' };

    beforeEach(() => {
      mockJwtService.sign = jest.fn().mockReturnValue('new.token');
    });

    it('rotates tokens and clears password_must_change on success', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password_hash: 'hash',
        password_must_change: true,
      });
      mockUserRepository.save = jest.fn().mockImplementation((u) => Promise.resolve(u));
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('new.hash'));

      const result = await service.changePassword(mockUser.id, dto);

      expect(result.user.password_must_change).toBe(false);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: 'new.hash', password_must_change: false }),
      );
    });

    it('throws AUTH_INVALID_CREDENTIALS when old password is wrong', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, password_hash: 'hash' });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      try {
        await service.changePassword(mockUser.id, dto);
        fail('should have thrown');
      } catch (err) {
        expect((err as ApiException).getCode()).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
      }
    });

    it('throws AUTH_USER_NOT_FOUND when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      try {
        await service.changePassword('missing', dto);
        fail('should have thrown');
      } catch (err) {
        expect((err as ApiException).getCode()).toBe(ApiErrorCode.AUTH_USER_NOT_FOUND);
      }
    });

    it('throws AUTH_ACCOUNT_INACTIVE for inactive user', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, is_active: false });
      try {
        await service.changePassword(mockUser.id, dto);
        fail('should have thrown');
      } catch (err) {
        expect((err as ApiException).getCode()).toBe(ApiErrorCode.AUTH_ACCOUNT_INACTIVE);
      }
    });
  });

  describe('Phase 4-7 rotation + blacklist', () => {
    const buildWithRedis = async (
      redisGet: jest.Mock,
      redisSet: jest.Mock,
    ): Promise<AuthService> => {
      const decodeMock = jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 600 });
      const mod = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: mockUserRepository },
          {
            provide: JwtService,
            useValue: {
              sign: jest.fn().mockReturnValue('new.jwt.token'),
              verify: jest.fn().mockResolvedValue({ sub: mockUser.id, type: 'refresh' }),
              decode: decodeMock,
            },
          },
          {
            provide: RedisService,
            useValue: {
              getClient: () => ({ get: redisGet, set: redisSet }),
            },
          },
        ],
      }).compile();
      return mod.get(AuthService);
    };

    it('rejects a blacklisted refresh token with AUTH_REFRESH_INVALID', async () => {
      const get = jest.fn().mockResolvedValue('1');
      const set = jest.fn().mockResolvedValue('OK');
      const svc = await buildWithRedis(get, set);

      try {
        await svc.refreshToken('blacklisted.refresh.token');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        expect((err as ApiException).getCode()).toBe(ApiErrorCode.AUTH_REFRESH_INVALID);
      }
      expect(get).toHaveBeenCalledWith(expect.stringMatching(/^auth:blacklist:[0-9a-f]{64}$/));
    });

    it('blacklists the old refresh token on successful rotation', async () => {
      const get = jest.fn().mockResolvedValue(null); // not blacklisted
      const set = jest.fn().mockResolvedValue('OK');
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const svc = await buildWithRedis(get, set);

      await svc.refreshToken('valid.refresh.token');

      expect(set).toHaveBeenCalledWith(
        expect.stringMatching(/^auth:blacklist:[0-9a-f]{64}$/),
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('logout blacklists both access and refresh tokens', async () => {
      const get = jest.fn().mockResolvedValue(null);
      const set = jest.fn().mockResolvedValue('OK');
      const svc = await buildWithRedis(get, set);

      await svc.logout(mockUser.id, 'access.token', 'refresh.token');

      // Two SET calls — one per token.
      expect(set).toHaveBeenCalledTimes(2);
    });

    it('logout is a no-op for omitted tokens', async () => {
      const get = jest.fn().mockResolvedValue(null);
      const set = jest.fn().mockResolvedValue('OK');
      const svc = await buildWithRedis(get, set);

      await svc.logout(mockUser.id);
      expect(set).not.toHaveBeenCalled();
    });

    it('isTokenBlacklisted returns true when Redis says so', async () => {
      const get = jest.fn().mockResolvedValue('1');
      const set = jest.fn().mockResolvedValue('OK');
      const svc = await buildWithRedis(get, set);

      expect(await svc.isTokenBlacklisted('any.token')).toBe(true);
    });

    it('isTokenBlacklisted returns false when Redis errors (fail-open)', async () => {
      const get = jest.fn().mockRejectedValue(new Error('redis down'));
      const set = jest.fn().mockResolvedValue('OK');
      const svc = await buildWithRedis(get, set);

      expect(await svc.isTokenBlacklisted('any.token')).toBe(false);
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
