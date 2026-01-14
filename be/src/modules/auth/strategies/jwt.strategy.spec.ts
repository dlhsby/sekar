import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User, UserRole } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'testuser',
    password_hash: 'hashed-password',
    full_name: 'Test User',
    role: UserRole.WORKER,
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
    const module: TestingModule = await Test.createTestingModule({
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default JWT secret when not configured', async () => {
      const mockConfigWithoutSecret = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
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
      }).compile();

      const strategyWithDefault = module.get<JwtStrategy>(JwtStrategy);
      expect(strategyWithDefault).toBeDefined();
      expect(mockConfigWithoutSecret.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      username: 'testuser',
      role: UserRole.WORKER,
    };

    it('should return user if found and active', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub, is_active: true },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate with different user roles', async () => {
      const adminPayload: JwtPayload = {
        sub: 'admin-uuid-2b3c4d5e-f6a7-8901-bcde-f12345678901',
        username: 'admin',
        role: UserRole.ADMIN,
      };

      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      mockUserRepository.findOne.mockResolvedValue(adminUser);

      const result = await strategy.validate(adminPayload);

      expect(result).toEqual(adminUser);
    });

    it('should validate with supervisor role', async () => {
      const supervisorPayload: JwtPayload = {
        sub: 'supervisor-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
        username: 'supervisor',
        role: UserRole.SUPERVISOR,
      };

      const supervisorUser = { ...mockUser, role: UserRole.SUPERVISOR };
      mockUserRepository.findOne.mockResolvedValue(supervisorUser);

      const result = await strategy.validate(supervisorPayload);

      expect(result).toEqual(supervisorUser);
    });
  });
});
