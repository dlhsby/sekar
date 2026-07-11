import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserAreasService } from '../user-areas/user-areas.service';
import { UserValidationService } from './services/user-validation.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('UsersController', () => {
  let module: TestingModule;
  let controller: UsersController;
  let usersService: UsersService;

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

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    updateProfilePicture: jest.fn(),
  };

  const mockUserAreasService = {
    getEffectiveAreas: jest.fn().mockResolvedValue([]),
    getPermanentAreas: jest.fn().mockResolvedValue([]),
  };

  const mockUserValidationService = {
    isUsernameAvailable: jest.fn().mockResolvedValue(true),
    suggestUsername: jest.fn().mockResolvedValue('suggested_user'),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: UserAreasService,
          useValue: mockUserAreasService,
        },
        {
          provide: UserValidationService,
          useValue: mockUserValidationService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        password: 'Password123!',
        full_name: 'New User',
        role: UserRole.SATGAS,
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, mockUser);

      expect(result).toEqual(mockUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const paginatedResult = {
        data: [mockUser],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockUsersService.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 50 }, mockUser);

      expect(result).toEqual(paginatedResult);
      expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(1, 50, mockUser);
    });

    it('should pass admin_rayon user context for rayon filtering', async () => {
      const adminDataUser: User = {
        id: 'admin-data-uuid',
        username: 'admindata1',
        password_hash: 'hashedpassword',
        full_name: 'Admin Data One',
        phone_number: null,
        profile_picture_url: null,
        role: UserRole.ADMIN_RAYON,
        rayon_id: 'rayon-uuid-1',
        is_active: true,
        password_must_change: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const paginatedResult = {
        data: [mockUser],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockUsersService.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 50 }, adminDataUser);

      expect(result).toEqual(paginatedResult);
      expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(1, 50, adminDataUser);
    });

    it('should pass kepala_rayon user context for rayon filtering', async () => {
      const kepalaRayonUser: User = {
        id: 'kepala-rayon-uuid',
        username: 'kepalarayon1',
        password_hash: 'hashedpassword',
        full_name: 'Kepala Rayon One',
        phone_number: null,
        profile_picture_url: null,
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'rayon-uuid-2',
        is_active: true,
        password_must_change: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const paginatedResult = {
        data: [mockUser],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockUsersService.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 50 }, kepalaRayonUser);

      expect(result).toEqual(paginatedResult);
      expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(1, 50, kepalaRayonUser);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getUserAreas', () => {
    it("returns the user's permanent areas, sorted by name, unwrapped from UserArea", async () => {
      mockUserAreasService.getPermanentAreas.mockResolvedValue([
        { area: { id: 'a2', name: 'Taman Bungkul' } },
        { area: { id: 'a1', name: 'Jl. Ahmad Yani' } },
        { area: null }, // orphaned assignment → filtered out
      ]);

      const result = await controller.getUserAreas(mockUser.id);

      expect(mockUserAreasService.getPermanentAreas).toHaveBeenCalledWith(mockUser.id);
      expect(result.map((a) => a.name)).toEqual(['Jl. Ahmad Yani', 'Taman Bungkul']);
    });

    it('returns an empty list when the user has no permanent areas', async () => {
      mockUserAreasService.getPermanentAreas.mockResolvedValue([]);
      expect(await controller.getUserAreas(mockUser.id)).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        full_name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateUserDto, mockUser);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, updateUserDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser.id, mockUser);

      expect(usersService.remove).toHaveBeenCalledWith(mockUser.id, mockUser);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      current_password: 'oldpass123',
      new_password: 'newpass456',
    };

    it('should successfully change password', async () => {
      mockUsersService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(mockUser, changePasswordDto);

      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto.current_password,
        changePasswordDto.new_password,
      );
    });

    it('should call service with authenticated user ID', async () => {
      const authenticatedUser: User = {
        id: 'user-123',
        username: 'worker1',
        password_hash: 'hashedpassword',
        full_name: 'Worker One',
        phone_number: null,
        profile_picture_url: null,
        role: UserRole.SATGAS,
        is_active: true,
        password_must_change: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUsersService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(authenticatedUser, changePasswordDto);

      expect(usersService.changePassword).toHaveBeenCalledWith(
        authenticatedUser.id,
        changePasswordDto.current_password,
        changePasswordDto.new_password,
      );
    });
  });

  describe('uploadProfilePicture', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 100,
      buffer: Buffer.from('fake-image-data'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload profile picture for own user as base64', async () => {
      mockUsersService.updateProfilePicture.mockResolvedValue(undefined);

      const result = await controller.uploadProfilePicture(mockUser.id, mockFile, mockUser);
      const expectedBase64 = `data:image/jpeg;base64,${mockFile.buffer.toString('base64')}`;

      expect(result).toEqual({ profile_picture_url: expectedBase64 });
      expect(mockUsersService.updateProfilePicture).toHaveBeenCalledWith(
        mockUser.id,
        expectedBase64,
      );
    });

    it('should allow admin to upload for other user', async () => {
      const adminUser: User = {
        ...mockUser,
        id: 'admin-uuid',
        role: UserRole.ADMIN_SYSTEM,
      };
      mockUsersService.updateProfilePicture.mockResolvedValue(undefined);

      const result = await controller.uploadProfilePicture('other-user-uuid', mockFile, adminUser);
      const expectedBase64 = `data:image/jpeg;base64,${mockFile.buffer.toString('base64')}`;

      expect(result).toEqual({ profile_picture_url: expectedBase64 });
    });

    it('should throw ForbiddenException if non-admin uploads for another user', async () => {
      await expect(
        controller.uploadProfilePicture('other-user-uuid', mockFile, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if no file provided', async () => {
      await expect(
        controller.uploadProfilePicture(mockUser.id, null as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };
      await expect(
        controller.uploadProfilePicture(mockUser.id, invalidFile as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file exceeding 5MB', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 };
      await expect(
        controller.uploadProfilePicture(mockUser.id, largeFile as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
