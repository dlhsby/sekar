# Backend Testing Specifications - SEKAR

## Overview

This document provides comprehensive testing guidelines for the SEKAR backend (NestJS + TypeORM + PostgreSQL). It covers unit testing patterns, E2E testing strategies, mocking approaches, and test data management.

**Current Status:** 256 tests passing, 100% coverage across all modules

---

## Table of Contents

1. [Unit Testing Patterns](#unit-testing-patterns)
2. [E2E Testing](#e2e-testing)
3. [Service Testing](#service-testing)
4. [Controller Testing](#controller-testing)
5. [Guard & Decorator Testing](#guard--decorator-testing)
6. [Entity Testing](#entity-testing)
7. [Mocking Strategies](#mocking-strategies)
8. [Test Data Management](#test-data-management)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Unit Testing Patterns

### Test File Structure

Every `.ts` file should have a corresponding `.spec.ts` file in the same directory:

```
modules/
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts
│   ├── auth.controller.ts
│   └── auth.controller.spec.ts
```

### Basic Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';

describe('ServiceName', () => {
  let service: ServiceName;
  let dependency: DependencyType;

  // Mock dependencies
  const mockDependency = {
    method1: jest.fn(),
    method2: jest.fn(),
  };

  beforeEach(async () => {
    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: DependencyName,
          useValue: mockDependency,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    dependency = module.get<DependencyType>(DependencyName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should handle successful case', async () => {
      // Arrange
      const input = { ... };
      mockDependency.method1.mockResolvedValue(expected);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expected);
      expect(mockDependency.method1).toHaveBeenCalledWith(...);
    });

    it('should handle error case', async () => {
      // Arrange
      mockDependency.method1.mockRejectedValue(new Error('...'));

      // Act & Assert
      await expect(service.methodName(input)).rejects.toThrow(ExpectedException);
    });
  });
});
```

---

## Service Testing

### Testing Business Logic

Services contain core business logic and should have thorough test coverage (>90%).

**Example: AuthService**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

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
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: '12345678',
    };

    it('should successfully login and return JWT token', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.access_token).toBe('mock.jwt.token');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: loginDto.username },
      });
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if validation succeeds', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
```

### Key Service Testing Patterns

1. **Mock Repository**: Always mock TypeORM repositories
2. **Mock External Services**: Mock S3, JWT, bcrypt
3. **Test Error Paths**: Verify exceptions are thrown correctly
4. **Test Validation**: Ensure business rules are enforced
5. **Test Transactions**: Verify rollback on errors (if using transactions)

---

## Controller Testing

### Testing API Endpoints

Controllers handle HTTP requests and delegate to services. Test request validation, response formatting, and guard integration.

**Example: UsersController**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password_hash: 'hashed',
    full_name: 'Test User',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        password: '12345678',
        full_name: 'New User',
        role: UserRole.WORKER,
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [mockUser];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('123');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('123');
    });
  });
});
```

### Controller Testing Best Practices

1. **Focus on Request/Response**: Don't re-test service logic
2. **Mock Services**: Controllers should only call services, not implement logic
3. **Test Decorators**: Verify `@Body()`, `@Param()`, `@Query()` work correctly
4. **Test Guards**: Ensure authentication/authorization decorators are present
5. **Test Response Formatting**: Verify correct HTTP status codes

---

## Guard & Decorator Testing

### Testing Custom Guards

**Example: RolesGuard**

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles required', () => {
    const context = createMockExecutionContext(UserRole.WORKER, undefined);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    const context = createMockExecutionContext(UserRole.ADMIN, [UserRole.ADMIN]);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user lacks required role', () => {
    const context = createMockExecutionContext(UserRole.WORKER, [UserRole.ADMIN]);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(false);
  });

  function createMockExecutionContext(userRole: UserRole, requiredRoles?: UserRole[]): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }
});
```

### Testing Custom Decorators

**Example: GetUser Decorator**

```typescript
import { ExecutionContext } from '@nestjs/common';
import { GetUser } from './get-user.decorator';

describe('GetUser Decorator', () => {
  it('should extract user from request', () => {
    const mockUser = { id: '123', username: 'test', role: UserRole.WORKER };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as ExecutionContext;

    const result = GetUser()(null, mockContext);

    expect(result).toEqual(mockUser);
  });

  it('should return undefined if no user in request', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;

    const result = GetUser()(null, mockContext);

    expect(result).toBeUndefined();
  });
});
```

---

## Entity Testing

### Testing Entity Methods

Some entities have business logic methods that should be tested.

**Example: Shift Entity**

```typescript
import { Shift } from './shift.entity';

describe('Shift Entity', () => {
  let shift: Shift;

  beforeEach(() => {
    shift = new Shift();
    shift.clock_in_time = new Date('2026-01-15T08:00:00Z');
  });

  describe('calculateHoursWorked', () => {
    it('should calculate hours for completed shift', () => {
      shift.clock_out_time = new Date('2026-01-15T16:00:00Z');

      const hours = shift.calculateHoursWorked();

      expect(hours).toBe(8);
    });

    it('should return null for active shift', () => {
      shift.clock_out_time = null;

      const hours = shift.calculateHoursWorked();

      expect(hours).toBeNull();
    });

    it('should handle shifts crossing midnight', () => {
      shift.clock_in_time = new Date('2026-01-15T22:00:00Z');
      shift.clock_out_time = new Date('2026-01-16T02:00:00Z');

      const hours = shift.calculateHoursWorked();

      expect(hours).toBe(4);
    });
  });

  describe('isActive', () => {
    it('should return true for active shift', () => {
      shift.clock_out_time = null;

      expect(shift.isActive()).toBe(true);
    });

    it('should return false for completed shift', () => {
      shift.clock_out_time = new Date();

      expect(shift.isActive()).toBe(false);
    });
  });
});
```

---

## E2E Testing

### E2E Test Setup

E2E tests run against a real (test) database and test the entire HTTP request/response cycle.

**Configuration: test/jest-e2e.json**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### E2E Test Example

**test/app.e2e-spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Connection } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    connection = moduleFixture.get(Connection);
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('Authentication', () => {
    it('/api/auth/login (POST) - success', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'worker1',
          password: '12345678',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body.user).toHaveProperty('username', 'worker1');
          authToken = res.body.access_token;
        });
    });

    it('/api/auth/login (POST) - invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'worker1',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/api/auth/me (GET) - with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('username', 'worker1');
        });
    });

    it('/api/auth/me (GET) - without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('should deny access without JWT', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });

    it('should allow access with valid JWT', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
```

### E2E Testing Best Practices

1. **Use Test Database**: Separate from development DB
2. **Seed Before Tests**: Load test data in `beforeAll()`
3. **Clean After Tests**: Truncate tables or drop DB
4. **Test Complete Flows**: Login → Create → Read → Update → Delete
5. **Test Authorization**: Verify role-based access works
6. **Test Validation**: Verify DTO validation works end-to-end

---

## Mocking Strategies

### Repository Mocking

Always mock TypeORM repositories to avoid database dependencies in unit tests.

```typescript
const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  })),
};

// In test setup
{
  provide: getRepositoryToken(Entity),
  useValue: mockRepository,
}
```

### External Service Mocking

**AWS S3:**

```typescript
const mockS3Service = {
  uploadFile: jest.fn().mockResolvedValue({
    url: 'https://s3.amazonaws.com/bucket/key',
    key: 'uploads/photo.jpg',
  }),
  deleteFile: jest.fn().mockResolvedValue(true),
};

{
  provide: S3Service,
  useValue: mockS3Service,
}
```

**JWT Service:**

```typescript
const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ userId: '123', role: 'worker' }),
};

{
  provide: JwtService,
  useValue: mockJwtService,
}
```

### Time Mocking

Use Jest's timer mocks for time-dependent logic:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-15T10:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

it('should calculate shift hours correctly', () => {
  const shift = { clock_in_time: new Date('2026-01-15T08:00:00Z') };
  // Test uses fixed time from jest.setSystemTime
});
```

---

## Test Data Management

### Factory Pattern

Create reusable factory functions for test data:

```typescript
// test/factories/user.factory.ts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'testuser',
  password_hash: '$2b$10$hashedpassword',
  full_name: 'Test User',
  role: UserRole.WORKER,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Usage in tests
const adminUser = createMockUser({ role: UserRole.ADMIN });
const inactiveUser = createMockUser({ is_active: false });
```

### Fixtures

See [test-data.md](./test-data.md) for comprehensive test fixtures.

---

## Common Testing Patterns

### Pattern 1: Testing Validation

```typescript
it('should reject invalid email format', async () => {
  const dto = { email: 'invalid-email', password: 'pass' };

  await expect(service.register(dto)).rejects.toThrow(BadRequestException);
});
```

### Pattern 2: Testing Authorization

```typescript
it('should only allow admin to delete users', async () => {
  const workerUser = createMockUser({ role: UserRole.WORKER });

  await expect(service.deleteUser('123', workerUser)).rejects.toThrow(
    ForbiddenException,
  );
});
```

### Pattern 3: Testing GPS Logic

```typescript
it('should validate GPS within boundary', () => {
  const result = gpsUtils.isWithinBoundary(
    -7.2905, 112.7398,  // Current position
    -7.2905, 112.7398,  // Area center
    100                  // Radius in meters
  );

  expect(result).toBe(true);
});
```

### Pattern 4: Testing Pagination

```typescript
it('should return paginated results', async () => {
  const result = await service.findAll({ page: 1, limit: 10 });

  expect(result.data).toHaveLength(10);
  expect(result.meta).toHaveProperty('total');
  expect(result.meta).toHaveProperty('page', 1);
});
```

---

## Troubleshooting

### Common Issues

**Issue: Tests timeout**
```typescript
// Solution: Increase timeout for specific test
it('should handle slow operation', async () => {
  // ...
}, 10000); // 10 second timeout
```

**Issue: Circular dependency errors**
```typescript
// Solution: Use forwardRef
@Injectable()
export class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB))
    private serviceB: ServiceB,
  ) {}
}
```

**Issue: Database connection not closing**
```typescript
// Solution: Properly close connections in afterAll
afterAll(async () => {
  await connection.close();
  await app.close();
});
```

---

## Running Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- auth.service.spec.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run tests with debugging
npm run test:debug
```

---

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Test Data & Fixtures](./test-data.md)
- [Overall Testing Strategy](./strategy.md)

---

*Last Updated: 2026-06-20*
*Current Status (Phase 5 code-side): ~1,938 tests, 93.13% stmt / 82.32% branch coverage*
