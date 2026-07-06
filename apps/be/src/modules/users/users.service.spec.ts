import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UserValidationService } from './services/user-validation.service';
import { User, UserRole } from './entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { AuditLogService } from '../audit/audit.service';
import { UserAreasService } from '../user-areas/user-areas.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

// bcrypt >=6 exports are non-configurable, so jest.spyOn cannot patch the real
// module; mock it so the spies attach to plain jest.fn()s instead.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let module: TestingModule;
  let service: UsersService;
  let authService: AuthService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: '$2b$10$hashedpassword',
    full_name: 'Test User',
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.SATGAS,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    softRemove: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
  } = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockUserAreasService = {
    reconcilePermanentAreas: jest.fn().mockResolvedValue({ added: [], removed: [] }),
    getPermanentAreaIds: jest.fn().mockResolvedValue([]),
    getPermanentAreaIdsForUsers: jest.fn().mockResolvedValue(new Map()),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UsersService,
        // Real instance — resolves against the same mocked repository, so the
        // pre-extraction uniqueness assertions keep exercising identical paths.
        UserValidationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: UserAreasService,
          useValue: mockUserAreasService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      password: 'Password123!',
      full_name: 'New User',
      role: UserRole.SATGAS,
    };

    it('should successfully create a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(authService.hashPassword).toHaveBeenCalledWith(createUserDto.password);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('auto-generates a temp password + forces change when none is supplied', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((u) => u as User);
      mockUserRepository.save.mockImplementation(async (u) => ({ ...(u as User), id: 'new-id' }));

      const result = await service.create({
        username: 'nopass',
        full_name: 'No Pass',
        role: UserRole.SATGAS,
      });

      expect(result.temp_password).toBeDefined();
      expect(typeof result.temp_password).toBe('string');
      // Generated password is hashed; must-change flag set.
      expect(authService.hashPassword).toHaveBeenCalledWith(result.temp_password);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password_must_change: true }),
      );
    });

    it('forces change even when an explicit password is supplied (CSV-import regression)', async () => {
      // A password an admin/CSV supplies is only a bootstrap credential — the
      // worker never chose it, so first login must still force a change. The UAT
      // outage came from persisting these as `password_must_change=false`.
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((u) => u as User);
      mockUserRepository.save.mockImplementation(async (u) => ({ ...(u as User), id: 'new-id' }));

      const result = await service.create({
        username: 'withpass',
        password: 'ImportedPass1',
        full_name: 'With Pass',
        role: UserRole.SATGAS,
      });

      // Supplied password is honoured (hashed), but change is still forced and no
      // temp password is surfaced (the admin already knows the supplied one).
      expect(authService.hashPassword).toHaveBeenCalledWith('ImportedPass1');
      expect(result.temp_password).toBeUndefined();
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password_must_change: true }),
      );
    });

    it('reconciles permanent areas from area_ids on create', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.create({
        username: 'withareas',
        full_name: 'With Areas',
        role: UserRole.SATGAS,
        area_ids: ['area-1', 'area-2'],
      });

      expect(mockUserAreasService.reconcilePermanentAreas).toHaveBeenCalledWith(
        mockUser.id,
        ['area-1', 'area-2'],
        expect.any(String),
      );
    });

    it('should throw ConflictException if username exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow('Username already exists');
    });

    it('should audit-log the creation with the acting admin as actor (4-4 C2)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      const actor = { ...mockUser, id: 'admin-actor-uuid' } as User;

      await service.create(createUserDto, actor);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'user',
          entity_id: mockUser.id,
          action: 'create',
          actor_id: 'admin-actor-uuid',
          new_value: expect.objectContaining({
            username: createUserDto.username,
            full_name: createUserDto.full_name,
            role: createUserDto.role,
          }),
        }),
      );
    });

    it('should not audit-log when the creation fails', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockAuditLogService.log).not.toHaveBeenCalled();
    });

    it('should create a user with phone_number when unique', async () => {
      const dtoWithPhone: CreateUserDto = {
        ...createUserDto,
        phone_number: '081200000099',
      };
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // phone_number check
      mockUserRepository.create.mockReturnValue({ ...mockUser, phone_number: '081200000099' });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, phone_number: '081200000099' });

      const result = await service.create(dtoWithPhone);

      expect(result.phone_number).toBe('081200000099');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { phone_number: '081200000099' },
      });
    });

    it('should throw ConflictException if phone_number already in use', async () => {
      const dtoWithPhone: CreateUserDto = {
        ...createUserDto,
        phone_number: '081200000099',
      };
      mockUserRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.username) return Promise.resolve(null);
        if (opts?.where?.phone_number) {
          return Promise.resolve({ ...mockUser, phone_number: '081200000099' });
        }
        return Promise.resolve(null);
      });

      await expect(service.create(dtoWithPhone)).rejects.toThrow(ConflictException);
      await expect(service.create(dtoWithPhone)).rejects.toThrow('Phone number already in use');
    });
  });

  describe('findByRoles', () => {
    it('should fetch active users filtered by roles', async () => {
      const users = [mockUser];
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
      };
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findByRoles(['satgas', 'linmas']);

      expect(result).toEqual(users);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.role IN (:...roles)', {
        roles: ['satgas', 'linmas'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.is_active = :isActive', {
        isActive: true,
      });
    });
  });

  describe('updateProfilePicture', () => {
    it('should update profile picture URL', async () => {
      mockUserRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

      await service.updateProfilePicture(mockUser.id, 'https://example.com/avatar.png');

      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        profile_picture_url: 'https://example.com/avatar.png',
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        select: expect.arrayContaining([
          'id',
          'username',
          'full_name',
          'role',
          'is_active',
          'area_id',
          'rayon_id',
          'created_at',
        ]),
      });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users with default values', async () => {
      const users = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAllPaginated();

      expect(result.data).toEqual(users);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        select: expect.arrayContaining([
          'id',
          'username',
          'full_name',
          'role',
          'is_active',
          'area_id',
          'rayon_id',
          'created_at',
        ]),
        skip: 0,
        take: 50,
        order: { created_at: 'DESC' },
      });
    });

    it('attaches assigned_area_count + assigned_area_ids (permanent areas) to each user', async () => {
      const users = [
        { ...mockUser, id: 'u1' },
        { ...mockUser, id: 'u2' },
      ];
      mockUserRepository.findAndCount.mockResolvedValue([users, 2]);
      mockUserAreasService.getPermanentAreaIdsForUsers.mockResolvedValue(
        new Map([
          ['u1', ['a1', 'a2', 'a3']],
          ['u2', []],
        ]),
      );

      const result = await service.findAllPaginated();

      expect(mockUserAreasService.getPermanentAreaIdsForUsers).toHaveBeenCalledWith(['u1', 'u2']);
      expect(result.data[0].assigned_area_count).toBe(3);
      expect(result.data[0].assigned_area_ids).toEqual(['a1', 'a2', 'a3']);
      expect(result.data[1].assigned_area_count).toBe(0);
      expect(result.data[1].assigned_area_ids).toEqual([]);
    });

    it('should return paginated users with custom page and limit', async () => {
      const users = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([users, 10]);

      const result = await service.findAllPaginated(2, 5);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(2);
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        select: expect.arrayContaining([
          'id',
          'username',
          'full_name',
          'role',
          'is_active',
          'area_id',
          'rayon_id',
          'created_at',
        ]),
        skip: 5,
        take: 5,
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array when no users exist', async () => {
      mockUserRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllPaginated();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should filter users by rayon for admin_data user', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid',
        username: 'admindata1',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
      };
      const users = [mockUser];
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([users, 1]),
      };
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.findAllPaginated(1, 50, adminDataUser as any);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('user.area', 'area');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(user.rayon_id = :rayonId OR area.rayon_id = :rayonId)',
        {
          rayonId: 'rayon-uuid-1',
        },
      );
    });

    it('should filter users by rayon for kepala_rayon user', async () => {
      const kepalaRayonUser = {
        id: 'kepala-rayon-uuid',
        username: 'kepalarayon1',
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'rayon-uuid-2',
      };
      const users = [mockUser];
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([users, 1]),
      };
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      await service.findAllPaginated(1, 50, kepalaRayonUser as any);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('user.area', 'area');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(user.rayon_id = :rayonId OR area.rayon_id = :rayonId)',
        {
          rayonId: 'rayon-uuid-2',
        },
      );
    });

    it('should not filter users for admin_system user', async () => {
      const adminSystemUser = {
        id: 'admin-system-uuid',
        username: 'adminsystem1',
        role: UserRole.ADMIN_SYSTEM,
      };
      const users = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([users, 1]);

      await service.findAllPaginated(1, 50, adminSystemUser as any);

      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        select: expect.arrayContaining([
          'id',
          'username',
          'full_name',
          'role',
          'is_active',
          'area_id',
          'rayon_id',
          'created_at',
        ]),
        skip: 0,
        take: 50,
        order: { created_at: 'DESC' },
      });
    });

    it('should return empty array for admin_data when no users in their rayon', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid-2',
        username: 'admindata2',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'empty-rayon-uuid',
      };
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findAllPaginated(1, 50, adminDataUser as any);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(user.rayon_id = :rayonId OR area.rayon_id = :rayonId)',
        {
          rayonId: 'empty-rayon-uuid',
        },
      );
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should return empty array for kepala_rayon when no users in their rayon', async () => {
      const kepalaRayonUser = {
        id: 'kepala-rayon-uuid-2',
        username: 'kepalarayon2',
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'empty-rayon-uuid-2',
      };
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findAllPaginated(1, 50, kepalaRayonUser as any);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(user.rayon_id = :rayonId OR area.rayon_id = :rayonId)',
        {
          rayonId: 'empty-rayon-uuid-2',
        },
      );
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should properly scope admin_data to only their rayon users', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid',
        username: 'admindata1',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
      };
      const rayon1Users = [
        { ...mockUser, id: 'user-1', username: 'worker1' },
        { ...mockUser, id: 'user-2', username: 'worker2' },
      ];
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rayon1Users, 2]),
      };
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.findAllPaginated(1, 50, adminDataUser as any);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(user.rayon_id = :rayonId OR area.rayon_id = :rayonId)',
        {
          rayonId: 'rayon-uuid-1',
        },
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const id = 'non-existent-id';
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      full_name: 'Updated Name',
    };

    it('should update a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result.full_name).toBe(updateUserDto.full_name);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should audit-log the update (4-4 C2)', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, full_name: 'Updated Name' });
      const actor = { ...mockUser, id: 'admin-actor-uuid' } as User;

      await service.update(mockUser.id, { full_name: 'Updated Name' }, actor);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: 'user',
          entity_id: mockUser.id,
          action: 'update',
          actor_id: 'admin-actor-uuid',
          new_value: { full_name: 'Updated Name' },
        }),
      );
    });

    it('should NOT change the password via the admin update path', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser });

      // `password` is no longer part of UpdateUserDto; even if forced in, it is ignored.
      await service.update(mockUser.id, { full_name: 'X' } as UpdateUserDto);

      expect(authService.hashPassword).not.toHaveBeenCalled();
    });

    it('should update phone_number when unique', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // findOne(id)
        .mockResolvedValueOnce(null); // phone duplicate check
      mockUserRepository.save.mockResolvedValue({ ...mockUser, phone_number: '081200000088' });

      const result = await service.update(mockUser.id, { phone_number: '081200000088' });

      expect(result.phone_number).toBe('081200000088');
    });

    it('should throw ConflictException if phone_number belongs to another user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // findOne(id)
        .mockResolvedValueOnce({ ...mockUser, id: 'other-user-uuid' }); // phone in use elsewhere

      await expect(service.update(mockUser.id, { phone_number: '081200000077' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating phone_number to value already on same user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce({ ...mockUser, phone_number: '081200000066' })
        .mockResolvedValueOnce({ ...mockUser, phone_number: '081200000066' }); // same user
      mockUserRepository.save.mockResolvedValue({ ...mockUser, phone_number: '081200000066' });

      const result = await service.update(mockUser.id, { phone_number: '081200000066' });

      expect(result.phone_number).toBe('081200000066');
    });

    it('reconciles permanent areas + audits a reassign when area_ids change', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser });
      mockUserAreasService.getPermanentAreaIds.mockResolvedValue(['area-old']);
      mockUserAreasService.reconcilePermanentAreas.mockResolvedValue({
        added: ['area-new'],
        removed: ['area-old'],
      });

      await service.update(mockUser.id, { area_ids: ['area-new'] });

      expect(mockUserAreasService.reconcilePermanentAreas).toHaveBeenCalledWith(
        mockUser.id,
        ['area-new'],
        expect.any(String),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'reassign' }),
      );
    });
  });

  describe('resetPassword', () => {
    it('generates a temp password, forces change, and returns it once', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser });

      const result = await service.resetPassword(mockUser.id, {
        ...mockUser,
        id: 'admin',
      } as User);

      expect(result.temp_password).toBeDefined();
      expect(authService.hashPassword).toHaveBeenCalledWith(result.temp_password);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password_must_change: true }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'reset_password' }),
      );
    });
  });

  describe('updateOwnProfile', () => {
    it('should update user full_name only', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = { full_name: 'Updated Name' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({ ...mockUser, full_name: 'Updated Name' });

      const result = await service.updateOwnProfile(mockUser.id, dto);

      expect(result.full_name).toBe('Updated Name');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should update user phone_number only', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = { phone_number: '081234567890' };
      mockUserRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id) return Promise.resolve(mockUser);
        if (opts?.where?.phone_number) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, phone_number: '081234567890' });

      const result = await service.updateOwnProfile(mockUser.id, dto);

      expect(result.phone_number).toBe('081234567890');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should update both full_name and phone_number', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = {
        full_name: 'New Name',
        phone_number: '081234567890',
      };
      mockUserRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id) return Promise.resolve(mockUser);
        if (opts?.where?.phone_number) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, ...dto });

      const result = await service.updateOwnProfile(mockUser.id, dto);

      expect(result.full_name).toBe('New Name');
      expect(result.phone_number).toBe('081234567890');
    });

    it('should trim full_name whitespace', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = { full_name: '  Trimmed Name  ' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({ ...mockUser, full_name: 'Trimmed Name' });

      const result = await service.updateOwnProfile(mockUser.id, dto);

      expect(result.full_name).toBe('Trimmed Name');
    });

    it('should throw ConflictException if phone_number already in use by another user', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = { phone_number: '081234567890' };
      const existingUser = { ...mockUser, id: 'other-uuid', phone_number: '081234567890' };
      const userWithoutPhone = { ...mockUser, phone_number: null }; // user being updated has no existing phone
      mockUserRepository.findOne.mockImplementation((opts: any) => {
        if (opts?.where?.id) return Promise.resolve(userWithoutPhone);
        if (opts?.where?.phone_number) return Promise.resolve(existingUser);
        return Promise.resolve(null);
      });

      await expect(service.updateOwnProfile(mockUser.id, dto)).rejects.toThrow(ConflictException);
      await expect(service.updateOwnProfile(mockUser.id, dto)).rejects.toThrow(
        'Phone number already in use',
      );
    });

    it('should not fail when updating phone_number to the same existing phone', async () => {
      jest.clearAllMocks();
      const userWithPhone = { ...mockUser, phone_number: '081234567890' };
      const dto: UpdateMyProfileDto = { phone_number: '081234567890' };
      mockUserRepository.findOne.mockResolvedValue(userWithPhone);
      mockUserRepository.save.mockResolvedValue(userWithPhone);

      const result = await service.updateOwnProfile(mockUser.id, dto);

      expect(result.phone_number).toBe('081234567890');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = { full_name: 'New Name' };
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateOwnProfile(mockUser.id, dto)).rejects.toThrow(NotFoundException);
    });

    it('should not allow empty/empty update', async () => {
      jest.clearAllMocks();
      const dto: UpdateMyProfileDto = {};
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.updateOwnProfile(mockUser.id, dto);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a user (softRemove → deleted_at)', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.softRemove.mockResolvedValue({ ...mockUser });

      await service.remove(mockUser.id);

      expect(mockUserRepository.softRemove).toHaveBeenCalledWith(mockUser);
    });

    it('should audit-log the delete', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.softRemove.mockResolvedValue({ ...mockUser });
      const actor = { ...mockUser, id: 'admin-actor-uuid' } as User;

      await service.remove(mockUser.id, actor);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        entity_type: 'user',
        entity_id: mockUser.id,
        action: 'delete',
        actor_id: 'admin-actor-uuid',
      });
    });
  });

  describe('deactivate / activate', () => {
    it('deactivate sets is_active=false and audits', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, is_active: true });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, is_active: false });
      const actor = { ...mockUser, id: 'admin-actor-uuid' } as User;

      await service.deactivate(mockUser.id, actor);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'deactivate', actor_id: 'admin-actor-uuid' }),
      );
    });

    it('activate sets is_active=true and audits', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, is_active: false });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, is_active: true });
      const actor = { ...mockUser, id: 'admin-actor-uuid' } as User;

      await service.activate(mockUser.id, actor);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'activate', actor_id: 'admin-actor-uuid' }),
      );
    });
  });

  describe('hardRemove', () => {
    it('should hard delete a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.remove.mockResolvedValue(mockUser);

      await service.hardRemove(mockUser.id);

      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('findByUsername', () => {
    it('should return user if found by username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null if user not found by username', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
    });
  });

  describe('changePassword', () => {
    const currentPassword = 'oldpass123';
    const newPassword = 'newpass456';
    const newPasswordHash = '$2b$10$newhashedpassword';

    beforeEach(() => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(((password: string, hash: string) => {
        if (password === currentPassword && hash === mockUser.password_hash) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }) as never);
      mockAuthService.hashPassword.mockResolvedValue(newPasswordHash);
    });

    it('should successfully change password when current password is correct', async () => {
      const userWithHash = { ...mockUser, password_hash: '$2b$10$hashedpassword' };
      mockUserRepository.findOne.mockResolvedValue(userWithHash);
      mockUserRepository.save.mockResolvedValue({
        ...userWithHash,
        password_hash: newPasswordHash,
      });

      await service.changePassword(mockUser.id, currentPassword, newPassword);

      // Verify bcrypt.compare was called twice (current password verification + new password check)
      expect(bcrypt.compare).toHaveBeenCalledTimes(2);
      expect(bcrypt.compare).toHaveBeenNthCalledWith(1, currentPassword, '$2b$10$hashedpassword');
      expect(bcrypt.compare).toHaveBeenNthCalledWith(2, newPassword, '$2b$10$hashedpassword');
      expect(authService.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          password_hash: newPasswordHash,
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent-id', currentPassword, newPassword),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.changePassword('non-existent-id', currentPassword, newPassword),
      ).rejects.toThrow('User with ID non-existent-id not found');
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.changePassword(mockUser.id, 'wrongpassword', newPassword),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(mockUser.id, 'wrongpassword', newPassword),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(((_password: string, _hash: string) => {
        return Promise.resolve(true); // Both current and new password match
      }) as never);

      await expect(
        service.changePassword(mockUser.id, currentPassword, currentPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword(mockUser.id, currentPassword, currentPassword),
      ).rejects.toThrow('New password must be different from current password');
    });
  });
});
