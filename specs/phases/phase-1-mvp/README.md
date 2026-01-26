# Phase 1: MVP - Core Tracking System

**Duration:** 2 weeks (10 working days)
**Status:** ✅ COMPLETE (Backend 100%, Mobile 100%)
**Goal:** Launch pilot with 3 areas, 30 workers

---

## Overview

Phase 1 delivers the minimum viable product for SEKAR - a functional worker tracking system that enables GPS-verified clock-in/out, work reporting with photo evidence, and real-time supervisor monitoring. This phase focuses on Android mobile app with offline-first architecture.

### Success Criteria

- [x] Workers can clock in/out with GPS validation and selfie verification
- [x] Workers can submit work reports with photos
- [x] Offline functionality with automatic sync when online
- [x] Supervisors can monitor worker locations in real-time
- [x] Supervisors can review and approve work reports
- [x] Backend API with >80% test coverage (84.23% achieved)
- [ ] Android app deployed and tested by 30 workers
- [ ] System deployed to AWS with 99.9% uptime

---

## Key Features

### For Workers (Mobile App)
1. **Authentication**
   - Login with username/password
   - JWT token storage
   - Auto-logout on token expiry

2. **Clock In/Out**
   - GPS location verification (must be within assigned area)
   - Selfie capture for identity verification
   - Automatic shift timer
   - Clock-in/out history

3. **Work Reporting**
   - Submit daily work reports
   - Attach multiple photos/videos
   - Auto-capture GPS location
   - Offline queue for later sync

4. **Location Tracking**
   - Background GPS tracking during shift
   - Location pings every 5 minutes
   - Battery-optimized tracking
   - Location history view

5. **Profile & Settings**
   - View profile information
   - Change password
   - View shift history
   - App settings (notifications, location)

### For Supervisors (Mobile App)
1. **Live Map Dashboard**
   - Real-time worker locations
   - Color-coded by status (on shift, idle, offline)
   - Area boundaries overlay
   - Worker info cards on tap

2. **Attendance Monitoring**
   - Daily attendance summary
   - Late clock-ins highlighted
   - Missing workers alerts
   - Attendance history

3. **Report Review**
   - Pending reports list
   - View photos/videos
   - Approve/reject with notes
   - Filter by date/worker/area

4. **Worker Management**
   - View assigned workers
   - Worker performance summary
   - Contact workers

### Backend API
1. **Auth Module**
   - Login/logout endpoints
   - JWT token generation
   - Role-based access control

2. **Users Module**
   - CRUD operations
   - Soft delete support
   - Role management

3. **Areas Module**
   - Area CRUD with GPS boundaries
   - Area types (Park, Pedestrian Zone, etc.)
   - Assignment management

4. **Shifts Module**
   - Clock-in/out with GPS validation
   - Shift timer calculation
   - Shift history

5. **Reports Module**
   - Submit work reports
   - Photo/video upload to S3
   - Approval workflow

6. **Location Module**
   - Background location pings
   - Location history
   - Real-time tracking

7. **Supervisor Module**
   - Dashboard statistics
   - Attendance tracking
   - Report management

---

## Technical Stack

### Backend
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 14+ (AWS RDS)
- **ORM:** TypeORM
- **Auth:** JWT with Passport.js
- **Storage:** AWS S3 for media
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest (>80% coverage)

### Mobile
- **Framework:** React Native 0.76.x
- **Language:** TypeScript 5.x
- **State:** Redux Toolkit
- **Offline:** AsyncStorage, SQLite
- **Maps:** react-native-maps (Google Maps)
- **Location:** react-native-geolocation-service
- **Camera:** react-native-image-picker
- **Testing:** Jest + React Native Testing Library

### Infrastructure
- **Hosting:** AWS Elastic Beanstalk
- **Database:** AWS RDS (PostgreSQL db.t3.micro)
- **Storage:** AWS S3
- **Environment:** Dev + Production

---

## Deliverables

### Backend (✅ Complete)
- [x] NestJS project setup with TypeScript
- [x] PostgreSQL database schema (7 tables)
- [x] Auth module (login, JWT, guards)
- [x] Users module (CRUD with soft delete)
- [x] Areas module (GPS boundaries, types)
- [x] Shifts module (clock-in/out, GPS validation)
- [x] Reports module (submissions, approvals)
- [x] Location module (pings, history)
- [x] Supervisor module (dashboard, stats)
- [x] Swagger API documentation
- [x] Unit tests (>80% coverage)
- [x] Docker setup
- [x] AWS deployment configuration

### Mobile (✅ Complete)
- [x] React Native project setup
- [x] Navigation structure (Worker/Supervisor tabs)
- [x] Login screen with authentication
- [x] Redux store setup (auth, shift, report, offline)
- [x] API client configuration
- [x] 12 reusable components (Button, Card, TextInput, etc.)
- [x] Worker home screen with shift timer
- [x] Permission service (location, camera)
- [x] Clock in/out screen with GPS validation
- [x] Media service for photo capture
- [x] Report submission screen
- [x] Background location tracking service
- [x] Offline queue and sync manager
- [x] Supervisor map dashboard
- [x] Supervisor reports screen
- [x] Profile screens
- [x] Unit tests (1,086 tests, 76% stmt coverage, 81% func coverage)

### DevOps
- [ ] AWS Elastic Beanstalk setup
- [ ] RDS PostgreSQL instance
- [ ] S3 bucket configuration
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variables management
- [ ] Monitoring and logging

---

## Project Timeline

### Week 1: Backend Development
- **Day 1-2:** ✅ Auth & Users modules (Complete)
- **Day 3-4:** ✅ Areas & Shifts modules (Complete)
- **Day 5:** ✅ Reports, Location, Supervisor modules (Complete)

### Week 2: Mobile Development
- **Day 6-7:** ✅ Setup, Login, Home, Clock In/Out screens (Complete)
- **Day 8:** ✅ Report submission screen (Complete)
- **Day 9:** ✅ Background tracking, offline sync (Complete)
- **Day 10:** ✅ Supervisor screens (Complete)
- **Day 11:** ✅ Profile screens, testing (Complete)
- **Day 12-14:** ⏳ AWS deployment, UAT, bug fixes (Pending deployment)

---

## Key Decisions & Rationale

### 1. Mobile-First Approach
- **Decision:** Start with mobile app before web dashboard
- **Rationale:** Workers are in the field and need mobile access. Validate core workflow before building web interface.

### 2. Android First, iOS Later
- **Decision:** Phase 1 targets Android only
- **Rationale:** 90%+ of Indonesian government workers use Android. iOS support added in Phase 5.

### 3. Offline-First Architecture
- **Decision:** Full offline support with automatic sync
- **Rationale:** Field workers may have poor internet connectivity. Must work reliably offline.

### 4. GPS Boundary Validation
- **Decision:** Strict GPS validation for clock-in (within 100m of area boundary)
- **Rationale:** Prevent fraud and ensure workers are physically at assigned location. 100m tolerance balances GPS accuracy limitations with security needs.
- **Reference:** See `specs/business-rules.md` for all GPS parameters

### 5. Selfie Verification
- **Decision:** Mandatory selfie on clock-in
- **Rationale:** Prevent buddy-punching and verify worker identity.

### 6. Background Location Tracking
- **Decision:** Track location every 5 minutes during shift
- **Rationale:** Supervisors need to verify workers stayed at location. Balance between accuracy and battery life.

### 7. Photo/Video Evidence
- **Decision:** Workers must attach photos to work reports
- **Rationale:** Verify work completion and provide audit trail.

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| GPS inaccuracy in areas | High | Use 100m tolerance (per business-rules.md), manual override planned Phase 2 |
| Poor internet in field | High | Offline-first architecture with local SQLite storage |
| Battery drain from tracking | Medium | Optimize location pings to 5-min intervals, use significant location changes |
| S3 upload failures | Medium | Queue failed uploads, retry with exponential backoff |
| Backend downtime | High | AWS Elastic Beanstalk auto-scaling, health checks |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Worker resistance to tracking | High | Clear communication about privacy, only track during shifts |
| Supervisor overwhelm | Medium | Intuitive UI, training sessions, support hotline |
| Data plan costs for workers | Medium | Minimize data usage, suggest Wi-Fi sync |
| Device compatibility | Medium | Test on common Android devices (Samsung, Oppo, Xiaomi) |

---

## Testing Strategy

### Backend Testing
- **Unit Tests:** >80% coverage per module
- **Integration Tests:** API endpoints with test database
- **E2E Tests:** Critical user flows (login, clock-in, report submission)
- **Load Tests:** 100 concurrent users

### Mobile Testing
- **Unit Tests:** Components, utilities, Redux logic
- **Integration Tests:** API integration, offline sync
- **Device Tests:** 5+ Android devices (various screen sizes)
- **User Acceptance:** 3-5 workers for pilot testing

### Test Coverage Goals
- Backend: >80% per module (ACHIEVED: 84.23%)
- Mobile: >70% (ACHIEVED: 76.05% stmt, 81.01% func, 1,086 tests)
- E2E: 100% of critical paths

---

## Deployment Plan

### Backend Deployment
1. Set up AWS Elastic Beanstalk application
2. Configure RDS PostgreSQL instance
3. Create S3 bucket for media uploads
4. Set environment variables
5. Deploy application
6. Run database migrations
7. Seed initial data (areas, test users)
8. Test API endpoints via Swagger

### Mobile Deployment
1. Build Android APK (release mode)
2. Test on 3+ physical devices
3. Distribute via internal testing (Google Play Internal Testing)
4. Gather feedback from pilot users
5. Fix critical bugs
6. Release to production

### Rollback Plan
- Keep previous backend version in EB
- Store previous mobile APK
- Database backup before migrations
- Ability to roll back within 15 minutes

---

## Success Metrics

### Technical Metrics
- Backend uptime: >99.9%
- API response time: <500ms (p95)
- Mobile app crash rate: <1%
- Offline sync success rate: >95%
- Test coverage: >80% (backend), >70% (mobile)

### Business Metrics
- Worker adoption rate: >90% (27/30 workers)
- Daily active users: >80%
- Average clock-ins per day: 25+
- Reports submitted per day: 20+
- Supervisor satisfaction: >4/5

---

## Documentation Links

- [Backend Implementation Guide](./backend.md)
- [Mobile Implementation Guide](./mobile.md)
- [Day-by-Day Timeline](./timeline.md)
- [Status Tracking](./STATUS.md)
- [API Documentation](../../api/contracts.md)
- [Database Schema](../../../specs/architecture/database-schema.md)

---

## Stakeholders

- **Product Owner:** DLH Surabaya
- **End Users:** 30 field workers, 3 supervisors
- **Development Team:** Backend (1), Mobile (1), DevOps (1)
- **QA Team:** 1 tester
- **Support:** IT helpdesk

---

## Next Steps After Phase 1

Once Phase 1 MVP is complete and stable:
1. Gather user feedback during 2-week pilot
2. Fix critical bugs and UX issues
3. Begin Phase 2: Task assignment system
4. Start building web dashboard for supervisors
5. Plan for scaling to 100+ workers

---

*Last Updated: January 22, 2026*
*Status: ✅ Phase 1 MVP COMPLETE - Backend 100%, Mobile 100%*
