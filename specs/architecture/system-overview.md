# System Overview

## Executive Summary

SEKAR (Sistem Evaluasi Kerja Satgas RTH) is a distributed worker tracking and task management system designed for DLH Surabaya's municipal green space management operations. The system supports 500+ workers across 30+ locations with real-time GPS tracking, digital work reports, and supervisor dashboards.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├────────────────────┬────────────────────┬───────────────────┤
│  React Native      │   React Native     │    Next.js Web    │
│  Mobile (Android)  │   Mobile (iOS)     │    Dashboard      │
│  Phase 1           │   Phase 5          │    Phase 6        │
└─────────┬──────────┴──────────┬─────────┴──────────┬────────┘
          │                     │                     │
          │  REST API + JWT     │                     │
          └─────────────────────┴─────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                    Application Layer                          │
│                    NestJS Backend API                         │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Auth Module │  │  Users   │  │  Areas   │  │  Shifts  │ │
│  └─────────────┘  └──────────┘  └──────────┘  └──────────┘ │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Reports   │  │ Location │  │Supervisor│  │Assignments│ │
│  └─────────────┘  └──────────┘  └──────────┘  └──────────┘ │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│  PostgreSQL    │  │    AWS S3      │  │  Redis      │
│  Database      │  │  Media Storage │  │  Cache      │
│  (RDS)         │  │                │  │  (Phase 2+) │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Architecture Patterns

#### 1. Three-Tier Architecture
- **Presentation Layer:** React Native (mobile), Next.js (web)
- **Application Layer:** NestJS REST API
- **Data Layer:** PostgreSQL + AWS S3

#### 2. Modular Monolith (Backend)
Backend organized as a modular monolith with clear module boundaries:
- Each module owns its domain logic and data
- Modules communicate through well-defined service interfaces
- Shared utilities in common module
- Ready for future microservices extraction if needed

#### 3. Offline-First (Mobile)
Mobile architecture prioritizes offline operation:
- Local-first data storage (AsyncStorage + Encrypted Storage)
- Background sync queue for API operations
- Optimistic UI updates
- Conflict resolution strategies

## System Components

### 1. Backend API (NestJS)

**Purpose:** Central business logic and data management

**Key Modules:**
- **auth:** JWT authentication, role-based access control
- **users:** User management (CRUD, soft delete, profiles)
- **area-types:** Work area type classification
- **areas:** Work location management with GPS boundaries
- **worker-assignments:** Worker-to-area assignments
- **shifts:** Shift tracking (clock-in/out with GPS validation)
- **reports:** Work report submission with multimedia
- **location:** Real-time GPS tracking during shifts
- **supervisor:** Supervisor dashboard aggregations

**Responsibilities:**
- Business logic enforcement
- Data validation and sanitization
- Authentication and authorization
- Database transactions
- File upload coordination
- API rate limiting (Phase 2+)

**Current Status:** Phase 1 MVP Complete (10 modules, 256 tests, 34 endpoints)

### 2. Mobile Application (React Native)

**Purpose:** Field worker interface for daily operations

**Key Features:**
- Worker authentication with biometric support (Phase 2+)
- GPS-validated clock-in/out
- Real-time location tracking during shifts
- Work report submission with camera integration
- Photo/video evidence capture
- Offline operation with background sync
- Push notifications (Phase 2+)

**Architecture Patterns:**
- Redux Toolkit for state management
- React Navigation for routing
- Axios for API communication with retry logic
- AsyncStorage for offline data persistence
- Encrypted Storage for sensitive data (tokens, credentials)

**Current Status:** Phase 1 ~50% Complete (3/12 screens, 62 tests)

### 3. Web Dashboard (Next.js) - Phase 6

**Purpose:** Supervisor and admin interface for oversight

**Key Features:**
- Real-time worker location map
- Shift status monitoring
- Work report review and approval
- Analytics and reporting
- User management
- Area configuration

**Architecture Patterns:**
- Server-side rendering for initial load performance
- React Query for server state management
- Zustand for client state
- Tailwind CSS for styling
- Recharts for data visualization

**Current Status:** Not started (Phase 6)

### 4. Database (PostgreSQL)

**Purpose:** Primary data store for all system data

**Key Characteristics:**
- UUID primary keys for offline compatibility
- Soft delete for audit trail
- Timestamps (created_at, updated_at) on all entities
- Proper indexing for query performance
- Foreign key constraints for referential integrity
- JSONB columns for flexible metadata (Phase 3+)

**Current Status:** Full schema implemented (14 tables)

### 5. Media Storage (AWS S3)

**Purpose:** Photo and video storage for work reports

**Key Features:**
- Presigned URLs for direct upload
- Automatic thumbnail generation (Lambda)
- CDN distribution (CloudFront - Phase 3+)
- Lifecycle policies for cost optimization
- Versioning for audit trail

**Current Status:** Configured for development

## System Characteristics

### Scalability

**Current Scale:**
- 500 workers across 30 locations
- ~2000 shifts per day
- ~1000 reports per day
- ~500MB daily media uploads

**Design for Scale:**
- Horizontal scaling via AWS Elastic Beanstalk / ECS
- Database read replicas (Phase 3+)
- Redis caching layer (Phase 2+)
- S3 + CloudFront for media delivery
- API rate limiting per user/role

### Reliability

**Target SLAs:**
- 99.9% uptime (backend API)
- <500ms average API response time
- <2s mobile app cold start time

**Reliability Measures:**
- Health check endpoints
- Automated backups (daily full, hourly incremental)
- Database connection pooling
- Graceful degradation in mobile app
- Error logging with Sentry (Phase 2+)

### Security

**Security Layers:**
- JWT authentication with 7-day expiration
- Role-based access control (Worker, Supervisor, Admin)
- HTTPS/TLS for all communications
- Password hashing with bcrypt (10 rounds)
- SQL injection protection (TypeORM parameterized queries)
- XSS protection (input sanitization)
- CORS configuration
- Rate limiting (Phase 2+)
- Audit logging (Phase 3+)

### Maintainability

**Code Quality:**
- TypeScript for type safety
- >80% test coverage requirement per module
- ESLint + Prettier for code consistency
- Modular architecture for separation of concerns
- Swagger documentation for all APIs
- Git workflow with PR reviews

**Documentation:**
- Technical specs in `specs/` folder
- API documentation via Swagger
- Development logs in `development_log/`
- README files per component

## Data Flow Patterns

### 1. Clock-In Flow

```
Worker Mobile App
  ↓ (1) Request location permission
GPS Service
  ↓ (2) Get current coordinates
Mobile App
  ↓ (3) Capture selfie photo
Camera Service
  ↓ (4) POST /api/shifts/clock-in
Backend API
  ↓ (5) Validate GPS within area boundary
Haversine Calculation
  ↓ (6) Validate worker assigned to area
Database Query
  ↓ (7) Upload photo to S3
AWS S3
  ↓ (8) Create shift record
PostgreSQL
  ↓ (9) Return success response
Mobile App
  ↓ (10) Show confirmation + start location tracking
```

### 2. Work Report Flow

```
Worker Mobile App
  ↓ (1) Worker fills form + captures photos/videos
Camera/Gallery
  ↓ (2) Store locally if offline
AsyncStorage
  ↓ (3) POST /api/reports (when online)
Backend API
  ↓ (4) Validate shift is active
Database Query
  ↓ (5) Upload media to S3 (parallel)
AWS S3
  ↓ (6) Store report with S3 URLs
PostgreSQL
  ↓ (7) Notify supervisor (Phase 2+)
Push Notification Service
  ↓ (8) Return success + sync status
Mobile App
```

### 3. Offline Sync Flow

```
Mobile App (Offline)
  ↓ (1) User performs action (clock-in, report, etc.)
Offline Queue
  ↓ (2) Store action in local queue
AsyncStorage
  ↓ (3) Network connectivity restored
Network Monitor
  ↓ (4) Process queue in FIFO order
Background Sync Service
  ↓ (5) POST queued actions to API
Backend API
  ↓ (6) Update local data with server response
Mobile State Management
  ↓ (7) Remove from queue on success
AsyncStorage
  ↓ (8) UI updates to reflect sync status
Mobile UI
```

## Integration Points

### Mobile ↔ Backend
- **Protocol:** REST over HTTPS
- **Authentication:** JWT Bearer tokens
- **Data Format:** JSON
- **Media Upload:** Multipart form data
- **Retry Logic:** Exponential backoff (1s, 2s, 4s, 8s, 16s max)

### Backend ↔ Database
- **ORM:** TypeORM
- **Connection Pool:** 10 connections (dev), 50 (prod)
- **Query Logging:** Enabled in development
- **Migrations:** Version controlled in `be/src/database/migrations/`

### Backend ↔ AWS S3
- **SDK:** AWS SDK for JavaScript v3
- **Upload:** Presigned POST URLs (15 min expiration)
- **Download:** Presigned GET URLs (1 hour expiration)
- **Naming:** `{user_id}/{entity_type}/{timestamp}_{uuid}.{ext}`

### Web ↔ Backend
- **Protocol:** REST over HTTPS (same as mobile)
- **Authentication:** JWT with HttpOnly cookies (more secure)
- **Real-time:** Server-Sent Events for live updates (Phase 3+)

## Deployment Architecture

### Development Environment
```
Local Machine
├── Docker Compose
│   ├── PostgreSQL (port 5432)
│   └── Adminer (port 8080)
├── NestJS Dev Server (port 3000)
└── React Native Metro (port 8081)
```

### Production Environment (AWS)
```
Route 53 (DNS)
  ↓
CloudFront (CDN - Phase 3+)
  ↓
Application Load Balancer
  ↓
┌─────────────────────────┐
│  Elastic Beanstalk/ECS  │
│  ┌──────┐  ┌──────┐     │
│  │ API  │  │ API  │     │
│  │ Node │  │ Node │     │
│  └──────┘  └──────┘     │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐  ┌──────┐
│  RDS   │  │  S3  │
│ Postgres│ │ Media │
└────────┘  └──────┘
```

## Technology Decisions

### Why NestJS?
- Enterprise-grade TypeScript framework
- Built-in dependency injection
- Modular architecture support
- Excellent TypeORM integration
- Comprehensive testing utilities
- Swagger integration

### Why React Native?
- Cross-platform (Android + iOS)
- Large ecosystem of libraries
- Reusable components with TypeScript
- Good offline support
- Mature navigation libraries
- Hot reload for fast development

### Why PostgreSQL?
- ACID compliance for data integrity
- JSON/JSONB support for flexibility
- Excellent TypeORM support
- Mature, battle-tested
- Good performance for this scale
- PostGIS support for future geospatial queries (Phase 4+)

### Why UUID Primary Keys?
- Enable offline record creation without conflicts
- No server round-trip needed for ID generation
- Better for distributed systems
- No information leakage (vs sequential IDs)

### Why JWT?
- Stateless authentication
- Works well with mobile apps
- Easy to scale horizontally
- Industry standard
- Can include claims (user_id, role)

## Future Architecture Considerations

### Phase 2+ Enhancements
- Redis caching layer for frequently accessed data
- Push notification service (FCM)
- Background job queue (Bull)
- API rate limiting per user
- Audit logging

### Phase 3+ Enhancements
- CloudFront CDN for media delivery
- ElasticSearch for full-text search
- WebSocket/SSE for real-time updates
- Database read replicas
- Advanced analytics pipeline

### Phase 4+ Enhancements
- PostGIS for advanced geospatial queries
- Time-series database for location data (TimescaleDB)
- Machine learning for route optimization
- Asset tracking with QR codes/NFC

---

---

## Phase 2E: Planned Architecture Changes (Client Feedback II)

> **Full specification:** See [`specs/phases/phase-2-e-client-feedback-2/`](../phases/phase-2-e-client-feedback-2/)
> **ADRs:** [ADR-012](./decisions/ADR-012-phone-number-login.md), [ADR-013](./decisions/ADR-013-multi-area-assignment.md), [ADR-014](./decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](./decisions/ADR-015-audit-trail.md)

### Key Architectural Changes

1. **Dual-Identifier Authentication (ADR-012):** Login accepts phone number OR username via `identifier` field. New `phone_number` column on users with unique partial index.

2. **Multi-Area Assignment Model (ADR-013):** New `user_areas` junction table replaces single `users.area_id` for korlap. Supports `permanent` (admin-assigned) and `task_based` (auto-computed from active tasks) types. `users.area_id` kept for backward compatibility.

3. **Overtime as Flagged Shift (ADR-014):** Overtime reuses shift infrastructure with `shifts.is_overtime` boolean. New `overtimes.shift_id` FK links overtime record to its clock-in/out shift. Requires normal shift clock-out before overtime clock-in.

4. **Generic Audit Trail (ADR-015):** New `audit_logs` table with JSONB `old_value`/`new_value` for tracking entity changes. Append-only, `actor_id` uses `ON DELETE RESTRICT` for immutability. BRIN index for time-range queries.

5. **Expanded Clockable Roles:** `CLOCKABLE_ROLES` expands from [satgas, linmas, korlap] to include admin_data, kepala_rayon. Rayon-level boundary checking for admin_data/kepala_rayon (uses `rayons.boundary_polygon`).

### Breaking Changes
- Login API: `{ username, password }` → `{ identifier, password }`
- Monitoring scope: korlap multi-area boundary checking
- Overtime flow: submission-based → clock-in/out-based

---

**Document Owner:** Software Architect
**Last Updated:** 2026-03-10
**Status:** Active — Phase 2E Planned
**Related Docs:** [`tech-stack.md`](./tech-stack.md), [`data-flow.md`](./data-flow.md), [`security.md`](./security.md)
