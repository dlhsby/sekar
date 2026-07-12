import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { RolePermissionsService } from '../rbac/services/role-permissions.service';

describe('AuthController', () => {
  let module: TestingModule;
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: 'hashedpassword',
    full_name: 'Test User',
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.SATGAS,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
  };

  const mockUserAreasService = {
    getEffectiveLocations: jest.fn().mockResolvedValue([]),
  };

  const mockAreaRepository = {
    findOne: jest.fn(),
  };

  const mockRolePermissionsService = {
    getRolePermissionKeys: jest.fn().mockResolvedValue([]),
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
          provide: getRepositoryToken(Location),
          useValue: mockAreaRepository,
        },
        {
          provide: UserLocationsService,
          useValue: mockUserAreasService,
        },
        {
          provide: RolePermissionsService,
          useValue: mockRolePermissionsService,
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
        identifier: 'testuser',
        password: 'Password123!',
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

    it('should include phone_number and profile_picture_url in response', async () => {
      const userWithPhotoAndPhone: User = {
        ...mockUser,
        phone_number: '081234567890',
        profile_picture_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        role: UserRole.SATGAS,
      };

      const result = await controller.getMe(userWithPhotoAndPhone);

      expect(result).toHaveProperty('phone_number', '081234567890');
      expect(result).toHaveProperty(
        'profile_picture_url',
        'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      );
    });

    it('should return null for phone_number and profile_picture_url when not set', async () => {
      const userWithoutPhotoAndPhone: User = {
        ...mockUser,
        phone_number: null,
        profile_picture_url: null,
      };

      const result = await controller.getMe(userWithoutPhotoAndPhone);

      expect(result).toHaveProperty('phone_number', null);
      expect(result).toHaveProperty('profile_picture_url', null);
    });

    describe('Phase 2C: Location Assignment', () => {
      describe('Korlap with permanent location_id', () => {
        it('should return assigned_area when location_id exists and area is found', async () => {
          const korlapUser: User = {
            ...mockUser,
            role: UserRole.KORLAP,
            location_id: 'area-123',
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
              coordinates: [
                [
                  [112.733, -7.28],
                  [112.736, -7.28],
                  [112.736, -7.282],
                  [112.733, -7.282],
                  [112.733, -7.28],
                ],
              ],
            },
          };

          mockAreaRepository.findOne.mockResolvedValue(mockArea);

          const result = await controller.getMe(korlapUser);

          expect(result).toHaveProperty('id', korlapUser.id);
          expect(result).toHaveProperty('location_id', 'area-123');
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

        it('should return location_id but no assigned_area when area is deleted', async () => {
          const korlapUser: User = {
            ...mockUser,
            role: UserRole.KORLAP,
            location_id: 'deleted-area',
            rayon_id: 'rayon-456',
          };

          mockAreaRepository.findOne.mockResolvedValue(null);

          const result = await controller.getMe(korlapUser);

          expect(result).toHaveProperty('location_id', 'deleted-area');
          expect(result).toHaveProperty('rayon_id', 'rayon-456');
          expect(result).not.toHaveProperty('assigned_area');
        });
      });

      describe('Satgas/Linmas with effective-area assignment', () => {
        it('should return assigned_area from the worker effective areas', async () => {
          const satgasUser: User = {
            ...mockUser,
            id: 'satgas-123',
            role: UserRole.SATGAS,
          };

          mockUserAreasService.getEffectiveLocations.mockResolvedValue([{ id: 'area-456' }]);
          mockAreaRepository.findOne.mockResolvedValue({
            id: 'area-456',
            name: 'Taman Bungkul',
            gps_lat: -7.281234,
            gps_lng: 112.734567,
            radius_meters: 100,
            boundary_polygon: null,
          });

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
          expect(mockUserAreasService.getEffectiveLocations).toHaveBeenCalledWith('satgas-123');
          expect(mockAreaRepository.findOne).toHaveBeenCalledWith({
            where: { id: 'area-456' },
            relations: ['areaType'],
          });
        });

        it('should not return assigned_area when the worker has no effective areas', async () => {
          const satgasUser: User = {
            ...mockUser,
            id: 'satgas-no-area',
            role: UserRole.SATGAS,
          };

          mockUserAreasService.getEffectiveLocations.mockResolvedValue([]);

          const result = await controller.getMe(satgasUser);

          expect(result).not.toHaveProperty('assigned_area');
        });

        it('should not return assigned_area when the effective area no longer exists', async () => {
          const linmasUser: User = {
            ...mockUser,
            id: 'linmas-123',
            role: UserRole.LINMAS,
          };

          mockUserAreasService.getEffectiveLocations.mockResolvedValue([{ id: 'area-789' }]);
          mockAreaRepository.findOne.mockResolvedValue(null); // Location was deleted

          const result = await controller.getMe(linmasUser);

          expect(result).not.toHaveProperty('assigned_area');
        });

        it('should resolve the first effective area when several exist', async () => {
          const satgasUser: User = {
            ...mockUser,
            id: 'satgas-multi',
            role: UserRole.SATGAS,
          };

          mockUserAreasService.getEffectiveLocations.mockResolvedValue([
            { id: 'area-789' },
            { id: 'area-other' },
          ]);
          mockAreaRepository.findOne.mockResolvedValue({
            id: 'area-789',
            name: 'Taman Mayangkara',
            gps_lat: -7.285678,
            gps_lng: 112.738901,
            radius_meters: 150,
            boundary_polygon: null,
          });

          const result = await controller.getMe(satgasUser);

          expect(result).toHaveProperty('assigned_area');
          expect(result.assigned_area!.name).toBe('Taman Mayangkara');
        });
      });

      describe('Edge cases', () => {
        it('should handle user with no location_id and no effective area gracefully', async () => {
          const basicUser: User = {
            ...mockUser,
            id: 'basic-user',
            role: UserRole.SATGAS,
          };

          mockUserAreasService.getEffectiveLocations.mockResolvedValue([]);

          const result = await controller.getMe(basicUser);

          expect(result).toHaveProperty('id', 'basic-user');
          expect(result).toHaveProperty('location_id', null);
          expect(result).toHaveProperty('rayon_id', null);
          expect(result).not.toHaveProperty('assigned_area');
        });
      });
    });
  });

  describe('logout', () => {
    it('blacklists both tokens and returns success', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockUser, { refresh_token: 'rt-1' }, 'Bearer at-1');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authService.logout).toHaveBeenCalledWith(mockUser.id, 'at-1', 'rt-1');
    });

    it('still calls service when auth header is missing', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      await controller.logout(mockUser, { refresh_token: 'rt-2' }, undefined);
      expect(authService.logout).toHaveBeenCalledWith(mockUser.id, undefined, 'rt-2');
    });
  });
});
