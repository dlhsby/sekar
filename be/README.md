# SEKAR Backend API

<div align="center">

**NestJS Backend for SEKAR**  
(Sistem Evaluasi Kerja Satgas RTH)

Worker Tracking & Task Management System for DKRTH Surabaya

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage->80%25-success)](./coverage)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🎯 Overview

SEKAR is a comprehensive worker tracking and task management system designed specifically for DKRTH (Dinas Kebersihan dan Ruang Terbuka Hijau) Surabaya to monitor and manage green space workers across the city.

### Problem Statement
- Manual tracking of 500+ field workers across multiple areas
- No real-time visibility of worker locations and activities
- Difficulty in monitoring work quality and attendance
- Inefficient report management and review process

### Solution
A mobile-first system that enables:
- Real-time GPS tracking of workers during shifts
- Digital clock-in/out with selfie verification
- Photo/video-based work reports with offline support
- Live supervisor dashboard with map view
- Comprehensive attendance and performance analytics

---

## ✨ Features

### Current (Phase 1 - Day 1-2) ✅

#### Authentication & Authorization
- ✅ JWT token-based authentication
- ✅ Role-based access control (Worker, Supervisor, Admin)
- ✅ Secure password hashing with bcrypt
- ✅ Token validation and refresh

#### User Management
- ✅ Create, read, update, delete users (Admin)
- ✅ View all users (Admin, Supervisor)
- ✅ User activation/deactivation (soft delete)
- ✅ Password management and hashing

#### Security
- ✅ Input validation with class-validator
- ✅ SQL injection protection with TypeORM
- ✅ CORS configuration
- ✅ Security audit logging
- ✅ Environment-based secrets management

### Coming Soon (Phase 1 - Day 3-5)

#### Area Management (Day 3-4)
- Area CRUD operations
- Area type management (park, pedestrian, mini garden, street)
- GPS boundary definitions
- Worker-area assignments

#### Shift Tracking (Day 3-4)
- Clock-in with GPS validation (±100m)
- Selfie photo capture on clock-in
- Clock-out tracking
- Hours worked calculation
- Offline queue for sync

#### Work Reports (Day 5)
- Photo/video report submission
- Condition rating (Good/Fair/Poor)
- GPS-tagged reports
- Media upload to AWS S3
- Offline report drafts

#### Location Tracking (Day 5)
- Background GPS tracking (10-min intervals)
- Batch location upload
- Location history

#### Supervisor Features (Day 5)
- Live map of active workers
- Report review and approval
- Attendance tracking
- Filter by area/date/worker

---

## 🛠️ Tech Stack

### Core Framework
- **NestJS 10.x** - Progressive Node.js framework
- **TypeScript 5.x** - Type-safe development
- **Node.js 18+** - JavaScript runtime

### Database & ORM
- **PostgreSQL 14+** - Relational database
- **TypeORM 0.3.x** - Database ORM
- **AWS RDS** - Managed database (production)

### Authentication & Security
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens
- **bcrypt** - Password hashing
- **class-validator** - Input validation

### Cloud Services (Production)
- **AWS S3** - Media storage
- **AWS RDS** - PostgreSQL database
- **AWS Elastic Beanstalk/ECS** - Application hosting
- **AWS CloudWatch** - Logging and monitoring

### Documentation & Testing
- **Swagger/OpenAPI** - API documentation
- **Jest** - Testing framework
- **Supertest** - E2E testing
- **>80% test coverage** - Quality assurance

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (or Docker)
- **Git**
- **AWS CLI** (for production deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/sekar.git
cd sekar/be
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up PostgreSQL**

Using Docker (recommended):
```bash
cd ../db
./start.sh
```

Or manually:
```bash
createdb sekar_db
```

4. **Configure environment variables**

Create `.env` file:
```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db

# JWT
JWT_SECRET=your-very-secure-secret-key-change-in-production
JWT_EXPIRATION=7d

# AWS (for production)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=sekar-media

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19006

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

See [ENV_TEMPLATE.md](./ENV_TEMPLATE.md) for detailed documentation.

5. **Seed database with test users**
```bash
npm run seed
```

This creates test users:
- Admin: `admin` / `admin123`
- Supervisor: `supervisor1` / `supervisor123`
- Workers: `worker1`, `worker2`, `worker3` / `worker123`

6. **Start development server**
```bash
npm run start:dev
```

The API will be available at:
- **API:** http://localhost:3000/api
- **Swagger Docs:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/api/health

---

## 📁 Project Structure

```
be/
├── src/
│   ├── modules/
│   │   ├── auth/                    # Authentication & JWT
│   │   │   ├── decorators/          # Custom decorators (GetUser, Roles)
│   │   │   ├── dto/                 # Data transfer objects
│   │   │   ├── guards/              # Auth & role guards
│   │   │   ├── interfaces/          # JWT payload interface
│   │   │   ├── strategies/          # Passport JWT strategy
│   │   │   ├── auth.controller.ts   # Auth endpoints
│   │   │   ├── auth.service.ts      # Auth business logic
│   │   │   └── auth.module.ts       # Auth module config
│   │   ├── users/                   # User management
│   │   │   ├── dto/                 # Create/Update user DTOs
│   │   │   ├── entities/            # User entity
│   │   │   ├── users.controller.ts  # User endpoints
│   │   │   ├── users.service.ts     # User business logic
│   │   │   └── users.module.ts      # User module config
│   │   ├── areas/                   # (Phase 1 Day 3-4)
│   │   ├── shifts/                  # (Phase 1 Day 3-4)
│   │   ├── reports/                 # (Phase 1 Day 5)
│   │   ├── location/                # (Phase 1 Day 5)
│   │   └── supervisor/              # (Phase 1 Day 5)
│   ├── common/
│   │   ├── constants/               # Application constants
│   │   ├── guards/                  # Shared guards
│   │   ├── interceptors/            # Shared interceptors
│   │   ├── decorators/              # Shared decorators
│   │   └── utils/                   # Utility functions
│   ├── config/                      # Configuration files
│   ├── database/
│   │   ├── migrations/              # Database migrations
│   │   └── seeds/                   # Database seeders
│   ├── app.module.ts                # Root application module
│   ├── app.controller.ts            # Root controller
│   ├── app.service.ts               # Root service
│   └── main.ts                      # Application entry point
├── test/                            # E2E tests
├── development_log/                 # Implementation logs
│   ├── 1_BOILERPLATE.md
│   ├── 2_AUTH_USERS_MODULES.md
│   └── 3_CODE_REVIEW_IMPROVEMENTS.md
├── .env                             # Environment variables (not in git)
├── .env.example                     # Environment template
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── nest-cli.json                    # NestJS CLI configuration
├── API_DOCUMENTATION.md             # Comprehensive API docs
├── ENV_TEMPLATE.md                  # Environment variables guide
└── README.md                        # This file
```

---

## 📚 API Documentation

### Interactive Documentation (Swagger)
Visit http://localhost:3000/api/docs for interactive API documentation.

### Comprehensive Guide
See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed endpoint documentation.

### Quick API Reference

#### Authentication
```bash
# Login
POST /api/auth/login
Body: { "username": "worker1", "password": "worker123" }

# Get current user
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

#### User Management
```bash
# Get all users (Admin/Supervisor)
GET /api/users
Headers: Authorization: Bearer {token}

# Create user (Admin)
POST /api/users
Headers: Authorization: Bearer {token}
Body: { "username": "worker4", "password": "worker123", "full_name": "Pekerja Empat" }

# Get user by ID (Admin/Supervisor)
GET /api/users/{id}
Headers: Authorization: Bearer {token}

# Update user (Admin)
PATCH /api/users/{id}
Headers: Authorization: Bearer {token}
Body: { "full_name": "Updated Name" }

# Delete user (Admin)
DELETE /api/users/{id}
Headers: Authorization: Bearer {token}
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e

# Specific file
npm test -- auth.service.spec.ts
```

### Test Coverage

Current coverage: **>80%** on all modules ✅

```bash
# Generate coverage report
npm run test:cov

# View coverage report
open coverage/lcov-report/index.html
```

### Testing Guidelines

- All services must have >80% test coverage
- Test success and error scenarios
- Mock external dependencies
- Use AAA pattern (Arrange-Act-Assert)
- See [.cursor/rules/003-unit-testing.mdc](./.cursor/rules/003-unit-testing.mdc) for guidelines

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run start           # Start (production mode)
npm run start:dev       # Start with watch mode
npm run start:debug     # Start with debugging

# Building
npm run build           # Build for production

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier

# Database
npm run seed            # Seed database with test data

# Testing
npm test                # Run unit tests
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run E2E tests
```

### Development Workflow

1. **Create feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes and test**
```bash
npm run start:dev      # Start dev server
npm test               # Run tests
npm run lint           # Check code quality
```

3. **Commit with descriptive message**
```bash
git commit -m "feat: add shift clock-in endpoint"
```

4. **Push and create pull request**
```bash
git push origin feature/your-feature-name
```

### Code Guidelines

- Follow NestJS best practices (see [.cursor/rules/001-code-generation.mdc](./.cursor/rules/001-code-generation.mdc))
- Write comprehensive JSDoc comments
- Maintain >80% test coverage
- Use TypeScript strict mode
- Follow SOLID principles
- Add Swagger decorators to all endpoints

---

## 🚀 Deployment

### Production Checklist

- [ ] Update environment variables in `.env`
- [ ] Change default passwords
- [ ] Set strong JWT_SECRET
- [ ] Configure AWS credentials
- [ ] Set up PostgreSQL on AWS RDS
- [ ] Create S3 bucket for media
- [ ] Configure CORS_ORIGIN
- [ ] Enable HTTPS
- [ ] Set up monitoring (CloudWatch)
- [ ] Run database migrations
- [ ] Test all endpoints

### AWS Deployment

1. **Build for production**
```bash
npm run build
```

2. **Deploy to Elastic Beanstalk**
```bash
eb init
eb create sekar-api-prod
eb deploy
```

3. **Or deploy with Docker**
```bash
docker build -t sekar-backend .
docker push your-registry/sekar-backend:latest
```

### Environment Variables (Production)

See [ENV_TEMPLATE.md](./ENV_TEMPLATE.md) for production configuration.

---

## 📊 Project Status

### Phase 1 MVP Progress

- [x] **Day 0:** Project Setup & Boilerplate ✅
- [x] **Day 1-2:** Auth & Users Modules ✅
  - [x] JWT Authentication
  - [x] Role-based Access Control
  - [x] User CRUD Operations
  - [x] Password Management
  - [x] >80% Test Coverage
  - [x] Swagger Documentation
- [ ] **Day 3-4:** Areas & Shifts Modules (Next)
- [ ] **Day 5:** Reports, Location & Supervisor Modules
- [ ] **Day 6-14:** Mobile App Development

### Quality Metrics

| Metric | Status |
|--------|--------|
| Test Coverage | >80% ✅ |
| Linting Errors | 0 ✅ |
| TypeScript Strict Mode | Enabled ✅ |
| API Documentation | Complete ✅ |
| Code Quality | Production-Ready ✅ |

---

## 🤝 Contributing

### Development Guidelines

1. Follow NestJS and TypeScript best practices
2. Write comprehensive tests (>80% coverage)
3. Add JSDoc comments to all public methods
4. Include Swagger decorators on all endpoints
5. Update documentation when adding features
6. Follow conventional commit messages

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```bash
feat(auth): add JWT token refresh endpoint
fix(users): correct password hashing on update
docs(api): update authentication documentation
test(shifts): add GPS validation tests
```

---

## 📞 Support

### Resources

- **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Swagger UI:** http://localhost:3000/api/docs
- **Development Logs:** [development_log/](./development_log/)
- **Environment Guide:** [ENV_TEMPLATE.md](./ENV_TEMPLATE.md)

### Getting Help

- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) first
- Review [development_log/](./development_log/) for implementation details
- Check Swagger UI for interactive API testing
- Review code guidelines in `.cursor/rules/`

---

## 📄 License

UNLICENSED - Private project for DKRTH Surabaya

---

## 🙏 Acknowledgments

- **Client:** DKRTH (Dinas Kebersihan dan Ruang Terbuka Hijau) Surabaya
- **Framework:** NestJS Team
- **Database:** PostgreSQL Community
- **Cloud:** AWS

---

<div align="center">

**Built with ❤️ for DKRTH Surabaya**

[Documentation](./API_DOCUMENTATION.md) • [Changelog](./development_log/) • [Support](mailto:support@sekar.example.com)

</div>

---

**Last Updated:** January 7, 2026  
**Version:** 1.0.0  
**Phase:** 1 - MVP (Day 1-2 Complete)  
**Status:** ✅ Production-Ready (Auth & Users modules)
