# SEKAR System Design Brief

**System Name:** SEKAR (Sistem Evaluasi Kinerja Satgas RTH)
**Organization:** DLH Surabaya (Dinas Kebersihan dan Ruang Terbuka Hijau)
**Version:** Phase 5 (Reporting/Analytics/Assets feature-complete; code-side Jun 17, 2026)
**Last Updated:** 2026-06-20
**Status:** Phases 1-3 Complete ✅ | Phase 4 ~98% (code-side Jun 11) | Phase 5 release-prep + features shipped | **See `specs/COMPLETION_STATUS.md` for authoritative status**

---

## 1. Executive Summary

SEKAR is a worker tracking and task management system designed for municipal park workers in Surabaya. The system addresses critical operational challenges: lack of worker visibility, difficulty verifying work completion, slow incident response, and paper-based reporting that leads to lost or delayed information.

**Recommended Approach:** A hybrid mobile-first solution with offline-first architecture, GPS-validated clock-in/out (100m tolerance), photo-verified work reports, and real-time supervisor dashboards. Built on a modular monolith backend (NestJS) with React Native mobile apps, the system is designed for poor connectivity environments typical of outdoor park work.

**Why This Approach:**
- **Offline-First:** Park workers often lack reliable connectivity; the system queues all actions locally and syncs when available
- **GPS + Photo Verification:** Prevents clock-in fraud while respecting worker privacy (no continuous surveillance)
- **Modular Monolith:** Simpler deployment and maintenance for a 1-developer team while allowing future microservices extraction
- **React Native:** Code reuse between Android and iOS, mature ecosystem, strong offline capabilities

**Key Constraints Addressed:**
- $50K initial budget / $2K monthly operational
- 1 developer, 3-month timeline to pilot
- 500 workers, 10 supervisors, 50+ park areas
- Poor network coverage in parks
- Indonesian labor law compliance

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────────────────┐
                                    │                         AWS CLOUD                               │
                                    │  ┌─────────────────────────────────────────────────────────┐    │
                                    │  │                   PRODUCTION VPC                         │    │
                                    │  │                                                          │    │
┌─────────────────┐                 │  │  ┌─────────────┐    ┌─────────────────────────────┐     │    │
│  MOBILE APPS    │                 │  │  │   Route 53  │────│     CloudFront CDN          │     │    │
│  (React Native) │                 │  │  │    (DNS)    │    │   (Static Assets, S3 URLs)  │     │    │
├─────────────────┤                 │  │  └──────┬──────┘    └──────────────────────────────┘    │    │
│ ┌─────────────┐ │    HTTPS/WSS   │  │         │                                               │    │
│ │   Worker    │ │◄───────────────┼──┼─────────▼────────────────────────────────────────────┐  │    │
│ │    App      │ │                 │  │  ┌─────────────────────────────────────────────────┐ │  │    │
│ │  - Clock    │ │                 │  │  │        Application Load Balancer                │ │  │    │
│ │  - Reports  │ │                 │  │  │   (SSL Termination, Health Checks)              │ │  │    │
│ │  - Location │ │                 │  │  └─────────────────────┬───────────────────────────┘ │  │    │
│ └─────────────┘ │                 │  │                        │                              │  │    │
├─────────────────┤                 │  │           ┌────────────┼────────────┐                 │  │    │
│ ┌─────────────┐ │                 │  │           ▼            ▼            ▼                 │  │    │
│ │ Supervisor  │ │                 │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐           │  │    │
│ │    App      │ │                 │  │  │  NestJS   │ │  NestJS   │ │  NestJS   │           │  │    │
│ │  - Map View │ │                 │  │  │ Instance 1│ │ Instance 2│ │ Instance N│           │  │    │
│ │  - Reports  │ │                 │  │  │   (ECS)   │ │   (ECS)   │ │   (ECS)   │           │  │    │
│ │  - Approve  │ │                 │  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘           │  │    │
│ └─────────────┘ │                 │  │        │             │             │                  │  │    │
└─────────────────┘                 │  │        └─────────────┼─────────────┘                  │  │    │
                                    │  │                      │                                 │  │    │
┌─────────────────┐                 │  │         ┌────────────┴────────────┐                   │  │    │
│   WEB DASHBOARD │                 │  │         ▼                         ▼                   │  │    │
│   (Next.js)     │                 │  │  ┌─────────────┐          ┌─────────────┐            │  │    │
│   [Phase 6]     │                 │  │  │    RDS      │          │    AWS S3   │            │  │    │
│ ┌─────────────┐ │                 │  │  │ PostgreSQL  │          │   (Media)   │            │  │    │
│ │   Admin     │ │                 │  │  │  (Primary)  │          │  - Photos   │            │  │    │
│ │  Dashboard  │ │                 │  │  │             │          │  - Videos   │            │  │    │
│ │  - CRUD     │ │                 │  │  └──────┬──────┘          └─────────────┘            │  │    │
│ │  - Reports  │ │                 │  │         │                                             │  │    │
│ │  - Analytics│ │                 │  │         ▼                                             │  │    │
│ └─────────────┘ │                 │  │  ┌─────────────┐    ┌─────────────┐                   │  │    │
└─────────────────┘                 │  │  │    RDS      │    │   Redis     │                   │  │    │
                                    │  │  │  (Replica)  │    │  (Phase 2+) │                   │  │    │
                                    │  │  └─────────────┘    └─────────────┘                   │  │    │
                                    │  │                                                        │  │    │
                                    │  └────────────────────────────────────────────────────────┘  │    │
                                    │                                                              │    │
                                    │  ┌──────────────────────────────────────────────────────────┐│    │
                                    │  │ SUPPORTING SERVICES                                      ││    │
                                    │  │ - CloudWatch (Monitoring, Logs)                          ││    │
                                    │  │ - SNS/FCM (Push Notifications - Phase 2)                 ││    │
                                    │  │ - SES (Email Reports - Phase 3)                          ││    │
                                    │  │ - ElasticSearch (Full-text Search - Phase 3)             ││    │
                                    │  └──────────────────────────────────────────────────────────┘│    │
                                    └──────────────────────────────────────────────────────────────┘    │
                                                                                                        │
```

### 2.2 Mobile Offline-First Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP (React Native)                                  │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           UI LAYER (React Components)                            │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐         │   │
│  │  │   Login   │ │   Home    │ │ Clock In  │ │  Submit   │ │  Reports  │         │   │
│  │  │  Screen   │ │  Screen   │ │   /Out    │ │  Report   │ │   List    │         │   │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘         │   │
│  └────────┼─────────────┼─────────────┼─────────────┼─────────────┼───────────────┘   │
│           │             │             │             │             │                    │
│  ┌────────▼─────────────▼─────────────▼─────────────▼─────────────▼───────────────┐   │
│  │                           STATE LAYER (Redux Toolkit)                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │  Auth Slice │  │ Shift Slice │  │Report Slice │  │Offline Slice│             │   │
│  │  │  - tokens   │  │  - current  │  │  - drafts   │  │  - queue    │             │   │
│  │  │  - user     │  │  - history  │  │  - list     │  │  - status   │             │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │   │
│  └─────────┼────────────────┼────────────────┼────────────────┼────────────────────┘   │
│            │                │                │                │                        │
│  ┌─────────▼────────────────▼────────────────▼────────────────▼────────────────────┐   │
│  │                           SERVICE LAYER                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ API Client  │  │  Location   │  │   Media     │  │    Sync     │              │   │
│  │  │  (Axios)    │  │  Service    │  │  Service    │  │   Manager   │              │   │
│  │  │ - JWT int.  │  │ - GPS track │  │ - Capture   │  │ - Queue     │              │   │
│  │  │ - Retry     │  │ - Haversine │  │ - Compress  │  │ - Retry     │              │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │   │
│  └─────────┼────────────────┼────────────────┼────────────────┼─────────────────────┘   │
│            │                │                │                │                         │
│  ┌─────────▼────────────────▼────────────────▼────────────────▼─────────────────────┐   │
│  │                           STORAGE LAYER                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │   │
│  │  │  AsyncStorage   │  │Encrypted Storage│  │   File System   │                    │   │
│  │  │  - Offline Q    │  │  - JWT Tokens   │  │  - Photos       │                    │   │
│  │  │  - Cache        │  │  - User Data    │  │  - Pending      │                    │   │
│  │  │  - Redux State  │  │  - Credentials  │  │    Uploads      │                    │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                    │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           NATIVE MODULES                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  Geoloc.    │  │   Camera    │  │   NetInfo   │  │    Push     │               │   │
│  │  │  Service    │  │   Module    │  │  (Network)  │  │   Notifs    │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow - Key Scenarios

#### 2.3.1 Clock-In Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Worker  │     │  Mobile  │     │  Backend │     │ Database │     │   S3     │
│   App    │     │ Services │     │  NestJS  │     │ PostgreSQL│    │  Media   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Tap "Clock In"               │                │                │
     │────────────────►                │                │                │
     │                │                │                │                │
     │     2. Get GPS Location         │                │                │
     │◄───────────────│                │                │                │
     │    (lat, lng, accuracy)         │                │                │
     │                │                │                │                │
     │ 3. Capture Selfie               │                │                │
     │────────────────►                │                │                │
     │     (compress to 500KB)         │                │                │
     │                │                │                │                │
     │◄───────────────│                │                │                │
     │  4. Return photo file           │                │                │
     │                │                │                │                │
     │   5. POST /api/shifts/clock-in  │                │                │
     │────────────────┼───────────────►│                │                │
     │    {lat, lng, photo_base64}     │                │                │
     │                │                │                │                │
     │                │    6. Validate GPS (Haversine)  │                │
     │                │    Distance <= 100m from area  │                │
     │                │────────────────┼───────────────►│                │
     │                │         7. Get worker assignment│                │
     │                │◄───────────────┼────────────────│                │
     │                │                │                │                │
     │                │    8. Upload selfie to S3       │                │
     │                │────────────────┼────────────────┼───────────────►│
     │                │◄───────────────┼────────────────┼────────────────│
     │                │         9. Return S3 URL        │                │
     │                │                │                │                │
     │                │   10. Create shift record       │                │
     │                │────────────────┼───────────────►│                │
     │                │◄───────────────┼────────────────│                │
     │                │         11. Shift created       │                │
     │                │                │                │                │
     │◄───────────────┼────────────────│                │                │
     │  12. Success {shift_id, area_name, clock_in_time}│                │
     │                │                │                │                │
     │ 13. Start Location Tracking (every 5 min)        │                │
     │────────────────►                │                │                │
     │                │                │                │                │
```

#### 2.3.2 Offline Report Submission Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Worker  │     │ Offline  │     │   Sync   │     │  Backend │     │   S3     │
│   App    │     │  Queue   │     │  Manager │     │  NestJS  │     │  Media   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Submit report (OFFLINE)      │                │                │
     │────────────────►                │                │                │
     │   {type, description,           │                │                │
     │    photos[], gps}               │                │                │
     │                │                │                │                │
     │ 2. Store in queue (AsyncStorage)│                │                │
     │◄───────────────│                │                │                │
     │  "Saved offline - will sync"    │                │                │
     │                │                │                │                │
     │    ...time passes, network restored...           │                │
     │                │                │                │                │
     │                │ 3. Network restored event       │                │
     │                │────────────────►                │                │
     │                │                │                │                │
     │                │ 4. Process queue (FIFO)         │                │
     │                │◄───────────────│                │                │
     │                │                │                │                │
     │                │                │ 5. POST /api/reports             │
     │                │                │───────────────►│                │
     │                │                │ {photos as base64}              │
     │                │                │                │                │
     │                │                │   6. Upload photos to S3        │
     │                │                │                │───────────────►│
     │                │                │                │◄───────────────│
     │                │                │                │  7. S3 URLs    │
     │                │                │                │                │
     │                │                │ 8. Report saved│                │
     │                │                │◄───────────────│                │
     │                │                │                │                │
     │                │ 9. Remove from queue            │                │
     │                │◄───────────────│                │                │
     │                │                │                │                │
     │ 10. Sync complete notification  │                │                │
     │◄───────────────┼────────────────│                │                │
     │  "Report synced successfully"   │                │                │
     │                │                │                │                │
```

### 2.4 Why This Architecture (Not Alternatives)

| Consideration | Our Choice | Alternative Rejected | Rationale |
|---------------|------------|---------------------|-----------|
| **Backend Framework** | NestJS (Modular Monolith) | Express.js / Microservices | NestJS provides structure for 1 developer; microservices add operational complexity |
| **Mobile Framework** | React Native | Flutter / Native | TypeScript consistency with backend; larger ecosystem; mature offline libraries |
| **Database** | PostgreSQL | MongoDB / MySQL | ACID compliance critical for attendance; JSON support for flexible data; mature geospatial |
| **Primary Keys** | UUID | Auto-increment INT | Enables offline record creation without ID conflicts during sync |
| **Offline Storage** | AsyncStorage | WatermelonDB / Realm | Simpler for Phase 1 (30 workers); can migrate to WatermelonDB in Phase 2 if needed |
| **GPS Validation** | Checkpoint + Periodic (Hybrid) | Continuous Geofencing | Better battery life; respects privacy; 100m tolerance handles GPS inaccuracy |
| **Authentication** | JWT (15min access + 7d refresh) | Session-based | Stateless scales horizontally; works offline with cached tokens |
| **File Storage** | AWS S3 | Local / Azure Blob | Proven scalability; presigned URLs; cost-effective |

---

## 3. Technology Stack

### 3.1 Core Technology Stack

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Backend Framework** | NestJS | 10.x | Enterprise TypeScript, modular architecture, excellent documentation, built-in DI |
| **Backend Language** | TypeScript | 5.x | Type safety, better IDE support, catches bugs early |
| **Database** | PostgreSQL | 14+ | ACID compliance, UUID support, JSON/JSONB, mature geospatial, open-source |
| **ORM** | TypeORM | 0.3.x | Code-first migrations, excellent NestJS integration, repository pattern |
| **Authentication** | JWT + Passport.js | 10.x / 0.7.x | Stateless, mobile-friendly, industry standard |
| **API Documentation** | Swagger/OpenAPI | 7.x | Auto-generated interactive docs from decorators |
| **File Storage** | AWS S3 + SDK v3 | 3.x | Presigned URLs, scalable, cost-effective for media |
| **Mobile Framework** | React Native | 0.76.x | Cross-platform, TypeScript, strong offline ecosystem |
| **Mobile State** | Redux Toolkit | 2.x | Predictable state, redux-persist for offline |
| **Mobile Navigation** | React Navigation | 7.x | Native-feel navigation, deep linking support |
| **Mobile Storage** | AsyncStorage + EncryptedStorage | 1.x / 4.x | Offline queue, secure token storage |
| **Mobile Location** | react-native-geolocation-service | 5.x | More reliable than built-in, background support |
| **Mobile Maps** | react-native-maps | 1.x | Google Maps on Android, Apple Maps on iOS |
| **Mobile Camera** | react-native-image-picker | 7.x | Photo/video capture with compression |
| **Web Framework** | Next.js | 15.x | App Router, SSR, excellent DX |
| **Web UI** | Shadcn/ui + TailwindCSS | Latest | Accessible components, consistent design |
| **Web State** | TanStack Query | 5.x | Server state management, caching, real-time |
| **Web Auth** | AuthContext (custom) | — | JWT in httpOnly cookie, route guard in src/proxy.ts |
| **Infrastructure** | AWS (RDS, S3, ECS) | - | Scalable, managed services, regional availability |
| **CI/CD** | GitHub Actions | - | Free tier, integrated with repository |
| **Containerization** | Docker + Docker Compose | 24.x | Consistent environments, easy local setup |
| **Monitoring** | CloudWatch + Sentry | - | AWS-native logs; Sentry for error tracking |

### 3.2 Development vs Production Environment

| Component | Development | Production |
|-----------|-------------|------------|
| **Database** | Docker PostgreSQL (localhost:5432) | AWS RDS PostgreSQL (Multi-AZ) |
| **S3 Storage** | LocalStack (localhost:4566) | AWS S3 (ap-southeast-1) |
| **Backend** | `npm run start:dev` (hot reload) | AWS ECS (4 instances, auto-scale) |
| **Database Admin** | Adminer (localhost:8080) | AWS RDS Console |
| **Monitoring** | Console logs | CloudWatch + Sentry |
| **Connection Pool** | 10 connections | 15/instance (60 total) |
| **Rate Limiting** | Disabled | 100 req/min global, 5/min login |

---

## 4. Cost Estimate

### 4.1 Pilot Phase (3 Parks, 30 Workers)

| Service | Specification | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **AWS RDS PostgreSQL** | db.t3.micro, 20GB storage | $15-20 |
| **AWS S3** | ~5GB storage, ~10k requests | $1-2 |
| **AWS ECS** | 2 x t3.micro (0.5 vCPU, 1GB) | $15-20 |
| **AWS ALB** | Application Load Balancer | $16 |
| **CloudWatch** | Basic monitoring + logs | $5 |
| **Route 53** | DNS hosting | $0.50 |
| **Data Transfer** | ~10GB outbound | $1 |
| **Google Play Console** | One-time registration | $25 (one-time) |
| **Domain Name** | .id domain (annual) | $10/year |
| **SSL Certificate** | AWS ACM (free) | $0 |
| **Push Notifications** | Firebase FCM (free tier) | $0 |
| **TOTAL MONTHLY** | | **~$55-65** |

### 4.2 Full Scale (50 Parks, 500 Workers)

| Service | Specification | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **AWS RDS PostgreSQL** | db.t3.medium, 100GB, Multi-AZ | $80-100 |
| **AWS RDS Read Replica** | db.t3.small (read scaling) | $30 |
| **AWS S3** | ~100GB storage, ~500k requests | $5-10 |
| **AWS S3 Glacier** | Archive (1-year old data) | $1-2 |
| **AWS CloudFront** | CDN for media delivery | $10-15 |
| **AWS ECS** | 4 x t3.small (1 vCPU, 2GB) | $60-80 |
| **AWS ElastiCache Redis** | cache.t3.micro | $15-20 |
| **AWS ALB** | Application Load Balancer | $20-25 |
| **CloudWatch** | Enhanced monitoring + logs | $20-30 |
| **Route 53** | DNS + health checks | $5 |
| **Data Transfer** | ~100GB outbound | $10-15 |
| **Google Play Console** | Already paid | $0 |
| **Apple Developer** | Annual fee | $99/year ($8/month) |
| **Domain Name** | .id domain | $10/year |
| **Sentry** | Team plan (error tracking) | $26 |
| **Push Notifications** | Firebase FCM (free tier) | $0 |
| **Email (SES)** | Report delivery (~5000/month) | $1 |
| **TOTAL MONTHLY** | | **~$300-350** |

### 4.3 Cost Comparison Summary

| Phase | Workers | Monthly Ops | Annual | Notes |
|-------|---------|-------------|--------|-------|
| **Pilot** | 30 | $60 | $720 | Well under $2K/month target |
| **Full Scale** | 500 | $325 | $3,900 | Still significantly under budget |
| **With Buffer** | 500 | $500 | $6,000 | 50% buffer for growth |

**Initial Development Costs:**
- Developer salary (3 months): Included in existing budget
- AWS setup: ~$100 (one-time)
- Testing devices: ~$300 (2 Android phones)
- **Total Initial:** ~$400 (well under $50K budget)

---

## 5. Key Design Decisions

### 5.1 Location Verification Strategy

**Decision: Option D - Hybrid (Checkpoint + Periodic)**

| Aspect | Implementation | Rationale |
|--------|---------------|-----------|
| **Clock-In/Out** | GPS + Selfie verification | Fraud prevention with photo evidence |
| **Boundary Tolerance** | 100 meters (Haversine formula) | Accounts for GPS inaccuracy under tree cover |
| **During Shift** | Location logged every 5 minutes | Validates presence without constant surveillance |
| **Battery Impact** | Minimal (not continuous tracking) | Foreground service only during shift |
| **Privacy Compliance** | No tracking outside work hours | Workers own location data during shift only |
| **Spoofing Detection** | Speed check (25 km/h max), teleport detection | Prevents GPS faker apps |

**Why Not Other Options:**
- **Option A (Checkpoint only):** Too easy to game; no verification during shift
- **Option B (Geofencing):** Battery-intensive; unreliable with complex park boundaries
- **Option C (Continuous polling):** Privacy concerns; excessive battery drain

### 5.2 Mobile App Architecture

**Decision: Single unified app with role-based navigation**

```
┌─────────────────────────────────────────────────────────────────┐
│                     SEKAR Mobile App                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Auth Layer                               │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │ │
│  │  │   Login Screen  │ │  JWT Storage    │ │ Role Detection │  │ │
│  │  │   (All roles)   │ │ (Encrypted)     │ │ (Auto-route)  │  │ │
│  │  └─────────────────┘ └─────────────────┘ └───────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                      │
│           ┌────────────────┴────────────────┐                    │
│           ▼                                  ▼                    │
│  ┌─────────────────────┐          ┌─────────────────────┐        │
│  │   WORKER MODULE     │          │  SUPERVISOR MODULE   │        │
│  │  ┌───────────────┐  │          │  ┌───────────────┐  │        │
│  │  │ Home Screen   │  │          │  │ Map Dashboard │  │        │
│  │  │ - Shift timer │  │          │  │ - Live workers│  │        │
│  │  │ - Quick actions│ │          │  │ - Area status │  │        │
│  │  ├───────────────┤  │          │  ├───────────────┤  │        │
│  │  │ Clock In/Out  │  │          │  │ Attendance    │  │        │
│  │  │ - GPS check   │  │          │  │ - Daily view  │  │        │
│  │  │ - Selfie      │  │          │  │ - Reports     │  │        │
│  │  ├───────────────┤  │          │  ├───────────────┤  │        │
│  │  │ Report Submit │  │          │  │ Report Review │  │        │
│  │  │ - Multi-photo │  │          │  │ - Approve     │  │        │
│  │  │ - Work types  │  │          │  │ - Reject      │  │        │
│  │  ├───────────────┤  │          │  ├───────────────┤  │        │
│  │  │ Reports List  │  │          │  │ Reports List  │  │        │
│  │  ├───────────────┤  │          │  ├───────────────┤  │        │
│  │  │ Profile       │  │          │  │ Profile       │  │        │
│  │  └───────────────┘  │          │  └───────────────┘  │        │
│  └─────────────────────┘          └─────────────────────┘        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   SHARED SERVICES                            │ │
│  │  - Offline Queue - Location Service - Media Service          │ │
│  │  - API Client - Sync Manager - Permissions                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Single codebase reduces maintenance for 1-developer team
- Shared offline infrastructure and services
- One app store listing to manage
- Consistent UX across roles
- Role-specific features hidden until needed

### 5.3 Offline-First Data Sync

**Implementation:**

```typescript
// Offline Queue Item Structure
interface OfflineQueueItem {
  id: string;           // UUID generated client-side
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'REPORT' | 'LOCATION';
  data: any;            // Payload including photos as base64
  timestamp: number;    // When action was taken
  retries: number;      // Retry count (max 3)
  status: 'pending' | 'syncing' | 'failed';
}

// Priority Order for Sync
const SYNC_PRIORITY = ['CLOCK_IN', 'CLOCK_OUT', 'REPORT', 'LOCATION'];

// Retry Strategy
const RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min
```

**Sync Rules:**
| Rule | Implementation |
|------|---------------|
| **Queue Size** | Max 100 items (oldest removed first) |
| **Queue Age** | Max 7 days (after that, marked as expired) |
| **Photo Strategy** | Compress to 500KB, store locally until synced |
| **Conflict Resolution** | Server wins; local marked as conflict |
| **Network Detection** | NetInfo library; sync on connection restored |
| **Batch Upload** | Photos uploaded in parallel (max 3 concurrent) |

### 5.4 Asset Reporting Data Model (Phase 4)

**Schema Design:**

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│      AREAS          │     │       ASSETS        │     │   ASSET_TYPES       │
├─────────────────────┤     ├─────────────────────┤     ├─────────────────────┤
│ id (UUID) PK        │     │ id (UUID) PK        │     │ id (UUID) PK        │
│ name                │◄────│ location_id FK          │     │ name                │
│ type_id FK          │     │ asset_type_id FK    │────►│ category            │
│ center_lat          │     │ code (QR reference) │     │ requires_maintenance│
│ center_lng          │     │ name                │     │ created_at          │
│ radius_meters       │     │ condition (1-5)     │     └─────────────────────┘
│ status              │     │ last_maintenance    │
└─────────────────────┘     │ photo_url           │     ┌─────────────────────┐
                            │ gps_lat, gps_lng    │     │ MAINTENANCE_RECORDS │
                            │ created_at          │     ├─────────────────────┤
                            │ updated_at          │     │ id (UUID) PK        │
                            └─────────────────────┘     │ asset_id FK         │
                                      ▲                 │ worker_id FK        │
                                      │                 │ type                │
                            ┌─────────┴─────────────┐   │ description         │
                            │   ASSET_ASSIGNMENTS   │   │ condition_before    │
                            ├───────────────────────┤   │ condition_after     │
                            │ id (UUID) PK          │   │ photos[]            │
                            │ asset_id FK           │   │ completed_at        │
                            │ worker_id FK          │   └─────────────────────┘
                            │ assigned_at           │
                            │ returned_at           │
                            └───────────────────────┘
```

**Condition Scale:** 1-5 (Poor, Fair, Good, Very Good, Excellent) with photo evidence required for condition < 3.

### 5.5 Pilot-to-Scale Strategy

**Phase Approach:**

| Phase | Scope | Key Validations | Scale-Ready Decisions |
|-------|-------|-----------------|----------------------|
| **Pilot (Week 1-2)** | 3 parks, 30 workers | GPS accuracy in parks; offline sync reliability; user acceptance | UUID keys; JWT auth; S3 for media |
| **Validation (Week 3-4)** | Same scope + tasks | Task workflow; push notifications | Redis caching; connection pooling |
| **Expansion (Week 5-8)** | 10 parks, 100 workers | Performance under load; report volume | Database indexes; table partitioning |
| **Full Scale (Week 9-16)** | 50 parks, 500 workers | Production hardening; analytics | Read replicas; CDN; monitoring |

**Shortcuts Acceptable for Pilot:**
- AsyncStorage instead of WatermelonDB (sufficient for 30 workers)
- Single database instance (no read replicas)
- Manual deployment (no CI/CD pipeline)
- Basic monitoring (console logs + basic CloudWatch)
- No caching layer (Redis deferred to Phase 2)

**Must Be Scale-Ready from Day One:**
- UUID primary keys (offline-first requirement)
- JWT authentication (stateless scaling)
- S3 for media (no local file storage)
- PostgreSQL with TypeORM (proper indexing support)
- Docker containerization (deployment consistency)

---

## 6. Key Risks & Mitigations

### 6.1 Top 5 Risks

| # | Risk | Probability | Impact | Mitigation Strategy |
|---|------|-------------|--------|---------------------|
| **1** | **GPS unreliable under tree cover** | High | High | 100m tolerance; workers can adjust position; photo evidence as backup; allow manual override with supervisor approval |
| **2** | **Worker resistance to "surveillance"** | Medium | High | Frame as safety tool (lone worker protection); show only work-hour data to supervisors; transparent data usage policy; involve union in design |
| **3** | **Poor network connectivity in parks** | High | Medium | Offline-first architecture; queue all actions locally; automatic sync on connection; visual sync status indicator |
| **4** | **Single developer bandwidth** | Medium | High | Phased delivery (MVP first); use proven frameworks (NestJS, React Native); leverage libraries over custom code; prioritize ruthlessly |
| **5** | **Device fragmentation (Android)** | Medium | Medium | Target Android 8+ (95% coverage in Indonesia); test on low-end devices (2GB RAM); photo compression to reduce memory; minimal native modules |

### 6.2 Additional Risk Considerations

| Risk Category | Specific Risk | Mitigation |
|--------------|--------------|------------|
| **Security** | GPS spoofing apps | Speed/teleport detection; pattern analysis; selfie verification at clock-in |
| **Security** | Token theft | Encrypted storage; 15-min access tokens; refresh token rotation |
| **Privacy** | Data misuse concerns | Clear data policy; GDPR-like practices; data deletion on request |
| **Operational** | Photo storage costs | Compression (500KB target); 1-year archive to Glacier; quotas per user |
| **Technical** | Database performance at scale | Connection pooling; monthly partitioning; proper indexes |
| **Adoption** | Low tech literacy | Simple UI; Indonesian language; minimal text; icon-heavy design |

---

## 7. Implementation Roadmap

### 7.1 Phase Timeline Overview

```
Week 1-2: PHASE 1 - MVP (COMPLETE)
├── Backend: 9 modules, 37 endpoints, 401 tests
├── Mobile: 12 screens, 12 components, 894 tests
├── Features: Clock-in/out, Reports, Location tracking
└── Status: Ready for pilot deployment

Week 3-4: PHASE 2 - Enhanced Features
├── Task assignment system
├── Push notifications (FCM)
├── KMZ/KML import for area boundaries
├── Redis caching layer
└── Multi-photo reports (up to 5)

Week 5-7: PHASE 3 - Analytics & Reporting
├── Worker performance analytics
├── Area coverage analytics
├── Automated scheduled reports (email)
├── Custom report builder (PDF/CSV/Excel)
├── Real-time WebSocket updates
└── ElasticSearch for full-text search

Week 8-10: PHASE 4 - Asset Management
├── Asset registry system
├── QR code scanning
├── Maintenance scheduling
├── Asset assignment history
└── Maintenance reports

Week 11-13: PHASE 5 - iOS & Advanced
├── iOS app release (full parity)
├── Apple Sign-In integration
├── Siri Shortcuts
├── Biometric authentication
├── Advanced fraud detection
└── Multi-language support (i18n)

Week 14-16: PHASE 6 - Web Dashboard
├── Next.js 15 admin dashboard
├── Full CRUD operations
├── Bulk operations (CSV import/export)
├── Advanced reporting UI
├── Audit logging
└── Admin configuration panel
```

### 7.2 Phase 1 Completion Details (Current State)

**Backend Modules (9):**
1. **Auth** - JWT login, token refresh, logout
2. **Users** - CRUD with soft delete, role management
3. **Area Types** - Reference data (Park, Pedestrian, etc.)
4. **Areas** - Work areas with GPS boundaries
5. **Worker Assignments** - Worker-to-area mapping
6. **Shifts** - Clock-in/out with GPS validation
7. **Reports** - Work reports with photos
8. **Location** - Background GPS tracking
9. **Supervisor** - Dashboard APIs

**Mobile Screens (12):**
- Auth: LoginScreen
- Worker: HomeScreen, ClockInOutScreen, ReportSubmissionScreen, ReportsListScreen, ProfileScreen
- Supervisor: MapDashboardScreen, AttendanceScreen, ReportsListScreen, ReportDetailScreen, ProfileScreen

**API Endpoints (37):**
- Auth: 4 endpoints
- Users: 5 endpoints
- Area Types: 2 endpoints
- Areas: 5 endpoints
- Worker Assignments: 2 endpoints
- Shifts: 5 endpoints
- Reports: 6 endpoints
- Location: 3 endpoints
- Supervisor: 5 endpoints

**Test Coverage:**
- Backend: 401 tests, 84.23% coverage
- Mobile: 894 tests, 76.51% coverage

---

## 8. Success Metrics

### 8.1 System Success Metrics (Not Just Tracking)

| Metric | Baseline | Target (3 months) | How to Measure |
|--------|----------|-------------------|----------------|
| **Incident Response Time** | 2+ hours (manual) | < 30 minutes | Task assignment to clock-in at location |
| **Report Completion Rate** | Unknown | > 90% of shifts | Reports submitted / Total shifts |
| **Supervisor Drive Time** | 4 hours/day | < 1 hour/day | Self-reported; verified via GPS |
| **Photo Evidence Compliance** | 0% (paper-based) | > 95% of reports | Reports with photos / Total reports |
| **Sync Success Rate** | N/A | > 99% | Successful syncs / Total queue items |
| **App Crash Rate** | N/A | < 1% | Sentry crash reports / Total sessions |
| **User Adoption** | 0% | > 85% active daily | DAU / Total registered workers |

### 8.2 Quality Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| **Backend Test Coverage** | > 80% | 84.23% |
| **Mobile Test Coverage** | > 75% | 76.51% |
| **API Response Time (p95)** | < 500ms | To be measured |
| **Clock-In Success Rate** | > 98% | To be measured |
| **Offline Queue Recovery** | 100% | To be measured |
| **WCAG AA Compliance** | 100% | Design specs ready |

---

## 9. Privacy & Labor Compliance

### 9.1 Privacy Safeguards

| Concern | Safeguard | Implementation |
|---------|-----------|----------------|
| **Location outside work** | No tracking | GPS service stops at clock-out; no background tracking |
| **Continuous surveillance** | Periodic only | 5-minute intervals, not real-time stream |
| **Data retention** | Limited | 90-day active retention; archive after 1 year; delete on request |
| **Access control** | Role-based | Supervisors see only their assigned workers; admins have audit logs |
| **Transparency** | Clear policy | In-app data usage explanation; worker can see their own data |

### 9.2 Labor Law Compliance (Indonesian Context)

| Requirement | Implementation |
|-------------|---------------|
| **Work hour tracking** | Accurate clock-in/out with GPS verification |
| **Overtime visibility** | Shift duration calculated; alerts for > 8 hours |
| **Rest period compliance** | System enforces minimum 5-minute shift |
| **Worker consent** | Explicit permission during onboarding |
| **Union involvement** | Design review with labor representatives |
| **Data access** | Workers can export their own attendance records |

### 9.3 Positioning as "Safety Tool"

**Key Messaging:**
- "Know when your colleague needs help" (lone worker safety)
- "Prove your presence during disputes" (worker protection)
- "Report hazards immediately" (incident reporting)
- "Get help faster" (emergency response)

---

## 10. Architectural Decision Records (ADRs)

### 10.1 ADR Summary

| ADR | Decision | Status |
|-----|----------|--------|
| **ADR-001** | UUID primary keys for offline compatibility | Accepted |
| **ADR-002** | Offline-first mobile with AsyncStorage queue | Accepted |
| **ADR-003** | AsyncStorage for Phase 1 (WatermelonDB deferred) | Accepted |
| **ADR-004** | JWT authentication (15min access + 7day refresh) | Accepted |
| **ADR-005** | 100m GPS boundary tolerance (Haversine) | Accepted |
| **ADR-006** | PostgreSQL monthly partitioning for location_logs | Accepted |
| **ADR-007** | React Native over Flutter for mobile | Accepted |
| **ADR-008** | Modular monolith (NestJS) over microservices | Accepted |

### 10.2 Key ADR Details

**ADR-001: UUID Primary Keys**
- **Context:** Mobile app needs to create records offline
- **Decision:** All tables use UUID v4 primary keys
- **Consequence:** 4x larger indexes, but enables true offline-first
- **Implementation:** `uuid_generate_v4()` in PostgreSQL, `uuid` library in React Native

**ADR-002: Offline-First Architecture**
- **Context:** Park workers often have poor connectivity
- **Decision:** All actions queued locally first, synced when online
- **Consequence:** More complex sync logic, but 100% offline capability
- **Implementation:** AsyncStorage queue with priority processing

**ADR-005: 100m GPS Tolerance**
- **Context:** GPS accuracy varies under tree cover (10-50m error)
- **Decision:** Accept clock-in if worker is within 100m of area center
- **Consequence:** Potential for edge-case fraud, mitigated by photo evidence
- **Implementation:** Haversine formula for distance calculation

---

## 11. Development Commands

### 11.1 Backend Commands

```bash
cd be
npm run start:dev          # Development server with hot reload
npm run test:cov           # Run tests with coverage report
npm run seed               # Seed database with test data
npm run build              # Build for production
```

### 11.2 Mobile Commands

```bash
cd apps/mobile
npm start                  # Start Metro bundler
npm run android            # Run on Android emulator/device
npm run ios                # Run on iOS simulator (macOS only)
npm test                   # Run Jest tests
```

### 11.3 Infrastructure Commands

```bash
./scripts/infra.sh start           # Start PostgreSQL + Adminer + MinIO + Redis
./scripts/infra.sh stop            # Stop all services
cd infra && docker-compose logs -f  # View logs
```

### 11.4 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Docs** | http://localhost:3000/api/docs | Bearer JWT token |
| **Health Check** | http://localhost:3000/api/health | Public |
| **Database Admin** | http://localhost:8080 | postgres / postgres |
| **Test Users** | See `npm run seed` | admin/12345678, worker1/12345678 |

---

## 12. Conclusion

SEKAR is a practical, cost-effective solution for municipal park worker management that addresses real operational challenges while respecting privacy and labor compliance. The architecture is designed for:

1. **Offline-First Reality:** Parks have poor connectivity; the system works fully offline
2. **Single Developer Capacity:** Modular monolith with proven frameworks reduces complexity
3. **Budget Constraints:** ~$60/month pilot, ~$325/month full scale (well under $2K target)
4. **Privacy-First Design:** Checkpoint verification, not continuous surveillance
5. **Phased Delivery:** MVP complete in 2 weeks; full feature set in 16 weeks

**Current Status:** Phase 1 MVP is complete with 9 backend modules, 37 API endpoints, 12 mobile screens, and comprehensive test coverage. The system is ready for pilot deployment to 3 parks with 30 workers.

**Next Steps:**
1. Deploy pilot environment on AWS
2. Onboard pilot workers with training
3. Collect feedback and iterate
4. Proceed to Phase 2 (Tasks & Notifications)

---

## Appendix A: Business Rules Quick Reference

This appendix consolidates all configurable parameters and business rules for the SEKAR system.

### A.1 GPS & Location Parameters

| Parameter | Value | Phase | Notes |
|-----------|-------|-------|-------|
| **Boundary Tolerance** | 100 meters | 1 | Tested at 30+ Surabaya locations |
| **GPS Accuracy Threshold** | ±50 meters | 1 | Minimum acceptable accuracy |
| **Location Update Interval** | 5 minutes | 1 | Balance battery vs granularity |
| **Maximum Location Age** | 10 minutes | 1 | Consider stale if older |
| **Location Batch Size** | 20 locations | 1 | Upload when threshold reached |
| **Spoofing Max Speed** | 25 km/h | 3 | Flag if exceeded |
| **Teleport Detection** | 500m in 30s | 3 | Physically impossible movement |

### A.2 Authentication & Tokens

| Parameter | Value | Phase | Notes |
|-----------|-------|-------|-------|
| **Access Token Lifetime** | 15 minutes | 1 | Short for security |
| **Refresh Token Lifetime** | 7 days | 1 | One-time use with rotation |
| **Password Min Length** | 8 characters | 1 | No complexity requirement in Phase 1 |
| **Failed Login Lockout** | 5 attempts / 15 min | 2 | Brute force protection |
| **Session Lifetime (Web)** | 8 hours | 6 | Sliding window |

### A.3 Shift & Attendance Rules

| Parameter | Value | Phase | Notes |
|-----------|-------|-------|-------|
| **Minimum Shift Duration** | 5 minutes | 1 | Prevents accidental clock-out |
| **Maximum Shift Duration** | 12 hours | 2 | Auto clock-out + alert |
| **Overtime Threshold** | 8 hours/day | 1 | Indonesian labor law |
| **Early Clock-In Window** | 30 minutes | 2 | Before scheduled shift |
| **Required Reports** | 1 per 2+ hour shift | 2 | Ensure work documentation |

### A.4 Work Report Requirements

| Parameter | Value | Phase | Notes |
|-----------|-------|-------|-------|
| **Photos per Report** | 1-5 photos | 1 | Evidence requirement |
| **Photo Max Size** | 5 MB original | 1 | Before compression |
| **Photo Compressed Target** | 500 KB | 1 | 70% JPEG quality |
| **Photo Max Dimensions** | 1200 x 1200 px | 1 | Sufficient for evidence |
| **Description Length** | 10-500 characters | 1 | Required field |
| **Video Max Duration** | 30 seconds | 2 | Optional evidence |
| **Video Max Size** | 30 MB | 2 | MP4/MOV format |

### A.5 Work Report Types

| Code | Indonesian | English |
|------|------------|---------|
| CLEANING | Pembersihan | General cleaning |
| PRUNING | Perantingan | Tree/plant pruning |
| WATERING | Penyiraman | Plant watering |
| FERTILIZING | Pemupukan | Fertilizer application |
| REPAIR | Perbaikan | Infrastructure repairs |
| OTHER | Lainnya | Other maintenance |

### A.6 Offline Queue Limits

| Parameter | Value | Phase | Notes |
|-----------|-------|-------|-------|
| **Max Queue Size** | 100 items | 1 | Oldest removed first |
| **Max Queue Age** | 7 days | 1 | After that, expired |
| **Auto-Retry Attempts** | 3 | 1 | Exponential backoff |
| **Retry Delays** | 1min, 5min, 15min | 1 | Backoff strategy |
| **Sync Priority** | Clock-ins > Reports > Location | 1 | Queue processing order |

### A.7 API Rate Limits

| Endpoint Category | Limit | Window | Phase |
|-------------------|-------|--------|-------|
| **Authentication** | 5 requests | 1 minute | 1 |
| **General API** | 100 requests | 1 minute | 1 |
| **File Upload** | 10 requests | 1 minute | 1 |
| **Bulk Operations** | 5 requests | 5 minutes | 6 |
| **Report Generation** | 3 requests | 10 minutes | 3 |

### A.8 Performance Targets

| Endpoint Type | Target | Max Acceptable |
|---------------|--------|----------------|
| **Authentication** | <200ms | 500ms |
| **Clock-In/Out** | <500ms | 1s |
| **List Workers** | <300ms | 800ms |
| **Submit Report** | <1s | 3s |
| **Photo Upload** | <5s | 15s |
| **Dashboard Load** | <1s | 2s |

### A.9 Data Retention

| Data Type | Active | Archive | Delete |
|-----------|--------|---------|--------|
| **Shifts** | Forever | N/A | Never |
| **Location Logs** | Forever | 6 months (cold) | Never |
| **Work Reports** | Forever | 1 year | Never |
| **Photos (Local)** | 7 days | Upload immediately | After sync |
| **Photos (Server)** | Forever | 1 year (Glacier) | Never |
| **Deleted Users** | 90 days (soft) | N/A | 90 days |

### A.10 Role Permissions Matrix

| Resource | Worker | Supervisor | Admin |
|----------|--------|------------|-------|
| **Clock In/Out** | Own only | View all | View all |
| **Submit Reports** | Yes | Yes | Yes |
| **Review Reports** | No | Assigned areas | All |
| **Manage Users** | No | No | Yes |
| **Manage Areas** | No | View only | Yes |
| **View Dashboard** | Own data | Assigned areas | All |
| **Export Data** | No | Assigned areas | All |

### A.11 Localization

| Context | Format | Example |
|---------|--------|---------|
| **Timestamps (API)** | ISO 8601 UTC | 2026-01-16T07:30:00Z |
| **Display (Short)** | DD/MM/YYYY HH:mm | 16/01/2026 14:30 |
| **Display (Long)** | DD MMMM YYYY, HH:mm WIB | 16 Januari 2026, 14:30 WIB |
| **Currency** | Rp #.###.###,- | Rp 1.500.000,- |
| **Distance** | ### meter | 150 meter |

---

**Document History:**
- **v1.0** (January 21, 2026): Initial comprehensive brief based on implemented Phase 1 MVP
- **Source:** Created from `brief/intro.md` and verified against actual implementation

**Maintained By:** Development Team
**Review Cycle:** Updated after each phase completion
