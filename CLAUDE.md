# CLAUDE.md

**Last Updated:** January 21, 2026
**Status:** Phase 1 MVP Complete

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SEKAR (Sistem Evaluasi Kerja Satgas RTH) is a worker tracking and task management system for DLH Surabaya - the municipal department managing parks and green spaces. The system provides real-time GPS tracking, digital clock-in/out, work reports with photo/video evidence, and supervisor dashboards.

**Tech Stack:**
- **Backend:** NestJS 10.x, TypeScript, PostgreSQL 14+, TypeORM, JWT, AWS (S3, RDS)
- **Mobile:** React Native 0.76.x, TypeScript, Redux Toolkit, AsyncStorage
- **Database:** PostgreSQL with TypeORM (auto-synchronize in dev)

## Common Commands

### Backend (be/)

```bash
# Development
cd be
npm install
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugging

# Testing
npm test                   # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage (>80% required)
npm run test:e2e           # Run E2E tests
npm test -- <filename>     # Run specific test file

# Code Quality
npm run lint               # Lint with ESLint
npm run format             # Format with Prettier

# Database
npm run seed               # Seed test users (admin, supervisor1, worker1-3)
npm run build              # Build for production
```

### Mobile (fe/mobile/)

```bash
# Development
cd fe/mobile
npm install
npm start                  # Start Metro bundler
npm run android            # Run on Android emulator/device
npm run ios                # Run on iOS simulator/device (macOS only)

# Testing
npm test                   # Run unit tests
npm run lint               # Lint code
```

### Infrastructure (PostgreSQL + Adminer + LocalStack)

```bash
# Start all infrastructure services
./infra/start.sh
cd infra && docker-compose up -d

# Check service status
cd infra && docker-compose ps

# View logs
cd infra && docker-compose logs -f
cd infra && docker-compose logs -f localstack
cd infra && docker-compose logs -f postgres

# Stop services
./infra/stop.sh
cd infra && docker-compose down

# Clean restart (removes volumes - deletes data!)
cd infra && docker-compose down -v

# Access PostgreSQL CLI
cd infra && docker-compose exec postgres psql -U postgres -d sekar_db

# List S3 buckets and objects (LocalStack)
cd infra && docker-compose exec -e AWS_ACCESS_KEY_ID=test \
  -e AWS_SECRET_ACCESS_KEY=test \
  postgres aws s3 ls --endpoint-url http://localstack:4566
```

### Local Development Scripts

```bash
# From project root
./local-start.sh          # Start database and backend in watch mode
./local-stop.sh           # Stop all services
```

## Architecture

### Backend Structure (NestJS)

```
be/src/
├── modules/
│   ├── auth/              # JWT authentication, guards, decorators
│   │   ├── guards/        # JwtAuthGuard, RolesGuard
│   │   ├── decorators/    # @GetUser(), @Roles()
│   │   ├── strategies/    # JWT Passport strategy
│   │   └── dto/           # Login/register DTOs
│   └── users/             # User management (CRUD, soft delete)
│       ├── entities/      # User entity with TypeORM
│       └── dto/           # Create/update user DTOs
├── common/                # Shared guards, interceptors, decorators
├── config/                # Configuration files
└── database/
    ├── migrations/        # TypeORM migrations
    └── seeds/             # Database seeders
```

**Key Patterns:**
- **Module Structure:** Each feature has controller, service, module, DTOs, entities
- **Authentication:** JWT with Passport.js, role-based access control (Worker, Supervisor, Admin)
- **Authorization:** Custom guards (`@Roles()` decorator) check user roles
- **User Retrieval:** Use `@GetUser()` decorator to get authenticated user from request
- **Database:** TypeORM with entities, auto-synchronize in dev only
- **API Docs:** Swagger at `/api/docs`, use `@Api*` decorators on all endpoints
- **Testing:** Jest with >80% coverage requirement, mock external dependencies

### Mobile Structure (React Native)

```
fe/mobile/
├── android/               # Android native code
├── ios/                   # iOS native code
├── src/                   # Application source (to be implemented)
│   ├── screens/           # Screen components
│   ├── components/        # Reusable components
│   ├── store/             # Redux Toolkit store
│   ├── services/          # API services
│   └── constants/         # Config, API URLs
└── __tests__/             # Jest tests
```

**Key Dependencies:**
- Navigation: React Navigation (native stack + bottom tabs)
- State: Redux Toolkit + React Redux
- Storage: AsyncStorage, Encrypted Storage
- Location: react-native-geolocation-service
- Maps: react-native-maps
- Camera/Media: react-native-image-picker

### Database

- **Default Credentials:** postgres/postgres/sekar_db
- **Ports:** PostgreSQL (5432), Adminer (8080), LocalStack (4566)
- **Data Persistence:** `./infra/data` directory (PostgreSQL), `./infra/localstack/data` (LocalStack)
- **Seeded Users:**
  - `admin` / `admin123` (Admin role)
  - `supervisor1` / `supervisor123` (Supervisor role)
  - `worker1`, `worker2`, `worker3` / `worker123` (Worker role)

## Development Workflow

### Adding a New Backend Feature

1. **Generate module:** `nest g module <name>` or create manually
2. **Create entity** in `entities/` with TypeORM decorators
3. **Create DTOs** in `dto/` with class-validator decorators
4. **Create service** with business logic
5. **Create controller** with routes and Swagger decorators
6. **Add guards:** Use `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(...)`
7. **Write tests** with >80% coverage (service + controller)
8. **Import module** in `app.module.ts`
9. **Test via Swagger** at `http://localhost:3000/api/docs`

### Authentication Flow

```typescript
// All protected routes need:
@UseGuards(JwtAuthGuard)
// Role-based access:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Supervisor')
// Get current user:
@GetUser() user: User
```

### Testing Requirements

- **Unit Tests:** >80% coverage per module
- **Mock Pattern:** Mock repositories, services, external dependencies
- **Test Structure:** Arrange-Act-Assert pattern
- **Coverage Command:** `npm run test:cov`
- See `.cursor/rules/003-unit-testing.mdc` for detailed guidelines

## Environment Configuration

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost        # Use 'postgres' in Docker
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION=7d
# LocalStack S3 (Development - no AWS credentials needed)
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=sekar-media-dev
AWS_REGION=ap-southeast-1

# Production S3 (use real AWS)
# AWS_ENDPOINT_URL=              # Leave empty for production
# AWS_S3_FORCE_PATH_STYLE=       # Leave empty for production
# AWS_ACCESS_KEY_ID=<real-key>
# AWS_SECRET_ACCESS_KEY=<real-secret>
# AWS_S3_BUCKET=sekar-media-production
# AWS_REGION=ap-southeast-1
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
```

### Mobile (API Configuration)

- **Android Emulator:** Use `http://10.0.2.2:3000/api`
- **Physical Device:** Use `http://<your-ip>:3000/api`
- Configure in `src/constants/config.ts`

## Important Development Notes

### Code Generation Standards

Follow `.cursor/rules/001-code-generation.mdc` and architectural specifications:
- Apply SOLID principles
- Use clean architecture with separation of concerns
- Implement proper error handling with meaningful messages (see `specs/architecture/cross-cutting-concerns.md`)
- Write concise, idiomatic TypeScript
- Use descriptive names (camelCase for variables/functions, PascalCase for classes)
- Avoid code duplication through proper abstraction
- Keep functions concise (aim for 5 lines when possible)
- Follow NestJS best practices and patterns
- Consult `specs/business-rules.md` for business logic validation rules
- Check relevant ADRs in `specs/architecture/decisions/` for architectural decisions

### Security

- **JWT Authentication:** Two-token system (15-min access + 7-day refresh with rotation)
- **Token Refresh:** Automatic refresh on expiration (see `specs/api/authentication.md`)
- **Password Hashing:** Bcrypt with 10 rounds
- **Role-Based Access Control:** Worker, Supervisor, Admin
- **Rate Limiting:** 100 req/min global, 5 req/min login (see `specs/architecture/security.md`)
- **Input Validation:** class-validator with standardized error codes
- **SQL Injection Protection:** TypeORM parameterized queries
- **Location Tracking:** Only during active shifts with GPS validation (±100m tolerance)
- **Secrets Management:** Never commit secrets to git (.env in .gitignore)
- **Error Handling:** Standardized error codes (31 codes, see `specs/api/error-handling.md`)
- **Compliance:** Follow OWASP Top 10 guidelines

### Database Management

- **Auto-sync:** Enabled in development only (TypeORM synchronize)
- **Migrations:** Use TypeORM migrations for production (see `specs/database/migrations.md` for zero-downtime strategy)
- **Connection Pooling:** 15 connections per instance in production (see `specs/database/schema.md`)
- **Soft Delete:** Users use soft delete (deleted_at timestamp)
- **Seeding:** Run `npm run seed` to create test users
- **Performance:** Indexes and partitioning strategies documented in database specs

### API Documentation

- **Swagger UI:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/api/health`
- All endpoints must have `@Api*` decorators
- Include request/response examples in decorators

## Development Phases

**Phase 1 MVP - COMPLETE ✅**
- Backend: 9 modules, 37 endpoints, 401 tests, 84.23% coverage
- Mobile: 14 screens, 12 components, 831 tests (100% pass rate)
- Specifications: 50+ files enhanced with architectural improvements

**Next Phases:**
- **Phase 2:** Enhanced features - Tasks, notifications, KMZ import
- **Phase 3:** Analytics & Reporting - Report builder, scheduler
- **Phase 4:** Asset Management - QR codes, maintenance
- **Phase 5:** iOS & Advanced - Biometrics, fraud detection
- **Phase 6:** Web Dashboard - Full CRUD, bulk ops, audit

See `specs/COMPLETION_STATUS.md` for comprehensive status tracking.

## Troubleshooting

### Backend Won't Start
```bash
# Port already in use
lsof -ti:3000 | xargs kill -9
# Database connection failed
docker-compose ps  # Check if postgres is running
cat .env | grep DATABASE  # Verify credentials
# Missing dependencies
rm -rf node_modules package-lock.json && npm install
```

### Mobile Build Issues
```bash
# Metro bundler cache
npm start -- --reset-cache
# Android build failed
cd android && ./gradlew clean && cd .. && npm run android
# Can't connect to backend
# Use 10.0.2.2:3000 (Android emulator) or your IP (physical device)
```

### Docker Issues
```bash
docker-compose ps              # Check service status
docker-compose logs backend    # View backend logs
docker-compose down -v         # Clean restart (removes volumes)
docker-compose up --build      # Rebuild and start
```

### LocalStack Issues

```bash
# LocalStack won't start
cd infra
docker-compose logs localstack
lsof -ti:4566 | xargs kill -9
docker-compose restart localstack

# Bucket not created automatically
# Check backend logs for errors
docker-compose -f ../docker-compose.yml logs backend | grep S3

# Manual bucket creation (if needed)
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 mb s3://sekar-media-dev --endpoint-url http://localstack:4566'

# Photo URLs not accessible
# Verify URL format in backend logs
# Test from within container:
cd ..
docker-compose exec backend curl http://localhost:4566/sekar-media-dev/test

# List all objects in bucket
cd infra
docker-compose exec postgres sh -c \
  'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
   aws s3 ls s3://sekar-media-dev --endpoint-url http://localstack:4566 --recursive'

# Delete all objects (reset S3)
docker-compose down -v
rm -rf localstack/
docker-compose up -d
```

## Documentation Structure

The project uses a hierarchical folder structure for specifications and development rules:

### `specs/` - Technical Specifications

Comprehensive technical specifications organized by specialist roles:
- **By Role:** `specs/architecture/`, `specs/database/`, `specs/api/`, `specs/mobile/`, `specs/web/`, `specs/ui-ux/`, `specs/testing/`, `specs/deployment/`
- **By Phase:** `specs/phases/phase-1-mvp/`, `specs/phases/phase-2-enhanced/`, etc.
- Start with `specs/README.md` for navigation guide

### `.cursor/` Folders - Development Rules

- **Root `.cursor/`** - General rules applicable across all components
  - Project-wide coding standards
  - General patterns (code generation, documentation, testing)
  - Custom commands for the entire project

- **Component `.cursor/`** - Technology-specific rules
  - `be/.cursor/rules/` - NestJS patterns, backend best practices
  - `fe/mobile/.cursor/rules/` - React Native patterns, mobile best practices
  - Each tailored to the specific framework and requirements

**Usage Tip:** Check `specs/` for comprehensive technical specifications and `.cursor/rules/` for coding standards and patterns.

---

## Key Resources

| Category | Resource | Description |
|----------|----------|-------------|
| **Status** | `specs/COMPLETION_STATUS.md` | Single source of truth for project status |
| **API** | `specs/api/contracts.md` | All 37 endpoints documented |
| **Errors** | `specs/api/error-handling.md` | 31 standardized error codes |
| **Business** | `specs/business-rules.md` | Consolidated business logic rules |
| **Architecture** | `specs/architecture/decisions/` | 8 ADRs documenting key choices |
| **All Specs** | `specs/README.md` | Navigation guide to all specifications |

---

## Project Status

**Phase 1 MVP - COMPLETE ✅**

| Component | Metrics | Status |
|-----------|---------|--------|
| **Backend** | 9 modules, 37 endpoints, 31 error codes, 401 tests (84.23%) | ✅ Complete |
| **Mobile** | 14 screens, 12 components, 831 tests (100% pass) | ✅ Complete |
| **Specs** | 50+ files with architectural improvements | ✅ Complete |

**Key Features Implemented:**
- JWT authentication with token refresh (15-min access + 7-day refresh)
- GPS-validated clock-in/out (±100m tolerance)
- Work reports with photo compression (500KB target)
- Offline-first with AsyncStorage queue
- Rate limiting (100 req/min global, 5 req/min login)
- Background location tracking

**Next Phase:** Phase 2 - Enhanced Features (Tasks, Notifications, KMZ Import)

See `specs/COMPLETION_STATUS.md` for comprehensive details.
