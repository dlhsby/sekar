# Phase 1 - MVP Overview

## 🎯 Objectives

Build a production-ready backend API for the SEKAR pilot program supporting:
- **3 areas** (various types: park, pedestrian, street)
- **30 workers** + supervisors
- **Core functionality:** clock-in/out, work reports, location tracking

---

## 📅 Timeline

**Duration:** 5 days (Days 1-5 of development)

| Day | Focus | Modules |
|-----|-------|---------|
| Day 1-2 | Foundation | Auth ✅, Users ✅ |
| Day 3 | Area Management | AreaTypes, Areas |
| Day 4 | Shift Tracking | Shifts (clock-in/out) |
| Day 5 | Reports & Dashboard | Reports, Location, Supervisor |

---

## 🎨 Features

### Authentication & Users (Day 1-2) ✅
- JWT token-based authentication
- Role-based access control (worker, supervisor, admin)
- User CRUD with soft delete
- Secure password handling

### Area Management (Day 3)
- Area types: park, pedestrian, mini_garden, street
- Areas with GPS center point and radius
- Worker-to-area assignments
- GPS boundary validation utility

### Shift Tracking (Day 4)
- Clock-in with GPS + selfie photo
- GPS validation (±100m from area center)
- Clock-out tracking
- Current shift status
- Hours worked calculation

### Work Reports (Day 5)
- Create reports with notes
- Condition rating (Baik/Cukup/Buruk)
- Photo/video upload to S3
- GPS-tagged reports
- Report review by supervisors

### Location Tracking (Day 5)
- Batch upload of GPS pings
- Associate pings with active shift
- Efficient bulk insert

### Supervisor Dashboard (Day 5)
- Active workers list with locations
- Reports list with filters
- Attendance tracking
- Mark reports as reviewed

---

## 🏗️ Architecture

### Module Structure
```
src/modules/
├── auth/           # Authentication, JWT, Guards
├── users/          # User CRUD, Roles
├── area-types/     # Area type lookup
├── areas/          # Area management
├── worker-assignments/ # Worker-area mapping
├── shifts/         # Clock-in/out
├── reports/        # Work reports
├── location/       # GPS tracking
└── supervisor/     # Dashboard endpoints
```

### Database Tables
- `users` - User accounts
- `area_types` - Type lookup (4 types)
- `areas` - Work areas with GPS
- `worker_assignments` - Worker-area mapping
- `shifts` - Clock-in/out records
- `work_reports` - Reports with conditions
- `report_media` - Photos/videos
- `location_pings` - GPS tracking data

---

## 🔗 Dependencies

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- AWS account (S3, optionally RDS)

### External Services
- AWS S3 for media storage
- Google Maps API (for mobile, not directly used in backend)

---

## 📊 Success Criteria

1. ✅ All 8 modules implemented and tested
2. ✅ >80% test coverage per module
3. ✅ Swagger documentation for all endpoints
4. ✅ GPS validation correctly rejects out-of-boundary clock-ins
5. ✅ S3 upload works for photos/videos
6. ✅ Supervisor endpoints return accurate data
7. ✅ Deployed and accessible

---

## 🚨 Out of Scope (MVP)

- Task assignment system → Phase 2
- Push notifications → Phase 2
- KMZ import → Phase 2
- Advanced analytics → Phase 3
- Asset management → Phase 4
- Fraud detection → Phase 5

---

## 📝 Notes

- Focus on stability and correctness over features
- All code must follow NestJS best practices
- Every module needs >80% test coverage
- Use meaningful error messages

---

*See implementation details in `implementation/implementation-guide.md`*

