# Architecture Design - Phase 1 MVP

## Overview

This document describes the architectural design of the SEKAR backend following NestJS best practices, SOLID principles, and clean architecture patterns.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEKAR Backend                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Controllers Layer                      │   │
│  │  (HTTP endpoints, validation, Swagger docs)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Services Layer                         │   │
│  │  (Business logic, orchestration)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Repositories Layer                       │   │
│  │  (Data access via TypeORM)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Database                             │   │
│  │  (PostgreSQL on AWS RDS)                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  External Services: AWS S3, Google Maps API                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Module Structure

```
src/
├── main.ts                         # Application entry point
├── app.module.ts                   # Root module
├── app.controller.ts               # Health check, info
├── app.service.ts                  # App-level services
│
├── modules/
│   ├── auth/                       # Authentication
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── auth-response.dto.ts
│   │   ├── decorators/
│   │   │   ├── get-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts
│   │
│   ├── users/                      # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.service.spec.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── area-types/                 # Area type lookup
│   │   ├── area-types.module.ts
│   │   ├── area-types.controller.ts
│   │   ├── area-types.service.ts
│   │   ├── area-types.service.spec.ts
│   │   ├── dto/
│   │   │   └── create-area-type.dto.ts
│   │   └── entities/
│   │       └── area-type.entity.ts
│   │
│   ├── areas/                      # Area management
│   │   ├── areas.module.ts
│   │   ├── areas.controller.ts
│   │   ├── areas.service.ts
│   │   ├── areas.service.spec.ts
│   │   ├── dto/
│   │   │   ├── create-area.dto.ts
│   │   │   └── update-area.dto.ts
│   │   └── entities/
│   │       └── area.entity.ts
│   │
│   ├── worker-assignments/         # Worker-area mapping
│   │   ├── worker-assignments.module.ts
│   │   ├── worker-assignments.controller.ts
│   │   ├── worker-assignments.service.ts
│   │   ├── worker-assignments.service.spec.ts
│   │   └── entities/
│   │       └── worker-assignment.entity.ts
│   │
│   ├── shifts/                     # Clock-in/out
│   │   ├── shifts.module.ts
│   │   ├── shifts.controller.ts
│   │   ├── shifts.service.ts
│   │   ├── shifts.service.spec.ts
│   │   ├── dto/
│   │   │   ├── clock-in.dto.ts
│   │   │   └── clock-out.dto.ts
│   │   └── entities/
│   │       └── shift.entity.ts
│   │
│   ├── reports/                    # Work reports
│   │   ├── reports.module.ts
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   ├── reports.service.spec.ts
│   │   ├── dto/
│   │   │   ├── create-report.dto.ts
│   │   │   └── review-report.dto.ts
│   │   └── entities/
│   │       ├── work-report.entity.ts
│   │       └── report-media.entity.ts
│   │
│   ├── location/                   # GPS tracking
│   │   ├── location.module.ts
│   │   ├── location.controller.ts
│   │   ├── location.service.ts
│   │   ├── location.service.spec.ts
│   │   ├── dto/
│   │   │   └── batch-location.dto.ts
│   │   └── entities/
│   │       └── location-ping.entity.ts
│   │
│   └── supervisor/                 # Dashboard
│       ├── supervisor.module.ts
│       ├── supervisor.controller.ts
│       ├── supervisor.service.ts
│       └── supervisor.service.spec.ts
│
├── common/
│   ├── constants/
│   │   └── roles.constant.ts       # Role enum
│   ├── decorators/
│   │   └── public.decorator.ts     # Skip auth
│   ├── guards/
│   │   └── throttle.guard.ts       # Rate limiting (future)
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── utils/
│       ├── gps.util.ts             # GPS boundary validation
│       └── file.util.ts            # File handling
│
├── config/
│   ├── database.config.ts          # TypeORM config
│   ├── jwt.config.ts               # JWT config
│   └── aws.config.ts               # AWS S3 config
│
├── database/
│   ├── migrations/                 # TypeORM migrations
│   └── seeds/
│       └── seed.ts                 # Initial data seeding
│
└── shared/
    └── services/
        └── s3.service.ts           # AWS S3 upload service
```

---

## 🔧 Module Dependencies

```
AppModule
├── ConfigModule (global)
├── TypeOrmModule (global)
├── AuthModule
│   └── UsersModule
├── UsersModule
├── AreaTypesModule
├── AreasModule
│   └── AreaTypesModule
├── WorkerAssignmentsModule
│   ├── UsersModule
│   └── AreasModule
├── ShiftsModule
│   ├── UsersModule
│   ├── AreasModule
│   ├── WorkerAssignmentsModule
│   └── S3Service
├── ReportsModule
│   ├── ShiftsModule
│   └── S3Service
├── LocationModule
│   └── ShiftsModule
└── SupervisorModule
    ├── ShiftsModule
    ├── ReportsModule
    └── LocationModule
```

---

## 🗄️ Entity Relationships

```
┌──────────────┐     ┌──────────────────┐
│   AreaType   │────<│      Area        │
└──────────────┘     └──────────────────┘
                            │
                            │
┌──────────────┐     ┌──────────────────┐
│    User      │────<│WorkerAssignment  │
└──────────────┘     └──────────────────┘
      │
      │
      ├────────────────────┬─────────────────────┐
      │                    │                     │
┌─────────────┐    ┌───────────────┐    ┌──────────────┐
│   Shift     │    │ WorkReport    │    │LocationPing  │
└─────────────┘    └───────────────┘    └──────────────┘
      │                    │
      │             ┌──────────────┐
      └────────────>│ ReportMedia  │
                    └──────────────┘
```

---

## 🛡️ Security Architecture

### Authentication Flow

```
1. Client sends POST /auth/login with credentials
2. AuthService validates against database
3. JWT token generated with user_id, role
4. Token returned to client
5. Client includes token in Authorization header
6. JwtAuthGuard validates token on protected routes
7. RolesGuard checks user role for authorization
```

### Guard Chain

```
Request
  │
  ├─> JwtAuthGuard (verify token)
  │     ↓
  ├─> RolesGuard (check role)
  │     ↓
  └─> Controller (process request)
```

---

## 📦 Service Patterns

### Service Structure

```typescript
@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    private readonly areasService: AreasService,
    private readonly s3Service: S3Service,
  ) {}

  // Business logic methods
  async clockIn(userId: number, dto: ClockInDto): Promise<Shift> {
    // 1. Validate user not already clocked in
    // 2. Validate GPS within area boundary
    // 3. Upload selfie to S3
    // 4. Create shift record
    // 5. Return shift
  }
}
```

### Error Handling

```typescript
// Use specific NestJS exceptions
throw new BadRequestException('Already clocked in');
throw new NotFoundException('Area not found');
throw new ForbiddenException('Insufficient permissions');
throw new UnauthorizedException('Invalid token');
```

---

## 🔄 Data Flow

### Clock-In Flow

```
Mobile App
    │
    ▼
POST /shifts/clock-in
    │
    ▼
ShiftsController
    │
    ├─> Validate DTO (ClockInDto)
    │
    ▼
ShiftsService.clockIn()
    │
    ├─> Check no active shift
    │
    ├─> Get worker assignment
    │
    ├─> Validate GPS boundary (GpsUtil)
    │
    ├─> Upload selfie (S3Service)
    │
    └─> Create shift record (Repository)
    │
    ▼
Return ShiftResponse
```

---

## 🧪 Testing Strategy

### Unit Test Structure

```typescript
describe('ShiftsService', () => {
  let service: ShiftsService;
  let shiftRepository: MockType<Repository<Shift>>;
  let areasService: MockType<AreasService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useFactory: repositoryMockFactory,
        },
        {
          provide: AreasService,
          useFactory: () => ({
            findOne: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  describe('clockIn', () => {
    it('should create shift when GPS is valid', async () => {
      // Arrange, Act, Assert
    });

    it('should throw error when already clocked in', async () => {
      // Arrange, Act, Assert
    });
  });
});
```

---

## 🗃️ Database Indexes

```sql
-- Performance indexes for Phase 1
CREATE INDEX idx_shifts_worker_active ON shifts(worker_id) 
  WHERE clock_out_time IS NULL;

CREATE INDEX idx_location_pings_shift ON location_pings(shift_id, timestamp);

CREATE INDEX idx_reports_shift ON work_reports(shift_id);

CREATE INDEX idx_reports_date ON work_reports(report_time);
```

---

## 🔌 External Service Integration

### S3 Service

```typescript
@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: file,
      ContentType: contentType,
    }));

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
```

---

## 📊 Configuration Management

### Environment-Based Config

```typescript
// config/database.config.ts
export const databaseConfig = () => ({
  database: {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
  },
});
```

---

*Last Updated: January 2026*

