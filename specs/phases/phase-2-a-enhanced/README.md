# Phase 2: Enhanced Features & Web Dashboard

**Timeline:** Weeks 3-7 (after Phase 1 MVP completion)
**Duration:** 4-5 weeks
**Status:** Planned

---

## Overview

Phase 2 significantly expands the SEKAR system with organizational structure (Rayon), enhanced role hierarchy, shift scheduling, task management, push notifications, and a full-featured web dashboard for data management. This phase consolidates features originally planned for Phase 6 to deliver a complete operational system earlier.

---

## Goals

1. **Organizational Structure** - Implement Rayon system with 7 sectors
2. **Role Hierarchy** - Expand from 3 roles to 6 roles with proper access control
3. **Shift Management** - Fixed shift definitions with worker scheduling
4. **Task Assignment** - Supervisors can create and assign tasks to workers
5. **Push Notifications** - Real-time alerts via Firebase Cloud Messaging
6. **KMZ/KML Import** - Import area boundaries from GIS files
7. **Web Dashboard** - Full CRUD operations for User, Area, Rayon management
8. **Neo Brutalism Design** - Consistent design system across web and mobile

---

## Key Features

### 1. Rayon System (7 Sectors)

**Structure:**
```
DLH Surabaya
├── Rayon Selatan
├── Rayon Utara
├── Rayon Pusat
├── Rayon Timur 1
├── Rayon Timur 2
├── Rayon Barat 1
└── Rayon Barat 2
```

**Capabilities:**
- Each Rayon managed by a KepalaRayon
- Areas belong to exactly one Rayon
- Statistics and monitoring scoped by Rayon
- Web dashboard filtering by Rayon

### 2. Role Hierarchy (6 Roles)

| Role | Scope | Responsibilities |
|------|-------|------------------|
| **Admin** | System-wide | Full CRUD, user management, system config |
| **TopManagement** | City-wide | View all Rayons, city dashboard, reports |
| **KepalaRayon** | One Rayon | Manage Rayon areas, create tasks, view stats |
| **KoordinatorLapangan** | One Area | Assign workers, create tasks, approve reports |
| **Worker** | Assigned shifts | Clock in/out, submit reports, complete tasks |
| **Linmas** | Assigned shifts | Security patrol, incident reports, monitoring |

**Access Matrix:**

| Feature | Admin | TopMgmt | KepalaRayon | Koordinator | Worker | Linmas |
|---------|-------|---------|-------------|-------------|--------|--------|
| View all Rayons | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own Rayon | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Areas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign Workers | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Submit Reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Clock In/Out | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Real-time Map | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### 3. Shift Definitions (Fixed)

| Shift | Code | Time | Crosses Midnight |
|-------|------|------|------------------|
| Shift 1 | SHIFT1 | 06:00 - 15:00 | No |
| Shift 2 | SHIFT2 | 15:00 - 23:00 | No |
| Shift 3 | SHIFT3 | 21:00 - 05:00 | Yes |

**Note:** Shifts are fixed and not configurable by users.

### 4. Worker Scheduling

**Capabilities:**
- Assign workers to specific areas and shifts
- Set effective dates for schedule changes
- Track historical assignments
- Handle schedule overlaps and conflicts

**Staff Requirements:**
- Configure required staff per area per shift
- Different requirements for weekday/weekend/holiday
- Real-time staffing status display
- Understaffing alerts

### 5. Activity Types

**Worker Activities:**
- Penyiraman (Watering)
- Penanaman (Planting)
- Pemangkasan (Pruning)
- Pembersihan (Cleaning) - shared with Linmas
- Pemupukan (Fertilizing)
- Perawatan Tanaman (Plant Care)

**Linmas Activities:**
- Patroli Keamanan (Security Patrol)
- Laporan Insiden (Incident Report)
- Pemantauan Pengunjung (Visitor Monitoring)
- Pengecekan Fasilitas (Facility Check)

### 6. Task Assignment System

**Workflow:**
```
Created → Assigned → Accepted → In Progress → Completed
                 ↓
              Declined
```

**Capabilities:**
- Create task with title, description, priority, location
- Assign to specific worker or find nearest available
- Worker accepts/declines via mobile app
- Task completion with photo evidence
- Link task completion to work reports

### 7. Push Notifications (FCM)

**Notification Types:**
- Task assigned - Notify worker of new task
- Task reminder - Remind about pending tasks
- Shift reminder - Clock-in/out reminders
- Report reviewed - Feedback on submitted reports
- System announcements - Broadcast messages

### 8. Real-Time WebSocket (Foundation)

**Purpose:** Enable real-time features for monitoring dashboard.

**Events (Server → Client):**
- `worker:location` - Worker location updates (every 30s during shift)
- `worker:clock-in` - Worker clocked in notification
- `worker:clock-out` - Worker clocked out notification
- `area:staffing` - Area staffing status changed
- `task:assigned` - New task assigned
- `task:completed` - Task completed

**Events (Client → Server):**
- `subscribe:area` - Subscribe to area updates
- `subscribe:rayon` - Subscribe to rayon updates
- `unsubscribe:area` - Unsubscribe from area
- `unsubscribe:rayon` - Unsubscribe from rayon

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket Gateway                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Auth Guard    │───▶│  Room Manager   │                │
│  │ (JWT Validation)│    │ (Area/Rayon)    │                │
│  └─────────────────┘    └─────────────────┘                │
│            │                    │                          │
│            ▼                    ▼                          │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Event Handlers  │    │ Event Emitters  │                │
│  │ (subscribe/etc) │    │ (broadcasts)    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Uses `@nestjs/websockets` with Socket.IO adapter
- JWT authentication for WebSocket connections
- Room-based subscriptions (per area, per rayon)
- Scoped broadcasts based on user role
- Heartbeat for connection health monitoring

### 9. KMZ/KML Import

**Features:**
- Upload KMZ file with area boundaries
- Parse KML coordinates and metadata
- Preview parsed areas on map before import
- Create/update areas from imported data
- Support polygon boundaries (not just radius)

### 10. Web Dashboard (Next.js 14+)

**Pages:**
```
/                           - Login page
/dashboard                  - Role-based dashboard
/dashboard/map             - Real-time monitoring map
/users                     - User management (Admin)
/users/new                 - Create user
/users/[id]                - Edit user
/areas                     - Area management (Admin)
/areas/new                 - Create area
/areas/[id]                - Edit area with map editor
/areas/import              - KMZ import
/rayons                    - Rayon management (Admin)
/schedules                 - Shift scheduling
/reports                   - Reports list
/reports/[id]              - Report detail
/tasks                     - Tasks management
/settings                  - Activity types config (Admin)
```

**Features by Role:**

| Role | Dashboard Features |
|------|-------------------|
| Admin | Full CRUD for all entities, KMZ import, system config |
| TopManagement | City-wide map, Rayon summary cards, statistics |
| KepalaRayon | Rayon map, area management, task overview |
| KoordinatorLapangan | Area map, worker assignment, report review |

---

## Database Changes

### New Tables

| Table | Description |
|-------|-------------|
| `rayons` | 7 organizational sectors |
| `shift_definitions` | 3 fixed shift times |
| `activity_types` | Configurable work activities |
| `area_staff_requirements` | Staff requirements per area/shift |
| `special_day_overrides` | Holiday/special day configurations |
| `worker_schedules` | Worker-area-shift assignments |
| `tasks` | Task assignments for workers |
| `notifications` | Push notification records |

### Schema Updates

| Table | Changes |
|-------|---------|
| `users` | Add `rayon_id`, expand role enum to 6 roles |
| `area_types` | Add `category` (ACTIVE/PASSIVE) |
| `areas` | Add `rayon_id`, `boundary_polygon`, `coverage_area` |
| `work_reports` | Add `task_id`, `activity_type_id` |

See `specs/database/schema.md` for complete definitions.

---

## API Endpoints

### New Modules

| Module | Endpoints |
|--------|-----------|
| Rayons | CRUD + stats |
| Shift Definitions | List, Get |
| Activity Types | CRUD |
| Area Staff Requirements | CRUD per area |
| Worker Schedules | CRUD + my schedule |
| Monitoring | City/Rayon/Area stats, live workers |
| Import | KMZ upload, preview, confirm |
| Notifications | CRUD + mark read |
| Tasks | CRUD + accept/decline/complete |

### New Endpoint Count

| Category | Count |
|----------|-------|
| Rayons | 6 |
| Shift Definitions | 2 |
| Activity Types | 4 |
| Area Staff Requirements | 4 |
| Worker Schedules | 5 |
| Monitoring | 4 |
| Import (Areas) | 3 |
| Notifications | 5 |
| Tasks | 10 |
| **Total New** | **43** |

See `specs/api/contracts.md` for complete specifications.

---

## Mobile Updates

### Worker/Linmas Home Screen (Tabbed)

```
┌─────────────────────────────────────────────────────────────┐
│ SEKAR                              [Profile] [Notifications]│
├─────────────────────────────────────────────────────────────┤
│ Shift Aktif: Shift 1 (06:00-15:00)                         │
│ Area: Taman Bungkul                                         │
│ Status: ● Online | Lokasi Terverifikasi                    │
├─────────────────────────────────────────────────────────────┤
│  [ Tugas ]        [ Laporan ]                              │
├─────────────────────────────────────────────────────────────┤
│ TUGAS HARI INI (3)                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🔴 Penyiraman Area Timur          Prioritas: Tinggi    ││
│ │    Deadline: 10:00                [Kerjakan]           ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    [+ Tambah Laporan]                       │
└─────────────────────────────────────────────────────────────┘
```

### Koordinator Map Screen

```
┌─────────────────────────────────────────────────────────────┐
│ Monitoring Area                    [Filter] [Toggle Areas]  │
├─────────────────────────────────────────────────────────────┤
│    ┌──────────────────────────────────────────────────┐    │
│    │                    MAP                            │    │
│    │   [Area Polygon]     👷 Worker markers           │    │
│    │   [📍Area Marker]    🛡️ Linmas markers          │    │
│    └──────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│ Area: Taman Bungkul | Luas: 2,500 m²                       │
├─────────────────────────────────────────────────────────────┤
│ KEBUTUHAN STAF          │ AKTUAL                           │
│ Satgas: 6               │ Online: 4 | Offline: 1          │
│ Linmas: 2               │ Online: 2 | Offline: 0          │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ UNDERSTAFFED: Butuh 2 Satgas tambahan                   │
└─────────────────────────────────────────────────────────────┘
```

### Background Location Tracking

- Use `react-native-background-geolocation`
- Track location even when app is minimized/closed
- Battery-optimized intervals (configurable)
- Auto-stop when shift ends

See `specs/phases/phase-2-enhanced/mobile.md` for complete specifications.

---

## Design System

### Neo Brutalism

Phase 2 introduces the Neo Brutalism design system for consistent UI across web and mobile.

**Key Characteristics:**
- Bold, thick black borders (3px)
- Hard drop shadows (no blur)
- High contrast colors
- Zero border radius
- Strong visual hierarchy

**Design Tokens:**
```typescript
export const nbTokens = {
  colors: {
    primary: '#0066CC',      // Action blue
    success: '#1B5E20',      // Government green
    warning: '#F57C00',      // Alert orange
    danger: '#DC2626',       // Error red
    black: '#000000',        // Borders, shadows
    white: '#FFFFFF',        // Backgrounds
  },
  borders: {
    width: '3px',
    style: 'solid',
    color: '#000000',
  },
  shadows: {
    sm: '4px 4px 0px #000000',
    md: '6px 6px 0px #000000',
    lg: '8px 8px 0px #000000',
  },
  borderRadius: '0px',
};
```

See `specs/ui-ux/neo-brutalism.md` for complete design specifications.

---

## Dependencies

### Backend

```bash
npm install firebase-admin         # FCM push notifications
npm install jszip                  # KMZ extraction
npm install xml2js                 # KML parsing
npm install @types/geojson         # GeoJSON types
npm install @nestjs/websockets     # WebSocket gateway
npm install @nestjs/platform-socket.io  # Socket.IO adapter
npm install socket.io              # Socket.IO server
```

### Mobile

```bash
npm install react-native-background-geolocation
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

### Web Dashboard (New)

```bash
npx create-next-app@latest sekar-web --typescript --tailwind --app
npm install @tanstack/react-query  # Data fetching
npm install Google Maps              # Map component
npm install @maps/Google Maps-draw # Map drawing tools
npm install axios                  # HTTP client
npm install zustand                # State management
```

---

## Implementation Phases

### Agent/Skill Assignment Matrix

| Agent/Skill | Responsibility | Phase |
|-------------|----------------|-------|
| `/database-engineer` | Schema design, migrations, seed data, query optimization | 2A |
| `/backend-developer` | NestJS modules, services, controllers, WebSocket gateway | 2A, 2B |
| `/mobile-developer` | React Native screens, components, navigation, background services | 2C |
| `/web-developer` | Next.js pages, components, state management, API integration | 2D |
| `/ui-ux-designer` | Neo Brutalism design system, wireframes, accessibility (WCAG 2.1 AA) | 2C, 2D |
| `/devops-engineer` | FCM setup, Redis/ElastiCache, AWS infrastructure, CI/CD, deployment | 2E |
| `backend-tester` (agent) | Unit tests, E2E tests for backend modules | 2A, 2B |
| `mobile-tester` (agent) | Unit tests, integration tests for mobile | 2C |
| `web-tester` (agent) | Unit tests, E2E tests for web dashboard | 2D |
| `backend-code-reviewer` (agent) | Code review for backend changes | 2A, 2B |
| `mobile-code-reviewer` (agent) | Code review for mobile changes | 2C |
| `web-code-reviewer` (agent) | Code review for web changes | 2D |
| `system-architect` (agent) | Architecture review, ADR updates, cross-cutting decisions | All |
| `devops-infrastructure-engineer` (agent) | Infrastructure security review, scalability assessment | 2E |

---

### Phase 2A: Foundation (Backend) - Week 1-2

**Lead:** `/database-engineer` + `/backend-developer`

| # | Task | Agent/Skill | Dependencies |
|---|------|-------------|--------------|
| A1 | Review & finalize database schema for Phase 2 tables | `/database-engineer` | - |
| A2 | Create database migrations for new tables | `/database-engineer` | A1 |
| A3 | Create seed data for Phase 2 (rayons, shifts, activities) | `/database-engineer` | A2 |
| A4 | Implement Rayon module (entity, service, controller, DTOs) | `/backend-developer` | A2 |
| A5 | Implement Shift Definitions module | `/backend-developer` | A2 |
| A6 | Implement Activity Types module | `/backend-developer` | A2 |
| A7 | Implement Area Staff Requirements module | `/backend-developer` | A4, A5 |
| A8 | Update Users module for 6-role hierarchy | `/backend-developer` | A4 |
| A9 | Implement Worker Schedules module | `/backend-developer` | A5, A8 |
| A10 | Update Areas module (polygon, coverage, rayon assignment) | `/backend-developer` | A4 |
| A11 | Write unit tests for all Phase 2A modules | `backend-tester` | A4-A10 |
| A12 | Code review Phase 2A implementation | `backend-code-reviewer` | A11 |

---

### Phase 2B: Core Features (Backend) - Week 2-3

**Lead:** `/backend-developer`

| # | Task | Agent/Skill | Dependencies |
|---|------|-------------|--------------|
| B1 | Implement KMZ import service (jszip, xml2js) | `/backend-developer` | A10 |
| B2 | Implement Tasks module (CRUD + workflow endpoints) | `/backend-developer` | A6 |
| B3 | Update Reports module (task linkage, activity types) | `/backend-developer` | A6, B2 |
| B4 | Implement Monitoring endpoints | `/backend-developer` | A4, A9 |
| B5 | Implement WebSocket gateway for real-time updates | `/backend-developer` | B4 |
| B6 | Implement Push Notifications service (FCM) | `/backend-developer` | A8 |
| B7 | Implement Notifications module (CRUD + read status) | `/backend-developer` | B6 |
| B8 | Update Location module for background tracking support | `/backend-developer` | A9 |
| B9 | Write unit tests for Phase 2B modules | `backend-tester` | B1-B8 |
| B10 | Write E2E tests for critical workflows | `backend-tester` | B9 |
| B11 | Code review Phase 2B implementation | `backend-code-reviewer` | B10 |

---

### Phase 2C: Mobile Updates - Week 3-4

**Lead:** `/mobile-developer` + `/ui-ux-designer`

| # | Task | Agent/Skill | Dependencies |
|---|------|-------------|--------------|
| C1 | Design Neo Brutalism component specifications | `/ui-ux-designer` | - |
| C2 | Implement Neo Brutalism component library | `/mobile-developer` | C1 |
| C3 | Implement tabbed home screen (Tasks + Reports tabs) | `/mobile-developer` | C2, B2 |
| C4 | Update Worker/Linmas screens for activity types | `/mobile-developer` | C2, A6 |
| C5 | Implement Task acceptance/decline/complete flows | `/mobile-developer` | C3, B2 |
| C6 | Enhance Koordinator map screen (polygon, staffing status) | `/mobile-developer` | C2, B4 |
| C7 | Implement background location tracking | `/mobile-developer` | B8 |
| C8 | Implement push notification handling (FCM) | `/mobile-developer` | B6 |
| C9 | Implement WebSocket client for real-time updates | `/mobile-developer` | B5 |
| C10 | Write unit tests for new components | `mobile-tester` | C2-C9 |
| C11 | Write integration tests for workflows | `mobile-tester` | C10 |
| C12 | Code review Phase 2C implementation | `mobile-code-reviewer` | C11 |

---

### Phase 2D: Web Dashboard - Week 4-5

**Lead:** `/web-developer` + `/ui-ux-designer`

| # | Task | Agent/Skill | Dependencies |
|---|------|-------------|--------------|
| D1 | Initialize Next.js 14+ project with TypeScript | `/web-developer` | - |
| D2 | Configure Tailwind CSS with Neo Brutalism tokens | `/web-developer` | C1 |
| D3 | Implement Neo Brutalism component library (web) | `/web-developer` | D2 |
| D4 | Implement authentication (JWT, refresh token) | `/web-developer` | D1 |
| D5 | Implement dashboard layouts by role | `/web-developer` | D3, D4 |
| D6 | Implement User management CRUD pages | `/web-developer` | D5, A8 |
| D7 | Implement Rayon management pages | `/web-developer` | D5, A4 |
| D8 | Implement Area management with map editor | `/web-developer` | D5, A10 |
| D9 | Implement KMZ import UI with preview | `/web-developer` | D8, B1 |
| D10 | Implement Shift scheduling UI | `/web-developer` | D5, A9 |
| D11 | Implement real-time monitoring map | `/web-developer` | D5, B5 |
| D12 | Implement Reports viewing pages | `/web-developer` | D5, B3 |
| D13 | Write unit tests for components | `web-tester` | D3-D12 |
| D14 | Write E2E tests with Playwright | `web-tester` | D13 |
| D15 | Web accessibility audit (WCAG 2.1 AA) | `/ui-ux-designer` | D13 |
| D16 | Design implementation review | `/ui-ux-designer` | D3 |
| D17 | Code review Phase 2D implementation | `web-code-reviewer` | D14 |

---

### Phase 2E: DevOps & Infrastructure - Week 5-6

**Lead:** `/devops-engineer`

| # | Task | Agent/Skill | Dependencies |
|---|------|-------------|--------------|
| E1 | Create Firebase project and configure FCM | `/devops-engineer` | - |
| E2 | Store FCM credentials in AWS Secrets Manager | `/devops-engineer` | E1 |
| E3 | Set up Redis/ElastiCache for Bull Queue | `/devops-engineer` | - |
| E4 | Configure security groups for Redis access | `/devops-engineer` | E3 |
| E5 | Update environment variables for all environments | `/devops-engineer` | E1, E3 |
| E6 | Configure CloudWatch alarms for Phase 2 features | `/devops-engineer` | B6, B7 |
| E7 | Update CloudWatch dashboard with Phase 2 metrics | `/devops-engineer` | E6 |
| E8 | Update CI/CD pipeline for web dashboard | `/devops-engineer` | D1 |
| E9 | Deploy to staging environment | `/devops-engineer` | All 2A-2D |
| E10 | Deploy to production environment | `/devops-engineer` | E9 |
| E11 | Infrastructure security review | `devops-infrastructure-engineer` | E9 |

---

### Cross-Cutting Tasks

| # | Task | Agent/Skill | Phase |
|---|------|-------------|-------|
| X1 | Review Phase 2 architecture alignment with ADRs | `system-architect` | Start |
| X2 | Review and approve database schema changes | `system-architect` | 2A |
| X3 | Design WebSocket event architecture | `system-architect` | 2B |
| X4 | Review Neo Brutalism design for mobile accessibility | `/ui-ux-designer` | 2C |
| X5 | Review Neo Brutalism design for web accessibility | `/ui-ux-designer` | 2D |
| X6 | Design consistency review (mobile + web alignment) | `/ui-ux-designer` | 2C/2D |
| X7 | Integration testing (backend + mobile + web) | `system-architect` | End |
| X8 | Update API documentation (Swagger) | `/backend-developer` | 2B |
| X9 | Update CLAUDE.md with Phase 2 information | Any | End |
| X10 | Infrastructure security and scalability review | `devops-infrastructure-engineer` | 2E |

---

## Success Criteria

### Backend
- [ ] 6 roles implemented with proper access control
- [ ] Rayons CRUD with area assignment
- [ ] Worker schedules with date-based assignments
- [ ] Activity types configurable by Admin
- [ ] Staff requirements per area per shift
- [ ] KMZ import creates polygon boundaries
- [x] Push notifications delivered via FCM (backend ready, Android configured)
- [ ] Monitoring endpoints return real-time data
- [ ] WebSocket gateway for real-time updates
- [ ] Task CRUD with accept/decline/complete workflow
- [ ] All new modules have >80% test coverage

### Mobile
- [ ] Workers see tabbed home screen (Tasks + Reports)
- [ ] Workers receive push notifications
- [ ] Background location tracking works during shifts
- [ ] Koordinator sees enhanced map with staffing status
- [ ] Neo Brutalism components consistent with web

### Web Dashboard
- [ ] Admin can CRUD users, areas, rayons
- [ ] KMZ files can be imported with preview
- [ ] Worker schedules can be configured
- [ ] Real-time map shows worker locations
- [ ] Dashboard shows role-appropriate data
- [ ] Responsive design (desktop + tablet)
- [ ] WCAG 2.1 AA accessibility compliance

### Infrastructure & DevOps
- [x] Firebase FCM configured and sending notifications (Android ready, service account in place)
- [ ] Redis/ElastiCache running for Bull Queue
- [x] FCM credentials stored securely (service account in apps/be/config, in .gitignore)
- [ ] CloudWatch alarms configured for Phase 2 metrics
- [ ] CI/CD pipeline builds and deploys web dashboard
- [ ] Staging environment fully functional
- [ ] Production deployment completed with rollback plan

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FCM configuration complexity | High | Use react-native-firebase guide, test early on real devices |
| KMZ parsing edge cases | Medium | Test with multiple KMZ files from actual DLH data |
| Background location battery drain | Medium | Use optimized intervals, respect platform guidelines |
| Role migration complexity | High | Create migration script with rollback capability |
| Web dashboard scope | Medium | Strict MVP scope for Phase 2, defer analytics to Phase 3 |
| Redis/ElastiCache connectivity | Medium | Test in staging first, configure proper security groups |
| CI/CD pipeline for web | Medium | Extend existing pipeline, test builds incrementally |

---

## Related Documentation

- **Backend Checklist:** [`backend.md`](./backend.md)
- **Mobile Checklist:** [`mobile.md`](./mobile.md)
- **Web Checklist:** [`web.md`](./web.md)
- **Timeline:** [`timeline.md`](./timeline.md)
- **Testing:** [`testing.md`](./testing.md)
- **Progress:** [`STATUS.md`](./STATUS.md)
- **Design System:** `specs/ui-ux/neo-brutalism.md`
- **API Contracts:** `specs/api/contracts.md`
- **Database Schema:** `specs/database/schema.md`

---

**Phase Owner:** Project Manager
**Last Updated:** 2026-01-24
**Prerequisites:** Phase 1 MVP must be 100% complete and deployed
