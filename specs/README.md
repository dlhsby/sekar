# SEKAR Technical Specifications

This directory contains comprehensive technical specifications for the SEKAR (Sistem Evaluasi Kerja Satgas RTH) project, organized by specialist roles and development phases.

## 📋 Overview

SEKAR is a worker tracking and task management system for DLH Surabaya (Department of Cleanliness and Green Space). The system enables real-time GPS tracking, digital clock-in/out, work reports with multimedia evidence, and supervisor dashboards for managing 500+ workers across 30+ locations.

**Current Status:**
- **Backend:** Phase 2E Complete (1,264 tests, 94.51% coverage, ~130 endpoints, 18 modules)
- **Mobile:** Phase 2E Complete (3,669+ tests, 80.31%+ coverage, 21 screens, WCAG 2.1 AA)
- **Web:** Phase 2E Complete (505+ tests, 96%+ coverage, 21 pages, Next.js 16.1.6)

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
| [`phases/phase-2-d-monitoring/`](./phases/phase-2-d-monitoring/) | Phase 2D | 1 week | Real-Time Monitoring: five-status tracking, Mapbox, location history |
| [`phases/phase-2-e-client-feedback-2/`](./phases/phase-2-e-client-feedback-2/) | Phase 2E | 1 day | Client Feedback II: phone login, multi-area, overtime redesign |
| [`phases/phase-3-plants-monitoring-rebuild/`](./phases/phase-3-plants-monitoring-rebuild/) | Phase 3 | 5-7 weeks (73 dev-days) | Plants Management + Monitoring Rebuild + Public Intake (incl. M1-R Redesign Foundation) — Not Started |
| [`phases/phase-4-production-readiness/`](./phases/phase-4-production-readiness/) | Phase 4 | 6-8 weeks | Production Readiness: FCM, export, E2E, security, polish (Redis adopted in Phase 3) |
| [`phases/phase-5-finishing-ios/`](./phases/phase-5-finishing-ios/) | Phase 5 | 7-9 weeks | Finishing, Release & iOS: Reporting, Analytics, Assets, iOS |

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

**Phase 2E Client Feedback II (✅ COMPLETE — March 11, 2026):**
- ✅ Backend: 18 modules, ~130 endpoints, 1,264 tests (94.51% coverage)
- ✅ Mobile: 21 screens, 3,669+ tests (80.31%+ coverage)
- ✅ Web: 21 pages, 505+ tests (96%+ coverage), Next.js 16.1.6
- ✅ Database: 22 tables, 6 migrations, 8-role system
- ✅ DevOps: 3 CI/CD pipelines, Phase 2D deployed to production
- ✅ ADRs: 15 architecture decision records (ADR-001 through ADR-015)

**Next Phase:** Phase 3 Plants Management + Monitoring Rebuild + Public Intake (5-7 weeks, 73 dev-days, incl. M1-R Redesign Foundation)
- Monitoring v2 (Redis Streams event-sourced, Socket.IO Redis adapter, supercluster, staffing debouncer, stale sweep)
- Plants management (plant_species, area_plants aggregate inventory, notable_plants, per-area pruning cycle)
- Task typing + custom fields (task_type enum, JSONB schema registry, parent/child resume-tomorrow, partial completion)
- Public pruning intake (staff_kecamatan role, pruning_requests, admin_data disposition authority, convert-to-task)
- Service capacity calendar (generic rayon × ISO-week × service_type)
- Plant-seed inventory ledger
- CSV historical backfill (5,008 rows)
- See [Phase 3 specs](./phases/phase-3-plants-monitoring-rebuild/README.md)

**Following Phases:** Phase 4 Production Readiness (FCM, export, E2E, security — Redis inherited from Phase 3), Phase 5 Finishing, Release & iOS (Reporting, Analytics, Assets, iOS).

---

**Last Updated:** 2026-04-24
**Maintained By:** Development Team
**Version:** 2.1.0
