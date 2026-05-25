import { Test, TestingModule } from '@nestjs/testing';
import { UserAreasController } from './user-areas.controller';
import { UserAreasService } from './user-areas.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('UserAreasController', () => {
  let module: TestingModule;
  let controller: UserAreasController;

  const mockUserAreasService = {
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
      controllers: [UserAreasController],
      providers: [{ provide: UserAreasService, useValue: mockUserAreasService }],
    }).compile();

    controller = module.get<UserAreasController>(UserAreasController);
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
      mockUserAreasService.getEffectiveAreas.mockResolvedValue(mockAreas);

      const result = await controller.getUserAreas('user-uuid-1');

      expect(result).toEqual(mockAreas);
      expect(mockUserAreasService.getEffectiveAreas).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('assignAreas', () => {
    it('should call assignAreas with userId, area_ids, and currentUser.id', async () => {
      const mockResult = [{ id: 'ua-1', user_id: 'user-uuid-1', area_id: 'area-1' }];
      mockUserAreasService.assignAreas.mockResolvedValue(mockResult);

      const result = await controller.assignAreas(
        'user-uuid-1',
        { area_ids: ['area-1', 'area-2'] },
        mockAdmin,
      );

      expect(result).toEqual(mockResult);
      expect(mockUserAreasService.assignAreas).toHaveBeenCalledWith(
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
    it('should call getUsersByArea with areaId', async () => {
      const mockUsers = [{ id: 'user-1', username: 'korlap1' }];
      mockUserAreasService.getUsersByArea.mockResolvedValue(mockUsers);

      const result = await controller.getAreaUsers('area-uuid-1');

      expect(result).toEqual(mockUsers);
      expect(mockUserAreasService.getUsersByArea).toHaveBeenCalledWith('area-uuid-1');
    });
  });
});
