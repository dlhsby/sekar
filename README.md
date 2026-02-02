# 🌸 SEKAR - Sistem Evaluasi Kerja Satgas RTH

**Worker Tracking & Task Management System for DLH Surabaya**

[![Status](https://img.shields.io/badge/Phase%202-Complete-success)](https://github.com)
[![Backend](https://img.shields.io/badge/Backend-845%20tests%20%7C%2090.77%25-success)](https://github.com)
[![Mobile](https://img.shields.io/badge/Mobile-2141%20tests%20%7C%2080.31%25-success)](https://github.com)
[![License](https://img.shields.io/badge/license-proprietary-red)](https://github.com)

---

## 📖 Overview

SEKAR (Sistem Evaluasi Kerja Satgas RTH) is a comprehensive worker tracking and task management system for DLH Surabaya - the municipal department managing parks and green spaces across the city.

### The Problem

Municipal workers operate across diverse locations with no real-time visibility, paper-based reporting, and time-consuming manual verification.

### The Solution

SEKAR provides:
- ✅ Real-time GPS tracking (±100m accuracy)
- ✅ Digital clock-in/out with selfie verification
- ✅ Photo/video work reports with offline support
- ✅ Live supervisor dashboards
- ✅ Task assignment and workflow management
- ✅ 7 Rayon organizational structure
- ✅ Firebase push notifications
- ✅ Background location tracking

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥24.13.0
- **PostgreSQL** 14+ (or Docker)
- **npm** ≥10.0.0

### 1. Start Infrastructure

```bash
# Start PostgreSQL, Adminer, LocalStack
cd infra && ./start.sh
```

### 2. Start Backend

```bash
cd be
npm install
cp .env.example .env
# Edit .env with database credentials
npm run seed           # Create test users
npm run start:dev      # http://localhost:3000
```

### 3. Start Mobile App

```bash
cd fe/mobile
npm install
# Edit .env with API_BASE_URL
npm run android        # Android emulator/device
npm run ios            # iOS simulator (macOS only)
```

### 4. Access Services

- **Backend API:** http://localhost:3000/api
- **Swagger Docs:** http://localhost:3000/api/docs
- **Adminer (DB UI):** http://localhost:8080
- **Web Dashboard:** `cd fe/web && npm run dev` → http://localhost:3001

---

## 📊 Project Status

**Phase 2 Enhanced Features - ✅ COMPLETE** (February 2, 2026)

| Component | Status | Metrics |
|-----------|--------|---------|
| **Backend** | ✅ Complete | 15 modules, 83 endpoints, 845 tests, 90.77% coverage |
| **Mobile** | ✅ Complete | 17 screens, 2,141 tests (99.07% pass rate), 80.31% coverage, WCAG 2.1 AA |
| **Web** | ✅ Complete | 18 pages, 11 NB components, Next.js 16.1.4 |
| **Database** | ✅ Complete | 16 tables, Phase 2 migration complete |
| **DevOps** | ✅ Complete | 3 CI/CD pipelines, Docker, Firebase guide |

**Next Phase:** Phase 3 - Polishing & E2E Testing

---

## 🏗️ Tech Stack

### Backend
- **Framework:** NestJS 11.x + TypeScript
- **Database:** PostgreSQL 14+ with TypeORM
- **Auth:** JWT with Passport.js
- **Storage:** AWS S3 / LocalStack
- **Real-time:** WebSocket + Bull Queue

### Mobile
- **Framework:** React Native 0.76.x + TypeScript
- **State:** Redux Toolkit
- **Navigation:** React Navigation 7.x
- **Offline:** AsyncStorage + Sync Queue
- **Notifications:** Firebase Cloud Messaging
- **Design:** Neo Brutalism UI (WCAG 2.1 AA)

### Web
- **Framework:** Next.js 16.1.4 (App Router)
- **UI:** React 19 + TailwindCSS 4.x
- **State:** Zustand + TanStack Query 5.x
- **Maps:** Mapbox GL JS
- **Real-time:** Socket.io Client

---

## 📚 Documentation

### Essential Guides

- **[CLAUDE.md](/CLAUDE.md)** - Complete project guide for development with Claude Code
- **[specs/COMPLETION_STATUS.md](/specs/COMPLETION_STATUS.md)** - Single source of truth for project status
- **[specs/README.md](/specs/README.md)** - Navigation to all technical specifications

### Quick Links

- **API Docs:** [specs/api/contracts.md](/specs/api/contracts.md) - All 83 endpoints
- **Backend Setup:** [be/README.md](/be/README.md) - Backend quick start
- **Mobile Setup:** [fe/mobile/README.md](/fe/mobile/README.md) - Mobile quick start
- **Web Setup:** [fe/web/README.md](/fe/web/README.md) - Web quick start
- **Infrastructure:** [specs/deployment/infrastructure-setup.md](/specs/deployment/infrastructure-setup.md) - Docker services
- **AWS S3:** [specs/deployment/aws-s3-setup.md](/specs/deployment/aws-s3-setup.md) - Media storage
- **WSL2 Network:** [specs/deployment/wsl2-network-setup.md](/specs/deployment/wsl2-network-setup.md) - Mobile testing setup

---

## 🧪 Testing

```bash
# Backend
cd be && npm run test:cov    # 845 tests, 90.77% coverage

# Mobile
cd fe/mobile && npm test     # 2,141 tests, 80.31% coverage

# Web
cd fe/web && npm run test:e2e   # Playwright E2E tests
```

---

## 🔐 Security

- JWT authentication with role-based access control (Worker, Supervisor, Admin)
- GPS boundary validation (±100m tolerance)
- Photo uploads to AWS S3 with signed URLs
- Input validation with class-validator
- OWASP Top 10 compliance
- Rate limiting (100 req/min global, 5 req/min login)

See [specs/architecture/security.md](/specs/architecture/security.md) for details.

---

## 🤝 Contributing

See [CLAUDE.md](/CLAUDE.md) for development guidelines and coding standards.

---

## 📄 License

UNLICENSED - Proprietary project for DLH Surabaya

---

**Built with ❤️ for DLH Surabaya**

**Last Updated:** February 2, 2026
