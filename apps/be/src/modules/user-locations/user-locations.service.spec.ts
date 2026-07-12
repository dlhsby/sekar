import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserLocationsService } from './user-locations.service';
import { UserLocation } from './entities/user-location.entity';
import { Location } from '../locations/entities/location.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('UserLocationsService', () => {
  let module: TestingModule;
  let service: UserLocationsService;

  const mockUserAreaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockAreaRepo = {
    find: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    username: 'korlap1',
    role: UserRole.KORLAP,
  };

  const mockArea: Partial<Location> = {
    id: 'area-uuid-1',
    name: 'Taman Bungkul',
  };

  const mockUserArea: Partial<UserLocation> = {
    id: 'ua-uuid-1',
    user_id: 'user-uuid-1',
    location_id: 'area-uuid-1',
    assignment_type: 'permanent',
    location: mockArea as Location,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UserLocationsService,
        { provide: getRepositoryToken(UserLocation), useValue: mockUserAreaRepo },
        { provide: getRepositoryToken(Location), useValue: mockAreaRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<UserLocationsService>(UserLocationsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEffectiveAreas', () => {
    it('should return areas for user', async () => {
      mockUserAreaRepo.find.mockResolvedValue([mockUserArea]);

      const result = await service.getEffectiveAreas('user-uuid-1');

      expect(result).toEqual([mockArea]);
      expect(mockUserAreaRepo.find).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid-1' },
        relations: ['location'],
      });
    });

    it('should return empty array if no assignments', async () => {
      mockUserAreaRepo.find.mockResolvedValue([]);

      const result = await service.getEffectiveAreas('user-uuid-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPermanentAreas', () => {
    it('should return only permanent assignments', async () => {
      mockUserAreaRepo.find.mockResolvedValue([mockUserArea]);

      const result = await service.getPermanentAreas('user-uuid-1');

      expect(result).toEqual([mockUserArea]);
      expect(mockUserAreaRepo.find).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid-1', assignment_type: 'permanent' },
        relations: ['location'],
      });
    });
  });

  describe('getPermanentLocationIds', () => {
    it('should return only location_id strings', async () => {
      mockUserAreaRepo.find.mockResolvedValue([
        { location_id: 'area-uuid-1' },
        { location_id: 'area-uuid-2' },
      ]);

      const result = await service.getPermanentLocationIds('user-uuid-1');

      expect(result).toEqual(['area-uuid-1', 'area-uuid-2']);
      expect(mockUserAreaRepo.find).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid-1', assignment_type: 'permanent' },
        select: ['location_id'],
      });
    });
  });

  describe('getPermanentLocationIdsForUsers', () => {
    it('should batch-query and return a Map of user_id -> location_id[]', async () => {
      mockUserAreaRepo.find.mockResolvedValue([
        { user_id: 'user-uuid-1', location_id: 'area-uuid-1' },
        { user_id: 'user-uuid-1', location_id: 'area-uuid-2' },
        { user_id: 'user-uuid-2', location_id: 'area-uuid-3' },
      ]);

      const result = await service.getPermanentLocationIdsForUsers([
        'user-uuid-1',
        'user-uuid-2',
        'user-uuid-3',
      ]);

      expect(result.get('user-uuid-1')).toEqual(['area-uuid-1', 'area-uuid-2']);
      expect(result.get('user-uuid-2')).toEqual(['area-uuid-3']);
      expect(result.get('user-uuid-3')).toEqual([]);
      expect(mockUserAreaRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          assignment_type: 'permanent',
        }),
        select: ['user_id', 'location_id'],
      });
    });

    it('should handle empty user list and return empty Map', async () => {
      const result = await service.getPermanentLocationIdsForUsers([]);

      expect(result.size).toBe(0);
      expect(mockUserAreaRepo.find).not.toHaveBeenCalled();
    });

    it('should initialize all users with empty arrays even if no permanent areas', async () => {
      mockUserAreaRepo.find.mockResolvedValue([]);

      const result = await service.getPermanentLocationIdsForUsers(['user-uuid-1', 'user-uuid-2']);

      expect(result.get('user-uuid-1')).toEqual([]);
      expect(result.get('user-uuid-2')).toEqual([]);
      expect(result.size).toBe(2);
    });
  });

  describe('assignAreas', () => {
    it('should create new assignments', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockAreaRepo.find.mockResolvedValue([mockArea]);
      mockUserAreaRepo.findOne.mockResolvedValue(null);
      const created = { ...mockUserArea };
      mockUserAreaRepo.create.mockReturnValue(created);
      mockUserAreaRepo.save.mockResolvedValue(created);

      const result = await service.assignAreas('user-uuid-1', ['area-uuid-1'], 'admin-uuid');

      expect(result).toEqual([created]);
      expect(mockUserAreaRepo.create).toHaveBeenCalledWith({
        user_id: 'user-uuid-1',
        location_id: 'area-uuid-1',
        assignment_type: 'permanent',
        assigned_by: 'admin-uuid',
      });
    });

    it('should skip existing assignments', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockAreaRepo.find.mockResolvedValue([mockArea]);
      mockUserAreaRepo.findOne.mockResolvedValue(mockUserArea);

      const result = await service.assignAreas('user-uuid-1', ['area-uuid-1'], 'admin-uuid');

      expect(result).toEqual([mockUserArea]);
      expect(mockUserAreaRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignAreas('nonexistent', ['area-uuid-1'], 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if area not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockAreaRepo.find.mockResolvedValue([]); // No areas found

      await expect(
        service.assignAreas('user-uuid-1', ['nonexistent-area'], 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAssignment', () => {
    it('should delete assignment', async () => {
      mockUserAreaRepo.delete.mockResolvedValue({ affected: 1 });

      await service.removeAssignment('user-uuid-1', 'area-uuid-1');

      expect(mockUserAreaRepo.delete).toHaveBeenCalledWith({
        user_id: 'user-uuid-1',
        location_id: 'area-uuid-1',
        assignment_type: 'permanent',
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockUserAreaRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removeAssignment('user-uuid-1', 'nonexistent-area')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncTaskBasedLocations', () => {
    it('should remove old task-based areas and add new ones', async () => {
      mockUserAreaRepo.delete.mockResolvedValue({ affected: 2 });
      mockUserAreaRepo.findOne.mockResolvedValue(null);
      const created = { id: 'new-ua', assignment_type: 'task_based' };
      mockUserAreaRepo.create.mockReturnValue(created);
      mockUserAreaRepo.save.mockResolvedValue(created);

      await service.syncTaskBasedLocations('user-uuid-1', ['area-uuid-2']);

      expect(mockUserAreaRepo.delete).toHaveBeenCalledWith({
        user_id: 'user-uuid-1',
        assignment_type: 'task_based',
      });
      expect(mockUserAreaRepo.create).toHaveBeenCalledWith({
        user_id: 'user-uuid-1',
        location_id: 'area-uuid-2',
        assignment_type: 'task_based',
      });
    });

    it('should skip areas that already have any assignment', async () => {
      mockUserAreaRepo.delete.mockResolvedValue({ affected: 0 });
      mockUserAreaRepo.findOne.mockResolvedValue(mockUserArea); // Already exists

      await service.syncTaskBasedLocations('user-uuid-1', ['area-uuid-1']);

      expect(mockUserAreaRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getUsersByArea', () => {
    it('should return users for an area', async () => {
      const userArea = { ...mockUserArea, user: mockUser };
      mockUserAreaRepo.find.mockResolvedValue([userArea]);

      const result = await service.getUsersByArea('area-uuid-1');

      expect(result).toEqual([mockUser]);
      expect(mockUserAreaRepo.find).toHaveBeenCalledWith({
        where: { location_id: 'area-uuid-1' },
        relations: ['user'],
      });
    });
  });

  describe('isUserAssignedToArea', () => {
    it('should return true if assigned', async () => {
      mockUserAreaRepo.count.mockResolvedValue(1);

      const result = await service.isUserAssignedToArea('user-uuid-1', 'area-uuid-1');

      expect(result).toBe(true);
    });

    it('should return false if not assigned', async () => {
      mockUserAreaRepo.count.mockResolvedValue(0);

      const result = await service.isUserAssignedToArea('user-uuid-1', 'area-uuid-2');

      expect(result).toBe(false);
    });
  });
});
