# Backend Developer Reference

Additional patterns and best practices for NestJS backend development.

## Advanced Patterns

### Query Builder for Complex Queries

```typescript
async findWithFilters(filters: FilterDto): Promise<Entity[]> {
  const qb = this.entityRepository.createQueryBuilder('e');

  qb.leftJoinAndSelect('e.related', 'r')
    .where('e.deletedAt IS NULL');

  if (filters.status) {
    qb.andWhere('e.status = :status', { status: filters.status });
  }

  if (filters.startDate && filters.endDate) {
    qb.andWhere('e.createdAt BETWEEN :start AND :end', {
      start: filters.startDate,
      end: filters.endDate,
    });
  }

  if (filters.search) {
    qb.andWhere('(e.name ILIKE :search OR e.description ILIKE :search)', {
      search: `%${filters.search}%`,
    });
  }

  return qb
    .orderBy('e.createdAt', 'DESC')
    .skip(filters.offset || 0)
    .take(filters.limit || 20)
    .getMany();
}
```

### Pagination Response DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
```

### Custom Decorators

```typescript
// Combined auth decorator
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

export function Auth(...roles: string[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

// Usage
@Auth('Admin', 'Supervisor')
@Post()
async create() {}
```

### Transaction Support

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class EntityService {
  constructor(private dataSource: DataSource) {}

  async createWithRelations(dto: CreateDto): Promise<Entity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entity = queryRunner.manager.create(Entity, dto);
      await queryRunner.manager.save(entity);

      const related = queryRunner.manager.create(Related, { entityId: entity.id });
      await queryRunner.manager.save(related);

      await queryRunner.commitTransaction();
      return entity;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### Custom Pipes

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return date;
  }
}

// Usage
@Get()
async findByDate(@Query('date', ParseDatePipe) date: Date) {}
```

### Custom Interceptors

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### Exception Filters

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## TypeORM Patterns

### Entity Listeners

```typescript
@Entity()
export class Entity {
  @BeforeInsert()
  generateId() {
    this.id = uuidv4();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  @AfterLoad()
  calculateVirtual() {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
}
```

### Soft Delete with Query Scope

```typescript
// Repository extension
@Injectable()
export class EntityRepository extends Repository<Entity> {
  constructor(private dataSource: DataSource) {
    super(Entity, dataSource.createEntityManager());
  }

  findActive(): Promise<Entity[]> {
    return this.find({ where: { deletedAt: null } });
  }

  findWithDeleted(): Promise<Entity[]> {
    return this.find();
  }
}
```

### Eager vs Lazy Loading

```typescript
// Eager loading (always loads relation)
@ManyToOne(() => User, { eager: true })
user: User;

// Lazy loading (loads on access)
@ManyToOne(() => User, { lazy: true })
user: Promise<User>;

// Manual loading with query
const entity = await this.repository.findOne({
  where: { id },
  relations: ['user', 'user.role'],
});
```

## Validation Patterns

### Custom Validators

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from 'class-validator';

@ValidatorConstraint({ async: true })
export class IsUniqueEmailConstraint implements ValidatorConstraintInterface {
  constructor(private usersService: UsersService) {}

  async validate(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    return !user;
  }

  defaultMessage(): string {
    return 'Email already exists';
  }
}

export function IsUniqueEmail() {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      validator: IsUniqueEmailConstraint,
    });
  };
}
```

### Conditional Validation

```typescript
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @ValidateIf(o => o.password !== undefined)
  @IsString()
  @MinLength(8)
  password?: string;

  @ValidateIf(o => o.password !== undefined)
  @IsString()
  @Match('password', { message: 'Passwords must match' })
  confirmPassword?: string;
}
```

## Testing Patterns

### Mock Factories

```typescript
// test/factories/user.factory.ts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-uuid',
  email: 'test@example.com',
  name: 'Test User',
  role: 'Worker',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

// Usage in tests
const user = createMockUser({ role: 'Admin' });
```

### E2E Testing

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('EntityController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password' });
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /entities', () => {
    it('should create entity', () => {
      return request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Entity' })
        .expect(201)
        .expect(res => {
          expect(res.body.name).toBe('Test Entity');
        });
    });
  });
});
```

## Performance Optimization

### Query Optimization

```typescript
// Use select to limit fields
const users = await this.userRepository.find({
  select: ['id', 'name', 'email'],
  where: { isActive: true },
});

// Use indices for frequently queried fields
@Entity()
@Index(['email'])
@Index(['createdAt', 'status'])
export class User {
  @Column({ unique: true })
  email: string;
}
```

### Caching with Cache Manager

```typescript
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class EntityService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findById(id: string): Promise<Entity> {
    const cacheKey = `entity:${id}`;

    let entity = await this.cacheManager.get<Entity>(cacheKey);
    if (!entity) {
      entity = await this.repository.findOne({ where: { id } });
      await this.cacheManager.set(cacheKey, entity, 300); // 5 minutes
    }

    return entity;
  }
}
```

## Security Best Practices

### Rate Limiting

```typescript
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// In app.module.ts
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
});

// In controller
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {}
```

### Input Sanitization

```typescript
import { Transform } from 'class-transformer';
import { sanitize } from 'class-sanitizer';

export class CreateUserDto {
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsEmail()
  email: string;

  @Transform(({ value }) => sanitize(value))
  @IsString()
  name: string;
}
```

## Useful Utilities

### Date Handling

```typescript
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Query for today
const today = await this.repository.find({
  where: {
    createdAt: Between(startOfDay(new Date()), endOfDay(new Date())),
  },
});

// Query for last 7 days
const lastWeek = await this.repository.find({
  where: {
    createdAt: MoreThanOrEqual(subDays(new Date(), 7)),
  },
});
```

### UUID Generation

```typescript
import { v4 as uuidv4 } from 'uuid';

// In entity
@BeforeInsert()
generateId() {
  if (!this.id) {
    this.id = uuidv4();
  }
}
```
