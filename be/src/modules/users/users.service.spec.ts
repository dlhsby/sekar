import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let module: TestingModule;
  let service: UsersService;
  let userRepository: Repository<User>;
  let authService: AuthService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: '$2b$10$hashedpassword',
    full_name: 'Test User',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
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
      password: 'password123',
      full_name: 'New User',
      role: UserRole.WORKER,
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

    it('should throw ConflictException if username exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow('Username already exists');
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        select: ['id', 'username', 'full_name', 'role', 'is_active', 'created_at'],
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
        select: ['id', 'username', 'full_name', 'role', 'is_active', 'created_at'],
        skip: 0,
        take: 50,
        order: { created_at: 'DESC' },
      });
    });

    it('should return paginated users with custom page and limit', async () => {
      const users = [mockUser];
      mockUserRepository.findAndCount.mockResolvedValue([users, 10]);

      const result = await service.findAllPaginated(2, 5);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(2);
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        select: ['id', 'username', 'full_name', 'role', 'is_active', 'created_at'],
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

    it('should update user password if provided', async () => {
      const updateWithPassword: UpdateUserDto = {
        password: 'newpassword123',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.update(mockUser.id, updateWithPassword);

      expect(authService.hashPassword).toHaveBeenCalledWith(updateWithPassword.password);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      await service.remove(mockUser.id);

      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        is_active: false,
      });
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
      jest.spyOn(bcrypt, 'compare').mockImplementation((password: string, hash: string) => {
        if (password === currentPassword && hash === mockUser.password_hash) {
          return Promise.resolve(true as never);
        }
        if (password === newPassword && hash === mockUser.password_hash) {
          return Promise.resolve(false as never);
        }
        return Promise.resolve(false as never);
      });
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
      jest.spyOn(bcrypt, 'compare').mockImplementation((password: string, hash: string) => {
        return Promise.resolve(true as never); // Both current and new password match
      });

      await expect(
        service.changePassword(mockUser.id, currentPassword, currentPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword(mockUser.id, currentPassword, currentPassword),
      ).rejects.toThrow('New password must be different from current password');
    });
  });
});
