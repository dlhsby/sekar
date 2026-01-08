import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: 'hashedpassword',
    full_name: 'Test User',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return result', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const expectedResult = {
        access_token: 'mock.jwt.token',
        user: {
          id: mockUser.id,
          username: mockUser.username,
          full_name: mockUser.full_name,
          role: mockUser.role,
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMe', () => {
    it('should return current user info', async () => {
      const result = await controller.getMe(mockUser);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('username', mockUser.username);
      expect(result).toHaveProperty('full_name', mockUser.full_name);
      expect(result).toHaveProperty('role', mockUser.role);
      expect(result).not.toHaveProperty('password_hash');
    });
  });
});
