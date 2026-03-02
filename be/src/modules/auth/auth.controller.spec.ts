import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Area } from '../areas/entities/area.entity';

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

  const mockScheduleRepository = {
    findOne: jest.fn(),
  };

  const mockAreaRepository = {
    findOne: jest.fn(),
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
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreaRepository,
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
    it('should return current user info for users without area assignment', async () => {
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
    });

    describe('Phase 2C: Area Assignment', () => {
      describe('Korlap with permanent area_id', () => {
        it('should return assigned_area when area_id exists and area is found', async () => {
          const korlapUser: User = {
            ...mockUser,
            role: UserRole.KORLAP,
            area_id: 'area-123',
            rayon_id: 'rayon-456',
          };

          const mockArea = {
            id: 'area-123',
            name: 'Taman Bungkul',
            gps_lat: -7.281234,
            gps_lng: 112.734567,
            radius_meters: 100,
            boundary_polygon: {
              type: 'Polygon',
              coordinates: [[[112.733, -7.280], [112.736, -7.280], [112.736, -7.282], [112.733, -7.282], [112.733, -7.280]]],
            },
          };

          mockAreaRepository.findOne.mockResolvedValue(mockArea);

          const result = await controller.getMe(korlapUser);

          expect(result).toHaveProperty('id', korlapUser.id);
          expect(result).toHaveProperty('area_id', 'area-123');
          expect(result).toHaveProperty('rayon_id', 'rayon-456');
          expect(result).toHaveProperty('assigned_area');
          expect(result.assigned_area).toEqual({
            id: 'area-123',
            name: 'Taman Bungkul',
            gps_lat: -7.281234,
            gps_lng: 112.734567,
            radius_meters: 100,
            boundary_polygon: mockArea.boundary_polygon,
            area_type: null,
          });
          expect(mockAreaRepository.findOne).toHaveBeenCalledWith({
            where: { id: 'area-123' },
            relations: ['areaType'],
          });
        });

        it('should return area_id but no assigned_area when area is deleted', async () => {
          const korlapUser: User = {
            ...mockUser,
            role: UserRole.KORLAP,
            area_id: 'deleted-area',
            rayon_id: 'rayon-456',
          };

          mockAreaRepository.findOne.mockResolvedValue(null);

          const result = await controller.getMe(korlapUser);

          expect(result).toHaveProperty('area_id', 'deleted-area');
          expect(result).toHaveProperty('rayon_id', 'rayon-456');
          expect(result).not.toHaveProperty('assigned_area');
        });
      });

      describe('Satgas/Linmas with schedule-based area', () => {
        it('should return assigned_area when active schedule exists', async () => {
          const satgasUser: User = {
            ...mockUser,
            id: 'satgas-123',
            role: UserRole.SATGAS,
          };

          const mockSchedule = {
            id: 'schedule-1',
            user_id: 'satgas-123',
            area_id: 'area-456',
            effective_date: new Date('2026-02-01'),
            end_date: null,
            area: {
              id: 'area-456',
              name: 'Taman Bungkul',
              gps_lat: -7.281234,
              gps_lng: 112.734567,
              radius_meters: 100,
              boundary_polygon: null,
            },
          };

          mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);

          const result = await controller.getMe(satgasUser);

          expect(result).toHaveProperty('assigned_area');
          expect(result.assigned_area).toEqual({
            id: 'area-456',
            name: 'Taman Bungkul',
            gps_lat: -7.281234,
            gps_lng: 112.734567,
            radius_meters: 100,
            boundary_polygon: null,
            area_type: null,
          });
          expect(mockScheduleRepository.findOne).toHaveBeenCalledWith({
            where: expect.objectContaining({
              user_id: 'satgas-123',
            }),
            relations: ['area', 'area.areaType'],
          });
        });

        it('should not return assigned_area when no schedule exists', async () => {
          const satgasUser: User = {
            ...mockUser,
            id: 'satgas-no-schedule',
            role: UserRole.SATGAS,
          };

          mockScheduleRepository.findOne.mockResolvedValue(null);

          const result = await controller.getMe(satgasUser);

          expect(result).not.toHaveProperty('assigned_area');
        });

        it('should not return assigned_area when schedule area is null', async () => {
          const linmasUser: User = {
            ...mockUser,
            id: 'linmas-123',
            role: UserRole.LINMAS,
          };

          const mockSchedule = {
            id: 'schedule-2',
            user_id: 'linmas-123',
            area_id: 'area-789',
            effective_date: new Date('2026-02-01'),
            end_date: null,
            area: null, // Area was deleted
          };

          mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);

          const result = await controller.getMe(linmasUser);

          expect(result).not.toHaveProperty('assigned_area');
        });

        it('should return assigned_area when end_date is null (ongoing schedule)', async () => {
          const satgasUser: User = {
            ...mockUser,
            id: 'satgas-ongoing',
            role: UserRole.SATGAS,
          };

          const mockSchedule = {
            id: 'schedule-3',
            user_id: 'satgas-ongoing',
            effective_date: new Date('2026-02-01'),
            end_date: null, // Ongoing schedule
            area: {
              id: 'area-789',
              name: 'Taman Mayangkara',
              gps_lat: -7.285678,
              gps_lng: 112.738901,
              radius_meters: 150,
              boundary_polygon: null,
            },
          };

          mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);

          const result = await controller.getMe(satgasUser);

          expect(result).toHaveProperty('assigned_area');
          expect(result.assigned_area!.name).toBe('Taman Mayangkara');
        });
      });

      describe('Edge cases', () => {
        it('should handle user with no area_id and no schedule gracefully', async () => {
          const basicUser: User = {
            ...mockUser,
            id: 'basic-user',
            role: UserRole.SATGAS,
          };

          mockScheduleRepository.findOne.mockResolvedValue(null);

          const result = await controller.getMe(basicUser);

          expect(result).toHaveProperty('id', 'basic-user');
          expect(result).toHaveProperty('area_id', null);
          expect(result).toHaveProperty('rayon_id', null);
          expect(result).not.toHaveProperty('assigned_area');
        });
      });
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
