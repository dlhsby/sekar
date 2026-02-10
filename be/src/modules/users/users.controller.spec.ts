import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('UsersController', () => {
  let module: TestingModule;
  let controller: UsersController;
  let usersService: UsersService;

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

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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
        password: 'password123',
        full_name: 'New User',
        role: UserRole.SATGAS,
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const paginatedResult = {
        data: [mockUser],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockUsersService.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 50 });

      expect(result).toEqual(paginatedResult);
      expect(mockUsersService.findAllPaginated).toHaveBeenCalledWith(1, 50);
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

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        full_name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser.id);

      expect(usersService.remove).toHaveBeenCalledWith(mockUser.id);
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
        role: UserRole.SATGAS,
        is_active: true,
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
});
