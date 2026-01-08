# Phase 1 - MVP Development Plan

## 🎯 Objectives
Launch a pilot program with:
- 3 areas (various types: park, pedestrian, street)
- 30 workers
- 10 supervisors
- 2-week development timeline

## 📱 Core Features

### Worker Features
1. **Authentication**
   - Login with username/password
   - JWT token-based authentication
   - Role-based access control

2. **Clock In/Out**
   - GPS location verification (±100m from area)
   - Selfie photo capture for clock-in
   - Offline support with queue mechanism
   - Display assigned area name and type

3. **Work Reports**
   - Photo/video capture with notes
   - Condition rating (Baik/Cukup/Buruk)
   - GPS-tagged reports
   - Offline draft saving
   - Background upload when online

4. **Location Tracking**
   - Background GPS tracking during shift
   - 10-minute interval pings
   - Batch uploads every 30 minutes
   - Low battery optimization

### Supervisor Features
1. **Live Map Dashboard**
   - Real-time worker locations
   - Color-coded by area type
   - Filter by area/area type
   - Auto-refresh every 2 minutes

2. **Report Review**
   - View all submitted reports
   - Filter by date, worker, area, area type
   - Mark reports as reviewed
   - View report details with photos

3. **Attendance Tracking**
   - Daily attendance list
   - Clock-in/out times
   - Hours worked calculation
   - Filter by area and area type

## 🏗️ Architecture

### Backend (NestJS)
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── jwt.strategy.ts
│   │   ├── guards/
│   │   └── auth.service.spec.ts (>80% coverage)
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── entities/
│   │   └── users.service.spec.ts
│   ├── areas/
│   │   ├── areas.controller.ts
│   │   ├── areas.service.ts
│   │   ├── areas.module.ts
│   │   ├── entities/
│   │   └── areas.service.spec.ts
│   ├── area-types/
│   │   ├── area-types.controller.ts
│   │   ├── area-types.service.ts
│   │   ├── area-types.module.ts
│   │   └── area-types.service.spec.ts
│   ├── shifts/
│   │   ├── shifts.controller.ts
│   │   ├── shifts.service.ts
│   │   ├── shifts.module.ts
│   │   ├── entities/
│   │   └── shifts.service.spec.ts
│   ├── reports/
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   ├── reports.module.ts
│   │   ├── entities/
│   │   └── reports.service.spec.ts
│   ├── location/
│   │   ├── location.controller.ts
│   │   ├── location.service.ts
│   │   ├── location.module.ts
│   │   └── location.service.spec.ts
│   └── supervisor/
│       ├── supervisor.controller.ts
│       ├── supervisor.service.ts
│       ├── supervisor.module.ts
│       └── supervisor.service.spec.ts
├── common/
│   ├── guards/
│   ├── interceptors/
│   ├── decorators/
│   └── utils/
├── config/
│   ├── database.config.ts
│   ├── aws.config.ts
│   └── jwt.config.ts
└── main.ts
```

### Mobile (React Native)
```
src/
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   ├── worker/
│   │   ├── HomeScreen.tsx
│   │   ├── ClockInOutScreen.tsx
│   │   └── ReportScreen.tsx
│   └── supervisor/
│       ├── MapDashboardScreen.tsx
│       ├── ReportsListScreen.tsx
│       └── AttendanceScreen.tsx
├── components/
│   ├── common/
│   ├── worker/
│   └── supervisor/
├── services/
│   ├── api/
│   ├── storage/
│   ├── location/
│   └── offline/
├── store/
│   ├── auth/
│   ├── shifts/
│   └── reports/
├── utils/
│   ├── gps.ts
│   ├── camera.ts
│   └── validators.ts
└── navigation/
    └── RootNavigator.tsx
```

### Database (PostgreSQL)
- **users** - User accounts (workers, supervisors)
- **area_types** - Types of areas (park, pedestrian, mini_garden, street)
- **areas** - Work areas with GPS coordinates
- **worker_assignments** - Worker-to-area assignments
- **shifts** - Clock-in/out records
- **work_reports** - Work reports with conditions
- **report_media** - Photos/videos attached to reports
- **location_pings** - GPS tracking data
- **assets** - (Optional for MVP) Park assets

### AWS Services
- **RDS PostgreSQL** - Database (db.t3.micro)
- **S3** - Media storage (photos/videos)
- **Elastic Beanstalk/ECS** - Backend hosting
- **CloudWatch** - Logging and monitoring

## 📅 Development Timeline (14 days)

### Week 1: Backend & Database

#### Day 1-2: Backend Foundation
- [ ] NestJS project initialization
- [ ] Project structure setup (modules)
- [ ] Database schema design
- [ ] PostgreSQL setup (local + AWS RDS)
- [ ] TypeORM/Prisma configuration
- [ ] Auth module (JWT strategy)
- [ ] Users module
- [ ] Unit tests for Auth module (>80% coverage)

#### Day 3-4: Core Backend Modules
- [ ] Areas module with CRUD operations
- [ ] Area Types module
- [ ] Shifts module (clock-in/out logic)
- [ ] GPS boundary validation utility
- [ ] AWS S3 integration service
- [ ] Media upload functionality
- [ ] Unit tests for Shifts module (>80% coverage)

#### Day 5: Reports & Location Tracking
- [ ] Reports module with media handling
- [ ] Location tracking module (batch insert)
- [ ] Supervisor module (dashboard endpoints)
- [ ] Database seed data
- [ ] Unit tests for Reports module (>80% coverage)
- [ ] Deploy to AWS Elastic Beanstalk/ECS

### Week 2: Mobile App

#### Day 6-7: Mobile Foundation
- [ ] React Native project setup
- [ ] Navigation structure
- [ ] API service layer
- [ ] Authentication flow (Login screen)
- [ ] JWT storage (AsyncStorage)
- [ ] Offline database setup (SQLite/WatermelonDB)

#### Day 8-9: Worker Features
- [ ] Worker home screen
- [ ] Clock-in/out screen with GPS
- [ ] Camera integration for selfies
- [ ] GPS validation logic
- [ ] Offline queue for clock-in/out
- [ ] Work report submission screen
- [ ] Photo/video capture and upload

#### Day 10: Location Tracking & Sync
- [ ] Background location tracking service
- [ ] Offline data sync mechanism
- [ ] Upload queue management
- [ ] Retry logic for failed uploads
- [ ] Component tests for critical features

#### Day 11: Supervisor Features
- [ ] Supervisor dashboard with map
- [ ] Google Maps integration
- [ ] Active workers display
- [ ] Reports list screen
- [ ] Report detail view
- [ ] Mark as reviewed functionality

#### Day 12-13: Testing & Polish
- [ ] Integration testing
- [ ] End-to-end testing critical workflows
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Battery usage testing
- [ ] Offline functionality verification
- [ ] Build APK

#### Day 14: Deployment & Documentation
- [ ] Deploy backend to production
- [ ] Configure production environment variables
- [ ] Database migration to production
- [ ] Generate API documentation
- [ ] User manual (basic)
- [ ] Prepare for pilot deployment

## 🧪 Testing Checklist

### Backend Tests (Jest)
- [ ] Auth: Login, JWT validation, role guards
- [ ] Shifts: Clock-in validation, GPS boundary check, clock-out
- [ ] Reports: Create report, upload media to S3
- [ ] Location: Batch insert pings
- [ ] Supervisor: Get active workers, filter reports
- [ ] All modules: >80% coverage

### Mobile Tests
- [ ] Worker can login successfully
- [ ] Worker can clock-in with GPS + selfie
- [ ] GPS validation works (reject if outside area)
- [ ] Worker can submit report with photo
- [ ] Offline mode: Data queued properly
- [ ] Online mode: Queue syncs correctly
- [ ] Worker can clock-out
- [ ] Supervisor can view map with workers
- [ ] Supervisor can view and review reports

### Integration Tests
- [ ] Full clock-in to clock-out workflow
- [ ] Report submission with media upload
- [ ] Offline → online sync workflow
- [ ] Background location tracking
- [ ] Supervisor dashboard data accuracy

### Performance Tests
- [ ] Location batch upload (50+ pings)
- [ ] Media upload (10MB video)
- [ ] Map loads with 30+ workers
- [ ] Battery usage <15% per 8-hour shift

## 📦 Deliverables

### Code
- [ ] Backend repository with NestJS code
- [ ] Mobile app repository with React Native code
- [ ] Database migration scripts
- [ ] Seed data scripts

### Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Environment setup guide
- [ ] Deployment guide
- [ ] User manual (basic)

### Deployment
- [ ] Production backend on AWS
- [ ] Production database on RDS
- [ ] S3 bucket configured
- [ ] APK file for installation

## 🚨 Known Limitations (MVP)
- Android only (no iOS)
- Mobile app only (no web dashboard)
- No password reset (admin handles manually)
- No task assignment
- No KMZ import (areas hardcoded)
- No push notifications
- No advanced analytics
- Basic GPS validation only (no anti-cheating algorithms)
- Simple "reviewed" flag (no complex approval workflow)

## 🎯 Success Criteria
1. ✅ 30 workers can clock-in/out successfully
2. ✅ GPS validation prevents clock-in outside area boundaries
3. ✅ Workers can submit reports offline
4. ✅ Reports sync when connection restored
5. ✅ Supervisors can see real-time worker locations
6. ✅ Battery usage is acceptable (<15% per 8-hour shift)
7. ✅ All backend modules have >80% test coverage
8. ✅ Critical mobile features have unit tests

## 📞 Support & Next Steps
After MVP completion:
- Monitor pilot deployment for 2 weeks
- Gather user feedback
- Fix critical bugs
- Plan Phase 2 features based on feedback

