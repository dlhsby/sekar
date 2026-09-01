import { Test, TestingModule } from '@nestjs/testing';
import { UserLocationsController } from './user-locations.controller';
import { UserLocationsService } from './user-locations.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('UserLocationsController', () => {
  let module: TestingModule;
  let controller: UserLocationsController;

  const mockUserAreasService = {
    getEffectiveLocations: jest.fn(),
    assignLocations: jest.fn(),
    removeAssignment: jest.fn(),
    getUsersByLocation: jest.fn(),
  };

  const mockAdmin: User = {
    id: 'admin-uuid',
    username: 'admin',
    password_hash: 'hash',
    full_name: 'Admin',
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.ADMIN_SYSTEM,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [UserLocationsController],
      providers: [{ provide: UserLocationsService, useValue: mockUserAreasService }],
    }).compile();

    controller = module.get<UserLocationsController>(UserLocationsController);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserAreas', () => {
    it('should call getEffectiveLocations with userId', async () => {
      const mockAreas = [{ id: 'area-1', name: 'Taman Bungkul' }];
      mockUserAreasService.getEffectiveLocations.mockResolvedValue(mockAreas);

      const result = await controller.getUserLocations('user-uuid-1');

      expect(result).toEqual(mockAreas);
      expect(mockUserAreasService.getEffectiveLocations).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('assignLocations', () => {
    it('should call assignLocations with userId, area_ids, and currentUser.id', async () => {
      const mockResult = [{ id: 'ua-1', user_id: 'user-uuid-1', location_id: 'area-1' }];
      mockUserAreasService.assignLocations.mockResolvedValue(mockResult);

      const result = await controller.assignLocations(
        'user-uuid-1',
        { location_ids: ['area-1', 'area-2'] },
        mockAdmin,
      );

      expect(result).toEqual(mockResult);
      expect(mockUserAreasService.assignLocations).toHaveBeenCalledWith(
        'user-uuid-1',
        ['area-1', 'area-2'],
        'admin-uuid',
      );
    });
  });

  describe('removeAssignment', () => {
    it('should call removeAssignment and return success', async () => {
      mockUserAreasService.removeAssignment.mockResolvedValue(undefined);

      const result = await controller.removeAssignment('user-uuid-1', 'area-uuid-1');

      expect(result).toEqual({ success: true });
      expect(mockUserAreasService.removeAssignment).toHaveBeenCalledWith(
        'user-uuid-1',
        'area-uuid-1',
      );
    });
  });

  describe('getAreaUsers', () => {
    it('should call getUsersByLocation with areaId', async () => {
      const mockUsers = [{ id: 'user-1', username: 'korlap1' }];
      mockUserAreasService.getUsersByLocation.mockResolvedValue(mockUsers);

      const result = await controller.getLocationUsers('area-uuid-1');

      expect(result).toEqual(mockUsers);
      expect(mockUserAreasService.getUsersByLocation).toHaveBeenCalledWith('area-uuid-1');
    });
  });
});
