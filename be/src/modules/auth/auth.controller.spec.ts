import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { WorkerAssignmentsService } from '../worker-assignments/worker-assignments.service';

describe('AuthController', () => {
  let module: TestingModule;
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: 'hashedpassword',
    full_name: 'Test User',
    role: UserRole.SATGAS,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
  };

  const mockWorkerAssignmentsService = {
    getWorkerAssignment: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: WorkerAssignmentsService,
          useValue: mockWorkerAssignmentsService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
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
    it('should return current user info without assignment for non-worker', async () => {
      const adminUser: User = {
        ...mockUser,
        role: UserRole.SUPERADMIN,
      };

      const result = await controller.getMe(adminUser);

      expect(result).toHaveProperty('id', adminUser.id);
      expect(result).toHaveProperty('username', adminUser.username);
      expect(result).toHaveProperty('full_name', adminUser.full_name);
      expect(result).toHaveProperty('role', adminUser.role);
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('assigned_area');
      expect(mockWorkerAssignmentsService.getWorkerAssignment).not.toHaveBeenCalled();
    });

    it('should return current user info with assignment for worker', async () => {
      const mockAssignment = {
        area: {
          id: 'area-uuid-123',
          name: 'Test Area',
          area_type_id: 'type-uuid-123',
          areaType: {
            id: 'type-uuid-123',
            code: 'park',
            name: 'Taman',
            description: 'Park area',
          },
          gps_lat: '-7.2905',
          gps_lng: '112.7398',
          radius_meters: '150',
          address: 'Test Address',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      mockWorkerAssignmentsService.getWorkerAssignment.mockResolvedValue(mockAssignment);

      const result = await controller.getMe(mockUser);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('username', mockUser.username);
      expect(result).toHaveProperty('full_name', mockUser.full_name);
      expect(result).toHaveProperty('role', mockUser.role);
      expect(result).not.toHaveProperty('password_hash');
      expect(result).toHaveProperty('assigned_area');
      expect(result.assigned_area).toHaveProperty('id', 'area-uuid-123');
      expect(result.assigned_area).toHaveProperty('name', 'Test Area');
      expect(mockWorkerAssignmentsService.getWorkerAssignment).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return current user info without assignment when worker has no assignment', async () => {
      mockWorkerAssignmentsService.getWorkerAssignment.mockResolvedValue(null);

      const result = await controller.getMe(mockUser);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('username', mockUser.username);
      expect(result).toHaveProperty('full_name', mockUser.full_name);
      expect(result).toHaveProperty('role', mockUser.role);
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('assigned_area');
      expect(mockWorkerAssignmentsService.getWorkerAssignment).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockUser);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
      expect(authService.logout).toHaveBeenCalledTimes(1);
    });
  });
});
