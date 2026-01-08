# 🌸 SEKAR - Sistem Evaluasi Kerja Satgas RTH

**Worker Tracking & Task Management System for DKRTH Surabaya**

[![Status](https://img.shields.io/badge/status-in%20development-yellow)](https://github.com)
[![Phase](https://img.shields.io/badge/phase-MVP-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-proprietary-red)](https://github.com)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Development Phases](#-development-phases)
- [Testing](#-testing)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

---

## 📖 Overview

SEKAR (Sistem Evaluasi Kerja Satgas RTH) is a comprehensive worker tracking and task management system designed for DKRTH Surabaya - the municipal department responsible for parks and green spaces.

### The Problem

Municipal green space workers operate across diverse locations (parks, pedestrian zones, mini gardens, streets) with:
- ❌ No visibility into worker locations during shifts
- ❌ Difficulty verifying work completion
- ❌ Paper-based reporting (lost, delayed, incomplete)
- ❌ Supervisors spend hours driving for verification

### The Solution

SEKAR provides:
- ✅ Real-time worker location tracking
- ✅ GPS-verified clock-in/out with photo evidence
- ✅ Digital work reports with photos/videos
- ✅ Offline-first mobile app for field workers
- ✅ Live supervisor dashboard
- ✅ Task assignment and management
- ✅ Asset tracking and maintenance scheduling

---

## 🚀 Quick Start

### Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Runtime |
| PostgreSQL | 14+ | Database |
| Docker | Latest | Containerization (optional) |
| Android Studio | Latest | Mobile development |
| Java JDK | 17+ | React Native Android |

### Option 1: Docker (Recommended)

```bash
# Clone and start
git clone <repository-url>
cd sekar
docker-compose up -d

# Verify
curl http://localhost:3000/api/health
```

### Option 2: Manual Setup

#### 1. Database Setup

```bash
# Create database
createdb sekar_db

# Verify connection
psql -U postgres -d sekar_db
```

#### 2. Backend Setup

```bash
cd be
npm install

# Create .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
JWT_SECRET=dev-secret-key-change-in-production-123456789
JWT_EXPIRATION=7d
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=dummy-key-for-now
AWS_SECRET_ACCESS_KEY=dummy-secret-for-now
AWS_S3_BUCKET=sekar-media-dev
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
EOF

# Run
npm run start:dev
```

#### 3. Mobile Setup

```bash
cd fe/mobile
npm install

# Update API config (src/constants/config.ts)
# For Android emulator: http://10.0.2.2:3000/api
# For physical device: http://<your-ip>:3000/api

# Start Metro bundler
npm start

# Run on Android (new terminal)
npm run android
```

---

## 🐳 Docker Setup

### Quick Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Development mode (with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | sekar-postgres | 5432 | Database |
| Backend | sekar-backend | 3000 | NestJS API |

### Database Commands

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d sekar_db

# Backup database
docker-compose exec postgres pg_dump -U postgres sekar_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres sekar_db < backup.sql
```

### Environment Variables

Create `.env` in project root:

```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
```

---

## 📁 Project Structure

```
sekar/
├── be/                         # NestJS Backend API
│   ├── src/
│   │   └── modules/            # Auth, Users, Shifts, Reports, etc.
│   ├── .agents/                # Backend development plans
│   └── README.md
│
├── fe/
│   ├── mobile/                 # React Native Mobile App
│   │   ├── src/
│   │   ├── .agents/            # Mobile development plans
│   │   └── README.md
│   │
│   └── web/                    # Next.js Web Dashboard (Phase 6)
│       ├── .agents/            # Web development plans
│       └── README.md
│
├── .agents/                    # Root development plans & guides
│   ├── README.md               # 🔥 START HERE for development
│   ├── SUMMARY.md              # Executive summary
│   └── phase-X-*/              # Phase-specific plans
│
├── brainstorm/                 # Original planning documents
├── docker-compose.yml          # Production Docker config
├── docker-compose.dev.yml      # Development Docker config
└── README.md                   # This file
```

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS, TypeScript, PostgreSQL, TypeORM, JWT |
| **Mobile** | React Native, TypeScript, Zustand, SQLite |
| **Web** | Next.js 15, TypeScript, TailwindCSS, Shadcn |
| **Cloud** | AWS (RDS, S3, Elastic Beanstalk) |

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile Apps                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Worker App      │      │  Supervisor App   │        │
│  │  - Clock in/out  │      │  - Live map       │        │
│  │  - Work reports  │      │  - Reports review │        │
│  └────────┬─────────┘      └────────┬─────────┘        │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ↓                          ↓
    ┌────────────────────────────────────────┐
    │         NestJS Backend API             │
    │  Auth • Users • Shifts • Reports       │
    │  Location • Supervisor                 │
    └──────────────┬───────────┬─────────────┘
                   ↓           ↓
    ┌──────────────────┐  ┌──────────────┐
    │ PostgreSQL (RDS) │  │  AWS S3      │
    │ Users, Shifts,   │  │  Photos,     │
    │ Reports, Pings   │  │  Videos      │
    └──────────────────┘  └──────────────┘
```

---

## 📅 Development Phases

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| **1 - MVP** | 2 weeks | Core functionality, Android app | 🔴 Current |
| **2 - Enhanced** | 2-3 weeks | Tasks, notifications, basic web | 🟡 Next |
| **3 - Analytics** | 2 weeks | Reports, dashboards | 🟢 Future |
| **4 - Assets** | 2-3 weeks | QR codes, maintenance | 🟢 Future |
| **5 - iOS** | 3 weeks | iOS app, integrations | 🟢 Future |
| **6 - Web** | 3-4 weeks | Full web dashboard | 🟢 Future |

**Total:** 15-18 weeks for complete system

### Development Documentation

Each component has its own `.agents/` folder with detailed plans:
- `be/.agents/` - Backend phase plans
- `fe/mobile/.agents/` - Mobile phase plans
- `fe/web/.agents/` - Web phase plans

See `.agents/README.md` for comprehensive development guide.

---

## 🧪 Testing

### Backend

```bash
cd be
npm test              # Unit tests
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests
```

### Mobile

```bash
cd fe/mobile
npm test              # Unit tests
```

### Coverage Requirements

- **Unit Tests:** >80% per module
- **Integration Tests:** Critical paths
- **E2E Tests:** Happy paths

---

## 🔐 Security

### Authentication
- JWT tokens with 7-day expiration
- Role-based access control (Worker, Supervisor, Admin)
- Bcrypt password hashing

### Privacy
- Location tracking **only during active shifts**
- Worker consent for GPS tracking
- Compliant with local labor laws

### AWS Security
- IAM roles with minimal permissions
- S3 bucket access controls
- RDS encryption at rest

---

## 🔧 Troubleshooting

### Backend Issues

```bash
# Port already in use
lsof -i :3000 && kill -9 <PID>

# Database connection failed
sudo systemctl status postgresql
sudo systemctl start postgresql

# Missing dependencies
rm -rf node_modules package-lock.json && npm install
```

### Mobile Issues

```bash
# Metro bundler issues
npx react-native start --reset-cache

# Android build failed
cd android && ./gradlew clean && cd .. && npm run android

# Cannot connect to backend
# - Android Emulator: Use 10.0.2.2 instead of localhost
# - Physical Device: Use your computer's IP address
```

### Docker Issues

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs postgres

# Clean restart
docker-compose down -v
docker-compose up --build
```

---

## 📊 Project Metrics

### MVP Scale
- **Workers:** 30 (pilot)
- **Areas:** 3
- **Cost:** ~$40-100/month

### Full Scale
- **Workers:** 500
- **Areas:** 50
- **Cost:** ~$250-400/month

---

## 📚 Additional Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Development Plans | `.agents/README.md` | AI agent & developer guide |
| Backend API | `be/README.md` | API documentation |
| Mobile App | `fe/mobile/README.md` | Mobile setup & architecture |
| Original Requirements | `brainstorm/` | Project planning |

---

## 📞 Contact & Support

- **Client:** DKRTH Surabaya
- **Project:** SEKAR (Sistem Evaluasi Kerja Satgas RTH)
- **Status:** In Development (Phase 1 - MVP)

---

## 📄 License

Proprietary - DKRTH Surabaya Municipal Government

---

**Built with ❤️ for the green spaces of Surabaya** 🌳🌸🌺
