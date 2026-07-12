import { Test, TestingModule } from '@nestjs/testing';
import { UserLocationsController } from './user-locations.controller';
import { UserLocationsService } from './user-locations.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('UserLocationsController', () => {
  let module: TestingModule;
  let controller: UserLocationsController;

  const mockUserLocationsService = {
    getEffectiveAreas: jest.fn(),
    assignAreas: jest.fn(),
    removeAssignment: jest.fn(),
    getUsersByArea: jest.fn(),
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
      providers: [{ provide: UserLocationsService, useValue: mockUserLocationsService }],
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
    it('should call getEffectiveAreas with userId', async () => {
      const mockAreas = [{ id: 'area-1', name: 'Taman Bungkul' }];
      mockUserLocationsService.getEffectiveAreas.mockResolvedValue(mockAreas);

      const result = await controller.getUserAreas('user-uuid-1');

      expect(result).toEqual(mockAreas);
      expect(mockUserLocationsService.getEffectiveAreas).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('assignAreas', () => {
    it('should call assignAreas with userId, location_ids, and currentUser.id', async () => {
      const mockResult = [{ id: 'ua-1', user_id: 'user-uuid-1', location_id: 'area-1' }];
      mockUserLocationsService.assignAreas.mockResolvedValue(mockResult);

      const result = await controller.assignAreas(
        'user-uuid-1',
        { location_ids: ['area-1', 'area-2'] },
        mockAdmin,
      );

      expect(result).toEqual(mockResult);
      expect(mockUserLocationsService.assignAreas).toHaveBeenCalledWith(
        'user-uuid-1',
        ['area-1', 'area-2'],
        'admin-uuid',
      );
    });
  });

  describe('removeAssignment', () => {
    it('should call removeAssignment and return success', async () => {
      mockUserLocationsService.removeAssignment.mockResolvedValue(undefined);

      const result = await controller.removeAssignment('user-uuid-1', 'area-uuid-1');

      expect(result).toEqual({ success: true });
      expect(mockUserLocationsService.removeAssignment).toHaveBeenCalledWith(
        'user-uuid-1',
        'area-uuid-1',
      );
    });
  });

  describe('getAreaUsers', () => {
    it('should call getUsersByArea with locationId', async () => {
      const mockUsers = [{ id: 'user-1', username: 'korlap1' }];
      mockUserLocationsService.getUsersByArea.mockResolvedValue(mockUsers);

      const result = await controller.getAreaUsers('area-uuid-1');

      expect(result).toEqual(mockUsers);
      expect(mockUserLocationsService.getUsersByArea).toHaveBeenCalledWith('area-uuid-1');
    });
  });
});
