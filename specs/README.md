# SEKAR Technical Specifications

This directory contains comprehensive technical specifications for the SEKAR (Sistem Evaluasi Kinerja Satgas RTH) project, organized by specialist roles and development phases.

## 📋 Overview

SEKAR is a worker tracking and task management system for DLH Surabaya (Department of Cleanliness and Green Space). The system enables real-time GPS tracking, digital clock-in/out, work reports with multimedia evidence, and supervisor dashboards for managing 500+ workers across 30+ locations.

**Current Status:** Phases 1–5 shipped (Reporting / Analytics / Assets complete); staging is live on
AWS. The **single source of truth for status + metrics** (tests, coverage, endpoints, what's
deployed) is **[`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md)** — this hub does not duplicate live
numbers. Roughly: backend ~218 endpoints / 33 modules, web (Next.js 16) + mobile (React Native 0.83),
both on the Neo Brutalism design system.

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
| [`phases/phase-2-a-enhanced/`](./phases/phase-2-a-enhanced/) | Phase 2 | Weeks 3-4 | Tasks, Notifications, KMZ Import |
| [`phases/phase-2-c-client-feedback/`](./phases/phase-2-c-client-feedback/) | Phase 2C | 4-6 weeks | Client Feedback: 8-role system, terminology cleanup, polygon geofencing |
| [`phases/phase-2-d-monitoring/`](./phases/phase-2-d-monitoring/) | Phase 2D | 1 week | Real-Time Monitoring: five-status tracking, Mapbox, location history |
| [`phases/phase-2-e-client-feedback-2/`](./phases/phase-2-e-client-feedback-2/) | Phase 2E | 1 day | Client Feedback II: phone login, multi-area, overtime redesign |
| [`phases/phase-3-plants-monitoring-rebuild/`](./phases/phase-3-plants-monitoring-rebuild/) | Phase 3 | ✅ shipped | Plants Management + Monitoring Rebuild + Public Intake (incl. M1-R Redesign Foundation) |
| [`phases/phase-4-production-readiness/`](./phases/phase-4-production-readiness/) | Phase 4 | ✅ shipped | Production Readiness: FCM, export, E2E, security, rebrand/UI revamp, polish |
| [`phases/phase-5-finishing-ios/`](./phases/phase-5-finishing-ios/) | Phase 5 | ✅ shipped (iOS native = Mac-pending) | Finishing, Release & iOS: Reporting, Analytics, Assets |

> The per-phase folders below are **point-in-time records** of what each phase planned/shipped — not
> live status. For current status see [`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md).

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
- [`web/authentication.md`](./web/authentication.md) - AuthContext (JWT cookie) setup
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
- **Authentication:** JWT with Passport.js (15-min access + 7-day refresh, rotation)
- **Storage:** S3 (staging) / MinIO (dev + on-prem prod) for media
- **Realtime / cache:** WebSocket (Socket.IO) + Redis Streams
- **Documentation:** Swagger/OpenAPI at `/api/v1/docs`

### Mobile
- **Framework:** React Native 0.83.1 with TypeScript
- **State Management:** Redux Toolkit
- **Navigation:** React Navigation 7.x
- **Storage:** AsyncStorage + Encrypted Storage
- **Location:** react-native-geolocation-service
- **Maps:** react-native-maps
- **Offline:** Offline-first with sync queue

### Web
- **Framework:** Next.js 16 (App Router) + React 19
- **UI:** shadcn/ui + TailwindCSS 4 (Neo Brutalism design system)
- **State / data:** TanStack Query + Zustand (UI state)
- **Authentication:** JWT via `AuthContext` (httpOnly cookie; route guard in `src/proxy.ts`)
- **Forms:** React Hook Form + Zod · **Tables:** TanStack Table · **Charts:** Recharts
- **Maps:** **Mapbox GL JS** · **Real-time:** Socket.IO client
- **PWA:** installable, offline shell (feature-flagged)

### Infrastructure
- **Staging:** AWS — EC2 sole tenant (dlhsby box) + shared RDS + S3 (instance role), deploy via GitHub **OIDC → ECR → SSM** (no Elastic Beanstalk)
- **Production:** **on-prem** Docker Compose (Postgres + Redis + MinIO), platform-agnostic — not yet deployed
- **CI/CD:** GitHub Actions · **Secrets:** dotenvx (encrypted committed env) · **Local Dev:** Docker Compose (Postgres / MinIO / Redis / Adminer)
- **Monitoring:** CloudWatch (staging); Sentry wired across backend + web + mobile (dormant until a DSN is set)

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

1. **Start at the root** → [`/README.md`](/README.md) (project, local setup, contribute, deploy, release)
2. **Understand the System** → [`architecture/system-overview.md`](./architecture/system-overview.md)
3. **Review Database Design** → [`database/schema.md`](./database/schema.md)
4. **Learn API Contracts** → [`api/contracts.md`](./api/contracts.md) (+ live Swagger `/api/v1/docs`)
5. **Check current status** → [`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md)
6. **Check Your Role's Specs** → role-specific folder from the table above

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

### End-User Documentation
- **User Manual (Panduan):** [`../fe/docs/`](../fe/docs) — public, no-login Bahasa-Indonesia
  user manual (Docusaurus). Live at `https://docs.sekar.wahyutrip.com`. This is for **app users**
  (field workers, admins), distinct from these developer specs. Content is plain markdown under
  `fe/docs/docs/`; edits auto-deploy on push to `main`. See [`fe/docs/README.md`](../fe/docs/README.md).

### Component READMEs
- **Backend README:** [`/be/README.md`](/be/README.md) - Backend-specific setup
- **Mobile README:** [`/fe/mobile/README.md`](/fe/mobile/README.md) - Mobile-specific setup
- **Web README:** [`/fe/web/README.md`](/fe/web/README.md) - Web-specific setup
- **Infra README:** [`/infra/README.md`](/infra/README.md) - Infrastructure setup

### Deployment & Setup Guides
- **Deployment Guide:** [`deployment/deployment-guide.md`](./deployment/deployment-guide.md) - Local → staging → production, all scenarios (hub)
- **Run Locally:** [`deployment/local-development.md`](./deployment/local-development.md) - Docker infra (PostgreSQL, Adminer, MinIO, Redis), per-workspace run, WSL2 device networking
- **Obtaining Keys:** [`deployment/credentials-setup.md`](./deployment/credentials-setup.md) - Firebase, Google Maps, Mapbox, AWS S3 credentials
- **Operations:** [`deployment/operations.md`](./deployment/operations.md) - Migrations, backup/restore, rollback, incident runbooks
- **CI/CD & releases:** [`deployment/ci-cd.md`](./deployment/ci-cd.md) - Pipelines, secrets, `sekar-v*` / `mobile-v*` releases, `scripts/release.sh`
- **Encrypted secrets (dotenvx):** [`deployment/encrypted-secrets.md`](./deployment/encrypted-secrets.md) - Commit encrypted env, decrypt at runtime
- **E2E Testing:** [`testing/web-testing.md`](./testing/web-testing.md) - Playwright testing guide

## 🎯 Current status & focus

Phases 1–5 have shipped (plants/monitoring-rebuild, production-hardening + rebrand, reporting /
analytics / assets). Staging is live on AWS; production (on-prem) is pending the pemkot box. iOS
native packaging needs a Mac.

For the authoritative, up-to-date status, metrics, and recent-work log, see
**[`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md)** (the single source of truth). For deploy/release
mechanics see [`deployment/deployment-guide.md`](./deployment/deployment-guide.md) +
[`deployment/ci-cd.md`](./deployment/ci-cd.md).

---

**Last Updated:** 2026-06-20 · **Status SoT:** [`COMPLETION_STATUS.md`](./COMPLETION_STATUS.md)
