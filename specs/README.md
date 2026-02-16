# SEKAR Technical Specifications

This directory contains comprehensive technical specifications for the SEKAR (Sistem Evaluasi Kerja Satgas RTH) project, organized by specialist roles and development phases.

## 📋 Overview

SEKAR is a worker tracking and task management system for DLH Surabaya (Department of Cleanliness and Green Space). The system enables real-time GPS tracking, digital clock-in/out, work reports with multimedia evidence, and supervisor dashboards for managing 500+ workers across 30+ locations.

**Current Status:**
- **Backend:** Phase 2 Complete (845 tests, 90.77% coverage, 83 endpoints)
- **Mobile:** Phase 2 Complete (2,141 tests, 80.31% coverage, 17 screens, WCAG 2.1 AA)
- **Web:** Phase 2 Complete (11 tests, 18 pages, Next.js 16.1.4)

## 🗂️ Documentation Structure

This specifications folder is organized by **specialist roles** to enable parallel development:

### By Role

| Directory | Role | Description |
|-----------|------|-------------|
| [`architecture/`](./architecture/) | Software Architect | System design, tech stack, data flow, security architecture |
| [`database/`](./database/) | Database Engineer | Schema design, ERD, migrations, seed data |
| [`api/`](./api/) | Backend Developer | API contracts, authentication, error handling |
| [`mobile/`](./mobile/) | Mobile Developer | Screens, navigation, offline sync, permissions |
| [`web/`](./web/) | Web Developer | Pages, components, data fetching |
| [`ui-ux/`](./ui-ux/) | UI/UX Designer | Design system, colors, typography, components, accessibility |
| [`testing/`](./testing/) | QA Engineer | Testing strategy, coverage requirements, test data |
| [`deployment/`](./deployment/) | DevOps Engineer | Infrastructure, CI/CD, monitoring |

### By Phase

| Directory | Phase | Timeline | Description |
|-----------|-------|----------|-------------|
| [`phases/phase-1-mvp/`](./phases/phase-1-mvp/) | Phase 1 | Weeks 1-2 | MVP - Clock-in/out, Reports, GPS tracking |
| [`phases/phase-2-enhanced/`](./phases/phase-2-enhanced/) | Phase 2 | Weeks 3-4 | Tasks, Notifications, KMZ Import |
| [`phases/phase-2-c-client-feedback/`](./phases/phase-2-c-client-feedback/) | Phase 2C | 4-6 weeks | Client Feedback: 8-role system, terminology cleanup, polygon geofencing |
| [`phases/phase-3-analytics/`](./phases/phase-3-analytics/) | Phase 3 | Weeks 5-7 | Report Builder, Scheduler, Analytics |
| [`phases/phase-4-assets/`](./phases/phase-4-assets/) | Phase 4 | Weeks 8-10 | Assets, QR Codes, Maintenance |
| [`phases/phase-5-ios/`](./phases/phase-5-ios/) | Phase 5 | Weeks 11-13 | iOS, Biometrics, Fraud Detection, i18n |
| [`phases/phase-6-web/`](./phases/phase-6-web/) | Phase 6 | Weeks 14-16 | Full Web Dashboard with Audit Logging |

**See [`phases/README.md`](./phases/README.md) for detailed navigation of phase documentation.**

Each phase folder contains:
- `README.md` - Overview, goals, success criteria
- `STATUS.md` - Progress tracking checklist
- `backend.md` - Backend implementation guide
- `mobile.md` - Mobile implementation guide
- `web.md` - Web implementation guide
- `timeline.md` - Day-by-day breakdown
- `testing.md` - Test plans and acceptance criteria

## 🚀 Quick Start by Role

### Software Architect
Start with [`architecture/system-overview.md`](./architecture/system-overview.md) for high-level system design.

### Database Engineer
Start with [`database/schema.md`](./database/schema.md) for complete database schema and relationships.

### Backend Developer
Start with [`api/contracts.md`](./api/contracts.md) for all API endpoint specifications.

### Mobile Developer
Start with [`mobile/screens.md`](./mobile/screens.md) for screen specifications and user flows.

### Web Developer
Start with [`web/pages.md`](./web/pages.md) for web dashboard page specifications.

**Web Specs:**
- [`web/pages.md`](./web/pages.md) - Page structure and routes
- [`web/components.md`](./web/components.md) - Shadcn/ui component library
- [`web/data-fetching.md`](./web/data-fetching.md) - React Query patterns
- [`web/authentication.md`](./web/authentication.md) - NextAuth.js setup
- [`web/forms.md`](./web/forms.md) - React Hook Form + Zod
- [`web/data-tables.md`](./web/data-tables.md) - TanStack Table patterns
- [`web/realtime.md`](./web/realtime.md) - WebSocket integration
- [`web/performance.md`](./web/performance.md) - Optimization strategies

### UI/UX Designer
Start with [`ui-ux/README.md`](./ui-ux/README.md) for design system overview, then explore color palette, typography, and component specifications.

### QA Engineer
Start with [`testing/strategy.md`](./testing/strategy.md) for testing requirements and coverage goals.

### DevOps Engineer
Start with [`deployment/infrastructure.md`](./deployment/infrastructure.md) for AWS infrastructure setup.

## 📊 Tech Stack

### Backend
- **Framework:** NestJS 11.x with TypeScript 5.9
- **Database:** PostgreSQL 14+ with TypeORM
- **Authentication:** JWT with Passport.js
- **Storage:** AWS S3 for media files
- **Documentation:** Swagger/OpenAPI

### Mobile
- **Framework:** React Native 0.83.1 with TypeScript
- **State Management:** Redux Toolkit
- **Navigation:** React Navigation 7.x
- **Storage:** AsyncStorage + Encrypted Storage
- **Location:** react-native-geolocation-service
- **Maps:** react-native-maps
- **Offline:** Offline-first with sync queue

### Web
- **Framework:** Next.js 16.1.6 with App Router
- **UI Library:** Shadcn/ui + TailwindCSS
- **State Management:** React Query (TanStack Query)
- **Authentication:** NextAuth.js v5
- **Forms:** React Hook Form + Zod
- **Tables:** TanStack Table
- **Charts:** Recharts
- **Maps:** react-leaflet
- **Real-time:** Socket.IO client

### Infrastructure
- **Cloud:** AWS (RDS, S3, Elastic Beanstalk/ECS)
- **CI/CD:** GitHub Actions
- **Monitoring:** CloudWatch, Sentry
- **Local Dev:** Docker Compose

## 🔑 Key Design Decisions

### 1. Offline-First Mobile Architecture
Mobile app operates fully offline with automatic background sync when connectivity is restored. Critical for field workers with poor network coverage.

### 2. UUID Primary Keys
All entities use UUIDs to enable offline record creation without server-side ID generation conflicts.

### 3. GPS Validation
Work locations validated using Haversine formula with 100-meter boundary tolerance.

### 4. Photo/Video Evidence
All work reports require photo evidence stored in AWS S3 with automatic thumbnail generation.

### 5. Role-Based Access Control
Phase 1-2B: Three roles (Worker, Supervisor, Admin). Phase 2C: Eight roles — satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin. See [ADR-009](./architecture/decisions/ADR-009-phase2c-role-system-overhaul.md).

## 📖 Reading Path for New Developers

1. **Understand the System** → [`architecture/system-overview.md`](./architecture/system-overview.md)
2. **Review Database Design** → [`database/schema.md`](./database/schema.md)
3. **Learn API Contracts** → [`api/contracts.md`](./api/contracts.md)
4. **Understand Current Phase** → [`phases/phase-1-mvp/README.md`](./phases/phase-1-mvp/README.md)
5. **Check Your Role's Specs** → Role-specific folder from table above

## 🔄 Document Maintenance

- **Status Updates:** Each phase folder contains a `STATUS.md` file tracking completion
- **Change Requests:** Update relevant role-specific specs when requirements change
- **Version Control:** All specs are version controlled in git
- **Review Cycle:** Weekly review during sprint planning

## 📞 Related Documentation

### Project Guides
- **Project Instructions:** [`/CLAUDE.md`](/CLAUDE.md) - Claude Code usage guide
- **Project README:** [`/README.md`](/README.md) - Project setup and commands
- **Completion Status:** [`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md) - Single source of truth for project status

### Component READMEs
- **Backend README:** [`/be/README.md`](/be/README.md) - Backend-specific setup
- **Mobile README:** [`/fe/mobile/README.md`](/fe/mobile/README.md) - Mobile-specific setup
- **Web README:** [`/fe/web/README.md`](/fe/web/README.md) - Web-specific setup
- **Infra README:** [`/infra/README.md`](/infra/README.md) - Infrastructure setup

### Deployment & Setup Guides
- **AWS S3 Setup:** [`deployment/aws-s3-setup.md`](./deployment/aws-s3-setup.md) - Media storage configuration
- **WSL2 Network:** [`deployment/wsl2-network-setup.md`](./deployment/wsl2-network-setup.md) - WSL2 port forwarding for mobile testing
- **Infrastructure:** [`deployment/infrastructure-setup.md`](./deployment/infrastructure-setup.md) - Docker Compose services (PostgreSQL, Adminer, LocalStack)
- **E2E Testing:** [`testing/e2e-testing.md`](./testing/e2e-testing.md) - Playwright testing guide

## 🎯 Current Development Focus

**Phase 2 Enhanced Features Status (✅ COMPLETE):**
- ✅ Backend: 100% Complete (15 modules, 845 tests, 90.77% coverage, 83 endpoints)
- ✅ Mobile: 100% Complete (17 screens, 2,141 tests, 80.31% coverage, WCAG 2.1 AA)
- ✅ Web: 100% Complete (18 pages, 11 tests, Next.js 16.1.4)
- ✅ DevOps: 3 CI/CD pipelines, Docker, Firebase guide
- ✅ Database: 16 tables, Phase 2 migration complete

**Phase 2 Code Review & Improvements (January 31-February 1, 2026):**
- ✅ Fixed critical bugs (withAlpha(), ErrorBoundary)
- ✅ Added 84 comprehensive tests (2,057 → 2,141)
- ✅ Coverage +4.1%: API Services +6.22%, Sync Services +5.02%
- ✅ All critical modules ≥80% threshold

**Next Phase:** Phase 2C Client Feedback (spec complete, implementation pending)
- 8-role system overhaul, terminology cleanup (ADR-010)
- Soft polygon geofencing, flat overtime, task hierarchy
- See [Phase 2C specs](./phases/phase-2-c-client-feedback/README.md)

---

**Last Updated:** 2026-02-11
**Maintained By:** Development Team
**Version:** 1.0.0
