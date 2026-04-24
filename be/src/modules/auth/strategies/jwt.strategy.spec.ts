import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User, UserRole } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ApiException } from '../../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../../common/enums/api-error-codes.enum';

describe('JwtStrategy', () => {
  let module: TestingModule;
  let strategy: JwtStrategy;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'testuser',
    password_hash: 'hashed-password',
    full_name: 'Test User',
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.SATGAS,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not configured', async () => {
      const mockConfigWithoutSecret = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            {
              provide: getRepositoryToken(User),
              useValue: mockUserRepository,
            },
            {
              provide: ConfigService,
              useValue: mockConfigWithoutSecret,
            },
          ],
        }).compile(),
      ).rejects.toThrow(
        'JWT_SECRET environment variable is required. Application cannot start without it.',
      );
    });

    it('should initialize successfully when JWT_SECRET is configured', async () => {
      const mockConfigWithSecret = {
        get: jest.fn().mockReturnValue('test-secret-key'),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: getRepositoryToken(User),
            useValue: mockUserRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithSecret,
          },
        ],
      }).compile();

      const strategyWithSecret = testModule.get<JwtStrategy>(JwtStrategy);
      expect(strategyWithSecret).toBeDefined();
      expect(mockConfigWithSecret.get).toHaveBeenCalledWith('JWT_SECRET');

      await testModule.close();
    });
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      username: 'testuser',
      role: UserRole.SATGAS,
    };

    it('should return user if found and active', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub, is_active: true },
      });
    });

    it('should throw ApiException with AUTH_USER_NOT_FOUND if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await strategy.validate(payload);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_USER_NOT_FOUND);
        expect(error.message).toBe('User not found or inactive');
      }
    });

    it('should throw ApiException with AUTH_USER_NOT_FOUND if user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(null);

      try {
        await strategy.validate(payload);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.AUTH_USER_NOT_FOUND);
      }
    });

    it('should validate with different user roles', async () => {
      const adminPayload: JwtPayload = {
        sub: 'admin-uuid-2b3c4d5e-f6a7-8901-bcde-f12345678901',
        username: 'admin',
        role: UserRole.SUPERADMIN,
      };

      const adminUser = { ...mockUser, role: UserRole.SUPERADMIN };
      mockUserRepository.findOne.mockResolvedValue(adminUser);

      const result = await strategy.validate(adminPayload);

      expect(result).toEqual(adminUser);
    });

    it('should validate with supervisor role', async () => {
      const supervisorPayload: JwtPayload = {
        sub: 'supervisor-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
        username: 'supervisor',
        role: UserRole.KORLAP,
      };

      const supervisorUser = { ...mockUser, role: UserRole.KORLAP };
      mockUserRepository.findOne.mockResolvedValue(supervisorUser);

      const result = await strategy.validate(supervisorPayload);

      expect(result).toEqual(supervisorUser);
    });
  });
});
